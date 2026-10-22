import { getRequestConfig } from 'next-intl/server';

import { locales, defaultLocale, type Locale } from './routing';
export { locales, defaultLocale, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` contains the locale that was matched by the proxy
  let locale = await requestLocale;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
