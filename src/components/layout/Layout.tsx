import Link from 'next/link';
import { UtensilsCrossed, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';

interface HeaderProps {
  isDemo?: boolean;
}

/**
 * Site Header Component
 */
export function Header({ isDemo = false }: HeaderProps) {
  const basePath = isDemo ? '/demo' : '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href={`${basePath}/`} className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6" />
          <span className="text-lg font-semibold">{config.appName}</span>
          {isDemo && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Demo
            </span>
          )}
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={`${basePath}/`}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Recipes
          </Link>
          <Link
            href={`${basePath}/search`}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Search
          </Link>
          {!isDemo && (
            <Link
              href="/demo"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              View Demo
            </Link>
          )}
          {isDemo && (
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Exit Demo
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden md:flex">
            <Link href={`${basePath}/search`}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Site Footer Component
 */
export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UtensilsCrossed className="h-4 w-4" />
          <span>{config.appName}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Built with Next.js. Recipes stored as markdown.
        </p>
      </div>
    </footer>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  isDemo?: boolean;
}

/**
 * Main Layout Component
 */
export function Layout({ children, isDemo = false }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header isDemo={isDemo} />
      <main className="container flex-1 py-6 md:py-8">{children}</main>
      <Footer />
    </div>
  );
}
