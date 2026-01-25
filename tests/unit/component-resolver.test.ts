/**
 * Component Resolver Tests
 *
 * Tests for resolving component references across recipes
 */

import { describe, it, expect } from 'vitest';
import {
  resolveComponentReferences,
  ComponentReferenceError,
} from '@/modules/recipe/services/componentResolver';
import { Recipe, RecipeComponent } from '@/modules/recipe/domain';

// Helper to create a minimal recipe for testing
function createRecipe(slug: string, servings: number, components: RecipeComponent[]): Recipe {
  return {
    title: `Recipe ${slug}`,
    slug,
    status: 'published',
    servings,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    difficulty: 'medium',
    tags: [],
    images: [],
    headerImageRotation: true,
    sources: [],
    createdAt: '2024-01-01',
    description: 'Test recipe',
    ingredients: [],
    instructions: [],
    components,
    content: '',
  };
}

describe('Component Resolver', () => {
  describe('resolveComponentReferences', () => {
    it('returns recipe unchanged when no components have references', async () => {
      const recipe = createRecipe('test', 4, [
        {
          name: 'Sauce',
          ingredients: [{ raw: '2 cups tomatoes', name: 'tomatoes', quantity: 2, unit: 'cups', scalable: true }],
          instructions: ['Cook tomatoes'],
        },
      ]);

      const context = {
        getRecipeBySlug: async () => null,
      };
      
      const result = await resolveComponentReferences(recipe, context, { locale: 'en' });

      expect(result).toEqual(recipe);
    });

    it('resolves a simple component reference', async () => {
      const sourceRecipe = createRecipe('source', 4, [
        {
          name: 'Beetroot Tartare',
          slug: 'beetroot-tartare',
          ingredients: [
            { raw: '400g beetroot', name: 'beetroot', quantity: 400, unit: 'g', scalable: true },
            { raw: '2 tbsp oil', name: 'oil', quantity: 2, unit: 'tbsp', scalable: true },
          ],
          instructions: ['Dice beetroot', 'Mix with oil'],
        },
      ]);

      const targetRecipe = createRecipe('target', 2, [
        {
          name: 'Beetroot',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'source',
            componentSlug: 'beetroot-tartare',
            sourceServings: 0, // Will be set by resolver
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'source') return sourceRecipe;
        return null;
      };

      const result = await resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' });

      expect(result.components).toBeDefined();
      expect(result.components!.length).toBe(1);
      expect(result.components![0].ingredients.length).toBe(2);
      expect(result.components![0].instructions.length).toBe(2);
      expect(result.components![0].reference!.sourceServings).toBe(4);
    });

    it('throws error when source recipe not found', async () => {
      const recipe = createRecipe('target', 2, [
        {
          name: 'Component',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'nonexistent',
            componentSlug: 'component',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async () => null;

      await expect(
        resolveComponentReferences(recipe, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(ComponentReferenceError);

      await expect(
        resolveComponentReferences(recipe, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(/Source recipe "nonexistent" not found/);
    });

    it('throws error when component not found in source recipe', async () => {
      const sourceRecipe = createRecipe('source', 4, [
        {
          name: 'Other Component',
          slug: 'other',
          ingredients: [],
          instructions: [],
        },
      ]);

      const targetRecipe = createRecipe('target', 2, [
        {
          name: 'Component',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'source',
            componentSlug: 'nonexistent',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'source') return sourceRecipe;
        return null;
      };

      await expect(
        resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(ComponentReferenceError);

      await expect(
        resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(/Component with slug "nonexistent" not found/);
    });

    it('throws error when component missing slug', async () => {
      const sourceRecipe = createRecipe('source', 4, [
        {
          name: 'Component Without Slug',
          // No slug!
          ingredients: [],
          instructions: [],
        },
      ]);

      const targetRecipe = createRecipe('target', 2, [
        {
          name: 'Component',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'source',
            componentSlug: 'some-slug',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'source') return sourceRecipe;
        return null;
      };

      await expect(
        resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(ComponentReferenceError);
    });

    it('detects circular references (direct)', async () => {
      const recipe1 = createRecipe('recipe1', 4, [
        {
          name: 'Component A',
          slug: 'comp-a',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'recipe2',
            componentSlug: 'comp-b',
            sourceServings: 0,
          },
        },
      ]);

      const recipe2 = createRecipe('recipe2', 4, [
        {
          name: 'Component B',
          slug: 'comp-b',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'recipe1',
            componentSlug: 'comp-a',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'recipe1') return recipe1;
        if (slug === 'recipe2') return recipe2;
        return null;
      };

      await expect(
        resolveComponentReferences(recipe1, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(ComponentReferenceError);

      await expect(
        resolveComponentReferences(recipe1, { getRecipeBySlug: getRecipe }, { locale: 'en' })
      ).rejects.toThrow(/Circular component reference detected/);
    });

    it('resolves nested references (2 levels)', async () => {
      const baseRecipe = createRecipe('base', 4, [
        {
          name: 'Base Sauce',
          slug: 'base-sauce',
          ingredients: [
            { raw: '1 cup tomatoes', name: 'tomatoes', quantity: 1, unit: 'cup', scalable: true },
          ],
          instructions: ['Cook tomatoes'],
        },
      ]);

      const middleRecipe = createRecipe('middle', 4, [
        {
          name: 'Enhanced Sauce',
          slug: 'enhanced-sauce',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'base',
            componentSlug: 'base-sauce',
            sourceServings: 0,
          },
        },
      ]);

      const topRecipe = createRecipe('top', 2, [
        {
          name: 'Final Dish',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'middle',
            componentSlug: 'enhanced-sauce',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'base') return baseRecipe;
        if (slug === 'middle') return middleRecipe;
        if (slug === 'top') return topRecipe;
        return null;
      };

      const result = await resolveComponentReferences(topRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' });

      expect(result.components).toBeDefined();
      expect(result.components!.length).toBe(1);
      // Should have resolved all the way to base recipe's ingredients
      expect(result.components![0].ingredients.length).toBe(1);
      expect(result.components![0].ingredients[0].name).toBe('tomatoes');
      expect(result.components![0].instructions.length).toBe(1);
    });

    it('handles multiple components with mix of references and regular', async () => {
      const sourceRecipe = createRecipe('source', 4, [
        {
          name: 'Sauce',
          slug: 'sauce',
          ingredients: [{ raw: '1 cup tomatoes', name: 'tomatoes', quantity: 1, unit: 'cup', scalable: true }],
          instructions: ['Cook'],
        },
      ]);

      const targetRecipe = createRecipe('target', 2, [
        {
          name: 'Referenced Sauce',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'source',
            componentSlug: 'sauce',
            sourceServings: 0,
          },
        },
        {
          name: 'Regular Component',
          ingredients: [{ raw: '2 cups flour', name: 'flour', quantity: 2, unit: 'cups', scalable: true }],
          instructions: ['Mix flour'],
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'source') return sourceRecipe;
        return null;
      };

      const result = await resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' });

      expect(result.components!.length).toBe(2);
      // First component should be resolved
      expect(result.components![0].ingredients[0].name).toBe('tomatoes');
      // Second component should be unchanged
      expect(result.components![1].ingredients[0].name).toBe('flour');
    });

    it('copies prepTime and cookTime from source component when resolving reference', async () => {
      const sourceRecipe = createRecipe('source', 4, [
        {
          name: 'Sauce',
          slug: 'sauce',
          prepTime: 15,
          cookTime: 30,
          ingredients: [{ raw: '2 cups tomatoes', name: 'tomatoes', quantity: 2, unit: 'cups', scalable: true }],
          instructions: ['Cook tomatoes'],
        },
      ]);

      const targetRecipe = createRecipe('target', 2, [
        {
          name: 'Sauce Component',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'source',
            componentSlug: 'sauce',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'source') return sourceRecipe;
        return null;
      };

      const result = await resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' });

      expect(result.components![0].prepTime).toBe(15);
      expect(result.components![0].cookTime).toBe(30);
    });

    it('handles source component without prepTime/cookTime', async () => {
      const sourceRecipe = createRecipe('source', 4, [
        {
          name: 'Sauce',
          slug: 'sauce',
          // No prepTime/cookTime
          ingredients: [{ raw: '2 cups tomatoes', name: 'tomatoes', quantity: 2, unit: 'cups', scalable: true }],
          instructions: ['Cook tomatoes'],
        },
      ]);

      const targetRecipe = createRecipe('target', 2, [
        {
          name: 'Sauce Component',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'source',
            componentSlug: 'sauce',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'source') return sourceRecipe;
        return null;
      };

      const result = await resolveComponentReferences(targetRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' });

      expect(result.components![0].prepTime).toBeUndefined();
      expect(result.components![0].cookTime).toBeUndefined();
    });

    it('copies prepTime and cookTime through nested references', async () => {
      const baseRecipe = createRecipe('base', 4, [
        {
          name: 'Base Component',
          slug: 'base-comp',
          prepTime: 20,
          cookTime: 40,
          ingredients: [{ raw: '1 cup flour', name: 'flour', quantity: 1, unit: 'cup', scalable: true }],
          instructions: ['Mix flour'],
        },
      ]);

      const middleRecipe = createRecipe('middle', 4, [
        {
          name: 'Middle Component',
          slug: 'middle-comp',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'base',
            componentSlug: 'base-comp',
            sourceServings: 0,
          },
        },
      ]);

      const topRecipe = createRecipe('top', 2, [
        {
          name: 'Top Component',
          ingredients: [],
          instructions: [],
          reference: {
            type: 'recipe',
            recipeSlug: 'middle',
            componentSlug: 'middle-comp',
            sourceServings: 0,
          },
        },
      ]);

      const getRecipe = async (slug: string) => {
        if (slug === 'base') return baseRecipe;
        if (slug === 'middle') return middleRecipe;
        return null;
      };

      const result = await resolveComponentReferences(topRecipe, { getRecipeBySlug: getRecipe }, { locale: 'en' });

      // Should have the prepTime and cookTime from the base recipe
      expect(result.components![0].prepTime).toBe(20);
      expect(result.components![0].cookTime).toBe(40);
    });
  });

  describe('ComponentReferenceError', () => {
    it('creates error with correct properties', () => {
      const error = new ComponentReferenceError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ComponentReferenceError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
