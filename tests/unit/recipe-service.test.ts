/**
 * Recipe Service Tests
 *
 * Comprehensive tests for recipe service with mocked repository layer.
 * These tests are designed to be mutation-testing proof.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { RecipeService, createRecipeService } from '@/modules/recipe/services/recipeService';
import { Recipe, RecipeCard } from '@/modules/recipe/domain';
import * as repository from '@/modules/recipe/repository';

// Mock the repository module
vi.mock('@/modules/recipe/repository');

// Mock data
const mockRecipe1: Recipe = {
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
};

const mockRecipe2: Recipe = {
  title: 'Caesar Salad',
  slug: 'caesar-salad',
  status: 'published',
  servings: 2,
  prepTime: 15,
  cookTime: 0,
  totalTime: 15,
  difficulty: 'easy',
  tags: ['salad', 'lunch'],
  images: ['salad.jpg'],
  headerImageRotation: true,
  sources: [],
  createdAt: '2024-01-20T10:00:00Z',
  description: 'Fresh Caesar salad',
  ingredients: [],
  instructions: [],
  content: '',
};

const mockRecipe3: Recipe = {
  title: 'Beef Wellington',
  slug: 'beef-wellington',
  status: 'published',
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
};

const mockRecipeWithSharedTags: Recipe = {
  title: 'Lasagna',
  slug: 'lasagna',
  status: 'published',
  servings: 8,
  prepTime: 30,
  cookTime: 60,
  totalTime: 90,
  difficulty: 'medium',
  tags: ['italian', 'pasta', 'baking'],
  images: ['lasagna.jpg'],
  headerImageRotation: true,
  sources: [],
  createdAt: '2024-01-25T10:00:00Z',
  description: 'Classic Italian lasagna',
  ingredients: [],
  instructions: [],
  content: '',
};

const mockRecipes: Recipe[] = [mockRecipe1, mockRecipe2, mockRecipe3, mockRecipeWithSharedTags];

const mockCard1: RecipeCard = {
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
};

const mockCard2: RecipeCard = {
  slug: 'caesar-salad',
  title: 'Caesar Salad',
  description: 'Fresh Caesar salad',
  difficulty: 'easy',
  prepTime: 15,
  cookTime: 0,
  totalTime: 15,
  tags: ['salad', 'lunch'],
  images: ['salad.jpg'],
  status: 'published',
};

const mockCard3: RecipeCard = {
  slug: 'beef-wellington',
  title: 'Beef Wellington',
  description: 'Elegant beef dish',
  difficulty: 'hard',
  prepTime: 60,
  cookTime: 45,
  totalTime: 105,
  tags: ['beef', 'dinner', 'fancy'],
  images: ['wellington.jpg'],
  status: 'published',
};

const mockCard4: RecipeCard = {
  slug: 'lasagna',
  title: 'Lasagna',
  description: 'Classic Italian lasagna',
  difficulty: 'medium',
  prepTime: 30,
  cookTime: 60,
  totalTime: 90,
  tags: ['italian', 'pasta', 'baking'],
  images: ['lasagna.jpg'],
  status: 'published',
};

const mockRecipeCards: RecipeCard[] = [mockCard1, mockCard2, mockCard3, mockCard4];

describe('RecipeService', () => {
  let service: RecipeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecipeService('en');
  });

  describe('constructor', () => {
    it('creates service with default locale', () => {
      const defaultService = new RecipeService();
      expect(defaultService).toBeInstanceOf(RecipeService);
    });

    it('creates service with custom locale', () => {
      const dutchService = new RecipeService('nl');
      expect(dutchService).toBeInstanceOf(RecipeService);
    });
  });

  describe('getRecipes', () => {
    beforeEach(() => {
      (repository.getAllRecipes as Mock).mockResolvedValue(mockRecipes);
    });

    it('returns all recipes without filters or sorting', async () => {
      const result = await service.getRecipes();
      
      expect(result).toEqual(mockRecipes);
      expect(repository.getAllRecipes).toHaveBeenCalledWith('en');
      expect(repository.getAllRecipes).toHaveBeenCalledTimes(1);
    });

    it('calls repository with correct locale', async () => {
      const nlService = new RecipeService('nl');
      (repository.getAllRecipes as Mock).mockResolvedValue([]);
      
      await nlService.getRecipes();
      
      expect(repository.getAllRecipes).toHaveBeenCalledWith('nl');
    });

    it('filters recipes by tags', async () => {
      const result = await service.getRecipes({ tags: ['italian'] });
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.tags.includes('italian'))).toBe(true);
    });

    it('filters recipes by difficulty', async () => {
      const result = await service.getRecipes({ difficulty: ['easy'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('caesar-salad');
    });

    it('filters recipes by maxTotalTime', async () => {
      const result = await service.getRecipes({ maxTotalTime: 30 });
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.totalTime! <= 30)).toBe(true);
    });

    it('sorts recipes by title ascending', async () => {
      const result = await service.getRecipes(undefined, { field: 'title', direction: 'asc' });
      
      expect(result[0].title).toBe('Beef Wellington');
      expect(result[1].title).toBe('Caesar Salad');
      expect(result[2].title).toBe('Lasagna');
      expect(result[3].title).toBe('Spaghetti Carbonara');
    });

    it('sorts recipes by title descending', async () => {
      const result = await service.getRecipes(undefined, { field: 'title', direction: 'desc' });
      
      expect(result[0].title).toBe('Spaghetti Carbonara');
      expect(result[3].title).toBe('Beef Wellington');
    });

    it('sorts recipes by totalTime', async () => {
      const result = await service.getRecipes(undefined, { field: 'totalTime', direction: 'asc' });
      
      expect(result[0].totalTime).toBe(15);
      expect(result[3].totalTime).toBe(105);
    });

    it('sorts recipes by difficulty', async () => {
      const result = await service.getRecipes(undefined, { field: 'difficulty', direction: 'asc' });
      
      expect(result[0].difficulty).toBe('easy');
      expect(result[result.length - 1].difficulty).toBe('hard');
    });

    it('applies both filters and sorting', async () => {
      const result = await service.getRecipes(
        { tags: ['pasta'] },
        { field: 'title', direction: 'asc' }
      );
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Lasagna');
      expect(result[1].title).toBe('Spaghetti Carbonara');
    });

    it('returns empty array when filters match nothing', async () => {
      const result = await service.getRecipes({ tags: ['nonexistent'] });
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getRecipeCards', () => {
    beforeEach(() => {
      (repository.getAllRecipeCards as Mock).mockResolvedValue(mockRecipeCards);
    });

    it('returns all recipe cards without filters or sorting', async () => {
      const result = await service.getRecipeCards();
      
      expect(result).toEqual(mockRecipeCards);
      expect(repository.getAllRecipeCards).toHaveBeenCalledWith('en');
      expect(repository.getAllRecipeCards).toHaveBeenCalledTimes(1);
    });

    it('calls repository with correct locale', async () => {
      const nlService = new RecipeService('nl');
      (repository.getAllRecipeCards as Mock).mockResolvedValue([]);
      
      await nlService.getRecipeCards();
      
      expect(repository.getAllRecipeCards).toHaveBeenCalledWith('nl');
    });

    it('filters recipe cards by tags', async () => {
      const result = await service.getRecipeCards({ tags: ['pasta'] });
      
      expect(result).toHaveLength(2);
      expect(result.every(c => c.tags.includes('pasta'))).toBe(true);
    });

    it('filters recipe cards by difficulty', async () => {
      const result = await service.getRecipeCards({ difficulty: ['medium'] });
      
      expect(result).toHaveLength(2);
      expect(result.every(c => c.difficulty === 'medium')).toBe(true);
    });

    it('sorts recipe cards by title', async () => {
      const result = await service.getRecipeCards(undefined, { field: 'title', direction: 'asc' });
      
      expect(result[0].title).toBe('Beef Wellington');
      expect(result[3].title).toBe('Spaghetti Carbonara');
    });

    it('applies both filters and sorting', async () => {
      const result = await service.getRecipeCards(
        { difficulty: ['medium'] },
        { field: 'totalTime', direction: 'asc' }
      );
      
      expect(result).toHaveLength(2);
      expect(result[0].totalTime).toBeLessThan(result[1].totalTime);
    });
  });

  describe('getRecipe', () => {
    it('returns recipe by slug', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(mockRecipe1);
      
      const result = await service.getRecipe('spaghetti-carbonara');
      
      expect(result).toEqual(mockRecipe1);
      expect(repository.getRecipeBySlug).toHaveBeenCalledWith('spaghetti-carbonara', 'en');
    });

    it('calls repository with correct locale', async () => {
      const nlService = new RecipeService('nl');
      (repository.getRecipeBySlug as Mock).mockResolvedValue(null);
      
      await nlService.getRecipe('test-slug');
      
      expect(repository.getRecipeBySlug).toHaveBeenCalledWith('test-slug', 'nl');
    });

    it('returns null when recipe not found', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(null);
      
      const result = await service.getRecipe('nonexistent');
      
      expect(result).toBeNull();
    });

    it('returns null for empty slug', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(null);
      
      const result = await service.getRecipe('');
      
      expect(result).toBeNull();
      expect(repository.getRecipeBySlug).toHaveBeenCalledWith('', 'en');
    });
  });

  describe('getRecipeCard', () => {
    beforeEach(() => {
      (repository.recipeToCard as Mock).mockImplementation((recipe: Recipe) => ({
        slug: recipe.slug,
        title: recipe.title,
        description: recipe.description,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        tags: recipe.tags,
        images: recipe.images,
        status: recipe.status,
      }));
    });

    it('returns recipe card by slug', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(mockRecipe1);
      
      const result = await service.getRecipeCard('spaghetti-carbonara');
      
      expect(result).toBeDefined();
      expect(result?.slug).toBe('spaghetti-carbonara');
      expect(repository.getRecipeBySlug).toHaveBeenCalledWith('spaghetti-carbonara', 'en');
      expect(repository.recipeToCard).toHaveBeenCalledWith(mockRecipe1);
    });

    it('returns null when recipe not found', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(null);
      
      const result = await service.getRecipeCard('nonexistent');
      
      expect(result).toBeNull();
      expect(repository.recipeToCard).not.toHaveBeenCalled();
    });

    it('converts recipe to card correctly', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(mockRecipe2);
      
      const result = await service.getRecipeCard('caesar-salad');
      
      expect(result).toBeDefined();
      expect(result?.title).toBe('Caesar Salad');
      expect(result?.difficulty).toBe('easy');
      expect(result?.totalTime).toBe(15);
    });
  });

  describe('getTags', () => {
    it('returns all unique tags', async () => {
      const mockTags = ['italian', 'pasta', 'dinner', 'salad', 'lunch', 'beef', 'fancy', 'baking'];
      (repository.getAllTags as Mock).mockResolvedValue(mockTags);
      
      const result = await service.getTags();
      
      expect(result).toEqual(mockTags);
      expect(repository.getAllTags).toHaveBeenCalledWith('en');
    });

    it('calls repository with correct locale', async () => {
      const nlService = new RecipeService('nl');
      (repository.getAllTags as Mock).mockResolvedValue([]);
      
      await nlService.getTags();
      
      expect(repository.getAllTags).toHaveBeenCalledWith('nl');
    });

    it('returns empty array when no tags exist', async () => {
      (repository.getAllTags as Mock).mockResolvedValue([]);
      
      const result = await service.getTags();
      
      expect(result).toEqual([]);
    });
  });

  describe('getRecipesByTag', () => {
    beforeEach(() => {
      (repository.getAllRecipes as Mock).mockResolvedValue(mockRecipes);
    });

    it('returns recipes with specific tag', async () => {
      const result = await service.getRecipesByTag('italian');
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.tags.includes('italian'))).toBe(true);
    });

    it('returns recipes with dinner tag', async () => {
      const result = await service.getRecipesByTag('dinner');
      
      expect(result).toHaveLength(2);
      const slugs = result.map(r => r.slug);
      expect(slugs).toContain('spaghetti-carbonara');
      expect(slugs).toContain('beef-wellington');
    });

    it('returns empty array for nonexistent tag', async () => {
      const result = await service.getRecipesByTag('nonexistent');
      
      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty tag', async () => {
      const result = await service.getRecipesByTag('');
      
      expect(result).toHaveLength(0);
    });

    it('is case-sensitive for tags', async () => {
      const result = await service.getRecipesByTag('Italian');
      
      // Should not match 'italian' (lowercase)
      expect(result).toHaveLength(0);
    });
  });

  describe('getRelatedRecipes', () => {
    beforeEach(() => {
      (repository.getRecipeBySlug as Mock).mockImplementation((slug: string) => {
        return Promise.resolve(mockRecipes.find(r => r.slug === slug) || null);
      });
      (repository.getAllRecipeCards as Mock).mockResolvedValue(mockRecipeCards);
    });

    it('returns related recipes based on shared tags', async () => {
      const result = await service.getRelatedRecipes('spaghetti-carbonara');
      
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('lasagna');
      // Lasagna shares 2 tags with carbonara (italian, pasta)
      // Beef Wellington shares 1 tag (dinner)
    });

    it('excludes the current recipe from results', async () => {
      const result = await service.getRelatedRecipes('spaghetti-carbonara');
      
      expect(result.every(c => c.slug !== 'spaghetti-carbonara')).toBe(true);
    });

    it('sorts by number of matching tags (most matches first)', async () => {
      const result = await service.getRelatedRecipes('spaghetti-carbonara', 10);
      
      // Lasagna has 2 matching tags (italian, pasta)
      // Beef Wellington has 1 matching tag (dinner)
      expect(result[0].slug).toBe('lasagna');
      if (result.length > 1) {
        expect(result[1].slug).toBe('beef-wellington');
      }
    });

    it('respects the limit parameter', async () => {
      const result = await service.getRelatedRecipes('spaghetti-carbonara', 1);
      
      expect(result).toHaveLength(1);
    });

    it('uses default limit of 4', async () => {
      // Create more mock cards to test default limit
      const manyCards = [...mockRecipeCards];
      for (let i = 0; i < 10; i++) {
        manyCards.push({
          ...mockCard1,
          slug: `recipe-${i}`,
          title: `Recipe ${i}`,
          tags: ['italian'], // Share one tag with carbonara
        });
      }
      (repository.getAllRecipeCards as Mock).mockResolvedValue(manyCards);
      
      const result = await service.getRelatedRecipes('spaghetti-carbonara');
      
      expect(result).toHaveLength(4);
    });

    it('returns empty array when recipe not found', async () => {
      (repository.getRecipeBySlug as Mock).mockResolvedValue(null);
      
      const result = await service.getRelatedRecipes('nonexistent');
      
      expect(result).toHaveLength(0);
    });

    it('returns empty array when recipe has no tags', async () => {
      const recipeWithoutTags = { ...mockRecipe1, tags: [] };
      (repository.getRecipeBySlug as Mock).mockResolvedValue(recipeWithoutTags);
      
      const result = await service.getRelatedRecipes('spaghetti-carbonara');
      
      expect(result).toHaveLength(0);
    });

    it('returns empty array when no other recipes share tags', async () => {
      const uniqueRecipe = {
        ...mockRecipe1,
        tags: ['unique-tag-1', 'unique-tag-2'],
      };
      (repository.getRecipeBySlug as Mock).mockResolvedValue(uniqueRecipe);
      
      const result = await service.getRelatedRecipes('spaghetti-carbonara');
      
      expect(result).toHaveLength(0);
    });

    it('returns recipes when limit exceeds available matches', async () => {
      const result = await service.getRelatedRecipes('caesar-salad', 10);
      
      // Caesar salad shares no tags with others, should return empty
      expect(result).toHaveLength(0);
    });
  });
});

describe('createRecipeService', () => {
  it('creates a RecipeService instance', () => {
    const service = createRecipeService();
    
    expect(service).toBeInstanceOf(RecipeService);
  });

  it('creates service with default locale', async () => {
    (repository.getAllRecipes as Mock).mockResolvedValue([]);
    const service = createRecipeService();
    
    await service.getRecipes();
    
    expect(repository.getAllRecipes).toHaveBeenCalledWith('en');
  });

  it('creates service with custom locale', async () => {
    (repository.getAllRecipes as Mock).mockResolvedValue([]);
    const service = createRecipeService('nl');
    
    await service.getRecipes();
    
    expect(repository.getAllRecipes).toHaveBeenCalledWith('nl');
  });
});
