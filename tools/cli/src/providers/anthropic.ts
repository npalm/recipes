/**
 * Anthropic Provider
 *
 * Implements the AIProvider interface for Anthropic's Claude API.
 * Supports Claude 3 models (Opus, Sonnet, Haiku).
 */

import type {
  AIProvider,
  CompletionOptions,
  CompletionResult,
  ProviderConfig,
} from './types.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string;
  usage: AnthropicUsage;
}

export class AnthropicProvider implements AIProvider {
  readonly type = 'anthropic' as const;
  readonly model: string;

  private apiKey: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-5-sonnet-latest';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages: AnthropicMessage[] = [];

    // Convert messages (Anthropic doesn't support system role in messages array)
    for (const msg of options.messages) {
      if (msg.role === 'system') {
        // System messages will be handled separately
        continue;
      }
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Build system prompt
    let systemPrompt = options.systemPrompt || '';
    const systemMessages = options.messages.filter((m) => m.role === 'system');
    if (systemMessages.length > 0) {
      systemPrompt =
        systemMessages.map((m) => m.content).join('\n\n') +
        (systemPrompt ? '\n\n' + systemPrompt : '');
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    const textContent = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content: textContent,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
      raw: data,
    };
  }

  async healthCheck(): Promise<boolean> {
    // Anthropic doesn't have a simple health check endpoint
    // We'll try a minimal request
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
