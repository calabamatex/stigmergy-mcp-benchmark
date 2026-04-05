import { ReportingLevel, type ComparisonConfig } from '@stigmergy-benchmark/core';
import type { RunType } from '@stigmergy-benchmark/core';
import { getTask } from '@stigmergy-benchmark/tasks';
import { ComparisonEngine } from '@stigmergy-benchmark/engine';
import { BenchmarkStore } from '@stigmergy-benchmark/storage';
import {
  MockLLMClient,
  AnthropicClient,
  OpenAIClient,
  RetryLLMClient,
  RateLimitedLLMClient,
} from '@stigmergy-benchmark/llm-client';
import type { LLMClient } from '@stigmergy-benchmark/llm-client';
import { formatProgressLine, formatProvisionalStats, ProgressTracker } from '../format/progress.js';
import { formatComparisonResult } from '../format/results.js';

/** Minimum trials for statistical validity. */
const MIN_TRIALS = 3;

/** Default trial count when not specified. */
const DEFAULT_TRIALS = 10;

/** Minimum trials for adequate TOST power on crossover tasks. */
const MIN_CROSSOVER_TRIALS = 15;

export interface CompareOptions {
  task: string;
  trials: string;
  provider: string;
  model?: string;
  temperature: string;
  skipSingleAgent: boolean;
  seed?: string;
  db: string;
  verbose: boolean;
}

export async function runCompare(opts: CompareOptions): Promise<void> {
  const task = getTask(opts.task);
  const trialCount = Math.max(MIN_TRIALS, Number(opts.trials) || DEFAULT_TRIALS);
  const provider = opts.provider;
  const model = opts.model ?? getDefaultModel(provider);
  const temperature = Number(opts.temperature) || 0;
  const seed = opts.seed ? Number(opts.seed) : undefined;

  if (task.crossoverTask && trialCount < MIN_CROSSOVER_TRIALS) {
    console.warn(
      `Warning: Task "${task.name}" is a crossover task. TOST requires n >= 15 for adequate power (you set ${trialCount}).`,
    );
  }

  const config: ComparisonConfig = {
    trialCount,
    provider,
    model,
    temperature,
    promptCachingEnabled: true,
    skipSingleAgent: opts.skipSingleAgent,
  };

  console.log(`\nStigmergy-MCP Token Comparison`);
  console.log(`Task: ${task.name}  |  Model: ${model} (${provider})  |  Trials: ${trialCount}`);
  console.log(`${'─'.repeat(70)}\n`);

  const client = createClient(provider, seed);
  const store = new BenchmarkStore(opts.db);
  const engine = new ComparisonEngine(store, client);
  const tracker = new ProgressTracker();
  let currentRun: RunType | undefined;

  try {
    const result = await engine.runComparison(task, config, {
      onTrialStart(trialIndex, totalTrials) {
        tracker.onTrialStart();
        currentRun = undefined;
        process.stdout.write(
          `\r${formatProgressLine(trialIndex, totalTrials, 'running', tracker)}  `,
        );
      },
      onRunStart(trialIndex, runType) {
        currentRun = runType;
        process.stdout.write(
          `\r${formatProgressLine(trialIndex, config.trialCount, 'running', tracker, currentRun)}  `,
        );
      },
      onTrialComplete(trial, partialStats) {
        tracker.onTrialComplete();
        process.stdout.write(
          `\r${formatProgressLine(trial.trialIndex, config.trialCount, 'complete', tracker)}  \n`,
        );

        // Show provisional stats at milestones
        if (partialStats.reportingLevel !== ReportingLevel.RAW_ONLY) {
          const line = formatProvisionalStats(partialStats);
          if (line) console.log(`  ${line}`);
        }
      },
      onError(trialIndex, error) {
        console.error(`\n  Trial ${trialIndex + 1} failed: ${error.message}`);
      },
    });

    console.log('');
    console.log(formatComparisonResult(result));
    console.log(`\nResult saved: ${result.id}`);
    console.log(`View again: stigmergy-benchmark results show ${result.id}\n`);
  } finally {
    store.close();
  }
}

function createClient(provider: string, seed?: number): LLMClient {
  let client: LLMClient;
  switch (provider) {
    case 'mock':
      return new MockLLMClient({ seed: seed ?? 42, variance: 0.2 });
    case 'anthropic':
      client = new AnthropicClient();
      break;
    case 'openai':
      client = new OpenAIClient();
      break;
    default:
      throw new Error(`Unknown provider: ${provider}. Use: mock | anthropic | openai`);
  }
  // Wrap real providers with retry + rate limiting
  return new RateLimitedLLMClient(new RetryLLMClient(client));
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    case 'openai':
      return 'gpt-4o';
    case 'mock':
      return 'mock-model';
    default:
      return 'unknown';
  }
}
