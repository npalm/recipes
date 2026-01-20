import { describe, it, expect } from 'vitest';
import {
  parseRecipeMarkdown,
  parsedRecipeToRecipe,
  parseRecipe,
  RecipeParseError,
} from '@/lib/markdown/parser';

describe('Markdown Parser', () => {
  describe('parseRecipeMarkdown', () => {
    const validFrontmatter = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 15
cookTime: 30
difficulty: medium
createdAt: "2024-01-01"
---`;

    describe('simple recipe format', () => {
      it('parses a valid simple recipe', () => {
        const markdown = `${validFrontmatter}

This is a delicious recipe.

## Ingredients

- 2 cups flour
- 1 tsp salt

## Instructions

1. Mix ingredients
2. Bake for 30 minutes`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        
        expect(result.metadata.title).toBe('Test Recipe');
        expect(result.description).toBe('This is a delicious recipe.');
        expect(result.ingredientsMarkdown).toContain('2 cups flour');
        expect(result.instructionsMarkdown).toContain('Mix ingredients');
      });

      it('parses recipe with Dutch section names', () => {
        const markdown = `${validFrontmatter}

Een heerlijk recept.

## Ingrediënten

- 200g meel
- 1 theelepel zout

## Bereiding

1. Meng ingrediënten
2. Bak 30 minuten`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        
        expect(result.description).toBe('Een heerlijk recept.');
        expect(result.ingredientsMarkdown).toContain('200g meel');
        expect(result.instructionsMarkdown).toContain('Meng ingrediënten');
      });

      it('parses recipe with bilingual sections (fallback to Dutch)', () => {
        const markdown = `${validFrontmatter}

Description

## Ingrediënten

- 200g meel

## Bereiding

1. Meng ingrediënten`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toContain('200g meel');
        expect(result.instructionsMarkdown).toContain('Meng ingrediënten');
      });

      it('handles recipe with Notes section', () => {
        const markdown = `${validFrontmatter}

Description

## Ingredients

- Flour

## Instructions

1. Mix

## Notes

Store in airtight container`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.notesMarkdown).toContain('Store in airtight container');
      });

      it('handles recipe without description', () => {
        const markdown = `${validFrontmatter}

## Ingredients

- Flour

## Instructions

1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.description).toBe('');
      });

      it('extracts description before first heading', () => {
        const markdown = `${validFrontmatter}

First paragraph.

Second paragraph.

## Ingredients

- Flour`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.description).toBe('First paragraph.\n\nSecond paragraph.');
      });
    });

    describe('component-based recipe format', () => {
      it('parses component-based recipe', () => {
        const markdown = `${validFrontmatter}

A complex recipe with components.

## Components

### Sauce

#### Ingredients

- 1 cup tomatoes
- 1 clove garlic

#### Instructions

1. Sauté garlic
2. Add tomatoes

### Assembly

#### Instructions

1. Combine everything`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        
        expect(result.components).toHaveLength(2);
        expect(result.components![0].name).toBe('Sauce');
        expect(result.components![0].ingredientsMarkdown).toContain('tomatoes');
        expect(result.components![0].instructionsMarkdown).toContain('Sauté garlic');
        expect(result.components![1].name).toBe('Assembly');
      });

      it('parses component-based recipe with Dutch section names', () => {
        const markdown = `${validFrontmatter}

Een complex recept.

## Onderdelen

### Saus

#### Ingrediënten

- 1 kop tomaten

#### Bereiding

1. Fruit knoflook`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        
        expect(result.components).toHaveLength(1);
        expect(result.components![0].name).toBe('Saus');
        expect(result.components![0].ingredientsMarkdown).toContain('tomaten');
      });

      it('handles component with only instructions', () => {
        const markdown = `${validFrontmatter}

Recipe

## Components

### Assembly

#### Instructions

1. Plate the dish`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        
        expect(result.components).toHaveLength(1);
        expect(result.components![0].ingredientsMarkdown).toBe('');
        expect(result.components![0].instructionsMarkdown).toContain('Plate the dish');
      });

      it('handles component with only ingredients', () => {
        const markdown = `${validFrontmatter}

Recipe

## Components

### Garnish

#### Ingredients

- Fresh herbs`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        
        expect(result.components).toHaveLength(1);
        expect(result.components![0].ingredientsMarkdown).toContain('Fresh herbs');
        expect(result.components![0].instructionsMarkdown).toBe('');
      });
    });

    describe('frontmatter validation', () => {
      it('calculates totalTime when not provided', () => {
        const markdown = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 15
cookTime: 30
difficulty: medium
createdAt: "2024-01-01"
---

## Ingredients
- Flour`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.metadata.totalTime).toBe(45);
      });

      it('uses provided totalTime', () => {
        const markdown = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 15
cookTime: 30
totalTime: 50
difficulty: medium
createdAt: "2024-01-01"
---

## Ingredients
- Flour`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.metadata.totalTime).toBe(50);
      });

      it('throws RecipeParseError for invalid frontmatter', () => {
        const markdown = `---
title: ""
servings: -1
---

## Ingredients
- Flour`;

        expect(() => parseRecipeMarkdown(markdown, 'test')).toThrow(RecipeParseError);
      });

      it('throws RecipeParseError for missing required fields', () => {
        const markdown = `---
title: Test
---

## Ingredients
- Flour`;

        expect(() => parseRecipeMarkdown(markdown, 'test')).toThrow(RecipeParseError);
      });

      it('includes detailed error messages', () => {
        const markdown = `---
title: Test
servings: "invalid"
---

## Ingredients
- Flour`;

        try {
          parseRecipeMarkdown(markdown, 'test');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RecipeParseError);
          expect((error as RecipeParseError).slug).toBe('test');
          expect((error as RecipeParseError).message).toContain('Invalid frontmatter');
        }
      });
    });

    describe('edge cases', () => {
      it('handles empty sections', () => {
        const markdown = `${validFrontmatter}

## Ingredients

## Instructions

1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toBe('');
        expect(result.instructionsMarkdown).toContain('Mix');
      });

      it('handles sections with only whitespace', () => {
        const markdown = `${validFrontmatter}

## Ingredients

   

## Instructions

1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toBe('');
      });

      it('handles very long ingredient names', () => {
        const longIngredient = 'a'.repeat(500);
        const markdown = `${validFrontmatter}

## Ingredients

- ${longIngredient}

## Instructions

1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toContain(longIngredient);
      });

      it('handles Unicode characters', () => {
        const markdown = `${validFrontmatter}

## Ingredients

- 100g müesli
- 1 tbsp café
- ½ cup sugar
- 🌶️ chili

## Instructions

1. Mix everything 😊`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toContain('müesli');
        expect(result.ingredientsMarkdown).toContain('café');
        expect(result.ingredientsMarkdown).toContain('½');
        expect(result.ingredientsMarkdown).toContain('🌶️');
        expect(result.instructionsMarkdown).toContain('😊');
      });

      it('handles mixed list formats (should still work)', () => {
        const markdown = `${validFrontmatter}

## Ingredients

- Flour
* Salt
- Sugar

## Instructions

1. Mix
2) Bake`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toContain('Flour');
        expect(result.ingredientsMarkdown).toContain('Salt');
        expect(result.instructionsMarkdown).toContain('Mix');
      });

      it('handles malformed markdown gracefully', () => {
        const markdown = `${validFrontmatter}

## Ingredients
- Flour
### Nested heading that shouldn't be here
- Sugar

## Instructions
1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        // Should still extract what it can
        expect(result.ingredientsMarkdown).toContain('Flour');
      });

      it('handles recipe with no body content', () => {
        const markdown = validFrontmatter;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.description).toBe('');
        expect(result.ingredientsMarkdown).toBe('');
        expect(result.instructionsMarkdown).toBe('');
      });

      it('handles sections with HTML-like content (should pass through)', () => {
        const markdown = `${validFrontmatter}

## Ingredients

- <strong>Bold ingredient</strong>
- Regular ingredient

## Instructions

1. <em>Italicized instruction</em>`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toContain('<strong>Bold ingredient</strong>');
        expect(result.instructionsMarkdown).toContain('<em>Italicized instruction</em>');
      });

      it('handles multiple paragraph description', () => {
        const markdown = `${validFrontmatter}

First paragraph with some text.

Second paragraph with more information.

Third paragraph.

## Ingredients

- Flour`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.description).toContain('First paragraph');
        expect(result.description).toContain('Second paragraph');
        expect(result.description).toContain('Third paragraph');
      });

      it('handles headings with extra whitespace', () => {
        const markdown = `${validFrontmatter}

##   Ingredients   

- Flour

##    Instructions    

1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        expect(result.ingredientsMarkdown).toContain('Flour');
        expect(result.instructionsMarkdown).toContain('Mix');
      });

      it('handles case-insensitive section matching', () => {
        const markdown = `${validFrontmatter}

## INGREDIENTS

- Flour

## INSTRUCTIONS

1. Mix`;

        const result = parseRecipeMarkdown(markdown, 'test-recipe');
        // The regex should match case-insensitively
        expect(result.ingredientsMarkdown).toContain('Flour');
        expect(result.instructionsMarkdown).toContain('Mix');
      });
    });
  });

  describe('parsedRecipeToRecipe', () => {
    it('converts simple recipe format', () => {
      const parsed = {
        metadata: {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          totalTime: 45,
          difficulty: 'easy' as const,
          status: 'published' as const,
          tags: [],
          images: [],
          headerImageRotation: true,
          sources: [],
          createdAt: '2024-01-01',
        },
        description: 'Test recipe',
        ingredientsMarkdown: '- 1 cup flour',
        instructionsMarkdown: '1. Mix everything',
        rawContent: 'content',
      };

      const result = parsedRecipeToRecipe(parsed);
      
      expect(result.title).toBe('Test');
      expect(result.ingredients).toHaveLength(1);
      expect(result.instructions).toHaveLength(1);
      expect(result.components).toBeUndefined();
    });

    it('converts component-based recipe format', () => {
      const parsed = {
        metadata: {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          totalTime: 45,
          difficulty: 'medium' as const,
          status: 'published' as const,
          tags: [],
          images: [],
          headerImageRotation: true,
          sources: [],
          createdAt: '2024-01-01',
        },
        description: 'Complex recipe',
        ingredientsMarkdown: '',
        instructionsMarkdown: '',
        components: [
          {
            name: 'Main',
            ingredientsMarkdown: '- 1 cup flour',
            instructionsMarkdown: '1. Mix',
          },
        ],
        rawContent: 'content',
      };

      const result = parsedRecipeToRecipe(parsed);
      
      expect(result.ingredients).toEqual([]);
      expect(result.instructions).toEqual([]);
      expect(result.components).toHaveLength(1);
      expect(result.components![0].name).toBe('Main');
      expect(result.components![0].ingredients).toHaveLength(1);
    });

    it('handles recipe with notes', () => {
      const parsed = {
        metadata: {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          totalTime: 45,
          difficulty: 'easy' as const,
          status: 'published' as const,
          tags: [],
          images: [],
          headerImageRotation: true,
          sources: [],
          createdAt: '2024-01-01',
        },
        description: 'Test',
        ingredientsMarkdown: '- Flour',
        instructionsMarkdown: '1. Mix',
        notesMarkdown: 'Important notes here',
        rawContent: 'content',
      };

      const result = parsedRecipeToRecipe(parsed);
      expect(result.notes).toBe('Important notes here');
    });

    it('handles empty ingredient and instruction lists', () => {
      const parsed = {
        metadata: {
          title: 'Test',
          slug: 'test',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          totalTime: 45,
          difficulty: 'easy' as const,
          status: 'published' as const,
          tags: [],
          images: [],
          headerImageRotation: true,
          sources: [],
          createdAt: '2024-01-01',
        },
        description: 'Test',
        ingredientsMarkdown: '',
        instructionsMarkdown: '',
        components: [
          {
            name: 'Assembly',
            ingredientsMarkdown: '',
            instructionsMarkdown: '',
          },
        ],
        rawContent: 'content',
      };

      const result = parsedRecipeToRecipe(parsed);
      expect(result.components![0].ingredients).toEqual([]);
      expect(result.components![0].instructions).toEqual([]);
    });
  });

  describe('parseRecipe (full pipeline)', () => {
    it('parses complete recipe in one step', () => {
      const markdown = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 15
cookTime: 30
difficulty: medium
createdAt: "2024-01-01"
---

Delicious test recipe.

## Ingredients

- 2 cups flour
- 1 tsp salt

## Instructions

1. Mix ingredients
2. Bake for 30 minutes`;

      const result = parseRecipe(markdown, 'test-recipe');
      
      expect(result.title).toBe('Test Recipe');
      expect(result.description).toBe('Delicious test recipe.');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(2);
    });

    it('throws RecipeParseError on invalid recipe', () => {
      const markdown = `---
invalid: frontmatter
---

## Ingredients
- Flour`;

      expect(() => parseRecipe(markdown, 'test')).toThrow(RecipeParseError);
    });

    it('preserves raw content', () => {
      const markdown = `---
title: Test
slug: test
servings: 4
prepTime: 15
cookTime: 30
difficulty: easy
createdAt: "2024-01-01"
---

Description

## Ingredients
- Flour`;

      const result = parseRecipe(markdown, 'test');
      expect(result.content).toBe(markdown);
    });
  });

  describe('RecipeParseError', () => {
    it('has correct error properties', () => {
      const error = new RecipeParseError('Test error', 'test-slug', new Error('cause'));
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('RecipeParseError');
      expect(error.slug).toBe('test-slug');
      expect(error.cause).toBeDefined();
    });

    it('can be created without cause', () => {
      const error = new RecipeParseError('Test error', 'test-slug');
      
      expect(error.message).toBe('Test error');
      expect(error.slug).toBe('test-slug');
      expect(error.cause).toBeUndefined();
    });
  });
});
