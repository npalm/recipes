import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CookingMode } from '@/modules/recipe/components/CookingMode';
import type { Recipe } from '@/modules/recipe/domain';
import en from '../../messages/en.json';
import nl from '../../messages/nl.json';

const recipe: Recipe = {
  slug: 'test-cooking', title: 'Test cooking', status: 'published', servings: 2,
  prepTime: 10, cookTime: 20, difficulty: 'easy', tags: [], images: [], headerImageRotation: false,
  sources: [], createdAt: '2026-01-01', description: '', content: '',
  ingredients: [{ raw: '100 g flour', name: 'flour', quantity: 100, unit: 'g', scalable: true }],
  instructions: ['Mix {{100g}} flour.', 'Bake until golden.'],
};
const close = vi.fn();
function openCooking(data: Recipe = recipe, locale = 'en') {
  return render(<NextIntlClientProvider locale={locale} messages={locale === 'nl' ? nl : en}>
    <CookingMode recipe={data} locale={locale} servings={data.servings} onClose={close} />
  </NextIntlClientProvider>);
}

beforeEach(() => {
  // jsdom does not implement the dialog's browser top layer.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => {
  cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); close.mockClear();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
  for (const property of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen']) Reflect.deleteProperty(document, property);
});

describe('cooking mode', () => {
  it('walks through instructions, completes the recipe, and supports reviewing a completed step', () => {
    openCooking();
    expect(screen.getByRole('dialog', { name: recipe.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Step 1 of 2' })).toHaveFocus();
    expect(screen.getByRole('button', { name: en.cooking.previous })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.completeNext }));
    expect(screen.getByRole('heading', { name: 'Step 2 of 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.completeNext }));
    expect(screen.getByRole('heading', { name: en.recipe.allDone })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.previous }));
    fireEvent.click(screen.getByRole('button', { name: en.cooking.markIncomplete }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  });

  it('restores step, servings, and ingredient checkboxes when reopened', () => {
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.recipe.increaseServings }));
    fireEvent.click(screen.getByRole('checkbox', { name: '150 g flour' }));
    fireEvent.click(screen.getByRole('button', { name: en.cooking.completeNext }));
    cleanup();
    openCooking();
    expect(screen.getByRole('heading', { name: 'Step 2 of 2' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '150 g flour' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.exit }));
    expect(close).toHaveBeenCalledWith(3);
  });

  it('scales instructions and ingredients using referenced component servings', () => {
    openCooking({ ...recipe, ingredients: [], instructions: [], components: [{
      name: 'Sauce', ingredients: recipe.ingredients, instructions: recipe.instructions,
      reference: { type: 'recipe', recipeSlug: 'sauce', componentSlug: 'sauce', sourceServings: 4 },
    }] });
    expect(screen.getByRole('checkbox', { name: '50 g flour' })).toBeInTheDocument();
    expect(screen.getAllByText(/Mix 50\s*g flour\./)).toHaveLength(2);
    const context = screen.getByRole('region', { name: en.cooking.sectionIngredients });
    expect(within(context).getByText('50 g flour')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.recipe.increaseServings }));
    expect(within(context).getByText('75 g flour')).toBeInTheDocument();
  });

  it('keeps non-metric recipe quantities visible without inventing a gram conversion', () => {
    openCooking({ ...recipe, ingredients: [], instructions: [], components: [{
      name: 'Notencrunch', ingredients: [{ raw: "1 handje pinda's en/of cashewnoten", name: "pinda's en/of cashewnoten", quantity: 1, unit: 'handje', scalable: true }],
      instructions: ["Hak de pinda's en cashewnoten grof."],
    }] }, 'nl');
    const context = screen.getByRole('region', { name: nl.cooking.sectionIngredients });
    expect(within(context).getByText("1 handje pinda's en/of cashewnoten")).toBeInTheDocument();
  });

  it('skips without completing and resets progress without changing servings', () => {
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.skip }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    fireEvent.click(screen.getByRole('button', { name: en.cooking.completeNext }));
    expect(screen.getByRole('heading', { name: 'Step 1 of 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.restart }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
  });

  it('handles blocked storage and browser dismissal without losing the exit action', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    openCooking();
    expect(screen.getByText(en.cooking.storageUnavailable)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.completeNext }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(close).toHaveBeenCalledWith(2);
    cleanup();
    expect(document.body.style.overflow).toBe('');
  });

  it('provides Dutch controls and toggles the mobile ingredient panel', () => {
    openCooking(recipe, 'nl');
    const toggle = screen.getByRole('button', { name: nl.recipe.ingredients });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: nl.cooking.completeNext })).toBeInTheDocument();
  });

  it('keeps an overview in presenter view and supports keyboard navigation without completing skipped steps', () => {
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.presenterView }));
    expect(screen.getByRole('button', { name: en.cooking.presenterView })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('navigation', { name: en.cooking.overview })).toHaveLength(2);
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Step 1 of 2' }), { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Step 2 of 2' })).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Step 2 of 2' }), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Step 1 of 2' }), { key: ' ' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  });

  it('makes Space available immediately after enabling presenter view', () => {
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.presenterView }));
    expect(screen.getByRole('heading', { name: 'Step 1 of 2' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: ' ' });
    expect(screen.getByRole('heading', { name: 'Step 2 of 2' })).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  });

  it('completes only one step per Space press and prevents scrolling on repeated keydown', () => {
    openCooking({ ...recipe, instructions: ['Mix.', 'Bake.', 'Serve.'] });
    fireEvent.click(screen.getByRole('button', { name: en.cooking.presenterView }));
    fireEvent.keyDown(document.activeElement!, { key: ' ' });
    for (let repeat = 0; repeat < 5; repeat++) {
      expect(fireEvent.keyDown(document.activeElement!, { key: ' ', repeat: true })).toBe(false);
      expect(screen.getByRole('heading', { name: 'Step 2 of 3' })).toHaveFocus();
      expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    }
    fireEvent.keyUp(document.activeElement!, { key: ' ' });
    fireEvent.keyDown(document.activeElement!, { key: ' ' });
    expect(screen.getByRole('heading', { name: 'Step 3 of 3' })).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2');
  });

  it.each(['en', 'nl'])('announces mobile step completion in %s and updates labels after undo and restart', locale => {
    const messages = locale === 'nl' ? nl : en;
    const label = (number: number) => messages.cooking.goToStep.replace('{number}', String(number));
    const completedLabel = `${label(1)} — ${messages.cooking.completed}`;
    openCooking(recipe, locale);
    fireEvent.click(screen.getByRole('button', { name: messages.cooking.presenterView }));
    expect(screen.getByRole('button', { name: label(1) })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: messages.cooking.completeNext }));
    expect(screen.getByRole('button', { name: completedLabel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: label(2) })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: completedLabel }));
    fireEvent.click(screen.getByRole('button', { name: messages.cooking.markIncomplete }));
    expect(screen.getByRole('button', { name: label(1) })).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: completedLabel })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: messages.cooking.completeNext }));
    fireEvent.click(screen.getByRole('button', { name: messages.cooking.restart }));
    expect(screen.getByRole('button', { name: label(1) })).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByRole('button', { name: completedLabel })).not.toBeInTheDocument();
  });

  it('enters fullscreen on the presentation surface and releases it on exit', async () => {
    const state: { active: Element | null } = { active: null };
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => state.active });
    const request = vi.fn(function (this: HTMLElement) {
      state.active = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve();
    });
    const exit = vi.fn(() => { state.active = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: request });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.enterFullscreen }));
    await waitFor(() => expect(screen.getByRole('button', { name: en.cooking.exitFullscreen })).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(1);
    expect(document.fullscreenElement?.tagName).toBe('DIV');
    expect(screen.getByRole('button', { name: en.cooking.presenterView })).toHaveAttribute('aria-pressed', 'true');
    cleanup();
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('keeps presenter view usable when fullscreen is denied', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: vi.fn().mockRejectedValue(new Error('denied')) });
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.enterFullscreen }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(en.cooking.fullscreenError));
    expect(screen.getByRole('button', { name: en.cooking.presenterView })).toHaveAttribute('aria-pressed', 'true');
  });

  it('acquires and releases the screen wake lock when cooking mode closes', async () => {
    const lock = Object.assign(new EventTarget(), { released: false, release: vi.fn().mockResolvedValue(undefined) });
    const request = vi.fn().mockResolvedValue(lock);
    vi.stubGlobal('navigator', { wakeLock: { request } });
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.keepAwake }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(en.cooking.wake.active));
    expect(request).toHaveBeenCalledWith('screen');
    cleanup();
    expect(lock.release).toHaveBeenCalledTimes(1);
  });

  it('releases a wake lock that arrives after cooking mode has closed', async () => {
    let resolve!: (value: WakeLockSentinel) => void;
    const lock = Object.assign(new EventTarget(), { released: false, release: vi.fn().mockResolvedValue(undefined) });
    const request = vi.fn(() => new Promise<WakeLockSentinel>(done => { resolve = done; }));
    vi.stubGlobal('navigator', { wakeLock: { request } });
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.keepAwake }));
    cleanup();
    await act(async () => resolve(lock as unknown as WakeLockSentinel));
    expect(lock.release).toHaveBeenCalledTimes(1);
  });

  it('shows a recoverable message when the wake lock is denied', async () => {
    vi.stubGlobal('navigator', { wakeLock: { request: vi.fn().mockRejectedValue(new Error('denied')) } });
    openCooking();
    fireEvent.click(screen.getByRole('button', { name: en.cooking.keepAwake }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(en.cooking.wake.error));
    fireEvent.click(screen.getByRole('button', { name: en.cooking.keepAwake }));
    expect(screen.getByRole('button', { name: en.cooking.keepAwake })).toHaveAttribute('aria-pressed', 'false');
  });
});
