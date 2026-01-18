'use client';

import { useState } from 'react';
import { Minus, Plus, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ingredient } from '@/modules/recipe/domain';
import {
  scaleIngredients,
  formatScaledIngredient,
} from '@/modules/ingredient/services';
import { config } from '@/lib/config';

interface IngredientListProps {
  ingredients: Ingredient[];
  defaultServings: number;
}

/**
 * Interactive ingredient list with serving adjustment
 */
export function IngredientList({
  ingredients,
  defaultServings,
}: IngredientListProps) {
  const [servings, setServings] = useState(defaultServings);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const scaledIngredients = scaleIngredients(
    ingredients,
    defaultServings,
    servings
  );

  const handleServingsChange = (newServings: number) => {
    const clamped = Math.max(
      config.minServings,
      Math.min(config.maxServings, newServings)
    );
    setServings(clamped);
  };

  const increment = () => handleServingsChange(servings + 1);
  const decrement = () => handleServingsChange(servings - 1);

  const toggleChecked = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const isModified = servings !== defaultServings;

  return (
    <div>
      {/* Servings control */}
      <div className="mb-6 rounded-xl bg-muted/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          Servings
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={decrement}
              disabled={servings <= config.minServings}
              aria-label="Decrease servings"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-2xl font-bold">{servings}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={increment}
              disabled={servings >= config.maxServings}
              aria-label="Increase servings"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {isModified && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setServings(defaultServings)}
              className="text-muted-foreground"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
        {isModified && (
          <p className="mt-2 text-xs text-muted-foreground">
            Original recipe serves {defaultServings}
          </p>
        )}
      </div>

      {/* Ingredients list */}
      <ul className="space-y-1">
        {scaledIngredients.map((ingredient, index) => {
          const isChecked = checkedItems.has(index);
          const isScaled = ingredient.scalable && isModified;

          return (
            <li
              key={index}
              className={`group flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 ${
                isChecked ? 'opacity-50' : ''
              }`}
              onClick={() => toggleChecked(index)}
              role="checkbox"
              aria-checked={isChecked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleChecked(index);
                }
              }}
            >
              <span
                className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  isChecked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 group-hover:border-primary/50'
                }`}
              >
                {isChecked && (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              <span
                className={`text-sm leading-relaxed ${
                  isChecked ? 'line-through' : ''
                } ${isScaled ? 'font-medium text-primary' : ''}`}
              >
                {formatScaledIngredient(ingredient)}
              </span>
            </li>
          );
        })}
      </ul>

      {checkedItems.size > 0 && (
        <div className="mt-4 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCheckedItems(new Set())}
            className="w-full text-muted-foreground"
          >
            Clear {checkedItems.size} checked item{checkedItems.size !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Static ingredient list (no scaling)
 */
export function StaticIngredientList({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  return (
    <ul className="space-y-2">
      {ingredients.map((ingredient, index) => (
        <li key={index} className="flex items-start gap-3 text-sm">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
          <span className="leading-relaxed">{ingredient.raw}</span>
        </li>
      ))}
    </ul>
  );
}
