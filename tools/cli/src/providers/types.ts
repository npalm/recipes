/**
 * AI Provider Types
 *
 * Defines the interface for AI providers (OpenAI, Anthropic, Ollama).
 * All providers must implement this interface for interchangeability.
 */

/**
 * Supported AI provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'bedrock' | 'copilot';

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A single message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * Options for generating a completion
 */
export interface CompletionOptions {
  /** The messages to send to the model */
  messages: Message[];
  /** Maximum tokens to generate (optional, provider-specific defaults) */
  maxTokens?: number;
  /** Temperature for randomness (0-1, lower = more deterministic) */
  temperature?: number;
  /** System prompt to prepend (convenience, can also be first message) */
  systemPrompt?: string;
}

/**
 * Result from a completion request
 */
export interface CompletionResult {
  /** The generated text content */
  content: string;
  /** Usage statistics (if available) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** The model that was used */
  model: string;
  /** Raw response for debugging */
  raw?: unknown;
}

/**
 * Configuration for an AI provider
 */
export interface ProviderConfig {
  /** Provider type */
  type: ProviderType;
  /** API key (not needed for Ollama) */
  apiKey?: string;
  /** Model to use */
  model: string;
  /** Base URL (for Ollama or custom endpoints) */
  baseUrl?: string;
}

/**
 * AI Provider interface
 *
 * All AI providers must implement this interface to be usable
 * with the CLI commands.
 */
export interface AIProvider {
  /** Provider type identifier */
  readonly type: ProviderType;
  /** Model being used */
  readonly model: string;

  /**
   * Generate a completion from the AI model
   */
  complete(options: CompletionOptions): Promise<CompletionResult>;

  /**
   * Check if the provider is properly configured and reachable
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Factory function type for creating providers
 */
export type ProviderFactory = (config: ProviderConfig) => AIProvider;
