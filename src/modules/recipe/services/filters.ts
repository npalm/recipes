/**
 * Recipe Filtering Utilities
 *
 * Pure functions for filtering and sorting recipes.
 * These can be used on both client and server.
 */

import {
  Recipe,
  RecipeCard,
  RecipeFilters,
  RecipeSort,
  Difficulty,
} from '@/modules/recipe/domain';

/**
 * Difficulty order for sorting
 */
const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Filter recipes based on provided criteria
 */
export function filterRecipes(
  recipes: Recipe[],
  filters: RecipeFilters
): Recipe[] {
  return recipes.filter((recipe) => {
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(recipe.status)) {
        return false;
      }
    } else {
      // By default, only show published recipes
      if (recipe.status !== 'published') {
        return false;
      }
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) =>
        recipe.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Filter by difficulty
    if (filters.difficulty && filters.difficulty.length > 0) {
      if (!filters.difficulty.includes(recipe.difficulty)) {
        return false;
      }
    }

    // Filter by max total time
    if (filters.maxTotalTime !== undefined) {
      const totalTime = recipe.totalTime ?? recipe.prepTime + recipe.cookTime;
      if (totalTime > filters.maxTotalTime) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter recipe cards based on provided criteria
 */
export function filterRecipeCards(
  cards: RecipeCard[],
  filters: RecipeFilters
): RecipeCard[] {
  return cards.filter((card) => {
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(card.status)) {
        return false;
      }
    } else {
      if (card.status !== 'published') {
        return false;
      }
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) => card.tags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Filter by difficulty
    if (filters.difficulty && filters.difficulty.length > 0) {
      if (!filters.difficulty.includes(card.difficulty)) {
        return false;
      }
    }

    // Filter by max total time
    if (filters.maxTotalTime !== undefined) {
      if (card.totalTime > filters.maxTotalTime) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort recipes by specified field and direction
 */
export function sortRecipes(recipes: Recipe[], sort: RecipeSort): Recipe[] {
  const sorted = [...recipes];
  const direction = sort.direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'totalTime':
        const aTime = a.totalTime ?? a.prepTime + a.cookTime;
        const bTime = b.totalTime ?? b.prepTime + b.cookTime;
        comparison = aTime - bTime;
        break;
      case 'difficulty':
        comparison =
          DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        break;
    }

    return comparison * direction;
  });

  return sorted;
}

/**
 * Sort recipe cards by specified field and direction
 */
export function sortRecipeCards(
  cards: RecipeCard[],
  sort: RecipeSort
): RecipeCard[] {
  const sorted = [...cards];
  const direction = sort.direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'totalTime':
        comparison = a.totalTime - b.totalTime;
        break;
      case 'difficulty':
        comparison =
          DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        break;
      default:
        comparison = 0;
    }

    return comparison * direction;
  });

  return sorted;
}
