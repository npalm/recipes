/**
 * Shopping List Encoder Service Tests
 * Tests URL encoding/decoding logic following existing test patterns
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShoppingListEncoder } from '@/modules/shopping/services/encoder';
import type { ShoppingListData } from '@/modules/shopping/domain/types';

describe('ShoppingListEncoder', () => {
  let encoder: ShoppingListEncoder;

  beforeEach(() => {
    encoder = new ShoppingListEncoder();
  });

  describe('encode', () => {
    it('encodes valid shopping list data', () => {
      const data: ShoppingListData = {
        title: 'My Shopping List',
        recipes: [
          { slug: 'pasta-carbonara', servings: 4 },
          { slug: 'caesar-salad', servings: 6 },
        ],
      };

      const encoded = encoder.encode(data);
      expect(encoded).toBeTypeOf('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('encodes and decodes round-trip correctly', () => {
      const data: ShoppingListData = {
        title: 'Weekend Dinner',
        recipes: [
          { slug: 'grilled-salmon', servings: 2 },
        ],
      };

      const encoded = encoder.encode(data);
      const decoded = encoder.decode(encoded);

      expect(decoded).toEqual(data);
    });

    it('throws error for invalid data (empty title)', () => {
      const invalidData = {
        title: '',
        recipes: [{ slug: 'test', servings: 4 }],
      };

      expect(() => encoder.encode(invalidData as any)).toThrow();
    });

    it('throws error for invalid data (no recipes)', () => {
      const invalidData = {
        title: 'Test',
        recipes: [],
      };

      expect(() => encoder.encode(invalidData as any)).toThrow();
    });

    it('throws error for invalid servings', () => {
      const invalidData = {
        title: 'Test',
        recipes: [{ slug: 'test', servings: 0 }],
      };

      expect(() => encoder.encode(invalidData as any)).toThrow();
    });

    it('handles special characters in title', () => {
      const data: ShoppingListData = {
        title: 'Dinner & Dessert!',
        recipes: [{ slug: 'test', servings: 4 }],
      };

      const encoded = encoder.encode(data);
      const decoded = encoder.decode(encoded);

      expect(decoded?.title).toBe('Dinner & Dessert!');
    });
  });

  describe('decode', () => {
    it('decodes valid encoded data', () => {
      const data: ShoppingListData = {
        title: 'Test List',
        recipes: [
          { slug: 'recipe-one', servings: 4 },
          { slug: 'recipe-two', servings: 6 },
        ],
      };

      const encoded = encoder.encode(data);
      const decoded = encoder.decode(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.title).toBe(data.title);
      expect(decoded?.recipes).toHaveLength(2);
      expect(decoded?.recipes[0].slug).toBe('recipe-one');
      expect(decoded?.recipes[0].servings).toBe(4);
    });

    it('returns null for invalid base64', () => {
      const decoded = encoder.decode('not-valid-base64!!!');
      expect(decoded).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      // Encode invalid JSON
      const invalidEncoded = encodeURIComponent(Buffer.from('not json', 'utf-8').toString('base64'));
      const decoded = encoder.decode(invalidEncoded);
      expect(decoded).toBeNull();
    });

    it('returns null for data that does not match schema', () => {
      const invalidData = { invalid: 'data' };
      const json = JSON.stringify(invalidData);
      const base64 = Buffer.from(json, 'utf-8').toString('base64');
      const encoded = encodeURIComponent(base64);

      const decoded = encoder.decode(encoded);
      expect(decoded).toBeNull();
    });

    it('handles URL-encoded data', () => {
      const data: ShoppingListData = {
        title: 'Test',
        recipes: [{ slug: 'test', servings: 4 }],
      };

      const encoded = encoder.encode(data);
      // The encoded string should be a valid string
      expect(encoded).toBeTypeOf('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = encoder.decode(encoded);
      expect(decoded).toEqual(data);
    });
  });

  describe('generateUrl', () => {
    it('generates correct URL format', () => {
      const data: ShoppingListData = {
        title: 'Shopping List',
        recipes: [{ slug: 'test-recipe', servings: 4 }],
      };

      const url = encoder.generateUrl(data, 'en', 'https://example.com');
      expect(url).toMatch(/^https:\/\/example\.com\/en\/shopping\/.+$/);
    });

    it('generates different URLs for different data', () => {
      const data1: ShoppingListData = {
        title: 'List 1',
        recipes: [{ slug: 'recipe1', servings: 4 }],
      };

      const data2: ShoppingListData = {
        title: 'List 2',
        recipes: [{ slug: 'recipe2', servings: 6 }],
      };

      const url1 = encoder.generateUrl(data1, 'en', 'https://example.com');
      const url2 = encoder.generateUrl(data2, 'en', 'https://example.com');

      expect(url1).not.toBe(url2);
    });

    it('handles different locales', () => {
      const data: ShoppingListData = {
        title: 'Test',
        recipes: [{ slug: 'test', servings: 4 }],
      };

      const urlEn = encoder.generateUrl(data, 'en', 'https://example.com');
      const urlNl = encoder.generateUrl(data, 'nl', 'https://example.com');

      expect(urlEn).toContain('/en/shopping/');
      expect(urlNl).toContain('/nl/shopping/');
    });

    it('handles multiple recipes', () => {
      const data: ShoppingListData = {
        title: 'Multi-Recipe List',
        recipes: [
          { slug: 'recipe1', servings: 2 },
          { slug: 'recipe2', servings: 4 },
          { slug: 'recipe3', servings: 6 },
        ],
      };

      const url = encoder.generateUrl(data, 'en', 'https://example.com');
      expect(url).toMatch(/^https:\/\/example\.com\/en\/shopping\/.+$/);

      // Extract encoded part and decode to verify
      const encodedPart = url.split('/shopping/')[1];
      const decoded = encoder.decode(encodedPart);

      expect(decoded?.recipes).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('handles very long titles', () => {
      const data: ShoppingListData = {
        title: 'A'.repeat(200), // Max length
        recipes: [{ slug: 'test', servings: 4 }],
      };

      const encoded = encoder.encode(data);
      const decoded = encoder.decode(encoded);

      expect(decoded?.title).toBe(data.title);
    });

    it('handles maximum servings', () => {
      const data: ShoppingListData = {
        title: 'Test',
        recipes: [{ slug: 'test', servings: 100 }], // Max servings
      };

      const encoded = encoder.encode(data);
      const decoded = encoder.decode(encoded);

      expect(decoded?.recipes[0].servings).toBe(100);
    });

    it('handles many recipes', () => {
      const recipes = Array.from({ length: 10 }, (_, i) => ({
        slug: `recipe-${i}`,
        servings: (i % 10) + 1,
      }));

      const data: ShoppingListData = {
        title: 'Many Recipes',
        recipes,
      };

      const encoded = encoder.encode(data);
      const decoded = encoder.decode(encoded);

      expect(decoded?.recipes).toHaveLength(10);
    });
  });
});
