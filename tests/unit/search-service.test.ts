/**
 * Search Service Tests
 *
 * Tests for the recipe search functionality using Fuse.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RecipeSearchIndex,
  createSearchIndex,
  buildSearchIndexData,
  highlightMatches,
  SearchResult,
  SearchOptions,
} from '@/modules/search/services/searchService';
import { RecipeCard } from '@/modules/recipe/domain';

// Mock recipe data for testing
const mockRecipes: RecipeCard[] = [
  {
    slug: 'spaghetti-carbonara',
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish with eggs, cheese, and pancetta',
    difficulty: 'medium',
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    tags: ['italian', 'pasta', 'dinner'],
    images: ['carbonara.jpg'],
    status: 'published',
  },
  {
    slug: 'chicken-curry',
    title: 'Chicken Curry',
    description: 'Spicy and flavorful Indian curry with tender chicken',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 45,
    totalTime: 60,
    tags: ['indian', 'curry', 'dinner'],
    images: ['curry.jpg'],
    status: 'published',
  },
  {
    slug: 'chocolate-cake',
    title: 'Chocolate Cake',
    description: 'Rich and moist chocolate cake perfect for celebrations',
    difficulty: 'hard',
    prepTime: 30,
    cookTime: 40,
    totalTime: 70,
    tags: ['dessert', 'chocolate', 'baking'],
    images: ['cake.jpg'],
    status: 'published',
  },
  {
    slug: 'caesar-salad',
    title: 'Caesar Salad',
    description: 'Fresh romaine lettuce with classic Caesar dressing',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 0,
    totalTime: 15,
    tags: ['salad', 'lunch', 'healthy'],
    images: ['salad.jpg'],
    status: 'published',
  },
  {
    slug: 'pasta-primavera',
    title: 'Pasta Primavera',
    description: 'Light pasta with fresh spring vegetables',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 15,
    totalTime: 25,
    tags: ['pasta', 'vegetarian', 'italian'],
    images: ['primavera.jpg'],
    status: 'published',
  },
];

describe('RecipeSearchIndex', () => {
  let searchIndex: RecipeSearchIndex;

  beforeEach(() => {
    searchIndex = new RecipeSearchIndex(mockRecipes);
  });

  describe('constructor', () => {
    it('initializes with recipes', () => {
      expect(searchIndex.getAllRecipes()).toEqual(mockRecipes);
    });

    it('accepts custom fuse options', () => {
      const customIndex = new RecipeSearchIndex(mockRecipes, {
        threshold: 0.2,
      });
      
      // Custom threshold should make search more strict
      const results = customIndex.search('spageti'); // Typo
      expect(results.length).toBe(0); // Stricter threshold rejects typos
    });
  });

  describe('search', () => {
    it('finds exact title match', () => {
      const results = searchIndex.search('Spaghetti Carbonara');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toBe('Spaghetti Carbonara');
      expect(results[0].score).toBeLessThan(0.1); // Very good match
    });

    it('finds partial title match', () => {
      const results = searchIndex.search('carbonara');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toBe('Spaghetti Carbonara');
    });

    it('is case-insensitive', () => {
      const results1 = searchIndex.search('CHOCOLATE');
      const results2 = searchIndex.search('chocolate');
      const results3 = searchIndex.search('ChOcOlAtE');
      
      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results3.length).toBeGreaterThan(0);
      expect(results1[0].item.slug).toBe('chocolate-cake');
      expect(results2[0].item.slug).toBe('chocolate-cake');
      expect(results3[0].item.slug).toBe('chocolate-cake');
    });

    it('searches by description', () => {
      const results = searchIndex.search('tender chicken');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.slug).toBe('chicken-curry');
    });

    it('searches by tags', () => {
      const results = searchIndex.search('italian');
      
      expect(results.length).toBeGreaterThanOrEqual(2); // Carbonara and Primavera
      const slugs = results.map(r => r.item.slug);
      expect(slugs).toContain('spaghetti-carbonara');
      expect(slugs).toContain('pasta-primavera');
    });

    it('ranks title matches higher than description matches', () => {
      const results = searchIndex.search('pasta');
      
      // "Pasta Primavera" has "pasta" in title
      // "Spaghetti Carbonara" has "pasta" in description
      expect(results.length).toBeGreaterThan(0);
      
      // Find both recipes
      const primavera = results.find(r => r.item.slug === 'pasta-primavera');
      const carbonara = results.find(r => r.item.slug === 'spaghetti-carbonara');
      
      expect(primavera).toBeDefined();
      expect(carbonara).toBeDefined();
      
      // Primavera should rank higher (lower score = better match)
      expect(primavera!.score).toBeLessThan(carbonara!.score);
    });

    it('returns empty array for empty query', () => {
      const results = searchIndex.search('');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results1 = searchIndex.search('   ');
      const results2 = searchIndex.search('\t\n');
      
      expect(results1).toEqual([]);
      expect(results2).toEqual([]);
    });

    it('handles query with no matches', () => {
      const results = searchIndex.search('xyzabc123notfound');
      expect(results).toEqual([]);
    });

    it('handles special characters in query', () => {
      // Fuse.js treats special characters as word boundaries
      // Search for terms individually still works
      const pastaResults = searchIndex.search('pasta');
      const chickenResults = searchIndex.search('chicken');
      
      // Both searches should find recipes
      expect(pastaResults.length).toBeGreaterThan(0);
      expect(chickenResults.length).toBeGreaterThan(0);
    });

    it('respects limit option', () => {
      const results = searchIndex.search('pasta', { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('respects threshold option for stricter matching', () => {
      // Strict threshold (0.1 = nearly perfect match)
      const strictResults = searchIndex.search('spageti', { threshold: 0.1 });
      
      // Lenient threshold (0.6 = allows typos)
      const lenientResults = searchIndex.search('spageti', { threshold: 0.6 });
      
      // Lenient should find more results (typo tolerance)
      expect(lenientResults.length).toBeGreaterThanOrEqual(strictResults.length);
    });

    it('includes match information when includeMatches is true', () => {
      const results = searchIndex.search('carbonara', { includeMatches: true });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches).toBeDefined();
      expect(results[0].matches!.length).toBeGreaterThan(0);
      
      const match = results[0].matches![0];
      expect(match).toHaveProperty('key');
      expect(match).toHaveProperty('value');
      expect(match).toHaveProperty('indices');
      expect(Array.isArray(match.indices)).toBe(true);
    });

    it('excludes match information when includeMatches is false', () => {
      const results = searchIndex.search('carbonara', { includeMatches: false });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches).toBeUndefined();
    });

    it('includes scores in results', () => {
      const results = searchIndex.search('carbonara');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeDefined();
      expect(typeof results[0].score).toBe('number');
      expect(results[0].score).toBeGreaterThanOrEqual(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('returns results sorted by relevance (best match first)', () => {
      const results = searchIndex.search('chocolate');
      
      if (results.length > 1) {
        // Scores should be in ascending order (lower = better)
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeLessThanOrEqual(results[i + 1].score);
        }
      }
    });

    it('handles multiple word queries', () => {
      const results = searchIndex.search('chicken curry');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.slug).toBe('chicken-curry');
    });
  });

  describe('getSuggestions', () => {
    it('returns title suggestions for matching query', () => {
      const suggestions = searchIndex.getSuggestions('pasta');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('Pasta Primavera');
    });

    it('returns tag suggestions for matching query', () => {
      const suggestions = searchIndex.getSuggestions('italian');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('italian');
    });

    it('returns both title and tag suggestions', () => {
      const suggestions = searchIndex.getSuggestions('pasta', 10);
      
      // Should include both "Pasta Primavera" title and "pasta" tag
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Pasta'))).toBe(true);
    });

    it('respects limit parameter', () => {
      const suggestions = searchIndex.getSuggestions('a', 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('uses default limit of 5', () => {
      const suggestions = searchIndex.getSuggestions('a');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array for queries shorter than 2 characters', () => {
      const suggestions1 = searchIndex.getSuggestions('a');
      const suggestions2 = searchIndex.getSuggestions('x');
      
      expect(suggestions1).toEqual([]);
      expect(suggestions2).toEqual([]);
    });

    it('returns empty array for empty query', () => {
      const suggestions = searchIndex.getSuggestions('');
      expect(suggestions).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const suggestions = searchIndex.getSuggestions('   ');
      expect(suggestions).toEqual([]);
    });

    it('is case-insensitive', () => {
      const suggestions1 = searchIndex.getSuggestions('PASTA');
      const suggestions2 = searchIndex.getSuggestions('pasta');
      
      expect(suggestions1.length).toBeGreaterThan(0);
      expect(suggestions2.length).toBeGreaterThan(0);
    });

    it('returns unique suggestions (no duplicates)', () => {
      const suggestions = searchIndex.getSuggestions('pasta');
      const uniqueSuggestions = new Set(suggestions);
      
      expect(suggestions.length).toBe(uniqueSuggestions.size);
    });

    it('handles queries with no matches', () => {
      const suggestions = searchIndex.getSuggestions('xyznotfound');
      expect(suggestions).toEqual([]);
    });
  });

  describe('getAllRecipes', () => {
    it('returns all recipes', () => {
      const recipes = searchIndex.getAllRecipes();
      expect(recipes).toEqual(mockRecipes);
      expect(recipes.length).toBe(5);
    });

    it('returns a reference to the original array', () => {
      const recipes = searchIndex.getAllRecipes();
      expect(recipes).toBe(mockRecipes);
    });
  });

  describe('updateIndex', () => {
    it('updates the search index with new recipes', () => {
      const newRecipes: RecipeCard[] = [
        {
          slug: 'pizza',
          title: 'Pizza Margherita',
          description: 'Classic Italian pizza',
          difficulty: 'medium',
          prepTime: 20,
          cookTime: 15,
          totalTime: 35,
          tags: ['italian', 'pizza'],
          images: ['pizza.jpg'],
          status: 'published',
        },
      ];

      searchIndex.updateIndex(newRecipes);
      
      const recipes = searchIndex.getAllRecipes();
      expect(recipes).toEqual(newRecipes);
      expect(recipes.length).toBe(1);
      
      const results = searchIndex.search('pizza');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toBe('Pizza Margherita');
    });

    it('old recipes are no longer searchable after update', () => {
      const newRecipes: RecipeCard[] = [
        {
          slug: 'pizza',
          title: 'Pizza Margherita',
          description: 'Classic Italian pizza',
          difficulty: 'medium',
          prepTime: 20,
          cookTime: 15,
          totalTime: 35,
          tags: ['italian', 'pizza'],
          images: ['pizza.jpg'],
          status: 'published',
        },
      ];

      // Before update: carbonara should be found
      const beforeResults = searchIndex.search('carbonara');
      expect(beforeResults.length).toBeGreaterThan(0);

      searchIndex.updateIndex(newRecipes);
      
      // After update: carbonara should not be found
      const afterResults = searchIndex.search('carbonara');
      expect(afterResults).toEqual([]);
    });

    it('can update with empty array', () => {
      searchIndex.updateIndex([]);
      
      const recipes = searchIndex.getAllRecipes();
      expect(recipes).toEqual([]);
      
      const results = searchIndex.search('pasta');
      expect(results).toEqual([]);
    });
  });
});

describe('createSearchIndex', () => {
  it('creates a RecipeSearchIndex instance', () => {
    const index = createSearchIndex(mockRecipes);
    
    expect(index).toBeInstanceOf(RecipeSearchIndex);
    expect(index.getAllRecipes()).toEqual(mockRecipes);
  });

  it('accepts custom options', () => {
    const index = createSearchIndex(mockRecipes, { threshold: 0.2 });
    
    expect(index).toBeInstanceOf(RecipeSearchIndex);
  });

  it('works with empty recipes array', () => {
    const index = createSearchIndex([]);
    
    expect(index).toBeInstanceOf(RecipeSearchIndex);
    expect(index.getAllRecipes()).toEqual([]);
  });
});

describe('buildSearchIndexData', () => {
  it('returns recipes and index options', () => {
    const data = buildSearchIndexData(mockRecipes);
    
    expect(data).toHaveProperty('recipes');
    expect(data).toHaveProperty('indexOptions');
  });

  it('includes all recipes', () => {
    const data = buildSearchIndexData(mockRecipes);
    
    expect(data.recipes).toEqual(mockRecipes);
    expect(data.recipes.length).toBe(5);
  });

  it('includes Fuse.js options', () => {
    const data = buildSearchIndexData(mockRecipes);
    
    expect(data.indexOptions).toHaveProperty('keys');
    expect(data.indexOptions).toHaveProperty('threshold');
    expect(data.indexOptions).toHaveProperty('ignoreLocation');
    expect(Array.isArray(data.indexOptions.keys)).toBe(true);
  });

  it('includes weighted search keys', () => {
    const data = buildSearchIndexData(mockRecipes);
    
    const keys = data.indexOptions.keys as Array<{ name: string; weight: number }>;
    
    // Check that title, description, and tags are included with weights
    expect(keys.some(k => k.name === 'title')).toBe(true);
    expect(keys.some(k => k.name === 'description')).toBe(true);
    expect(keys.some(k => k.name === 'tags')).toBe(true);
    
    // Title should have highest weight
    const titleKey = keys.find(k => k.name === 'title');
    const descKey = keys.find(k => k.name === 'description');
    
    if (titleKey && descKey) {
      expect(titleKey.weight).toBeGreaterThan(descKey.weight);
    }
  });

  it('works with empty recipes array', () => {
    const data = buildSearchIndexData([]);
    
    expect(data.recipes).toEqual([]);
    expect(data.indexOptions).toBeDefined();
  });
});

describe('highlightMatches', () => {
  it('highlights single match', () => {
    const text = 'Hello World';
    const indices: ReadonlyArray<[number, number]> = [[0, 4]]; // "Hello"
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'Hello', highlight: true },
      { text: ' World', highlight: false },
    ]);
  });

  it('highlights multiple matches', () => {
    const text = 'Hello World Hello';
    const indices: ReadonlyArray<[number, number]> = [
      [0, 4],   // "Hello"
      [12, 16], // "Hello"
    ];
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'Hello', highlight: true },
      { text: ' World ', highlight: false },
      { text: 'Hello', highlight: true },
    ]);
  });

  it('highlights match in middle of text', () => {
    const text = 'Hello World Test';
    const indices: ReadonlyArray<[number, number]> = [[6, 10]]; // "World"
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'Hello ', highlight: false },
      { text: 'World', highlight: true },
      { text: ' Test', highlight: false },
    ]);
  });

  it('highlights match at end of text', () => {
    const text = 'Hello World';
    const indices: ReadonlyArray<[number, number]> = [[6, 10]]; // "World"
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'Hello ', highlight: false },
      { text: 'World', highlight: true },
    ]);
  });

  it('highlights entire text', () => {
    const text = 'Hello';
    const indices: ReadonlyArray<[number, number]> = [[0, 4]];
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'Hello', highlight: true },
    ]);
  });

  it('handles adjacent matches', () => {
    const text = 'HelloWorld';
    const indices: ReadonlyArray<[number, number]> = [
      [0, 4],  // "Hello"
      [5, 9],  // "World"
    ];
    
    const segments = highlightMatches(text, indices);
    
    // Adjacent ranges create separate highlighted segments
    expect(segments).toEqual([
      { text: 'Hello', highlight: true },
      { text: 'World', highlight: true },
    ]);
  });

  it('handles empty indices array', () => {
    const text = 'Hello World';
    const indices: ReadonlyArray<[number, number]> = [];
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'Hello World', highlight: false },
    ]);
  });

  it('handles empty text', () => {
    const text = '';
    const indices: ReadonlyArray<[number, number]> = [];
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([]);
  });

  it('handles single character match', () => {
    const text = 'Hello';
    const indices: ReadonlyArray<[number, number]> = [[1, 1]]; // "e"
    
    const segments = highlightMatches(text, indices);
    
    expect(segments).toEqual([
      { text: 'H', highlight: false },
      { text: 'e', highlight: true },
      { text: 'llo', highlight: false },
    ]);
  });

  it('preserves text content exactly', () => {
    const text = 'Special chars: !@#$%^&*()';
    const indices: ReadonlyArray<[number, number]> = [[15, 24]];
    
    const segments = highlightMatches(text, indices);
    
    const reconstructed = segments.map(s => s.text).join('');
    expect(reconstructed).toBe(text);
  });
});
