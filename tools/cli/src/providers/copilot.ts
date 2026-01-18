/**
 * GitHub Models Provider
 *
 * Implements the AIProvider interface for GitHub Models.
 * Uses the Azure AI inference API with GitHub authentication.
 *
 * Requires:
 * - GITHUB_TOKEN environment variable
 * - Or use `gh auth token` to get a token
 *
 * Available models include: gpt-4o, gpt-4o-mini, Llama-3.1-70B, Mistral-Large, etc.
 * See https://github.com/marketplace/models for the full list.
 */

import type {
  AIProvider,
  CompletionOptions,
  CompletionResult,
  ProviderConfig,
} from './types.js';

interface GitHubModelsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GitHubModelsChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: string;
}

interface GitHubModelsUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface GitHubModelsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GitHubModelsChoice[];
  usage: GitHubModelsUsage;
}

export class CopilotProvider implements AIProvider {
  readonly type = 'copilot' as const;
  readonly model: string;

  private token: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    // Get token from config or environment
    const token = config.apiKey || process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error(
        'GitHub token required for GitHub Models. Set GITHUB_TOKEN environment variable.\n' +
        'You can use: export GITHUB_TOKEN=$(gh auth token)'
      );
    }

    this.token = token;
    // Default to GPT-4o, but other options include:
    // - gpt-4o-mini (faster, cheaper)
    // - Llama-3.1-70B-Instruct (open source)
    // - Mistral-Large-2411 (Mistral)
    // - AI21-Jamba-1.5-Large (AI21)
    this.model = config.model || 'gpt-4o';
    // GitHub Models uses Azure AI inference endpoint
    this.baseUrl = config.baseUrl || 'https://models.inference.ai.azure.com';
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages: GitHubModelsMessage[] = [];

    // Add system prompt if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of options.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    const body = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub Models API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as GitHubModelsResponse;

    const textContent = data.choices[0]?.message?.content || '';

    return {
      content: textContent,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      model: data.model,
      raw: data,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a minimal request
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
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
