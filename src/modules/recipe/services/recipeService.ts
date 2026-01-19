/**
 * Recipe Service (Server-side only)
 *
 * This service uses file system operations and should only
 * be used in server components or server-side code.
 */

import {
  Recipe,
  RecipeCard,
  RecipeFilters,
  RecipeSort,
} from '@/modules/recipe/domain';
import {
  getAllRecipes,
  getAllRecipeCards,
  getRecipeBySlug,
  getAllTags,
  recipeToCard,
} from '@/modules/recipe/repository';
import {
  filterRecipes,
  filterRecipeCards,
  sortRecipes,
  sortRecipeCards,
} from './filters';

/**
 * Service class for recipe operations
 * NOTE: This class uses file system operations and can only be used server-side
 */
export class RecipeService {
  private locale: string;

  constructor(locale: string = 'en') {
    this.locale = locale;
  }

  /**
   * Get all recipes with optional filtering and sorting
   */
  getRecipes(filters?: RecipeFilters, sort?: RecipeSort): Recipe[] {
    let recipes = getAllRecipes(this.locale);

    if (filters) {
      recipes = filterRecipes(recipes, filters);
    }

    if (sort) {
      recipes = sortRecipes(recipes, sort);
    }

    return recipes;
  }

  /**
   * Get all recipe cards with optional filtering and sorting
   */
  getRecipeCards(filters?: RecipeFilters, sort?: RecipeSort): RecipeCard[] {
    let cards = getAllRecipeCards(this.locale);

    if (filters) {
      cards = filterRecipeCards(cards, filters);
    }

    if (sort) {
      cards = sortRecipeCards(cards, sort);
    }

    return cards;
  }

  /**
   * Get a single recipe by slug
   */
  getRecipe(slug: string): Recipe | null {
    return getRecipeBySlug(slug, this.locale);
  }

  /**
   * Get a recipe card by slug
   */
  getRecipeCard(slug: string): RecipeCard | null {
    const recipe = this.getRecipe(slug);
    return recipe ? recipeToCard(recipe) : null;
  }

  /**
   * Get all unique tags
   */
  getTags(): string[] {
    return getAllTags(this.locale);
  }

  /**
   * Get recipes by tag
   */
  getRecipesByTag(tag: string): Recipe[] {
    return this.getRecipes({ tags: [tag] });
  }

  /**
   * Get related recipes (same tags, excluding current)
   */
  getRelatedRecipes(slug: string, limit = 4): RecipeCard[] {
    const recipe = this.getRecipe(slug);
    if (!recipe || recipe.tags.length === 0) {
      return [];
    }

    const allCards = this.getRecipeCards();
    const related = allCards
      .filter((card) => card.slug !== slug)
      .map((card) => {
        const matchingTags = card.tags.filter((tag) =>
          recipe.tags.includes(tag)
        ).length;
        return { card, matchingTags };
      })
      .filter(({ matchingTags }) => matchingTags > 0)
      .sort((a, b) => b.matchingTags - a.matchingTags)
      .slice(0, limit)
      .map(({ card }) => card);

    return related;
  }
}

/**
 * Create a recipe service instance
 */
export function createRecipeService(locale: string = 'en'): RecipeService {
  return new RecipeService(locale);
}
