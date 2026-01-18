/**
 * Ollama Provider
 *
 * Implements the AIProvider interface for local Ollama instance.
 * Supports any model available in the local Ollama installation.
 */

import type {
  AIProvider,
  CompletionOptions,
  CompletionResult,
  ProviderConfig,
} from './types.js';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider implements AIProvider {
  readonly type = 'ollama' as const;
  readonly model: string;

  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.model = config.model || 'llama3.2';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages: OllamaMessage[] = [];

    // Add system prompt if provided
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    // Add conversation messages
    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens || 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OllamaResponse;

    return {
      content: data.message?.content || '',
      usage: data.prompt_eval_count
        ? {
            promptTokens: data.prompt_eval_count,
            completionTokens: data.eval_count || 0,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          }
        : undefined,
      model: data.model,
      raw: data,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models in Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = (await response.json()) as {
        models: Array<{ name: string }>;
      };
      return data.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }
}
