import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Manrope, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const recipeDisplay = Manrope({
  variable: '--font-recipe-display',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Recipe Collection',
  description: 'A curated collection of delicious recipes',
};

// Inline script to prevent theme flash on page load
// This runs before React hydrates, setting the correct theme immediately
const themeScript = `
  (function() {
    const stored = localStorage.getItem('recipe-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || (stored === 'system' && systemDark) || (!stored && systemDark) ? 'dark' : 'light';
    document.documentElement.classList.add(theme);
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${recipeDisplay.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
