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
        expect(result.description).toBe('First paragraph.');
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
      it('does not auto-calculate totalTime (done in parsedRecipeToRecipe)', () => {
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
        expect(result.metadata.totalTime).toBeUndefined();
        
        // But it should be calculated when converted to Recipe
        const recipe = parsedRecipeToRecipe(result);
        expect(recipe.totalTime).toBe(45);
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
        expect(result.description).toBe('First paragraph with some text.');
        expect(result.description).not.toContain('Second paragraph');
        expect(result.description).not.toContain('Third paragraph');
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

  describe('instruction parsing edge cases', () => {
    const validFrontmatter = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 15
cookTime: 30
difficulty: medium
createdAt: "2024-01-01"
---`;

    it('handles empty lines between instructions', () => {
      const markdown = `${validFrontmatter}

## Ingredients
- Flour

## Instructions

1. Mix ingredients

2. Let rest


3. Bake`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      expect(result.instructionsMarkdown).toContain('1. Mix ingredients');
      expect(result.instructionsMarkdown).toContain('2. Let rest');
      expect(result.instructionsMarkdown).toContain('3. Bake');
    });

    it('handles multi-line instructions (continuation lines)', () => {
      const markdown = `${validFrontmatter}

## Ingredients
- Flour

## Instructions

1. Mix the flour with water
   and knead for 10 minutes
   until smooth
2. Let rest`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.instructions[0]).toContain('Mix the flour with water');
      expect(parsed.instructions[0]).toContain('and knead for 10 minutes');
      expect(parsed.instructions[0]).toContain('until smooth');
    });

    it('handles instructions with bulleted lists', () => {
      const markdown = `${validFrontmatter}

## Ingredients
- Flour

## Instructions

- Mix ingredients
- Let rest
- Bake`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.instructions).toHaveLength(3);
      expect(parsed.instructions[0]).toBe('Mix ingredients');
      expect(parsed.instructions[1]).toBe('Let rest');
    });

    it('handles error wrapping in parseRecipe', () => {
      const markdown = `---
title: Test
slug: test
servings: -5
prepTime: 15
cookTime: 30
difficulty: medium
createdAt: "2024-01-01"
---

## Ingredients
- Flour`;

      // This should throw RecipeParseError wrapping the Zod validation error
      expect(() => parseRecipe(markdown, 'test')).toThrow(RecipeParseError);
      
      try {
        parseRecipe(markdown, 'test');
      } catch (error) {
        expect(error).toBeInstanceOf(RecipeParseError);
        // The error message contains the validation error
        expect((error as RecipeParseError).message).toContain('Invalid frontmatter');
        expect((error as RecipeParseError).slug).toBe('test');
      }
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

  describe('Component references', () => {
    const validFrontmatter = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 15
cookTime: 30
difficulty: medium
createdAt: "2024-01-01"
---`;

    it('parses component with slug metadata', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
slug: tomato-sauce

- 2 cups tomatoes
- 1 tsp salt

1. Cook tomatoes
2. Add salt`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components).toBeDefined();
      expect(parsed.components!.length).toBe(1);
      expect(parsed.components![0].name).toBe('Sauce');
      expect(parsed.components![0].slug).toBe('tomato-sauce');
      expect(parsed.components![0].reference).toBeUndefined();
    });

    it('parses component with reference', () => {
      const markdown = `${validFrontmatter}

## Components

### Beetroot Tartare
@include:veal-cheeks#beetroot-tartare`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components).toBeDefined();
      expect(parsed.components!.length).toBe(1);
      expect(parsed.components![0].name).toBe('Beetroot Tartare');
      expect(parsed.components![0].reference).toBeDefined();
      expect(parsed.components![0].reference!.type).toBe('recipe');
      expect(parsed.components![0].reference!.recipeSlug).toBe('veal-cheeks');
      expect(parsed.components![0].reference!.componentSlug).toBe('beetroot-tartare');
      expect(parsed.components![0].ingredients).toEqual([]);
      expect(parsed.components![0].instructions).toEqual([]);
    });

    it('parses component with both slug and reference', () => {
      const markdown = `${validFrontmatter}

## Components

### Special Sauce
slug: special-sauce
@include:base-recipe#sauce`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components).toBeDefined();
      expect(parsed.components!.length).toBe(1);
      expect(parsed.components![0].name).toBe('Special Sauce');
      expect(parsed.components![0].slug).toBe('special-sauce');
      expect(parsed.components![0].reference).toBeDefined();
      expect(parsed.components![0].reference!.recipeSlug).toBe('base-recipe');
    });

    it('removes slug and reference lines from component body', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
slug: my-sauce

#### Ingredients

- 2 cups tomatoes

#### Instructions

1. Cook`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      // The slug line should not appear in ingredients or instructions
      expect(parsed.components![0].ingredients.length).toBe(1);
      expect(parsed.components![0].ingredients[0].raw).toBe('2 cups tomatoes');
      expect(parsed.components![0].instructions.length).toBe(1);
      expect(parsed.components![0].instructions[0]).toBe('Cook');
    });

    it('handles component with slug but no reference', () => {
      const markdown = `${validFrontmatter}

## Components

### Main
slug: main-component

#### Ingredients

- 1 cup flour

#### Instructions

1. Mix`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].slug).toBe('main-component');
      expect(parsed.components![0].reference).toBeUndefined();
      expect(parsed.components![0].ingredients.length).toBe(1);
      expect(parsed.components![0].instructions.length).toBe(1);
    });

    it('handles component with reference but no slug', () => {
      const markdown = `${validFrontmatter}

## Components

### Referenced Component
@include:source-recipe#component-slug`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].slug).toBeUndefined();
      expect(parsed.components![0].reference).toBeDefined();
      expect(parsed.components![0].reference!.recipeSlug).toBe('source-recipe');
      expect(parsed.components![0].reference!.componentSlug).toBe('component-slug');
    });

    it('ignores slug with invalid format (not matching pattern)', () => {
      const markdown = `${validFrontmatter}

## Components

### Invalid
slug: Invalid_Slug_123

#### Ingredients

- Flour`;

      // Parser regex only matches lowercase-with-hyphens format
      // Invalid formats are ignored and slug won't be set
      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      
      expect(result.components).toBeDefined();
      expect(result.components!.length).toBe(1);
      // Slug won't be extracted because it doesn't match the pattern
      expect(result.components![0].slug).toBeUndefined();
      
      // Parse will succeed, component just won't have a slug
      const parsed = parsedRecipeToRecipe(result);
      expect(parsed.components![0].slug).toBeUndefined();
    });

    it('parses reference even with invalid format', () => {
      const markdown = `${validFrontmatter}

## Components

### Invalid
@include:invalid

#### Ingredients

- Flour`;

      // Parser attempts to extract reference but won't match the pattern
      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      
      expect(result.components).toBeDefined();
      expect(result.components!.length).toBe(1);
      // Reference won't be set because pattern requires recipe#component format
      expect(result.components![0].reference).toBeUndefined();
    });

    it('handles multiple components with mix of slugs and references', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
slug: tomato-sauce

- Tomatoes

1. Cook

### Base
@include:other#base

### Topping
slug: cheese-topping

- Cheese

1. Grate`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components!.length).toBe(3);
      expect(parsed.components![0].slug).toBe('tomato-sauce');
      expect(parsed.components![0].reference).toBeUndefined();
      expect(parsed.components![1].reference).toBeDefined();
      expect(parsed.components![1].slug).toBeUndefined();
      expect(parsed.components![2].slug).toBe('cheese-topping');
      expect(parsed.components![2].reference).toBeUndefined();
    });
  });

  describe('Component Timing', () => {
    const validFrontmatter = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 10
cookTime: 20
difficulty: medium
createdAt: "2024-01-01"
---`;

    it('should parse prepTime and cookTime from component metadata', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
prepTime: 10
cookTime: 20

#### Ingredients
- Tomatoes

#### Instructions
1. Cook`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components).toBeDefined();
      expect(parsed.components!.length).toBe(1);
      expect(parsed.components![0].prepTime).toBe(10);
      expect(parsed.components![0].cookTime).toBe(20);
    });

    it('should remove prepTime and cookTime metadata lines from component body', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
prepTime: 15
cookTime: 30

#### Ingredients
- Tomatoes

#### Instructions
1. Cook`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].ingredients[0].name).toBe('Tomatoes');
      expect(parsed.components![0].instructions[0]).toBe('Cook');
    });

    it('should handle component without timing', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce

#### Ingredients
- Tomatoes`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].prepTime).toBeUndefined();
      expect(parsed.components![0].cookTime).toBeUndefined();
    });

    it('should auto-calculate recipe totalTime from component times', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
prepTime: 10
cookTime: 20

#### Ingredients
- Tomatoes

### Main
prepTime: 15
cookTime: 30

#### Ingredients
- Pasta

### Topping
prepTime: 5
cookTime: 5

#### Ingredients
- Cheese`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.totalTime).toBe(85); // (10+20) + (15+30) + (5+5) = 30 + 45 + 10
    });

    it('should use explicit totalTime from frontmatter over calculated time', () => {
      const frontmatter = `---
title: Test Recipe
slug: test-recipe
servings: 4
prepTime: 10
cookTime: 20
totalTime: 100
difficulty: medium
createdAt: "2024-01-01"
---`;

      const markdown = `${frontmatter}

## Components

### Sauce
time: 30

#### Ingredients
- Tomatoes

### Main
time: 45

#### Ingredients
- Pasta`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.totalTime).toBe(100); // Explicit totalTime, not 75
    });

    it('should fallback to prepTime + cookTime when no component times', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce

#### Ingredients
- Tomatoes

### Main

#### Ingredients
- Pasta`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.totalTime).toBe(30); // 10 prepTime + 20 cookTime
    });

    it('should handle mixed components with and without timing', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
prepTime: 10
cookTime: 20

#### Ingredients
- Tomatoes

### Main

#### Ingredients
- Pasta

### Topping
prepTime: 5
cookTime: 10

#### Ingredients
- Cheese`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.totalTime).toBe(45); // (10+20) + (5+10) = 30 + 15 (ignores component without time)
    });

    it('should handle component with slug and timing', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
slug: tomato-sauce
prepTime: 10
cookTime: 15

#### Ingredients
- Tomatoes

#### Instructions
1. Cook`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].slug).toBe('tomato-sauce');
      expect(parsed.components![0].prepTime).toBe(10);
      expect(parsed.components![0].cookTime).toBe(15);
    });

    it('should handle component with reference (no timing in target)', () => {
      const markdown = `${validFrontmatter}

## Components

### Sauce
@include:base-recipe#sauce

### Main
prepTime: 15
cookTime: 25

#### Ingredients
- Pasta`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].reference).toBeDefined();
      expect(parsed.components![0].prepTime).toBeUndefined();
      expect(parsed.components![0].cookTime).toBeUndefined();
      expect(parsed.components![1].prepTime).toBe(15);
      expect(parsed.components![1].cookTime).toBe(25);
      expect(parsed.totalTime).toBe(40); // Only counts Main component (15+25)
    });

    it('should parse waitTime from component metadata', () => {
      const markdown = `${validFrontmatter}

## Components

### Sous Vide Meat
prepTime: 20
cookTime: 0
waitTime: 2160

#### Ingredients
- Beef

#### Instructions
1. Season and vacuum seal
2. Cook sous vide at 56°C for 36 hours`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components).toBeDefined();
      expect(parsed.components!.length).toBe(1);
      expect(parsed.components![0].prepTime).toBe(20);
      expect(parsed.components![0].cookTime).toBe(0);
      expect(parsed.components![0].waitTime).toBe(2160);
    });

    it('should remove waitTime metadata line from component body', () => {
      const markdown = `${validFrontmatter}

## Components

### Marinated Vegetables
prepTime: 15
cookTime: 0
waitTime: 180

#### Ingredients
- Vegetables

#### Instructions
1. Marinate for 3 hours`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].ingredients[0].name).toBe('Vegetables');
      expect(parsed.components![0].instructions[0]).toBe('Marinate for 3 hours');
      expect(parsed.components![0].waitTime).toBe(180);
    });

    it('should calculate totalTime using additive formula (prep + cook + wait per component)', () => {
      const markdown = `${validFrontmatter}

## Components

### Sous Vide Meat
prepTime: 20
cookTime: 0
waitTime: 2160

#### Ingredients
- Beef

### Quick Sauce
prepTime: 10
cookTime: 15

#### Ingredients
- Stock

### Marinated Vegetables
prepTime: 15
cookTime: 0
waitTime: 180

#### Ingredients
- Vegetables`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      // Component 1: 20 + 0 + 2160 = 2180
      // Component 2: 10 + 15 + 0 = 25
      // Component 3: 15 + 0 + 180 = 195
      // Total: 2180 + 25 + 195 = 2400
      expect(parsed.totalTime).toBe(2400);
    });

    it('should handle component with only waitTime (no prep/cook)', () => {
      const markdown = `${validFrontmatter}

## Components

### Chilling
waitTime: 240

#### Instructions
1. Chill in refrigerator for 4 hours`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].prepTime).toBeUndefined();
      expect(parsed.components![0].cookTime).toBeUndefined();
      expect(parsed.components![0].waitTime).toBe(240);
      expect(parsed.totalTime).toBe(240); // 0 + 0 + 240 = 240
    });

    it('should handle component where active time exceeds wait time', () => {
      const markdown = `${validFrontmatter}

## Components

### Slow Roast
prepTime: 30
cookTime: 240
waitTime: 60

#### Ingredients
- Meat`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      // 30 + 240 + 60 = 330 (all times are additive)
      expect(parsed.totalTime).toBe(330);
    });

    it('should handle component where wait time exceeds active time', () => {
      const markdown = `${validFrontmatter}

## Components

### Brined Pork
prepTime: 15
cookTime: 0
waitTime: 1440

#### Ingredients
- Pork`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      // 15 + 0 + 1440 = 1455 (all times are additive)
      expect(parsed.totalTime).toBe(1455);
    });

    it('should handle mixed components with and without waitTime', () => {
      const markdown = `${validFrontmatter}

## Components

### Marinated
prepTime: 10
waitTime: 180

#### Ingredients
- Chicken

### Quick Prep
prepTime: 5
cookTime: 10

#### Ingredients
- Vegetables

### Long Wait
waitTime: 1440

#### Instructions
1. Wait overnight`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      // Component 1: 10 + 0 + 180 = 190
      // Component 2: 5 + 10 + 0 = 15
      // Component 3: 0 + 0 + 1440 = 1440
      // Total: 190 + 15 + 1440 = 1645
      expect(parsed.totalTime).toBe(1645);
    });

    it('should handle component with slug and waitTime', () => {
      const markdown = `${validFrontmatter}

## Components

### Beetroot Tartare
slug: beetroot-tartare
prepTime: 10
cookTime: 0
waitTime: 180

#### Ingredients
- Beetroot

#### Instructions
1. Cook sous vide
2. Chill for 3 hours`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      expect(parsed.components![0].slug).toBe('beetroot-tartare');
      expect(parsed.components![0].prepTime).toBe(10);
      expect(parsed.components![0].cookTime).toBe(0);
      expect(parsed.components![0].waitTime).toBe(180);
      expect(parsed.totalTime).toBe(190); // 10 + 0 + 180 = 190
    });

    it('should handle component with all three timing fields equal', () => {
      const markdown = `${validFrontmatter}

## Components

### Equal Times
prepTime: 60
cookTime: 60
waitTime: 120

#### Ingredients
- Food`;

      const result = parseRecipeMarkdown(markdown, 'test-recipe');
      const parsed = parsedRecipeToRecipe(result);
      
      // 60 + 60 + 120 = 240
      expect(parsed.totalTime).toBe(240);
    });
  });
});
