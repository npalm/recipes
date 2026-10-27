import { createElement, type CSSProperties } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { ImageGallery, RecipeThumbnail } from '@/modules/recipe/components/ImageGallery';
import { config } from '@/lib/config';
import messages from '../../messages/nl.json';

vi.mock('next/image', () => ({
  default: ({ src, alt, className, style, width, height }: { src: string; alt: string; className: string; style?: CSSProperties; width?: number; height?: number }) => createElement('img', { src, alt, className, style, width, height }),
}));

const props = { images: ['hero.jpg', 'bottle.jpg', 'detail.jpg'], slug: 'mousse', title: 'Mousse met rum' };
function gallery(overrides = {}) {
  return <NextIntlClientProvider locale="nl" messages={messages}><ImageGallery {...props} {...overrides} /></NextIntlClientProvider>;
}
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('recipe image gallery', () => {
  it('opens the hero first and supports thumbnails, arrows and keyboard navigation', () => {
    render(gallery());
    expect(screen.getByAltText('Mousse met rum — Foto 1')).toHaveAttribute('src', '/content/recipes/mousse/images/hero.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Bekijk afbeelding 3' }));
    expect(screen.getByRole('button', { name: 'Bekijk afbeelding 3' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByAltText('Mousse met rum — Foto 3')).toHaveAttribute('src', '/content/recipes/mousse/images/detail.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Volgende afbeelding' }));
    expect(screen.getByAltText('Mousse met rum — Foto 1')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Galerij: Mousse met rum' }), { key: 'ArrowLeft' });
    expect(screen.getByAltText('Mousse met rum — Foto 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vorige afbeelding' }));
    expect(screen.getByAltText('Mousse met rum — Foto 2')).toBeInTheDocument();
  });

  it('resets safely when the ordered gallery changes or becomes empty', () => {
    const view = render(gallery());
    fireEvent.click(screen.getByRole('button', { name: 'Bekijk afbeelding 3' }));
    view.rerender(gallery({ images: ['bottle.jpg'] }));
    expect(screen.getByAltText('Mousse met rum — Foto 1')).toHaveAttribute('src', '/content/recipes/mousse/images/bottle.jpg');
    expect(screen.queryByRole('button', { name: 'Volgende afbeelding' })).not.toBeInTheDocument();
    view.rerender(gallery({ images: [] }));
    expect(screen.getByText('Geen afbeelding beschikbaar')).toBeInTheDocument();
  });

  it('pauses automatic rotation after a manual choice and lets the visitor resume', () => {
    vi.useFakeTimers();
    render(gallery({ autoRotate: true }));
    act(() => { vi.advanceTimersByTime(config.imageRotationInterval); });
    expect(screen.getByAltText('Mousse met rum — Foto 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bekijk afbeelding 1' }));
    act(() => { vi.advanceTimersByTime(config.imageRotationInterval * 2); });
    expect(screen.getByAltText('Mousse met rum — Foto 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Diavoorstelling afspelen' }));
    act(() => { vi.advanceTimersByTime(config.imageRotationInterval); });
    expect(screen.getByAltText('Mousse met rum — Foto 2')).toBeInTheDocument();
  });

  it('does not auto-rotate when reduced motion is requested', () => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    render(gallery({ autoRotate: true }));
    act(() => { vi.advanceTimersByTime(config.imageRotationInterval * 3); });
    expect(screen.getByAltText('Mousse met rum — Foto 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Diavoorstelling pauzeren' })).not.toBeInTheDocument();
  });

  it('supports browsing in the enlarged view and restores focus when closed', () => {
    render(gallery());
    const trigger = screen.getByRole('button', { name: 'Volledig beeld bekijken' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Volledig beeld bekijken' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Volgende afbeelding' }));
    expect(within(dialog).getByAltText('Mousse met rum — Foto 2')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Afbeelding sluiten' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
  });
});

it('keeps natural card dimensions by default and applies a saved crop only to the thumbnail', () => {
  const view = render(<RecipeThumbnail images={['rum.jpg']} slug="mousse" title="Mousse" dimensions={{ width: 80, height: 120 }} />);
  expect(screen.getByAltText('Mousse')).toHaveAttribute('height', '120');
  expect(screen.getByAltText('Mousse').parentElement).not.toHaveAttribute('style');
  view.rerender(<RecipeThumbnail images={['rum.jpg']} slug="mousse" title="Mousse" crop={{ ratio: '4:3', x: 20, y: 70, zoom: 1.5 }} />);
  expect(screen.getByAltText('Mousse')).toHaveStyle({ objectPosition: '20% 70%', transform: 'scale(1.5)', transformOrigin: '20% 70%' });
  expect(screen.getByAltText('Mousse').parentElement).toHaveStyle({ aspectRatio: '4 / 3' });
});

it('applies a separate recipe crop to the main photo and keeps other photos and fullscreen intact', () => {
  render(gallery({ crop: { ratio: '1:1', x: 40, y: 65, zoom: 1.2 } }));
  const hero = screen.getByAltText('Mousse met rum — Foto 1');
  expect(hero).toHaveStyle({ objectPosition: '40% 65%', transform: 'scale(1.2)' });
  expect(hero.parentElement).toHaveStyle({ aspectRatio: '1 / 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Volledig beeld bekijken' }));
  const full = within(screen.getByRole('dialog')).getByAltText('Mousse met rum — Foto 1');
  expect(full).not.toHaveAttribute('style');
  fireEvent.click(screen.getByRole('button', { name: 'Afbeelding sluiten' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bekijk afbeelding 2' }));
  expect(screen.getByAltText('Mousse met rum — Foto 2').style.transform).toBe('');
});
