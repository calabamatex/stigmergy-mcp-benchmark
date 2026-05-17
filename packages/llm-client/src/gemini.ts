import type {
  CompletionRequest,
  CompletionResponse,
  ContentBlock,
} from '@stigmergy-benchmark/core';
import type { LLMClient } from './client.js';
import { ApiError } from './errors.js';

/**
 * Google Gemini API client. Makes real API calls to Gemini models.
 * Requires GOOGLE_API_KEY environment variable or explicit apiKey.
 */
export class GeminiClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY ?? '';
    this.baseUrl = baseUrl ?? 'https://generativelanguage.googleapis.com';
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY is required');
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const systemText = systemMessages
      .map((m) =>
        typeof m.content === 'string' ? m.content : m.content.map((b) => b.text ?? '').join(''),
      )
      .join('\n');

    const contents = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text:
            typeof m.content === 'string' ? m.content : m.content.map((b) => b.text ?? '').join(''),
        },
      ],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature,
      },
    };

    if (systemText) {
      body.systemInstruction = { parts: [{ text: systemText }] };
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          })),
        },
      ];
    }

    const url = `${this.baseUrl}/v1beta/models/${request.model}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ApiError(response.status, errorBody, 'Gemini');
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: {
          parts: Array<{
            text?: string;
            functionCall?: { name: string; args: Record<string, unknown> };
          }>;
        };
        finishReason: string;
      }>;
      usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
        cachedContentTokenCount?: number;
      };
    };

    const candidate = data.candidates[0];
    const content: ContentBlock[] = [];

    for (const part of candidate.content.parts) {
      if (part.functionCall) {
        content.push({
          type: 'tool_use',
          id: crypto.randomUUID(),
          name: part.functionCall.name,
          input: part.functionCall.args,
        });
      } else if (part.text) {
        content.push({ type: 'text', text: part.text });
      }
    }

    return {
      content,
      usage: {
        input_tokens: data.usageMetadata.promptTokenCount,
        output_tokens: data.usageMetadata.candidatesTokenCount,
        cache_read_input_tokens: data.usageMetadata.cachedContentTokenCount,
      },
      stopReason: candidate.finishReason.toLowerCase(),
    };
  }
}
