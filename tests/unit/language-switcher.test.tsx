import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import messages from '../../messages/nl.json';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('@/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/search',
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState(null, '', '/'); });

describe('language switching', () => {
  it('preserves filters and fragments when switching to English', () => {
    window.history.replaceState(null, '', '/nl/search?tag=vis&tag=snel#results');
    render(<NextIntlClientProvider locale="nl" messages={messages}><LanguageSwitcher /></NextIntlClientProvider>);
    expect(screen.getByText('NL')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('EN'));
    expect(replace).toHaveBeenCalledWith('/search?tag=vis&tag=snel#results', { locale: 'en' });
  });
});
