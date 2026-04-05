import { describe, it, expect } from 'vitest';
import { RateLimitedLLMClient, BudgetExhaustedError } from '../src/rate-limiter.js';
import { MockLLMClient } from '../src/mock.js';
import { RunType, type CompletionRequest } from '@stigmergy-benchmark/core';

function makeRequest(): CompletionRequest {
  return {
    model: 'test',
    messages: [{ role: 'user', content: 'test' }],
    maxTokens: 100,
    temperature: 0,
    context: { runType: RunType.SINGLE_AGENT, runId: 'r1', trialIndex: 0, agentId: 'a1' },
  };
}

describe('RateLimitedLLMClient', () => {
  it('passes through calls when under budget', async () => {
    const mock = new MockLLMClient({
      seed: 42,
      baseInputTokens: 100,
      baseOutputTokens: 50,
      variance: 0,
    });
    const limited = new RateLimitedLLMClient(mock, { maxTotalTokens: 10000 });

    const resp = await limited.complete(makeRequest());
    expect(resp.usage.input_tokens + resp.usage.output_tokens).toBe(150);

    const usage = limited.getUsage();
    expect(usage.tokens).toBe(150);
    expect(usage.limit).toBe(10000);
    expect(usage.percent).toBeCloseTo(1.5, 1);
  });

  it('throws BudgetExhaustedError when a call exceeds budget', async () => {
    const mock = new MockLLMClient({
      seed: 42,
      baseInputTokens: 100,
      baseOutputTokens: 50,
      variance: 0,
    });
    const limited = new RateLimitedLLMClient(mock, { maxTotalTokens: 200 });

    // First call: 150 tokens, under budget (200) — succeeds
    await limited.complete(makeRequest());
    expect(limited.getUsage().tokens).toBe(150);

    // Second call: would push to 300, exceeding 200 budget — throws immediately after the call
    await expect(limited.complete(makeRequest())).rejects.toThrow(BudgetExhaustedError);
    expect(limited.isOverBudget()).toBe(true);

    // Further calls are blocked by pre-call check
    await expect(limited.complete(makeRequest())).rejects.toThrow(BudgetExhaustedError);
  });

  it('allows calls that stay exactly within budget', async () => {
    const mock = new MockLLMClient({
      seed: 42,
      baseInputTokens: 100,
      baseOutputTokens: 50,
      variance: 0,
    });
    const limited = new RateLimitedLLMClient(mock, { maxTotalTokens: 300 });

    // Two calls × 150 = 300, exactly at budget — both succeed
    await limited.complete(makeRequest());
    await limited.complete(makeRequest());
    expect(limited.getUsage().tokens).toBe(300);

    // Third call blocked by pre-call check (300 >= 300)
    await expect(limited.complete(makeRequest())).rejects.toThrow(BudgetExhaustedError);
  });

  it('unlimited budget (0) never throws', async () => {
    const mock = new MockLLMClient({
      seed: 42,
      baseInputTokens: 100,
      baseOutputTokens: 50,
      variance: 0,
    });
    const limited = new RateLimitedLLMClient(mock, { maxTotalTokens: 0 });

    for (let i = 0; i < 10; i++) {
      await limited.complete(makeRequest());
    }

    expect(limited.isOverBudget()).toBe(false);
    expect(limited.getUsage().percent).toBe(0);
  });

  it('tracks cumulative usage correctly', async () => {
    const mock = new MockLLMClient({
      seed: 42,
      baseInputTokens: 100,
      baseOutputTokens: 50,
      variance: 0,
    });
    const limited = new RateLimitedLLMClient(mock, { maxTotalTokens: 10000 });

    await limited.complete(makeRequest());
    await limited.complete(makeRequest());
    await limited.complete(makeRequest());

    expect(limited.getUsage().tokens).toBe(450); // 3 × 150
  });
});
