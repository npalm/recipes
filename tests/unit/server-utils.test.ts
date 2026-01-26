import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBaseUrl } from '@/lib/server-utils';
import { config } from '@/lib/config';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

describe('getBaseUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns URL from headers when available with https protocol', async () => {
    const { headers } = await import('next/headers');
    const mockHeaders = new Map([
      ['host', 'example.com'],
      ['x-forwarded-proto', 'https'],
    ]);
    
    vi.mocked(headers).mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
    } as any);

    const result = await getBaseUrl();
    expect(result).toBe('https://example.com');
  });

  it('returns URL from headers with http protocol when x-forwarded-proto is not set', async () => {
    const { headers } = await import('next/headers');
    const mockHeaders = new Map([
      ['host', 'localhost:3000'],
    ]);
    
    vi.mocked(headers).mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
    } as any);

    const result = await getBaseUrl();
    expect(result).toBe('http://localhost:3000');
  });

  it('returns production URL as fallback when headers are not available', async () => {
    const { headers } = await import('next/headers');
    
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as any);

    const result = await getBaseUrl();
    expect(result).toBe(config.productionUrl);
  });

  it('returns production URL when headers() throws an error', async () => {
    const { headers } = await import('next/headers');
    
    vi.mocked(headers).mockRejectedValue(new Error('Headers not available'));

    const result = await getBaseUrl();
    expect(result).toBe(config.productionUrl);
  });

  it('handles Vercel deployment URLs correctly', async () => {
    const { headers } = await import('next/headers');
    const mockHeaders = new Map([
      ['host', 'my-app-abc123.vercel.app'],
      ['x-forwarded-proto', 'https'],
    ]);
    
    vi.mocked(headers).mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
    } as any);

    const result = await getBaseUrl();
    expect(result).toBe('https://my-app-abc123.vercel.app');
  });

  it('handles custom domains correctly', async () => {
    const { headers } = await import('next/headers');
    const mockHeaders = new Map([
      ['host', 'keuken.guldenstraat.nl'],
      ['x-forwarded-proto', 'https'],
    ]);
    
    vi.mocked(headers).mockResolvedValue({
      get: (key: string) => mockHeaders.get(key) || null,
    } as any);

    const result = await getBaseUrl();
    expect(result).toBe('https://keuken.guldenstraat.nl');
  });
});
