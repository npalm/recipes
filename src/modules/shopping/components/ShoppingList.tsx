/**
 * ShoppingList Component
 * Main component for displaying shopping list with checkbox state management
 * Uses localStorage to persist checked items and removed items
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ShoppingRecipe } from '../domain/types';
import { IngredientAggregator } from '../services/aggregation';
import { useTranslations } from 'next-intl';
import { ShoppingListItem } from './ShoppingListItem';
import { ShoppingListHeader } from './ShoppingListHeader';

type ShoppingListProps = {
  title: string;
  recipes: Array<{ slug: string; title: string; servings: number }>;
  sourceRecipes: ShoppingRecipe[];
  locale: string;
  listId: string; // Unique ID for localStorage key
};

type ShoppingListStorageState = {
  checked: Record<string, boolean>;
  removed: Record<string, boolean>;
  targetServings: number;
};

export function ShoppingList({
  title,
  recipes,
  sourceRecipes,
  locale,
  listId,
}: ShoppingListProps) {
  const t = useTranslations('shopping');
  const defaultServings = recipes.length && recipes.every(recipe => recipe.servings === recipes[0].servings)
    ? recipes[0].servings : 2;
  const [state, setState] = useState<ShoppingListStorageState>({ checked: {}, removed: {}, targetServings: defaultServings });
  const [loadedListId, setLoadedListId] = useState<string | null>(null);
  const { checked: checkedItems, removed: removedItems, targetServings } = state;

  useEffect(() => {
    let next: ShoppingListStorageState = { checked: {}, removed: {}, targetServings: defaultServings };
    try {
      const saved = localStorage.getItem(`shopping-list-${listId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const booleanMap = (value: unknown): value is Record<string, boolean> =>
          !!value && typeof value === 'object' && !Array.isArray(value) &&
          Object.values(value).every(entry => typeof entry === 'boolean');
        next = {
          checked: booleanMap(parsed.checked) ? parsed.checked : {},
          removed: booleanMap(parsed.removed) ? parsed.removed : {},
          targetServings: Number.isInteger(parsed.targetServings) && parsed.targetServings >= 1 && parsed.targetServings <= 100
            ? parsed.targetServings : defaultServings,
        };
      }
    } catch { /* Unavailable or invalid storage should not prevent shopping. */ }
    // Storage must be loaded after hydration so the server and browser render the same markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
    setLoadedListId(listId);
  }, [listId, defaultServings]);

  useEffect(() => {
    if (loadedListId !== listId) return;
    try {
      localStorage.setItem(`shopping-list-${listId}`, JSON.stringify(state));
    } catch { /* Shopping remains usable when storage is disabled or full. */ }
  }, [state, listId, loadedListId]);

  const setCheckedItems = (update: (items: Record<string, boolean>) => Record<string, boolean>) =>
    setState(previous => ({ ...previous, checked: update(previous.checked) }));
  const setRemovedItems = (update: (items: Record<string, boolean>) => Record<string, boolean>) =>
    setState(previous => ({ ...previous, removed: update(previous.removed) }));
  const setTargetServings = (value: number) =>
    setState(previous => ({ ...previous, targetServings: Math.max(1, Math.min(100, value)) }));

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const removeItem = (itemId: string) => {
    setRemovedItems((prev) => ({
      ...prev,
      [itemId]: true,
    }));
  };

  const restoreItem = (itemId: string) => {
    setRemovedItems((prev) => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  // Scale each original contribution before combining quantities and converting units.
  const scaledItems = useMemo(() => new IngredientAggregator().aggregate(
    sourceRecipes, sourceRecipes.map(() => targetServings)
  ), [sourceRecipes, targetServings]);

  // Filter out removed items
  const visibleItems = scaledItems.filter((item) => !removedItems[item.id]);
  const removedItemsList = scaledItems.filter((item) => removedItems[item.id]);

  const checkedCount = visibleItems.filter((item) => checkedItems[item.id]).length;

  return (
    <div className="shopping-list-container max-w-4xl mx-auto p-6 print:p-4">
      <ShoppingListHeader
        title={title}
        recipes={recipes}
        items={visibleItems}
        checkedCount={checkedCount}
        locale={locale}
        defaultServings={defaultServings}
        targetServings={targetServings}
        onTargetServingsChange={setTargetServings}
      />

      {/* Shopping items */}
      <div className="mt-8 print:mt-4">
        <ul className="space-y-2 print:space-y-0">
          {visibleItems.map((item) => (
            <ShoppingListItem
              key={item.id}
              item={item}
              isChecked={checkedItems[item.id] || false}
              onToggle={() => toggleItem(item.id)}
              onRemove={() => removeItem(item.id)}
              locale={locale}
            />
          ))}
        </ul>
      </div>

      {/* Removed items section */}
      {removedItemsList.length > 0 && (
        <div className="mt-8 print:hidden">
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              {t('removedItems', { count: removedItemsList.length })}
            </summary>
            <ul className="mt-4 space-y-2">
              {removedItemsList.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <span>{item.displayName}</span>
                  <button
                    onClick={() => restoreItem(item.id)}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {t('restore')}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {visibleItems.length === 0 && removedItemsList.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg">{t('empty')}</p>
          <p className="text-sm mt-2">{t('addRecipes')}</p>
        </div>
      )}

      {visibleItems.length === 0 && removedItemsList.length > 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg">{t('allRemoved')}</p>
          <p className="text-sm mt-2">{t('restoreHint')}</p>
        </div>
      )}
    </div>
  );
}
