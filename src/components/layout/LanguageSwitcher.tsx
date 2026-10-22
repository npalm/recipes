'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { locales, type Locale } from '@/routing';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: Locale) => {
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: newLocale });
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
          aria-pressed={locale === loc}
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
