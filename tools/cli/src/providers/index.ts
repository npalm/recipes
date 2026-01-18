/**
 * AI Providers - Main Export
 *
 * Factory function to create the appropriate AI provider
 * based on configuration.
 */

import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';
import type { AIProvider, ProviderConfig, ProviderType } from './types.js';

export * from './types.js';
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { OllamaProvider } from './ollama.js';

/**
 * Create an AI provider based on configuration
 */
export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4-turbo-preview',
  anthropic: 'claude-3-5-sonnet-latest',
  ollama: 'llama3.2',
};

/**
 * Get provider config from environment variables
 */
export function getProviderFromEnv(): ProviderConfig | null {
  // Check for explicit provider selection
  const providerType = process.env.RECIPE_AI_PROVIDER as ProviderType;

  if (providerType === 'ollama') {
    return {
      type: 'ollama',
      model: process.env.RECIPE_OLLAMA_MODEL || DEFAULT_MODELS.ollama,
      baseUrl: process.env.RECIPE_OLLAMA_URL || 'http://localhost:11434',
    };
  }

  if (providerType === 'anthropic' || process.env.ANTHROPIC_API_KEY) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return {
      type: 'anthropic',
      apiKey,
      model: process.env.RECIPE_ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic,
    };
  }

  if (providerType === 'openai' || process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return {
      type: 'openai',
      apiKey,
      model: process.env.RECIPE_OPENAI_MODEL || DEFAULT_MODELS.openai,
    };
  }

  return null;
}
