import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ShoppingList } from '@/modules/shopping/components/ShoppingList';
import type { ShoppingRecipe } from '@/modules/shopping/domain/types';
import messages from '../../messages/nl.json';
import { ShoppingListEncoder } from '@/modules/shopping/services/encoder';

const sourceRecipes: ShoppingRecipe[] = [
  { slug: 'recipe-a', title: 'A', servings: 2, ingredients: [
    { name: 'flour', raw: '100 g flour', quantity: 100, unit: 'g', scalable: true },
    { name: 'salt', raw: '2 g salt', quantity: 2, unit: 'g', scalable: false },
  ] },
  { slug: 'recipe-b', title: 'B', servings: 4, ingredients: [
    { name: 'flour', raw: '300 g flour', quantity: 300, unit: 'g', scalable: true },
  ] },
];
const props = {
  title: 'Boodschappen', sourceRecipes, locale: 'nl', listId: 'test-list', encodedListData: 'test-list',
  recipes: sourceRecipes.map(({ slug, title, servings }) => ({ slug, title, servings })),
};
function renderList(overrides: Partial<typeof props> = {}) {
  return render(<NextIntlClientProvider locale="nl" messages={messages}><ShoppingList {...props} {...overrides} /></NextIntlClientProvider>);
}
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('shopping-list serving controls', () => {
  it('scales each recipe before combining, preserving fixed quantities', () => {
    renderList();
    expect(screen.getByText('250 g')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: messages.recipe.increaseServings }));
    fireEvent.click(screen.getByRole('button', { name: messages.recipe.increaseServings }));
    expect(screen.getByText('500 g')).toBeInTheDocument();
    expect(screen.getByText('2 g')).toBeInTheDocument();
    expect(screen.getByText('4 personen')).toBeInTheDocument();
  });

  it('restores stored servings and checked items after hydration', async () => {
    renderList();
    fireEvent.click(screen.getByRole('checkbox', { name: 'flour' }));
    fireEvent.click(screen.getByRole('button', { name: messages.recipe.increaseServings }));
    cleanup();
    renderList();
    await waitFor(() => expect(screen.getByText('3 personen')).toBeInTheDocument());
    expect(screen.getByRole('checkbox', { name: 'flour' })).toHaveAttribute('aria-checked', 'true');
  });

  it('remains usable when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    renderList();
    fireEvent.click(screen.getByRole('button', { name: messages.recipe.increaseServings }));
    expect(screen.getByText('3 personen')).toBeInTheDocument();
  });

  it('starts at the serving count encoded in a shared list', () => {
    renderList({ recipes: props.recipes.map(recipe => ({ ...recipe, servings: 4 })) });
    expect(screen.getByText('4 personen')).toBeInTheDocument();
    expect(screen.getByText('500 g')).toBeInTheDocument();
  });

  it('shares the current serving count', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderList();
    fireEvent.click(screen.getByRole('button', { name: messages.recipe.increaseServings }));
    fireEvent.click(screen.getByRole('button', { name: messages.shopping.shareLink }));
    const encoded = new URL(writeText.mock.calls[0][0]).pathname.split('/').pop()!;
    expect(new ShoppingListEncoder().decode(encoded)?.recipes.map(recipe => recipe.servings)).toEqual([3, 3]);
  });
});
