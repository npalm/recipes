import { describe, it, expect, vi, beforeEach } from 'vitest';
import { locales, defaultLocale } from '@/i18n';

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  getRequestConfig: vi.fn((configFn) => configFn),
}));

// Mock the message imports
vi.mock('../../messages/en.json', () => ({
  default: { test: 'Test message EN' },
}));

vi.mock('../../messages/nl.json', () => ({
  default: { test: 'Test bericht NL' },
}));

describe('i18n configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports correct locales', () => {
    expect(locales).toEqual(['en', 'nl']);
  });

  it('exports correct default locale', () => {
    expect(defaultLocale).toBe('en');
  });

  describe('getRequestConfig', () => {
    it('returns valid locale and messages for en', async () => {
      const { default: getRequestConfig } = await import('@/i18n');
      const config = await getRequestConfig({ requestLocale: Promise.resolve('en') });
      
      expect(config.locale).toBe('en');
      expect(config.messages).toEqual({ test: 'Test message EN' });
    });

    it('returns valid locale and messages for nl', async () => {
      const { default: getRequestConfig } = await import('@/i18n');
      const config = await getRequestConfig({ requestLocale: Promise.resolve('nl') });
      
      expect(config.locale).toBe('nl');
      expect(config.messages).toEqual({ test: 'Test bericht NL' });
    });

    it('falls back to default locale for invalid locale', async () => {
      const { default: getRequestConfig } = await import('@/i18n');
      const config = await getRequestConfig({ requestLocale: Promise.resolve('fr') });
      
      expect(config.locale).toBe('en');
      expect(config.messages).toEqual({ test: 'Test message EN' });
    });

    it('falls back to default locale when requestLocale is empty string', async () => {
      const { default: getRequestConfig } = await import('@/i18n');
      const config = await getRequestConfig({ requestLocale: Promise.resolve('') });
      
      expect(config.locale).toBe('en');
      expect(config.messages).toEqual({ test: 'Test message EN' });
    });

    it('falls back to default locale when requestLocale is undefined', async () => {
      const { default: getRequestConfig } = await import('@/i18n');
      const config = await getRequestConfig({ requestLocale: Promise.resolve(undefined) });
      
      expect(config.locale).toBe('en');
      expect(config.messages).toEqual({ test: 'Test message EN' });
    });
  });
});
