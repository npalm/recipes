/**
 * Ingredient Aggregation Service Tests
 * Tests ingredient aggregation and merging logic following existing test patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IngredientAggregator } from '@/modules/shopping/services/aggregation';
import { UnitConverter } from '@/modules/shopping/services/unitConverter';
import type { Recipe } from '@/modules/recipe/domain/types';

describe('IngredientAggregator', () => {
  let aggregator: IngredientAggregator;

  // Mock recipes for testing
  const mockRecipe1: Recipe = {
    title: 'Pasta Carbonara',
    slug: 'pasta-carbonara',
    status: 'published',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    difficulty: 'easy',
    tags: ['italian', 'pasta'],
    images: [],
    headerImageRotation: false,
    sources: [],
    createdAt: '2024-01-01',
    description: 'Classic Italian pasta',
    ingredients: [
      { raw: '400g pasta', quantity: 400, unit: 'g', name: 'pasta', scalable: true },
      { raw: '200g bacon', quantity: 200, unit: 'g', name: 'bacon', scalable: true },
      { raw: '4 eggs', quantity: 4, unit: 'piece', name: 'eggs', scalable: true },
      { raw: 'salt to taste', name: 'salt', scalable: false, notes: 'to taste' },
    ],
    instructions: ['Cook pasta', 'Fry bacon', 'Mix with eggs'],
    content: '',
  };

  const mockRecipe2: Recipe = {
    title: 'Caesar Salad',
    slug: 'caesar-salad',
    status: 'published',
    servings: 4,
    prepTime: 15,
    cookTime: 0,
    totalTime: 15,
    difficulty: 'easy',
    tags: ['salad', 'appetizer'],
    images: [],
    headerImageRotation: false,
    sources: [],
    createdAt: '2024-01-01',
    description: 'Fresh caesar salad',
    ingredients: [
      { raw: '2 eggs', quantity: 2, unit: 'piece', name: 'eggs', scalable: true },
      { raw: '100g bacon', quantity: 100, unit: 'g', name: 'bacon', scalable: true },
      { raw: '500ml olive oil', quantity: 500, unit: 'ml', name: 'olive oil', scalable: true },
      { raw: 'salt to taste', name: 'salt', scalable: false, notes: 'to taste' },
    ],
    instructions: ['Mix ingredients'],
    content: '',
  };

  beforeEach(() => {
    const unitConverter = new UnitConverter();
    aggregator = new IngredientAggregator(unitConverter);
  });

  describe('aggregate', () => {
    it('aggregates ingredients from a single recipe', () => {
      const result = aggregator.aggregate([mockRecipe1], [4]);

      expect(result).toHaveLength(4);
      expect(result.map(item => item.displayName)).toContain('pasta');
      expect(result.map(item => item.displayName)).toContain('bacon');
      expect(result.map(item => item.displayName)).toContain('eggs');
      expect(result.map(item => item.displayName)).toContain('salt');
    });

    it('merges same ingredients from multiple recipes', () => {
      const result = aggregator.aggregate([mockRecipe1, mockRecipe2], [4, 4]);

      // Should merge bacon, eggs, and salt
      const baconItem = result.find(item => item.name === 'bacon');
      const eggsItem = result.find(item => item.name === 'eggs');
      const saltItem = result.find(item => item.name === 'salt');

      expect(baconItem).toBeDefined();
      expect(baconItem?.quantity).toBe(300); // 200 + 100
      expect(baconItem?.unit).toBe('g');
      expect(baconItem?.sources).toHaveLength(2);

      expect(eggsItem).toBeDefined();
      expect(eggsItem?.quantity).toBe(6); // 4 + 2
      expect(eggsItem?.sources).toHaveLength(2);

      expect(saltItem).toBeDefined();
      expect(saltItem?.sources).toHaveLength(2);
    });

    it('sorts items alphabetically by display name', () => {
      const result = aggregator.aggregate([mockRecipe1], [4]);

      const names = result.map(item => item.displayName);
      const sortedNames = [...names].sort();

      expect(names).toEqual(sortedNames);
    });

    it('throws error when recipes and servings arrays have different lengths', () => {
      expect(() => {
        aggregator.aggregate([mockRecipe1, mockRecipe2], [4]);
      }).toThrow('Recipes and servings arrays must have the same length');
    });

    it('scales ingredients based on serving adjustments', () => {
      // Double the servings for recipe 1
      const result = aggregator.aggregate([mockRecipe1], [8]);

      const pastaItem = result.find(item => item.name === 'pasta');
      expect(pastaItem?.quantity).toBe(800); // 400 * 2
    });

    it('combines quantities with compatible units', () => {
      const recipeWithMl: Recipe = {
        ...mockRecipe1,
        ingredients: [
          { raw: '500ml milk', quantity: 500, unit: 'ml', name: 'milk', scalable: true },
        ],
      };

      const recipeWithL: Recipe = {
        ...mockRecipe2,
        ingredients: [
          { raw: '1L milk', quantity: 1, unit: 'L', name: 'milk', scalable: true },
        ],
      };

      const result = aggregator.aggregate([recipeWithMl, recipeWithL], [4, 4]);

      const milkItem = result.find(item => item.name === 'milk');
      expect(milkItem).toBeDefined();
      expect(milkItem?.quantity).toBe(1.5); // 500ml + 1L = 1.5L
      expect(milkItem?.unit).toBe('L');
    });

    it('handles ingredients without quantities', () => {
      const recipeNoQty: Recipe = {
        ...mockRecipe1,
        ingredients: [
          { raw: 'fresh herbs', name: 'fresh herbs', scalable: false },
        ],
      };

      const result = aggregator.aggregate([recipeNoQty], [4]);

      const herbsItem = result.find(item => item.name === 'fresh herbs');
      expect(herbsItem).toBeDefined();
      expect(herbsItem?.quantity).toBeUndefined();
    });

    it('preserves notes from ingredients', () => {
      const result = aggregator.aggregate([mockRecipe1], [4]);

      const saltItem = result.find(item => item.name === 'salt');
      expect(saltItem?.notes).toContain('to taste');
    });

    it('handles component-based recipes', () => {
      const componentRecipe: Recipe = {
        ...mockRecipe1,
        ingredients: [],
        components: [
          {
            name: 'Sauce',
            ingredients: [
              { raw: '200ml cream', quantity: 200, unit: 'ml', name: 'cream', scalable: true },
            ],
            instructions: ['Mix cream'],
          },
          {
            name: 'Topping',
            ingredients: [
              { raw: '100g cheese', quantity: 100, unit: 'g', name: 'cheese', scalable: true },
            ],
            instructions: ['Grate cheese'],
          },
        ],
      };

      const result = aggregator.aggregate([componentRecipe], [4]);

      expect(result).toHaveLength(2);
      expect(result.map(item => item.displayName)).toContain('cream');
      expect(result.map(item => item.displayName)).toContain('cheese');
    });

    it('handles mixed simple and component-based recipes', () => {
      const componentRecipe: Recipe = {
        ...mockRecipe1,
        ingredients: [
          { raw: '400g pasta', quantity: 400, unit: 'g', name: 'pasta', scalable: true },
        ],
        components: [
          {
            name: 'Sauce',
            ingredients: [
              { raw: '200ml cream', quantity: 200, unit: 'ml', name: 'cream', scalable: true },
            ],
            instructions: ['Mix'],
          },
        ],
      };

      const result = aggregator.aggregate([componentRecipe], [4]);

      expect(result.map(item => item.displayName)).toContain('pasta');
      expect(result.map(item => item.displayName)).toContain('cream');
    });
  });

  describe('name normalization', () => {
    it('treats ingredients with different casing as same', () => {
      const recipe1: Recipe = {
        ...mockRecipe1,
        ingredients: [
          { raw: '100g flour', quantity: 100, unit: 'g', name: 'Flour', scalable: true },
        ],
      };

      const recipe2: Recipe = {
        ...mockRecipe2,
        ingredients: [
          { raw: '200g flour', quantity: 200, unit: 'g', name: 'flour', scalable: true },
        ],
      };

      const result = aggregator.aggregate([recipe1, recipe2], [4, 4]);

      const flourItems = result.filter(item => item.name === 'flour');
      expect(flourItems).toHaveLength(1);
      expect(flourItems[0].quantity).toBe(300); // 100 + 200
      expect(flourItems[0].displayName).toBe('Flour'); // Preserves first occurrence casing
    });

    it('treats "red onion" and "onion" as different ingredients', () => {
      const recipe1: Recipe = {
        ...mockRecipe1,
        ingredients: [
          { raw: '1 red onion', quantity: 1, unit: 'piece', name: 'red onion', scalable: true },
        ],
      };

      const recipe2: Recipe = {
        ...mockRecipe2,
        ingredients: [
          { raw: '1 onion', quantity: 1, unit: 'piece', name: 'onion', scalable: true },
        ],
      };

      const result = aggregator.aggregate([recipe1, recipe2], [4, 4]);

      expect(result).toHaveLength(2);
      expect(result.map(item => item.displayName)).toContain('red onion');
      expect(result.map(item => item.displayName)).toContain('onion');
    });
  });

  describe('source tracking', () => {
    it('tracks which recipes each ingredient comes from', () => {
      const result = aggregator.aggregate([mockRecipe1, mockRecipe2], [4, 4]);

      const baconItem = result.find(item => item.name === 'bacon');
      expect(baconItem?.sources).toHaveLength(2);
      expect(baconItem?.sources[0].slug).toBe('pasta-carbonara');
      expect(baconItem?.sources[1].slug).toBe('caesar-salad');
      expect(baconItem?.sources[0].servings).toBe(4);
    });

    it('includes recipe titles in sources', () => {
      const result = aggregator.aggregate([mockRecipe1], [4]);

      const pastaItem = result.find(item => item.name === 'pasta');
      expect(pastaItem?.sources[0].title).toBe('Pasta Carbonara');
    });
  });

  describe('edge cases', () => {
    it('handles empty recipe list', () => {
      expect(() => {
        aggregator.aggregate([], []);
      }).not.toThrow();
    });

    it('handles recipes with no ingredients', () => {
      const emptyRecipe: Recipe = {
        ...mockRecipe1,
        ingredients: [],
        components: undefined,
      };

      const result = aggregator.aggregate([emptyRecipe], [4]);
      expect(result).toHaveLength(0);
    });

    it('handles ingredients with quantity ranges', () => {
      const rangeRecipe: Recipe = {
        ...mockRecipe1,
        ingredients: [
          {
            raw: '2-3 cups flour',
            quantity: 2,
            quantityMax: 3,
            unit: 'cups',
            name: 'flour',
            scalable: true,
          },
        ],
      };

      const result = aggregator.aggregate([rangeRecipe], [4]);

      const flourItem = result.find(item => item.name === 'flour');
      expect(flourItem).toBeDefined();
      expect(flourItem?.quantity).toBe(2);
      expect(flourItem?.quantityMax).toBe(3);
    });

    it('generates unique IDs for each item', () => {
      const result = aggregator.aggregate([mockRecipe1], [4]);

      const ids = result.map(item => item.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size); // All IDs are unique
    });
  });
});
