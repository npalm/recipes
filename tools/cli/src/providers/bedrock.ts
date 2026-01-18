/**
 * AWS Bedrock Provider
 *
 * Implements the AIProvider interface for AWS Bedrock.
 * Supports Claude models via Bedrock's converse API.
 *
 * Supports credentials via:
 * - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - Direct config (apiKey format: "accessKeyId:secretAccessKey" or "accessKeyId:secretAccessKey:sessionToken")
 * - AWS credentials file (~/.aws/credentials)
 * - IAM role (when running on AWS)
 */

import type {
  AIProvider,
  CompletionOptions,
  CompletionResult,
  ProviderConfig,
} from './types.js';

interface BedrockMessage {
  role: 'user' | 'assistant';
  content: Array<{ text: string }>;
}

interface BedrockUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface BedrockResponse {
  output: {
    message: {
      role: 'assistant';
      content: Array<{ text: string }>;
    };
  };
  stopReason: string;
  usage: BedrockUsage;
}

/**
 * Sign AWS requests using Signature Version 4
 * Simplified implementation for Bedrock API calls
 */
async function signRequest(
  method: string,
  url: URL,
  body: string,
  region: string,
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): Promise<Headers> {
  const service = 'bedrock';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const host = url.hostname;
  const canonicalUri = url.pathname;
  const canonicalQuerystring = url.search.slice(1);

  // Create canonical headers
  const headers: Record<string, string> = {
    host,
    'x-amz-date': amzDate,
    'content-type': 'application/json',
  };

  if (credentials.sessionToken) {
    headers['x-amz-security-token'] = credentials.sessionToken;
  }

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key}:${headers[key]}\n`)
    .join('');

  // Create payload hash
  const encoder = new TextEncoder();
  const payloadHash = await crypto.subtle
    .digest('SHA-256', encoder.encode(body))
    .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));

  // Create canonical request
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await crypto.subtle
    .digest('SHA-256', encoder.encode(canonicalRequest))
    .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));

  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n');

  // Calculate signature
  const getSignatureKey = async (key: string, dateStamp: string, region: string, service: string) => {
    const kDate = await hmacSha256(`AWS4${key}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');
    return kSigning;
  };

  const hmacSha256 = async (key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> => {
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  };

  const signingKey = await getSignatureKey(credentials.secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders = new Headers();
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('X-Amz-Date', amzDate);
  requestHeaders.set('Authorization', authorizationHeader);
  if (credentials.sessionToken) {
    requestHeaders.set('X-Amz-Security-Token', credentials.sessionToken);
  }

  return requestHeaders;
}

export class BedrockProvider implements AIProvider {
  readonly type = 'bedrock' as const;
  readonly model: string;

  private region: string;
  private credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };

  constructor(config: ProviderConfig) {
    // Try to get credentials from config.apiKey first (format: "accessKeyId:secretAccessKey[:sessionToken]")
    let accessKeyId: string | undefined;
    let secretAccessKey: string | undefined;
    let sessionToken: string | undefined;

    if (config.apiKey) {
      const parts = config.apiKey.split(':');
      if (parts.length >= 2) {
        accessKeyId = parts[0];
        secretAccessKey = parts[1];
        sessionToken = parts[2]; // Optional
      }
    }

    // Fall back to environment variables
    accessKeyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    secretAccessKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    sessionToken = sessionToken || process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials required. Either:\n' +
        '  - Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables\n' +
        '  - Or set RECIPE_BEDROCK_API_KEY in format "accessKeyId:secretAccessKey[:sessionToken]"'
      );
    }

    this.credentials = { accessKeyId, secretAccessKey, sessionToken };
    this.region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    this.model = config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages: BedrockMessage[] = [];

    // Convert messages (system is handled separately in Bedrock)
    for (const msg of options.messages) {
      if (msg.role === 'system') {
        continue;
      }
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: [{ text: msg.content }],
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
      messages,
      inferenceConfig: {
        maxTokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
      },
    };

    if (systemPrompt) {
      body.system = [{ text: systemPrompt }];
    }

    const endpoint = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${encodeURIComponent(this.model)}/converse`;
    const url = new URL(endpoint);
    const bodyString = JSON.stringify(body);

    const headers = await signRequest('POST', url, bodyString, this.region, this.credentials);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: bodyString,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AWS Bedrock API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as BedrockResponse;

    const textContent = data.output.message.content
      .map((block) => block.text)
      .join('');

    return {
      content: textContent,
      usage: {
        promptTokens: data.usage.inputTokens,
        completionTokens: data.usage.outputTokens,
        totalTokens: data.usage.totalTokens,
      },
      model: this.model,
      raw: data,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try a minimal request
      await this.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }
}
