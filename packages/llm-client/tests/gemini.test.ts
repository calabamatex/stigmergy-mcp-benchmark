import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiClient } from '../src/gemini.js';
import { RunType, type CompletionRequest } from '@stigmergy-benchmark/core';

function makeRequest(overrides?: Partial<CompletionRequest>): CompletionRequest {
  return {
    model: 'gemini-2.0-flash',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ],
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

function geminiResponse(overrides?: Record<string, unknown>) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: 'Hello there!' }],
        },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
    },
    ...overrides,
  };
}

describe('GeminiClient', () => {
  const originalEnv = process.env.GOOGLE_API_KEY;

  beforeEach(() => {
    delete process.env.GOOGLE_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv !== undefined) {
      process.env.GOOGLE_API_KEY = originalEnv;
    } else {
      delete process.env.GOOGLE_API_KEY;
    }
  });

  it('throws without API key', () => {
    expect(() => new GeminiClient()).toThrow('GOOGLE_API_KEY is required');
  });

  it('reads API key from env var', () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    expect(() => new GeminiClient()).not.toThrow();
  });

  it('accepts explicit API key', () => {
    expect(() => new GeminiClient('explicit-key')).not.toThrow();
  });

  it('completes a basic request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(geminiResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    const result = await client.complete(makeRequest());

    expect(result.content).toEqual([{ type: 'text', text: 'Hello there!' }]);
    expect(result.usage.input_tokens).toBe(10);
    expect(result.usage.output_tokens).toBe(5);
    expect(result.stopReason).toBe('stop');
  });

  it('sends system messages as systemInstruction', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(geminiResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    await client.complete(makeRequest());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'You are a helpful assistant.' }] });
    // System message should not appear in contents
    expect(body.contents.every((c: { role: string }) => c.role !== 'system')).toBe(true);
  });

  it('maps assistant role to model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(geminiResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    await client.complete(
      makeRequest({
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'How are you?' },
        ],
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.contents[1].role).toBe('model');
  });

  it('maps function calls to tool_use content blocks', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ functionCall: { name: 'search', args: { query: 'test' } } }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    const result = await client.complete(
      makeRequest({
        tools: [{ name: 'search', description: 'Search', input_schema: { type: 'object' } }],
      }),
    );

    expect(result.content[0].type).toBe('tool_use');
    expect(result.content[0].name).toBe('search');
    expect(result.content[0].input).toEqual({ query: 'test' });
    expect(result.content[0].id).toBeDefined();
  });

  it('sends tools as functionDeclarations', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(geminiResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    await client.complete(
      makeRequest({
        tools: [{ name: 'calc', description: 'Calculate', input_schema: { type: 'object' } }],
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.tools[0].functionDeclarations[0].name).toBe('calc');
  });

  it('uses x-goog-api-key header for auth', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(geminiResponse()),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('my-secret-key');
    await client.complete(makeRequest());

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-goog-api-key']).toBe('my-secret-key');
  });

  it('includes cached token count when present', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          geminiResponse({
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 5,
              totalTokenCount: 15,
              cachedContentTokenCount: 3,
            },
          }),
        ),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    const result = await client.complete(makeRequest());

    expect(result.usage.cache_read_input_tokens).toBe(3);
  });

  it('throws ApiError on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new GeminiClient('test-key');
    await expect(client.complete(makeRequest())).rejects.toThrow('Gemini API error 400');
  });
});
