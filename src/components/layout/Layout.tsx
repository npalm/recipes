'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  UtensilsCrossed,
  Search,
  Menu,
  X,
  Home,
  BookOpen,
  Moon,
  Sun,
  Github,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';
import { useTheme } from '@/components/theme/ThemeProvider';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Navigation link component with active state
 */
function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Site Header Component
 */
export function Header() {
  const t = useTranslations();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold leading-none">{config.appName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/">
              <Home className="h-4 w-4" />
              {t('navigation.recipes')}
            </NavLink>
            <NavLink href="/search">
              <Search className="h-4 w-4" />
              {t('navigation.search')}
            </NavLink>
            <NavLink href="/dinner/plan">
              <Calendar className="h-4 w-4" />
              {t('navigation.dinner')}
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher - Desktop */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden h-9 w-9 md:flex"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">{t('theme.toggle')}</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">{t('common.menu')}</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <nav className="container flex flex-col gap-1 py-4">
              <NavLink href="/" onClick={closeMobileMenu}>
                <Home className="h-4 w-4" />
                {t('navigation.recipes')}
              </NavLink>
              <NavLink href="/search" onClick={closeMobileMenu}>
                <Search className="h-4 w-4" />
                {t('navigation.search')}
              </NavLink>
              <NavLink href="/dinner/plan" onClick={closeMobileMenu}>
                <Calendar className="h-4 w-4" />
                {t('navigation.planDinner')}
              </NavLink>
              <div className="my-2 h-px bg-border" />
              
              {/* Language Switcher - Mobile */}
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
              
              <button
                onClick={() => {
                  toggleTheme();
                  closeMobileMenu();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? t('theme.lightMode') : t('theme.darkMode')}
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

/**
 * Site Footer Component
 */
export function Footer() {
  const t = useTranslations();
  
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-6">
        <p className="text-center text-sm text-muted-foreground">
          {new Date().getFullYear()} {config.appName}. {t('footer.description')}
        </p>
      </div>
    </footer>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Main Layout Component
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-6 md:py-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
