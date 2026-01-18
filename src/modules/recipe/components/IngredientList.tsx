'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  return (
    <div>
      {/* Servings control */}
      <div className="mb-4 flex items-center gap-3">
        <Label htmlFor="servings" className="text-sm font-medium">
          Servings:
        </Label>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={decrement}
            disabled={servings <= config.minServings}
            aria-label="Decrease servings"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            id="servings"
            type="number"
            value={servings}
            onChange={(e) => handleServingsChange(parseInt(e.target.value) || 1)}
            className="h-8 w-16 text-center"
            min={config.minServings}
            max={config.maxServings}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={increment}
            disabled={servings >= config.maxServings}
            aria-label="Increase servings"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {servings !== defaultServings && (
          <button
            onClick={() => setServings(defaultServings)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>

      {/* Ingredients list */}
      <ul className="space-y-2">
        {scaledIngredients.map((ingredient, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm"
          >
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
            <span
              className={
                ingredient.scalable && servings !== defaultServings
                  ? 'font-medium'
                  : ''
              }
            >
              {formatScaledIngredient(ingredient)}
            </span>
          </li>
        ))}
      </ul>
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
        <li key={index} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
          <span>{ingredient.raw}</span>
        </li>
      ))}
    </ul>
  );
}
