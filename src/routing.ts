import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'nl'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});
