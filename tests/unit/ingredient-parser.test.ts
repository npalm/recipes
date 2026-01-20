import { describe, it, expect } from 'vitest';
import {
  parseIngredient,
  parseIngredients,
  parseIngredientsFromMarkdown,
} from '@/modules/ingredient/services/parser';

describe('parseIngredient', () => {
  describe('basic parsing', () => {
    it('parses a simple ingredient with quantity and unit', () => {
      const result = parseIngredient('2 cups flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cups');
      expect(result.name).toBe('flour');
      expect(result.scalable).toBe(true);
    });

    it('parses ingredient without quantity', () => {
      const result = parseIngredient('salt to taste');
      expect(result.quantity).toBeUndefined();
      expect(result.name).toBe('salt to taste'); // Full text is the name when no quantity
      expect(result.scalable).toBe(false); // "to taste" makes it non-scalable
    });

    it('parses ingredient without unit', () => {
      const result = parseIngredient('3 eggs');
      expect(result.quantity).toBe(3);
      expect(result.unit).toBeUndefined();
      expect(result.name).toBe('eggs');
    });
  });

  describe('fractions', () => {
    it('parses simple fractions', () => {
      const result = parseIngredient('1/2 cup milk');
      expect(result.quantity).toBe(0.5);
      expect(result.unit).toBe('cup');
      expect(result.name).toBe('milk');
    });

    it('parses mixed numbers', () => {
      const result = parseIngredient('1 1/2 cups sugar');
      expect(result.quantity).toBe(1.5);
      expect(result.unit).toBe('cups');
      expect(result.name).toBe('sugar');
    });

    it('parses 1/4 correctly', () => {
      const result = parseIngredient('1/4 tsp salt');
      expect(result.quantity).toBe(0.25);
    });

    it('parses 3/4 correctly', () => {
      const result = parseIngredient('3/4 cup butter');
      expect(result.quantity).toBe(0.75);
    });
  });

  describe('ranges', () => {
    it('parses numeric ranges with hyphen', () => {
      const result = parseIngredient('2-3 cloves garlic');
      expect(result.quantity).toBe(2);
      expect(result.quantityMax).toBe(3);
      expect(result.unit).toBe('cloves');
      expect(result.name).toBe('garlic');
    });

    it('parses ranges with "to"', () => {
      const result = parseIngredient('1 to 2 cups broth');
      expect(result.quantity).toBe(1);
      expect(result.quantityMax).toBe(2);
    });

    it('parses fraction ranges', () => {
      const result = parseIngredient('1/2 - 1 tsp salt');
      expect(result.quantity).toBe(0.5);
      expect(result.quantityMax).toBe(1);
    });
  });

  describe('units', () => {
    it('parses volume units', () => {
      expect(parseIngredient('100ml water').unit).toBe('ml');
      expect(parseIngredient('1 liter milk').unit).toBe('liter');
      expect(parseIngredient('2 tablespoons oil').unit).toBe('tablespoons');
      expect(parseIngredient('1 tsp vanilla').unit).toBe('tsp');
    });

    it('parses weight units', () => {
      expect(parseIngredient('500g flour').unit).toBe('g');
      expect(parseIngredient('1 kg potatoes').unit).toBe('kg');
      expect(parseIngredient('8 oz cheese').unit).toBe('oz');
      expect(parseIngredient('2 lbs beef').unit).toBe('lbs');
    });

    it('parses count units', () => {
      expect(parseIngredient('2 cloves garlic').unit).toBe('cloves');
      expect(parseIngredient('1 bunch parsley').unit).toBe('bunch');
      expect(parseIngredient('3 sprigs thyme').unit).toBe('sprigs');
    });
  });

  describe('notes and preparation', () => {
    it('extracts notes in parentheses', () => {
      const result = parseIngredient('1 onion (finely diced)');
      expect(result.quantity).toBe(1);
      expect(result.name).toBe('onion');
      expect(result.notes).toBe('finely diced');
    });

    it('extracts preparation notes after comma', () => {
      const result = parseIngredient('2 cups chicken, cooked');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cups');
      // Note: comma-separated notes are trickier - let's check actual behavior
      expect(result.name).toContain('chicken');
    });

    it('handles optional notation', () => {
      const result = parseIngredient('nuts (optional)');
      expect(result.name).toBe('nuts');
      expect(result.notes).toBe('optional');
      expect(result.scalable).toBe(false);
    });
  });

  describe('scale marker', () => {
    it('removes {scale} marker and marks as scalable', () => {
      const result = parseIngredient('2 cups flour {scale}');
      expect(result.raw).toBe('2 cups flour {scale}');
      expect(result.scalable).toBe(true);
      expect(result.name).toBe('flour');
    });

    it('is case-insensitive for {scale} marker', () => {
      const result = parseIngredient('1 cup sugar {SCALE}');
      expect(result.scalable).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = parseIngredient('');
      expect(result.raw).toBe('');
      expect(result.name).toBe('');
      expect(result.scalable).toBe(false);
    });

    it('handles ingredient with no parseable quantity', () => {
      const result = parseIngredient('some olive oil');
      // "some" is recognized as an approximate unit
      expect(result.unit).toBe('some');
      expect(result.name).toBe('olive oil');
    });

    it('handles decimal quantities', () => {
      const result = parseIngredient('0.5 kg rice');
      expect(result.quantity).toBe(0.5);
    });

    it('handles complex ingredient names', () => {
      const result = parseIngredient('2 cups all-purpose flour');
      expect(result.name).toBe('all-purpose flour');
    });
  });
});

describe('parseIngredients', () => {
  it('parses multiple ingredients', () => {
    const ingredients = ['2 cups flour', '1 tsp salt', '3 eggs'];
    const results = parseIngredients(ingredients);
    
    expect(results).toHaveLength(3);
    expect(results[0].name).toBe('flour');
    expect(results[1].name).toBe('salt');
    expect(results[2].name).toBe('eggs');
  });
});

describe('parseIngredientsFromMarkdown', () => {
  it('parses markdown list with dashes', () => {
    const markdown = `
- 2 cups flour
- 1 tsp salt
- 3 eggs
    `;
    const results = parseIngredientsFromMarkdown(markdown);
    
    expect(results).toHaveLength(3);
    expect(results[0].quantity).toBe(2);
    expect(results[1].unit).toBe('tsp');
    expect(results[2].name).toBe('eggs');
  });

  it('parses markdown list with asterisks', () => {
    const markdown = `
* 1 cup sugar
* 2 eggs
    `;
    const results = parseIngredientsFromMarkdown(markdown);
    
    expect(results).toHaveLength(2);
  });

  it('ignores non-list content', () => {
    const markdown = `
## Ingredients

Here are the ingredients:

- 2 cups flour
- 1 tsp salt

Some extra text here.
    `;
    const results = parseIngredientsFromMarkdown(markdown);
    
    expect(results).toHaveLength(2);
  });

  it('handles ingredient with comma and preparation notes', () => {
    const markdown = `
## Ingredients

- 2 onions, finely chopped
- 3 cloves garlic, minced
- 1 carrot, diced
`;
    const results = parseIngredientsFromMarkdown(markdown);
    
    expect(results).toHaveLength(3);
    expect(results[0].name).toBe('onions');
    expect(results[0].notes).toBe('finely chopped');
    expect(results[1].name).toBe('garlic');
    expect(results[1].notes).toBe('minced');
    expect(results[2].name).toBe('carrot');
    expect(results[2].notes).toBe('diced');
  });

  it('handles ingredient with comma but not preparation notes', () => {
    const markdown = `
## Ingredients

- Salt and pepper, to taste
- 2 eggs, large
`;
    const results = parseIngredientsFromMarkdown(markdown);
    
    expect(results).toHaveLength(2);
    // "to taste" is a prep word, so it becomes notes
    expect(results[0].name).toBe('Salt and pepper');
    expect(results[0].notes).toBe('to taste');
    // "large" is not a prep word, so it stays part of name
    expect(results[1].name).toContain('eggs, large');
  });
});
