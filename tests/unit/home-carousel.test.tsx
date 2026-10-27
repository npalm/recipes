import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { HomeCarousel } from '@/modules/recipe/components/HomeCarousel';
import messages from '../../messages/nl.json';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}));
afterEach(cleanup);
const slides = [
  { slug: 'mousse', filename: 'rum.jpg', title: 'Mousse met rum', description: 'Witte chocolade' },
  { slug: 'zalm', filename: 'zalm.jpg', title: 'Miso zalm', description: 'Met noedels' },
];
const carousel = (items = slides) => <NextIntlClientProvider locale="nl" messages={messages}><HomeCarousel slides={items} locale="nl" /></NextIntlClientProvider>;

it('shows the saved photo and recipe link and wraps with arrows, dots and keyboard', () => {
  render(carousel());
  expect(screen.getByAltText('Mousse met rum')).toHaveAttribute('src', '/content/recipes/mousse/images/rum.jpg');
  expect(screen.getByRole('link', { name: 'Bekijk het recept' })).toHaveAttribute('href', '/nl/recipe/mousse');
  fireEvent.click(screen.getByRole('button', { name: 'Volgende uitgelichte foto' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Miso zalm');
  fireEvent.click(screen.getByRole('button', { name: 'Volgende uitgelichte foto' }));
  expect(screen.getByAltText('Mousse met rum')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
  expect(screen.getByAltText('Miso zalm')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Bekijk foto 1: Mousse met rum' }));
  expect(screen.getByRole('button', { name: 'Bekijk foto 1: Mousse met rum' })).toHaveAttribute('aria-current', 'true');
});

it('handles single and empty selections without navigation controls', () => {
  const view = render(carousel(slides.slice(0, 1)));
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  view.rerender(carousel([]));
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

it('starts at the server-selected slide while retaining manual navigation', () => {
  render(<NextIntlClientProvider locale="nl" messages={messages}><HomeCarousel slides={slides} locale="nl" initialIndex={1} /></NextIntlClientProvider>);
  expect(screen.getByAltText('Miso zalm')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Volgende uitgelichte foto' }));
  expect(screen.getByAltText('Mousse met rum')).toBeInTheDocument();
});
