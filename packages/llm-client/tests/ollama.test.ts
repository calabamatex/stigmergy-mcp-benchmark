import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from '../src/ollama.js';
import { RunType, type CompletionRequest } from '@stigmergy-benchmark/core';

function makeRequest(overrides?: Partial<CompletionRequest>): CompletionRequest {
  return {
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Hello' }],
    maxTokens: 1024,
    temperature: 0,
    context: {
      runType: RunType.SINGLE_AGENT,
      runId: 'run-test',
      trialIndex: 0,
      agentId: 'agent-1',
    },
    ...overrides,
  };
}

function ollamaResponse(overrides?: Record<string, unknown>) {
  return {
    message: {
      role: 'assistant',
      content: 'Hello there!',
    },
    done_reason: 'stop',
    prompt_eval_count: 12,
    eval_count: 8,
    ...overrides,
  };
}

describe('OllamaClient', () => {
  const originalEnv = process.env.OLLAMA_BASE_URL;

  beforeEach(() => {
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv !== undefined) {
      process.env.OLLAMA_BASE_URL = originalEnv;
    } else {
      delete process.env.OLLAMA_BASE_URL;
    }
  });

  it('does not require API key', () => {
    expect(() => new OllamaClient()).not.toThrow();
  });

  it('defaults to localhost:11434', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    await client.complete(makeRequest());

    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
  });

  it('reads OLLAMA_BASE_URL from env', async () => {
    process.env.OLLAMA_BASE_URL = 'http://gpu-server:11434';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    await client.complete(makeRequest());

    expect(mockFetch.mock.calls[0][0]).toBe('http://gpu-server:11434/api/chat');
  });

  it('accepts explicit base URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient('http://custom:1234');
    await client.complete(makeRequest());

    expect(mockFetch.mock.calls[0][0]).toBe('http://custom:1234/api/chat');
  });

  it('completes a basic request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    const result = await client.complete(makeRequest());

    expect(result.content).toEqual([{ type: 'text', text: 'Hello there!' }]);
    expect(result.usage.input_tokens).toBe(12);
    expect(result.usage.output_tokens).toBe(8);
    expect(result.stopReason).toBe('stop');
  });

  it('sends stream: false in request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    await client.complete(makeRequest());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stream).toBe(false);
  });

  it('defaults token counts to 0 when missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          message: { role: 'assistant', content: 'Hi' },
          done_reason: 'stop',
          // No prompt_eval_count or eval_count
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    const result = await client.complete(makeRequest());

    expect(result.usage.input_tokens).toBe(0);
    expect(result.usage.output_tokens).toBe(0);
  });

  it('does not include cache_read_input_tokens', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    const result = await client.complete(makeRequest());

    expect(result.usage.cache_read_input_tokens).toBeUndefined();
  });

  it('maps tool calls', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: { name: 'search', arguments: { query: 'test' } },
              },
            ],
          },
          done_reason: 'stop',
          prompt_eval_count: 10,
          eval_count: 5,
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    const result = await client.complete(
      makeRequest({
        tools: [{ name: 'search', description: 'Search', input_schema: { type: 'object' } }],
      }),
    );

    // Empty content string should not produce a text block
    expect(result.content.some((b) => b.type === 'text')).toBe(false);
    expect(result.content[0].type).toBe('tool_use');
    expect(result.content[0].name).toBe('search');
    expect(result.content[0].input).toEqual({ query: 'test' });
    expect(result.content[0].id).toBeDefined();
  });

  it('sends tools in OpenAI-compatible format', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ollamaResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    await client.complete(
      makeRequest({
        tools: [{ name: 'calc', description: 'Calculate', input_schema: { type: 'object' } }],
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: {
        name: 'calc',
        description: 'Calculate',
        parameters: { type: 'object' },
      },
    });
  });

  it('throws ApiError on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal server error'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    await expect(client.complete(makeRequest())).rejects.toThrow('Ollama API error 500');
  });

  it('defaults done_reason to stop when missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          message: { role: 'assistant', content: 'Hi' },
          // No done_reason
          prompt_eval_count: 5,
          eval_count: 3,
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OllamaClient();
    const result = await client.complete(makeRequest());

    expect(result.stopReason).toBe('stop');
  });
});
