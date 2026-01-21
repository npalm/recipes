/**
 * ShoppingList Component
 * Main component for displaying shopping list with checkbox state management
 * Uses localStorage to persist checked items and removed items
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ShoppingItem } from '../domain/types';
import { ShoppingListItem } from './ShoppingListItem';
import { ShoppingListHeader } from './ShoppingListHeader';
import { formatQuantity } from '@/modules/ingredient/services/scaling';

type ShoppingListProps = {
  title: string;
  recipes: Array<{ slug: string; title: string; servings: number }>;
  items: ShoppingItem[];
  locale: string;
  listId: string; // Unique ID for localStorage key
  encodedListData: string; // For generating share link
};

type ShoppingListStorageState = {
  checked: Record<string, boolean>;
  removed: Record<string, boolean>;
  targetServings: number;
};

export function ShoppingList({
  title,
  recipes,
  items,
  locale,
  listId,
  encodedListData,
}: ShoppingListProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [removedItems, setRemovedItems] = useState<Record<string, boolean>>({});
  const [targetServings, setTargetServings] = useState<number>(2);
  const [mounted, setMounted] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storageKey = `shopping-list-${listId}`;
    console.log('[ShoppingList] Loading from localStorage with key:', storageKey);
    const saved = localStorage.getItem(storageKey);
    console.log('[ShoppingList] Saved data:', saved);

    if (saved) {
      try {
        const parsed: ShoppingListStorageState = JSON.parse(saved);
        console.log('[ShoppingList] Parsed data:', parsed);
        setCheckedItems(parsed.checked || {});
        setRemovedItems(parsed.removed || {});
        setTargetServings(parsed.targetServings || 2);
        console.log('[ShoppingList] State loaded successfully');
      } catch (error) {
        console.error('Failed to load shopping list state:', error);
      }
    } else {
      console.log('[ShoppingList] No saved state found');
    }
    
    setHasLoadedFromStorage(true);
    setMounted(true);
  }, [listId]);

  // Save state to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (!hasLoadedFromStorage || !mounted || typeof window === 'undefined') return;

    const storageKey = `shopping-list-${listId}`;
    const state: ShoppingListStorageState = {
      checked: checkedItems,
      removed: removedItems,
      targetServings,
    };
    console.log('[ShoppingList] Saving to localStorage:', storageKey, state);
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [checkedItems, removedItems, targetServings, listId, mounted, hasLoadedFromStorage]);

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

  // Scale items based on target servings
  // Calculate multiplier for each recipe based on target servings vs original servings
  const scaledItems = useMemo(() => {
    return items.map((item) => {
      // Calculate weighted average multiplier based on all source recipes
      let totalMultiplier = 0;
      item.sources.forEach((source) => {
        const recipeMultiplier = targetServings / source.servings;
        totalMultiplier += recipeMultiplier;
      });
      const avgMultiplier = totalMultiplier / item.sources.length;

      if (avgMultiplier === 1 || !item.quantity) return item;

      return {
        ...item,
        quantity: item.quantity * avgMultiplier,
        quantityMax: item.quantityMax ? item.quantityMax * avgMultiplier : undefined,
      };
    });
  }, [items, targetServings]);

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
        encodedListData={encodedListData}
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
              Removed items ({removedItemsList.length})
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
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {visibleItems.length === 0 && removedItemsList.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg">No items in shopping list</p>
          <p className="text-sm mt-2">Add recipes to generate a shopping list</p>
        </div>
      )}

      {visibleItems.length === 0 && removedItemsList.length > 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg">All items removed</p>
          <p className="text-sm mt-2">Restore items from the removed section below</p>
        </div>
      )}
    </div>
  );
}
