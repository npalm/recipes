'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: Locale) => {
    // Remove the current locale prefix from the pathname
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, '');
    
    // Navigate to the same path with the new locale
    router.push(`/${newLocale}${pathnameWithoutLocale}`);
  };

  const getLanguageName = (loc: Locale): string => {
    return loc === 'en' ? t('english') : t('dutch');
  };

  return (
    <div className="flex items-center gap-2">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLanguage(loc)}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            locale === loc
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          aria-label={t('switchTo', { language: getLanguageName(loc) })}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
