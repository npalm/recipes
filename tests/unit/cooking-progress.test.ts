import { describe, expect, it } from 'vitest';
import { buildCookingRecipe, restoreCookingProgress } from '@/modules/recipe/services/cooking';
import type { Recipe } from '@/modules/recipe/domain';

const recipe = {
  servings: 2, ingredients: [{ raw: 'water', name: 'water', scalable: true }],
  instructions: ['Boil water.', 'Serve.'], components: [],
} as unknown as Recipe;

describe('saved cooking progress', () => {
  const cooking = buildCookingRecipe(recipe);
  const initial = restoreCookingProgress(null, cooking, 2);
  it.each([null, '{broken', 'null', '[]', '{}'])('uses a fresh session for invalid storage: %s', saved => {
    expect(restoreCookingProgress(saved, cooking, 2)).toEqual(initial);
  });
  it('invalidates saved progress after the recipe changes', () => {
    const updated = buildCookingRecipe({ ...recipe, instructions: ['New instructions.'] });
    const result = restoreCookingProgress(JSON.stringify({ ...initial, completedSteps: [cooking.steps[0].id] }), updated, 4);
    expect(result.completedSteps).toEqual([]);
    expect(result.servings).toBe(4);
  });
  it('bounds positions and servings, and discards unknown or duplicate identifiers', () => {
    const result = restoreCookingProgress(JSON.stringify({ ...initial, activeStep: 999, servings: -1,
      completedSteps: [cooking.steps[0].id, cooking.steps[0].id, 'unknown', 5],
      checkedIngredients: ['recipe-ingredient-0', 'unknown'],
    }), cooking, 2);
    expect(result.activeStep).toBe(2);
    expect(result.servings).toBe(2);
    expect(result.completedSteps).toEqual([cooking.steps[0].id]);
    expect(result.checkedIngredients).toEqual(['recipe-ingredient-0']);
  });
  it('rejects noninteger positions and invalid identifier lists', () => {
    const result = restoreCookingProgress(JSON.stringify({ ...initial, activeStep: 1.2, servings: 3,
      completedSteps: null, checkedIngredients: 'invalid',
    }), cooking, 2);
    expect(result.activeStep).toBe(0);
    expect(result.servings).toBe(3);
    expect(result.completedSteps).toEqual([]);
    expect(result.checkedIngredients).toEqual([]);
  });
});
