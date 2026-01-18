import { describe, it, expect } from 'vitest';
import { parseRecipe } from '@/lib/markdown/parser';

describe('Recipe Component Parser', () => {
  describe('Simple recipe parsing', () => {
    it('should parse a simple recipe without components', () => {
      const markdown = `---
title: Simple Test Recipe
slug: simple-test
status: published
servings: 4
prepTime: 10
cookTime: 20
difficulty: easy
tags: []
images: []
sources: []
createdAt: "2024-01-01"
---

A simple test recipe.

## Ingredients

- 2 cups flour {scale}
- 1 egg {scale}

## Instructions

1. Mix ingredients together.
2. Bake at 350°F for 20 minutes.
`;

      const recipe = parseRecipe(markdown, 'simple-test');

      expect(recipe.components).toBeUndefined();
      expect(recipe.ingredients).toHaveLength(2);
      expect(recipe.instructions).toHaveLength(2);
    });
  });

  describe('Component-based recipe parsing', () => {
    const componentMarkdown = `---
title: Fish Tacos
slug: fish-tacos
status: published
servings: 4
prepTime: 30
cookTime: 15
difficulty: medium
tags: ["mexican", "seafood"]
images: []
sources: []
createdAt: "2024-02-15"
---

Delicious fish tacos with multiple components.

## Components

### Beer-Battered Fish

#### Ingredients

- 1 lb white fish {scale}
- 1 cup flour {scale}
- 1 cup beer {scale}

#### Instructions

1. Mix batter ingredients.
2. Dip fish and fry until golden.

### Citrus Slaw

#### Ingredients

- 3 cups cabbage {scale}
- 2 tablespoons lime juice {scale}

#### Instructions

1. Shred cabbage.
2. Toss with lime juice.

### Assembly

#### Instructions

1. Warm tortillas.
2. Add fish and top with slaw.

## Notes

Great for summer entertaining!
`;

    it('should detect and parse a component-based recipe', () => {
      const recipe = parseRecipe(componentMarkdown, 'fish-tacos');

      expect(recipe.components).toBeDefined();
      expect(recipe.components).toHaveLength(3);
      expect(recipe.ingredients).toHaveLength(0);
      expect(recipe.instructions).toHaveLength(0);
    });

    it('should correctly parse component names', () => {
      const recipe = parseRecipe(componentMarkdown, 'fish-tacos');

      const componentNames = recipe.components!.map((c) => c.name);
      expect(componentNames).toEqual(['Beer-Battered Fish', 'Citrus Slaw', 'Assembly']);
    });

    it('should parse ingredients for each component', () => {
      const recipe = parseRecipe(componentMarkdown, 'fish-tacos');

      const fishComponent = recipe.components!.find(
        (c) => c.name === 'Beer-Battered Fish'
      )!;
      expect(fishComponent.ingredients).toHaveLength(3);
      expect(fishComponent.ingredients[0].name).toContain('fish');

      const slawComponent = recipe.components!.find(
        (c) => c.name === 'Citrus Slaw'
      )!;
      expect(slawComponent.ingredients).toHaveLength(2);

      const assemblyComponent = recipe.components!.find(
        (c) => c.name === 'Assembly'
      )!;
      expect(assemblyComponent.ingredients).toHaveLength(0);
    });

    it('should parse instructions for each component', () => {
      const recipe = parseRecipe(componentMarkdown, 'fish-tacos');

      const fishComponent = recipe.components!.find(
        (c) => c.name === 'Beer-Battered Fish'
      )!;
      expect(fishComponent.instructions).toHaveLength(2);
      expect(fishComponent.instructions[0]).toContain('Mix batter');

      const assemblyComponent = recipe.components!.find(
        (c) => c.name === 'Assembly'
      )!;
      expect(assemblyComponent.instructions).toHaveLength(2);
    });

    it('should still parse notes section for component-based recipes', () => {
      const recipe = parseRecipe(componentMarkdown, 'fish-tacos');

      expect(recipe.notes).toBe('Great for summer entertaining!');
    });

    it('should parse metadata correctly for component-based recipes', () => {
      const recipe = parseRecipe(componentMarkdown, 'fish-tacos');

      expect(recipe.title).toBe('Fish Tacos');
      expect(recipe.servings).toBe(4);
      expect(recipe.difficulty).toBe('medium');
      expect(recipe.tags).toEqual(['mexican', 'seafood']);
    });
  });

  describe('Edge cases', () => {
    it('should handle components without ingredients', () => {
      const markdown = `---
title: Test
slug: test
status: published
servings: 2
prepTime: 5
cookTime: 5
difficulty: easy
tags: []
images: []
sources: []
createdAt: "2024-01-01"
---

Test recipe.

## Components

### Assembly Only

#### Instructions

1. Just assemble everything.
`;

      const recipe = parseRecipe(markdown, 'test');
      
      expect(recipe.components).toHaveLength(1);
      expect(recipe.components![0].name).toBe('Assembly Only');
      expect(recipe.components![0].ingredients).toHaveLength(0);
      expect(recipe.components![0].instructions).toHaveLength(1);
    });

    it('should handle components without instructions', () => {
      const markdown = `---
title: Test
slug: test
status: published
servings: 2
prepTime: 5
cookTime: 0
difficulty: easy
tags: []
images: []
sources: []
createdAt: "2024-01-01"
---

Test recipe.

## Components

### Ingredients Only

#### Ingredients

- 1 cup item {scale}
`;

      const recipe = parseRecipe(markdown, 'test');
      
      expect(recipe.components).toHaveLength(1);
      expect(recipe.components![0].ingredients).toHaveLength(1);
      expect(recipe.components![0].instructions).toHaveLength(0);
    });
  });
});
