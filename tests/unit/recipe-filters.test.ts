/**
 * Recipe Filters Tests
 *
 * Comprehensive tests for recipe filtering and sorting utilities.
 * These tests are designed to be mutation-testing proof.
 */

import { describe, it, expect } from 'vitest';
import {
  filterRecipes,
  filterRecipeCards,
  sortRecipes,
  sortRecipeCards,
} from '@/modules/recipe/services/filters';
import { Recipe, RecipeCard, RecipeFilters, RecipeSort } from '@/modules/recipe/domain';

// Mock recipe data
const mockRecipes: Recipe[] = [
  {
    title: 'Spaghetti Carbonara',
    slug: 'spaghetti-carbonara',
    status: 'published',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    difficulty: 'medium',
    tags: ['italian', 'pasta', 'dinner'],
    images: ['carbonara.jpg'],
    headerImageRotation: true,
    sources: [],
    createdAt: '2024-01-15T10:00:00Z',
    description: 'Classic Italian pasta',
    ingredients: [],
    instructions: [],
    content: '',
  },
  {
    title: 'Caesar Salad',
    slug: 'caesar-salad',
    status: 'published',
    servings: 2,
    prepTime: 15,
    cookTime: 0,
    totalTime: 15,
    difficulty: 'easy',
    tags: ['salad', 'lunch', 'healthy'],
    images: ['salad.jpg'],
    headerImageRotation: true,
    sources: [],
    createdAt: '2024-01-20T10:00:00Z',
    description: 'Fresh Caesar salad',
    ingredients: [],
    instructions: [],
    content: '',
  },
  {
    title: 'Beef Wellington',
    slug: 'beef-wellington',
    status: 'draft',
    servings: 6,
    prepTime: 60,
    cookTime: 45,
    totalTime: 105,
    difficulty: 'hard',
    tags: ['beef', 'dinner', 'fancy'],
    images: ['wellington.jpg'],
    headerImageRotation: true,
    sources: [],
    createdAt: '2024-01-10T10:00:00Z',
    description: 'Elegant beef dish',
    ingredients: [],
    instructions: [],
    content: '',
  },
  {
    title: 'Chocolate Cake',
    slug: 'chocolate-cake',
    status: 'published',
    servings: 8,
    prepTime: 30,
    cookTime: 40,
    // totalTime is undefined - should calculate from prep + cook
    difficulty: 'medium',
    tags: ['dessert', 'chocolate', 'baking'],
    images: ['cake.jpg'],
    headerImageRotation: true,
    sources: [],
    createdAt: '2024-01-05T10:00:00Z',
    description: 'Rich chocolate cake',
    ingredients: [],
    instructions: [],
    content: '',
  },
];

const mockRecipeCards: RecipeCard[] = [
  {
    slug: 'spaghetti-carbonara',
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta',
    difficulty: 'medium',
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    tags: ['italian', 'pasta', 'dinner'],
    images: ['carbonara.jpg'],
    status: 'published',
  },
  {
    slug: 'caesar-salad',
    title: 'Caesar Salad',
    description: 'Fresh Caesar salad',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 0,
    totalTime: 15,
    tags: ['salad', 'lunch', 'healthy'],
    images: ['salad.jpg'],
    status: 'published',
  },
  {
    slug: 'beef-wellington',
    title: 'Beef Wellington',
    description: 'Elegant beef dish',
    difficulty: 'hard',
    prepTime: 60,
    cookTime: 45,
    totalTime: 105,
    tags: ['beef', 'dinner', 'fancy'],
    images: ['wellington.jpg'],
    status: 'draft',
  },
  {
    slug: 'chocolate-cake',
    title: 'Chocolate Cake',
    description: 'Rich chocolate cake',
    difficulty: 'medium',
    prepTime: 30,
    cookTime: 40,
    totalTime: 70,
    tags: ['dessert', 'chocolate', 'baking'],
    images: ['cake.jpg'],
    status: 'published',
  },
];

describe('filterRecipes', () => {
  describe('status filtering', () => {
    it('shows only published recipes by default (no status filter)', () => {
      const filters: RecipeFilters = {};
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(3);
      expect(result.every(r => r.status === 'published')).toBe(true);
      expect(result.find(r => r.slug === 'beef-wellington')).toBeUndefined();
    });

    it('filters by published status explicitly', () => {
      const filters: RecipeFilters = { status: ['published'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(3);
      expect(result.every(r => r.status === 'published')).toBe(true);
    });

    it('filters by draft status', () => {
      const filters: RecipeFilters = { status: ['draft'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('beef-wellington');
      expect(result[0].status).toBe('draft');
    });

    it('filters by multiple statuses', () => {
      const filters: RecipeFilters = { status: ['published', 'draft'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(4);
    });

    it('returns empty array when status filter matches nothing', () => {
      const filters: RecipeFilters = { status: [] };
      const result = filterRecipes(mockRecipes, filters);
      
      // Empty status array means default behavior (only published)
      expect(result).toHaveLength(3);
    });
  });

  describe('tags filtering', () => {
    it('filters by single tag', () => {
      const filters: RecipeFilters = { tags: ['italian'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('spaghetti-carbonara');
      expect(result[0].tags).toContain('italian');
    });

    it('filters by multiple tags (OR logic)', () => {
      const filters: RecipeFilters = { tags: ['italian', 'salad'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(2);
      const slugs = result.map(r => r.slug);
      expect(slugs).toContain('spaghetti-carbonara');
      expect(slugs).toContain('caesar-salad');
    });

    it('filters recipes with common tag', () => {
      const filters: RecipeFilters = { tags: ['dinner'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1); // Only carbonara (wellington is draft)
      expect(result[0].slug).toBe('spaghetti-carbonara');
    });

    it('returns empty array when tag filter matches nothing', () => {
      const filters: RecipeFilters = { tags: ['nonexistent'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(0);
    });

    it('ignores empty tags array', () => {
      const filters: RecipeFilters = { tags: [] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(3); // All published
    });
  });

  describe('difficulty filtering', () => {
    it('filters by easy difficulty', () => {
      const filters: RecipeFilters = { difficulty: ['easy'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('caesar-salad');
      expect(result[0].difficulty).toBe('easy');
    });

    it('filters by medium difficulty', () => {
      const filters: RecipeFilters = { difficulty: ['medium'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.difficulty === 'medium')).toBe(true);
    });

    it('filters by multiple difficulties', () => {
      const filters: RecipeFilters = { difficulty: ['easy', 'medium'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(3);
      expect(result.every(r => r.difficulty === 'easy' || r.difficulty === 'medium')).toBe(true);
    });

    it('filters by hard difficulty (includes draft)', () => {
      const filters: RecipeFilters = { difficulty: ['hard'], status: ['draft'] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('beef-wellington');
    });

    it('ignores empty difficulty array', () => {
      const filters: RecipeFilters = { difficulty: [] };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(3); // All published
    });
  });

  describe('maxTotalTime filtering', () => {
    it('filters recipes under 30 minutes', () => {
      const filters: RecipeFilters = { maxTotalTime: 30 };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(2);
      const slugs = result.map(r => r.slug);
      expect(slugs).toContain('spaghetti-carbonara');
      expect(slugs).toContain('caesar-salad');
    });

    it('filters recipes under 70 minutes', () => {
      const filters: RecipeFilters = { maxTotalTime: 70 };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(3);
      const slugs = result.map(r => r.slug);
      expect(slugs).toContain('caesar-salad'); // 15
      expect(slugs).toContain('spaghetti-carbonara'); // 30
      expect(slugs).toContain('chocolate-cake'); // 70 (calculated)
    });

    it('excludes recipes over time limit', () => {
      const filters: RecipeFilters = { maxTotalTime: 20 };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('caesar-salad');
      expect(result[0].totalTime).toBe(15);
    });

    it('calculates totalTime from prepTime + cookTime when undefined', () => {
      const filters: RecipeFilters = { maxTotalTime: 70 };
      const result = filterRecipes(mockRecipes, filters);
      
      // Chocolate Cake has undefined totalTime, should calculate as 30 + 40 = 70
      expect(result.some(r => r.slug === 'chocolate-cake')).toBe(true);
    });

    it('excludes recipes when calculated time exceeds limit', () => {
      const filters: RecipeFilters = { maxTotalTime: 69 };
      const result = filterRecipes(mockRecipes, filters);
      
      // Chocolate Cake (70 mins calculated) should be excluded
      expect(result.some(r => r.slug === 'chocolate-cake')).toBe(false);
    });

    it('includes recipes exactly at time limit', () => {
      const filters: RecipeFilters = { maxTotalTime: 15 };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].totalTime).toBe(15);
    });
  });

  describe('combined filters', () => {
    it('filters by tags AND difficulty', () => {
      const filters: RecipeFilters = {
        tags: ['dinner'],
        difficulty: ['medium'],
      };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('spaghetti-carbonara');
    });

    it('filters by difficulty AND maxTotalTime', () => {
      const filters: RecipeFilters = {
        difficulty: ['easy', 'medium'],
        maxTotalTime: 35,
      };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(2);
      const slugs = result.map(r => r.slug);
      expect(slugs).toContain('spaghetti-carbonara');
      expect(slugs).toContain('caesar-salad');
    });

    it('filters by tags, difficulty, and time', () => {
      const filters: RecipeFilters = {
        tags: ['pasta'],
        difficulty: ['medium'],
        maxTotalTime: 40,
      };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('spaghetti-carbonara');
    });

    it('returns empty array when no recipes match all filters', () => {
      const filters: RecipeFilters = {
        tags: ['italian'],
        difficulty: ['hard'],
      };
      const result = filterRecipes(mockRecipes, filters);
      
      expect(result).toHaveLength(0);
    });
  });

  it('does not mutate the original recipes array', () => {
    const originalLength = mockRecipes.length;
    const filters: RecipeFilters = { difficulty: ['easy'] };
    
    filterRecipes(mockRecipes, filters);
    
    expect(mockRecipes).toHaveLength(originalLength);
  });
});

describe('filterRecipeCards', () => {
  describe('status filtering', () => {
    it('shows only published cards by default', () => {
      const filters: RecipeFilters = {};
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(3);
      expect(result.every(c => c.status === 'published')).toBe(true);
    });

    it('filters by draft status', () => {
      const filters: RecipeFilters = { status: ['draft'] };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('beef-wellington');
    });

    it('filters by multiple statuses', () => {
      const filters: RecipeFilters = { status: ['published', 'draft'] };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(4);
    });
  });

  describe('tags filtering', () => {
    it('filters cards by single tag', () => {
      const filters: RecipeFilters = { tags: ['dessert'] };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('chocolate-cake');
    });

    it('filters cards by multiple tags', () => {
      const filters: RecipeFilters = { tags: ['pasta', 'salad'] };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('difficulty filtering', () => {
    it('filters cards by difficulty', () => {
      const filters: RecipeFilters = { difficulty: ['easy'] };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('easy');
    });
  });

  describe('maxTotalTime filtering', () => {
    it('filters cards by total time', () => {
      const filters: RecipeFilters = { maxTotalTime: 30 };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result).toHaveLength(2);
      expect(result.every(c => c.totalTime <= 30)).toBe(true);
    });

    it('uses totalTime directly from card (not calculated)', () => {
      const filters: RecipeFilters = { maxTotalTime: 70 };
      const result = filterRecipeCards(mockRecipeCards, filters);
      
      expect(result.some(c => c.slug === 'chocolate-cake')).toBe(true);
    });
  });

  it('does not mutate the original cards array', () => {
    const originalLength = mockRecipeCards.length;
    const filters: RecipeFilters = { difficulty: ['easy'] };
    
    filterRecipeCards(mockRecipeCards, filters);
    
    expect(mockRecipeCards).toHaveLength(originalLength);
  });
});

describe('sortRecipes', () => {
  describe('sort by title', () => {
    it('sorts by title ascending (A-Z)', () => {
      const sort: RecipeSort = { field: 'title', direction: 'asc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].title).toBe('Beef Wellington');
      expect(result[1].title).toBe('Caesar Salad');
      expect(result[2].title).toBe('Chocolate Cake');
      expect(result[3].title).toBe('Spaghetti Carbonara');
    });

    it('sorts by title descending (Z-A)', () => {
      const sort: RecipeSort = { field: 'title', direction: 'desc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].title).toBe('Spaghetti Carbonara');
      expect(result[1].title).toBe('Chocolate Cake');
      expect(result[2].title).toBe('Caesar Salad');
      expect(result[3].title).toBe('Beef Wellington');
    });

    it('handles case-insensitive alphabetical sorting', () => {
      const recipes: Recipe[] = [
        { ...mockRecipes[0], title: 'apple pie' },
        { ...mockRecipes[1], title: 'Banana Bread' },
        { ...mockRecipes[2], title: 'Cherry Tart' },
      ];
      const sort: RecipeSort = { field: 'title', direction: 'asc' };
      const result = sortRecipes(recipes, sort);
      
      expect(result[0].title).toBe('apple pie');
      expect(result[1].title).toBe('Banana Bread');
      expect(result[2].title).toBe('Cherry Tart');
    });
  });

  describe('sort by createdAt', () => {
    it('sorts by creation date ascending (oldest first)', () => {
      const sort: RecipeSort = { field: 'createdAt', direction: 'asc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].slug).toBe('chocolate-cake'); // 2024-01-05
      expect(result[1].slug).toBe('beef-wellington'); // 2024-01-10
      expect(result[2].slug).toBe('spaghetti-carbonara'); // 2024-01-15
      expect(result[3].slug).toBe('caesar-salad'); // 2024-01-20
    });

    it('sorts by creation date descending (newest first)', () => {
      const sort: RecipeSort = { field: 'createdAt', direction: 'desc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].slug).toBe('caesar-salad'); // 2024-01-20
      expect(result[1].slug).toBe('spaghetti-carbonara'); // 2024-01-15
      expect(result[2].slug).toBe('beef-wellington'); // 2024-01-10
      expect(result[3].slug).toBe('chocolate-cake'); // 2024-01-05
    });
  });

  describe('sort by totalTime', () => {
    it('sorts by total time ascending (fastest first)', () => {
      const sort: RecipeSort = { field: 'totalTime', direction: 'asc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].slug).toBe('caesar-salad'); // 15 min
      expect(result[1].slug).toBe('spaghetti-carbonara'); // 30 min
      expect(result[2].slug).toBe('chocolate-cake'); // 70 min (calculated)
      expect(result[3].slug).toBe('beef-wellington'); // 105 min
    });

    it('sorts by total time descending (slowest first)', () => {
      const sort: RecipeSort = { field: 'totalTime', direction: 'desc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].slug).toBe('beef-wellington'); // 105 min
      expect(result[1].slug).toBe('chocolate-cake'); // 70 min (calculated)
      expect(result[2].slug).toBe('spaghetti-carbonara'); // 30 min
      expect(result[3].slug).toBe('caesar-salad'); // 15 min
    });

    it('calculates totalTime from prepTime + cookTime when undefined', () => {
      const sort: RecipeSort = { field: 'totalTime', direction: 'asc' };
      const result = sortRecipes(mockRecipes, sort);
      
      const chocolateCake = result.find(r => r.slug === 'chocolate-cake');
      expect(chocolateCake).toBeDefined();
      // Should be sorted correctly based on 70 min (30 prep + 40 cook)
      const carbonara = result.find(r => r.slug === 'spaghetti-carbonara');
      expect(result.indexOf(chocolateCake!)).toBeGreaterThan(result.indexOf(carbonara!));
    });
  });

  describe('sort by difficulty', () => {
    it('sorts by difficulty ascending (easy to hard)', () => {
      const sort: RecipeSort = { field: 'difficulty', direction: 'asc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].difficulty).toBe('easy');
      expect(result[1].difficulty).toBe('medium');
      expect(result[2].difficulty).toBe('medium');
      expect(result[3].difficulty).toBe('hard');
    });

    it('sorts by difficulty descending (hard to easy)', () => {
      const sort: RecipeSort = { field: 'difficulty', direction: 'desc' };
      const result = sortRecipes(mockRecipes, sort);
      
      expect(result).toHaveLength(4);
      expect(result[0].difficulty).toBe('hard');
      expect(result[1].difficulty).toBe('medium');
      expect(result[2].difficulty).toBe('medium');
      expect(result[3].difficulty).toBe('easy');
    });

    it('maintains stable sort for same difficulty', () => {
      const sort: RecipeSort = { field: 'difficulty', direction: 'asc' };
      const result = sortRecipes(mockRecipes, sort);
      
      // Both carbonara and cake are medium
      const mediumRecipes = result.filter(r => r.difficulty === 'medium');
      expect(mediumRecipes).toHaveLength(2);
    });
  });

  it('does not mutate the original recipes array', () => {
    const originalOrder = mockRecipes.map(r => r.slug);
    const sort: RecipeSort = { field: 'title', direction: 'asc' };
    
    sortRecipes(mockRecipes, sort);
    
    expect(mockRecipes.map(r => r.slug)).toEqual(originalOrder);
  });

  it('returns a new array (not the same reference)', () => {
    const sort: RecipeSort = { field: 'title', direction: 'asc' };
    const result = sortRecipes(mockRecipes, sort);
    
    expect(result).not.toBe(mockRecipes);
  });
});

describe('sortRecipeCards', () => {
  describe('sort by title', () => {
    it('sorts cards by title ascending', () => {
      const sort: RecipeSort = { field: 'title', direction: 'asc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      expect(result[0].title).toBe('Beef Wellington');
      expect(result[3].title).toBe('Spaghetti Carbonara');
    });

    it('sorts cards by title descending', () => {
      const sort: RecipeSort = { field: 'title', direction: 'desc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      expect(result[0].title).toBe('Spaghetti Carbonara');
      expect(result[3].title).toBe('Beef Wellington');
    });
  });

  describe('sort by totalTime', () => {
    it('sorts cards by total time ascending', () => {
      const sort: RecipeSort = { field: 'totalTime', direction: 'asc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      expect(result[0].totalTime).toBe(15);
      expect(result[1].totalTime).toBe(30);
      expect(result[2].totalTime).toBe(70);
      expect(result[3].totalTime).toBe(105);
    });

    it('sorts cards by total time descending', () => {
      const sort: RecipeSort = { field: 'totalTime', direction: 'desc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      expect(result[0].totalTime).toBe(105);
      expect(result[3].totalTime).toBe(15);
    });
  });

  describe('sort by difficulty', () => {
    it('sorts cards by difficulty ascending', () => {
      const sort: RecipeSort = { field: 'difficulty', direction: 'asc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      expect(result[0].difficulty).toBe('easy');
      expect(result[3].difficulty).toBe('hard');
    });

    it('sorts cards by difficulty descending', () => {
      const sort: RecipeSort = { field: 'difficulty', direction: 'desc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      expect(result[0].difficulty).toBe('hard');
      expect(result[3].difficulty).toBe('easy');
    });
  });

  describe('unsupported sort fields', () => {
    it('handles createdAt field gracefully (returns unsorted)', () => {
      const sort: RecipeSort = { field: 'createdAt', direction: 'asc' };
      const result = sortRecipeCards(mockRecipeCards, sort);
      
      // Should return all cards, but order may not change
      expect(result).toHaveLength(4);
    });
  });

  it('does not mutate the original cards array', () => {
    const originalOrder = mockRecipeCards.map(c => c.slug);
    const sort: RecipeSort = { field: 'title', direction: 'asc' };
    
    sortRecipeCards(mockRecipeCards, sort);
    
    expect(mockRecipeCards.map(c => c.slug)).toEqual(originalOrder);
  });

  it('returns a new array (not the same reference)', () => {
    const sort: RecipeSort = { field: 'title', direction: 'asc' };
    const result = sortRecipeCards(mockRecipeCards, sort);
    
    expect(result).not.toBe(mockRecipeCards);
  });
});
