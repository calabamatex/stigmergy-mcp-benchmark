import { Router } from 'express';
import type { WebSocket } from 'ws';
import type { ComparisonConfig, ComparisonResult } from '@stigmergy-benchmark/core';
import { getTask } from '@stigmergy-benchmark/tasks';
import { ComparisonEngine } from '@stigmergy-benchmark/engine';
import type { BenchmarkStore } from '@stigmergy-benchmark/storage';
import { MockLLMClient, AnthropicClient, OpenAIClient, RetryLLMClient, RateLimitedLLMClient } from '@stigmergy-benchmark/llm-client';
import type { LLMClient } from '@stigmergy-benchmark/llm-client';
import { z } from 'zod';

/** Active WebSocket clients listening for live updates. */
const listeners = new Set<WebSocket>();

/** Track active comparison to prevent concurrent runs. */
let activeComparison: { id: string; promise: Promise<ComparisonResult> } | null = null;

export function addWSListener(ws: WebSocket): void {
  listeners.add(ws);
  ws.on('close', () => listeners.delete(ws));
}

function broadcast(data: unknown): void {
  const msg = JSON.stringify(data);
  for (const ws of listeners) {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(msg);
      }
    } catch {
      // WebSocket closed between readyState check and send — remove it
      listeners.delete(ws);
    }
  }
}

const CompareRequestSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  config: z.object({
    trialCount: z.number().int().min(3).max(100).optional(),
    provider: z.enum(['mock', 'anthropic', 'openai']).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    promptCachingEnabled: z.boolean().optional(),
    skipSingleAgent: z.boolean().optional(),
  }).optional(),
});

export function createLiveRoutes(store: BenchmarkStore): Router {
  const router = Router();

  router.post('/api/compare', (req, res) => {
    const parsed = CompareRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { taskId, config } = parsed.data;

    if (activeComparison) {
      res.status(409).json({ error: 'A comparison is already running', activeId: activeComparison.id });
      return;
    }

    let task;
    try {
      task = getTask(taskId);
    } catch {
      res.status(404).json({ error: `Task not found: ${taskId}` });
      return;
    }

    const fullConfig: ComparisonConfig = {
      trialCount: config?.trialCount ?? 10,
      provider: config?.provider ?? 'mock',
      model: config?.model ?? 'mock-model',
      temperature: config?.temperature ?? 0,
      promptCachingEnabled: config?.promptCachingEnabled ?? true,
      skipSingleAgent: config?.skipSingleAgent ?? false,
    };

    const client = createClient(fullConfig.provider);
    const engine = new ComparisonEngine(store, client);

    const comparisonId = crypto.randomUUID();

    // Track the active comparison promise
    const promise = engine.runComparison(task, fullConfig, {
      onTrialStart(trialIndex, totalTrials) {
        broadcast({ type: 'trial_start', trialIndex, totalTrials });
      },
      onRunStart(trialIndex, runType) {
        broadcast({ type: 'run_start', trialIndex, runType });
      },
      onRunComplete(trialIndex, runType) {
        broadcast({ type: 'run_complete', trialIndex, runType });
      },
      onTrialComplete(trial, partialStats) {
        broadcast({ type: 'trial_complete', trialIndex: trial.trialIndex, partialStats });
      },
      onError(trialIndex, error) {
        broadcast({ type: 'error', trialIndex, message: error.message });
      },
    });

    activeComparison = { id: comparisonId, promise };

    promise
      .then(result => {
        broadcast({ type: 'complete', result });
      })
      .catch(err => {
        console.error('Comparison failed:', err);
        broadcast({ type: 'error', trialIndex: -1, message: String(err) });
      })
      .finally(() => {
        activeComparison = null;
      });

    res.json({ comparisonId, status: 'started' });
  });

  router.get('/api/compare/status', (_req, res) => {
    res.json({
      active: activeComparison !== null,
      activeId: activeComparison?.id ?? null,
    });
  });

  return router;
}

function createClient(provider: string): LLMClient {
  switch (provider) {
    case 'mock':
      return new MockLLMClient({ seed: 42, variance: 0.2 });
    case 'anthropic':
      return new RateLimitedLLMClient(new RetryLLMClient(new AnthropicClient()));
    case 'openai':
      return new RateLimitedLLMClient(new RetryLLMClient(new OpenAIClient()));
    default:
      console.warn(`Unknown provider "${provider}", falling back to mock`);
      return new MockLLMClient({ seed: 42, variance: 0.2 });
  }
}
