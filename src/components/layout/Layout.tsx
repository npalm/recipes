'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
              Recipes
            </NavLink>
            <NavLink href="/search">
              <Search className="h-4 w-4" />
              Search
            </NavLink>
            <NavLink href="/dinner/plan">
              <Calendar className="h-4 w-4" />
              Dinner
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden h-9 w-9 md:flex"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
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
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <nav className="container flex flex-col gap-1 py-4">
              <NavLink href="/" onClick={closeMobileMenu}>
                <Home className="h-4 w-4" />
                Recipes
              </NavLink>
              <NavLink href="/search" onClick={closeMobileMenu}>
                <Search className="h-4 w-4" />
                Search
              </NavLink>
              <NavLink href="/dinner/plan" onClick={closeMobileMenu}>
                <Calendar className="h-4 w-4" />
                Plan Dinner
              </NavLink>
              <div className="my-2 h-px bg-border" />
              <button
                onClick={() => {
                  toggleTheme();
                  closeMobileMenu();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
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
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <span className="font-bold">{config.appName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A personal recipe collection stored as markdown files.
              Fast, simple, and always yours.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                All Recipes
              </Link>
              <Link
                href="/search"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Search
              </Link>
            </nav>
          </div>

          {/* About */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">About</h4>
            <p className="text-sm text-muted-foreground">
              Built with Next.js, styled with Tailwind CSS.
              Recipes stored as markdown in git for easy version control.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  <span className="sr-only">GitHub</span>
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <p className="text-center text-xs text-muted-foreground">
            {new Date().getFullYear()} {config.appName}. Made with love and good food.
          </p>
        </div>
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
