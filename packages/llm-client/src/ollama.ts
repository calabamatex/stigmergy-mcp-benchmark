import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
} from '@stigmergy-benchmark/core';
import type { LLMClient } from './client.js';
import { ApiError } from './errors.js';

/**
 * Ollama API client for local LLM inference.
 * No API key required. Connects to a running Ollama instance.
 * Default base URL: http://localhost:11434
 */
export class OllamaClient implements LLMClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messages = request.messages.map((m) => ({
      role: m.role === 'tool' ? 'user' : m.role,
      content:
        typeof m.content === 'string' ? m.content : m.content.map((b) => b.text ?? '').join(''),
    }));

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
      options: {
        num_predict: request.maxTokens,
        temperature: request.temperature,
      },
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ApiError(response.status, errorBody, 'Ollama');
    }

    const data = (await response.json()) as {
      message: {
        role: string;
        content: string;
        tool_calls?: Array<{
          function: { name: string; arguments: Record<string, unknown> };
        }>;
      };
      done_reason: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const content: ContentBlock[] = [];

    if (data.message.content) {
      content.push({ type: 'text', text: data.message.content });
    }

    if (data.message.tool_calls) {
      for (const tc of data.message.tool_calls) {
        content.push({
          type: 'tool_use',
          id: crypto.randomUUID(),
          name: tc.function.name,
          input: tc.function.arguments,
        });
      }
    }

    return {
      content,
      usage: {
        input_tokens: data.prompt_eval_count ?? 0,
        output_tokens: data.eval_count ?? 0,
      },
      stopReason: data.done_reason ?? 'stop',
    };
  }
}
