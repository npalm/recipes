import { describe, it, expect } from 'vitest';
import {
  difficultySchema,
  recipeStatusSchema,
  recipeSourceSchema,
  recipeFrontmatterSchema,
  ingredientSchema,
  recipeComponentSchema,
  recipeSchema,
  recipeFiltersSchema,
  validateRecipeFrontmatter,
  validateRecipe,
  safeValidateRecipeFrontmatter,
  safeValidateRecipe,
} from '@/modules/recipe/domain/schemas';

describe('Recipe Domain Schemas', () => {
  describe('difficultySchema', () => {
    it('accepts valid difficulty values', () => {
      expect(difficultySchema.parse('easy')).toBe('easy');
      expect(difficultySchema.parse('medium')).toBe('medium');
      expect(difficultySchema.parse('hard')).toBe('hard');
    });

    it('rejects invalid difficulty values', () => {
      expect(() => difficultySchema.parse('expert')).toThrow();
      expect(() => difficultySchema.parse('beginner')).toThrow();
      expect(() => difficultySchema.parse('')).toThrow();
      expect(() => difficultySchema.parse(null)).toThrow();
    });
  });

  describe('recipeStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(recipeStatusSchema.parse('draft')).toBe('draft');
      expect(recipeStatusSchema.parse('published')).toBe('published');
    });

    it('rejects invalid status values', () => {
      expect(() => recipeStatusSchema.parse('archived')).toThrow();
      expect(() => recipeStatusSchema.parse('')).toThrow();
      expect(() => recipeStatusSchema.parse(null)).toThrow();
    });
  });

  describe('recipeSourceSchema', () => {
    it('accepts valid source with URL only', () => {
      const source = { url: 'https://example.com/recipe' };
      const result = recipeSourceSchema.parse(source);
      expect(result.url).toBe('https://example.com/recipe');
    });

    it('accepts valid source with all fields', () => {
      const source = {
        url: 'https://example.com/recipe',
        title: 'Original Recipe',
        importedAt: '2024-01-01T00:00:00Z',
      };
      const result = recipeSourceSchema.parse(source);
      expect(result).toEqual(source);
    });

    it('rejects invalid URL format', () => {
      expect(() => recipeSourceSchema.parse({ url: 'not-a-url' })).toThrow();
      expect(() => recipeSourceSchema.parse({ url: 'invalid' })).toThrow();
      expect(() => recipeSourceSchema.parse({ url: '' })).toThrow();
      expect(() => recipeSourceSchema.parse({ url: '   ' })).toThrow();
    });

    it('rejects missing URL', () => {
      expect(() => recipeSourceSchema.parse({ title: 'Recipe' })).toThrow();
    });

    it('rejects invalid datetime format', () => {
      expect(() =>
        recipeSourceSchema.parse({
          url: 'https://example.com',
          importedAt: 'not-a-datetime',
        })
      ).toThrow();
    });
  });

  describe('recipeFrontmatterSchema', () => {
    const validFrontmatter = {
      title: 'Test Recipe',
      slug: 'test-recipe',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      difficulty: 'medium' as const,
      createdAt: '2024-01-01',
    };

    describe('title validation', () => {
      it('accepts valid titles', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.title).toBe('Test Recipe');
      });

      it('rejects empty title', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, title: '' })
        ).toThrow('Title is required');
      });

      it('rejects title over 200 characters', () => {
        const longTitle = 'a'.repeat(201);
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, title: longTitle })
        ).toThrow('Title must be less than 200 characters');
      });

      it('accepts title exactly 200 characters', () => {
        const title = 'a'.repeat(200);
        const result = recipeFrontmatterSchema.parse({ ...validFrontmatter, title });
        expect(result.title).toHaveLength(200);
      });
    });

    describe('slug validation', () => {
      it('accepts valid slugs', () => {
        const validSlugs = [
          'simple-recipe',
          'recipe-123',
          'a',
          'multiple-word-recipe-name',
          'recipe-with-numbers-123',
        ];

        validSlugs.forEach((slug) => {
          const result = recipeFrontmatterSchema.parse({ ...validFrontmatter, slug });
          expect(result.slug).toBe(slug);
        });
      });

      it('rejects empty slug', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: '' })
        ).toThrow('Slug is required');
      });

      it('rejects slug with uppercase letters', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: 'Recipe-Name' })
        ).toThrow('Slug must be lowercase with hyphens only');
      });

      it('rejects slug with spaces', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: 'recipe name' })
        ).toThrow('Slug must be lowercase with hyphens only');
      });

      it('rejects slug with underscores', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: 'recipe_name' })
        ).toThrow('Slug must be lowercase with hyphens only');
      });

      it('rejects slug with special characters', () => {
        const invalidSlugs = ['recipe!', 'recipe@name', 'recipe#tag', 'recipe.name'];
        invalidSlugs.forEach((slug) => {
          expect(() =>
            recipeFrontmatterSchema.parse({ ...validFrontmatter, slug })
          ).toThrow('Slug must be lowercase with hyphens only');
        });
      });

      it('rejects slug with consecutive hyphens', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: 'recipe--name' })
        ).toThrow('Slug must be lowercase with hyphens only');
      });

      it('rejects slug starting with hyphen', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: '-recipe' })
        ).toThrow('Slug must be lowercase with hyphens only');
      });

      it('rejects slug ending with hyphen', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, slug: 'recipe-' })
        ).toThrow('Slug must be lowercase with hyphens only');
      });
    });

    describe('status validation', () => {
      it('defaults to published when not provided', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.status).toBe('published');
      });

      it('accepts explicit status', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          status: 'draft',
        });
        expect(result.status).toBe('draft');
      });
    });

    describe('servings validation', () => {
      it('accepts valid servings', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.servings).toBe(4);
      });

      it('accepts servings of 1', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          servings: 1,
        });
        expect(result.servings).toBe(1);
      });

      it('accepts servings of 100 (max)', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          servings: 100,
        });
        expect(result.servings).toBe(100);
      });

      it('rejects zero servings', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, servings: 0 })
        ).toThrow('Servings must be a positive integer');
      });

      it('rejects negative servings', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, servings: -1 })
        ).toThrow('Servings must be a positive integer');
      });

      it('rejects servings over 100', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, servings: 101 })
        ).toThrow('Servings cannot exceed 100');
      });

      it('rejects decimal servings', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, servings: 4.5 })
        ).toThrow();
      });
    });

    describe('prepTime validation', () => {
      it('accepts valid prep time', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.prepTime).toBe(15);
      });

      it('accepts prep time of 0', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          prepTime: 0,
        });
        expect(result.prepTime).toBe(0);
      });

      it('accepts prep time of 2880 (48 hours max)', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          prepTime: 2880,
        });
        expect(result.prepTime).toBe(2880);
      });

      it('rejects negative prep time', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, prepTime: -1 })
        ).toThrow('Prep time cannot be negative');
      });

      it('rejects prep time over 48 hours', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, prepTime: 2881 })
        ).toThrow('Prep time cannot exceed 48 hours');
      });

      it('rejects decimal prep time', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, prepTime: 15.5 })
        ).toThrow();
      });
    });

    describe('cookTime validation', () => {
      it('accepts valid cook time', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.cookTime).toBe(30);
      });

      it('accepts cook time of 0', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          cookTime: 0,
        });
        expect(result.cookTime).toBe(0);
      });

      it('accepts cook time of 4320 (72 hours max)', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          cookTime: 4320,
        });
        expect(result.cookTime).toBe(4320);
      });

      it('rejects negative cook time', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, cookTime: -1 })
        ).toThrow('Cook time cannot be negative');
      });

      it('rejects cook time over 72 hours', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, cookTime: 4321 })
        ).toThrow('Cook time cannot exceed 72 hours');
      });

      it('rejects decimal cook time', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, cookTime: 30.5 })
        ).toThrow();
      });
    });

    describe('totalTime validation', () => {
      it('is optional', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.totalTime).toBeUndefined();
      });

      it('accepts valid total time', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          totalTime: 45,
        });
        expect(result.totalTime).toBe(45);
      });

      it('rejects negative total time', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, totalTime: -1 })
        ).toThrow('Total time cannot be negative');
      });
    });

    describe('tags validation', () => {
      it('defaults to empty array when not provided', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.tags).toEqual([]);
      });

      it('accepts valid tags', () => {
        const tags = ['dinner', 'italian', 'pasta'];
        const result = recipeFrontmatterSchema.parse({ ...validFrontmatter, tags });
        expect(result.tags).toEqual(tags);
      });

      it('rejects empty tag strings', () => {
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, tags: ['valid', ''] })
        ).toThrow();
      });

      it('rejects tags over 50 characters', () => {
        const longTag = 'a'.repeat(51);
        expect(() =>
          recipeFrontmatterSchema.parse({ ...validFrontmatter, tags: [longTag] })
        ).toThrow();
      });

      it('accepts tag exactly 50 characters', () => {
        const tag = 'a'.repeat(50);
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          tags: [tag],
        });
        expect(result.tags[0]).toHaveLength(50);
      });
    });

    describe('images validation', () => {
      it('defaults to empty array when not provided', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.images).toEqual([]);
      });

      it('accepts valid image filenames', () => {
        const images = ['photo1.jpg', 'photo2.png'];
        const result = recipeFrontmatterSchema.parse({ ...validFrontmatter, images });
        expect(result.images).toEqual(images);
      });

      it('accepts empty images array', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          images: [],
        });
        expect(result.images).toEqual([]);
      });
    });

    describe('headerImageRotation validation', () => {
      it('defaults to true when not provided', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.headerImageRotation).toBe(true);
      });

      it('accepts explicit false value', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          headerImageRotation: false,
        });
        expect(result.headerImageRotation).toBe(false);
      });
    });

    describe('sources validation', () => {
      it('defaults to empty array when not provided', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.sources).toEqual([]);
      });

      it('accepts valid sources', () => {
        const sources = [{ url: 'https://example.com' }];
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          sources,
        });
        expect(result.sources).toEqual(sources);
      });
    });

    describe('createdAt validation', () => {
      it('requires createdAt field', () => {
        const { createdAt, ...frontmatterWithoutCreatedAt } = validFrontmatter;
        expect(() => recipeFrontmatterSchema.parse(frontmatterWithoutCreatedAt)).toThrow();
      });

      it('accepts valid date string', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.createdAt).toBe('2024-01-01');
      });
    });

    describe('updatedAt validation', () => {
      it('is optional', () => {
        const result = recipeFrontmatterSchema.parse(validFrontmatter);
        expect(result.updatedAt).toBeUndefined();
      });

      it('accepts valid date string', () => {
        const result = recipeFrontmatterSchema.parse({
          ...validFrontmatter,
          updatedAt: '2024-01-15',
        });
        expect(result.updatedAt).toBe('2024-01-15');
      });
    });
  });

  describe('ingredientSchema', () => {
    it('accepts valid ingredient with all fields', () => {
      const ingredient = {
        raw: '2 cups flour',
        quantity: 2,
        unit: 'cups',
        name: 'flour',
        notes: 'all-purpose',
        scalable: true,
      };
      const result = ingredientSchema.parse(ingredient);
      expect(result).toEqual(ingredient);
    });

    it('accepts ingredient with minimal fields', () => {
      const ingredient = {
        raw: 'salt to taste',
        name: 'salt to taste',
      };
      const result = ingredientSchema.parse(ingredient);
      expect(result.raw).toBe('salt to taste');
      expect(result.name).toBe('salt to taste');
      expect(result.scalable).toBe(true); // default
    });

    it('rejects ingredient with empty raw text', () => {
      expect(() =>
        ingredientSchema.parse({ raw: '', name: 'test' })
      ).toThrow('Ingredient text is required');
    });

    it('rejects ingredient with empty name', () => {
      expect(() =>
        ingredientSchema.parse({ raw: 'test', name: '' })
      ).toThrow('Ingredient name is required');
    });

    it('rejects negative quantity', () => {
      expect(() =>
        ingredientSchema.parse({ raw: 'test', name: 'test', quantity: -1 })
      ).toThrow();
    });

    it('rejects zero quantity', () => {
      expect(() =>
        ingredientSchema.parse({ raw: 'test', name: 'test', quantity: 0 })
      ).toThrow();
    });
  });

  describe('recipeComponentSchema', () => {
    it('accepts valid component with all fields', () => {
      const component = {
        name: 'Sauce',
        ingredients: [{ raw: '1 cup tomatoes', name: 'tomatoes', scalable: true }],
        instructions: ['Cook tomatoes'],
      };
      const result = recipeComponentSchema.parse(component);
      expect(result).toEqual(component);
    });

    it('accepts component with minimal fields', () => {
      const component = { name: 'Assembly' };
      const result = recipeComponentSchema.parse(component);
      expect(result.name).toBe('Assembly');
      expect(result.ingredients).toEqual([]);
      expect(result.instructions).toEqual([]);
    });

    it('rejects component with empty name', () => {
      expect(() =>
        recipeComponentSchema.parse({ name: '' })
      ).toThrow('Component name is required');
    });

    it('rejects component with empty instruction strings', () => {
      expect(() =>
        recipeComponentSchema.parse({
          name: 'Test',
          instructions: ['Step 1', ''],
        })
      ).toThrow();
    });
  });

  describe('recipeSchema', () => {
    const validRecipe = {
      title: 'Test Recipe',
      slug: 'test-recipe',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      difficulty: 'medium' as const,
      createdAt: '2024-01-01',
      content: 'Recipe content',
      ingredients: [{ raw: '1 cup flour', name: 'flour', scalable: true }],
      instructions: ['Mix ingredients'],
    };

    it('accepts valid simple recipe', () => {
      const result = recipeSchema.parse(validRecipe);
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(1);
      expect(result.instructions).toHaveLength(1);
    });

    it('accepts valid component-based recipe', () => {
      const recipe = {
        ...validRecipe,
        ingredients: [],
        instructions: [],
        components: [
          {
            name: 'Main',
            ingredients: [{ raw: '1 cup flour', name: 'flour', scalable: true }],
            instructions: ['Mix'],
          },
        ],
      };
      const result = recipeSchema.parse(recipe);
      expect(result.components).toHaveLength(1);
    });

    it('rejects recipe with no ingredients, instructions, or components', () => {
      const recipe = {
        ...validRecipe,
        ingredients: [],
        instructions: [],
      };
      expect(() => recipeSchema.parse(recipe)).toThrow(
        'Recipe must have either ingredients/instructions or components'
      );
    });

    it('rejects recipe with empty components array', () => {
      const recipe = {
        ...validRecipe,
        ingredients: [],
        instructions: [],
        components: [],
      };
      expect(() => recipeSchema.parse(recipe)).toThrow(
        'Recipe must have either ingredients/instructions or components'
      );
    });

    it('defaults description to empty string', () => {
      const result = recipeSchema.parse(validRecipe);
      expect(result.description).toBe('');
    });

    it('accepts explicit description', () => {
      const recipe = { ...validRecipe, description: 'A delicious recipe' };
      const result = recipeSchema.parse(recipe);
      expect(result.description).toBe('A delicious recipe');
    });
  });

  describe('recipeFiltersSchema', () => {
    it('accepts empty filters', () => {
      const result = recipeFiltersSchema.parse({});
      expect(result).toEqual({});
    });

    it('accepts valid filters with all fields', () => {
      const filters = {
        tags: ['dinner', 'italian'],
        difficulty: ['easy', 'medium'] as const,
        maxTotalTime: 60,
        status: ['published'] as const,
        searchQuery: 'pasta',
      };
      const result = recipeFiltersSchema.parse(filters);
      expect(result).toEqual(filters);
    });

    it('rejects negative maxTotalTime', () => {
      expect(() =>
        recipeFiltersSchema.parse({ maxTotalTime: -1 })
      ).toThrow();
    });

    it('rejects zero maxTotalTime', () => {
      expect(() =>
        recipeFiltersSchema.parse({ maxTotalTime: 0 })
      ).toThrow();
    });
  });

  describe('validation helper functions', () => {
    describe('validateRecipeFrontmatter', () => {
      it('returns parsed data for valid frontmatter', () => {
        const frontmatter = {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          difficulty: 'easy',
          createdAt: '2024-01-01',
        };
        const result = validateRecipeFrontmatter(frontmatter);
        expect(result.title).toBe('Test');
      });

      it('throws error for invalid frontmatter', () => {
        expect(() => validateRecipeFrontmatter({ title: '' })).toThrow();
      });
    });

    describe('validateRecipe', () => {
      it('returns parsed data for valid recipe', () => {
        const recipe = {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          difficulty: 'easy',
          createdAt: '2024-01-01',
          content: 'content',
          ingredients: [{ raw: 'flour', name: 'flour' }],
          instructions: ['Mix'],
        };
        const result = validateRecipe(recipe);
        expect(result.title).toBe('Test');
      });

      it('throws error for invalid recipe', () => {
        expect(() => validateRecipe({ title: '' })).toThrow();
      });
    });

    describe('safeValidateRecipeFrontmatter', () => {
      it('returns success result for valid frontmatter', () => {
        const frontmatter = {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          difficulty: 'easy',
          createdAt: '2024-01-01',
        };
        const result = safeValidateRecipeFrontmatter(frontmatter);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.title).toBe('Test');
        }
      });

      it('returns error result for invalid frontmatter', () => {
        const result = safeValidateRecipeFrontmatter({ title: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });

    describe('safeValidateRecipe', () => {
      it('returns success result for valid recipe', () => {
        const recipe = {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          difficulty: 'easy',
          createdAt: '2024-01-01',
          content: 'content',
          ingredients: [{ raw: 'flour', name: 'flour' }],
          instructions: ['Mix'],
        };
        const result = safeValidateRecipe(recipe);
        expect(result.success).toBe(true);
      });

      it('returns error result for invalid recipe', () => {
        const result = safeValidateRecipe({ title: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });
  });
});
