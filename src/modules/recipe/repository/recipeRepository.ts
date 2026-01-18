/**
 * Recipe Repository
 *
 * Handles reading recipes from the file system.
 * Supports both real recipes and demo recipes.
 */

import fs from 'fs';
import path from 'path';
import { Recipe, RecipeCard } from '@/modules/recipe/domain';
import { parseRecipe, RecipeParseError } from '@/lib/markdown/parser';

/**
 * Configuration for the recipe repository
 */
export interface RecipeRepositoryConfig {
  contentDir: string;
  demoDir: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RecipeRepositoryConfig = {
  contentDir: path.join(process.cwd(), 'content', 'recipes'),
  demoDir: path.join(process.cwd(), 'content', 'demo'),
};

/**
 * Get the content directory based on demo mode
 */
function getContentDir(isDemo: boolean, config = DEFAULT_CONFIG): string {
  return isDemo ? config.demoDir : config.contentDir;
}

/**
 * Read all recipe slugs from the content directory
 */
export function getRecipeSlugs(
  isDemo = false,
  config = DEFAULT_CONFIG
): string[] {
  const contentDir = getContentDir(isDemo, config);

  try {
    if (!fs.existsSync(contentDir)) {
      return [];
    }

    const entries = fs.readdirSync(contentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => {
        // Check if directory contains an index.md file
        const indexPath = path.join(contentDir, name, 'index.md');
        return fs.existsSync(indexPath);
      });
  } catch (error) {
    console.error(`Failed to read recipe slugs: ${error}`);
    return [];
  }
}

/**
 * Read a single recipe by slug
 */
export function getRecipeBySlug(
  slug: string,
  isDemo = false,
  config = DEFAULT_CONFIG
): Recipe | null {
  const contentDir = getContentDir(isDemo, config);
  const recipePath = path.join(contentDir, slug, 'index.md');

  try {
    if (!fs.existsSync(recipePath)) {
      return null;
    }

    const content = fs.readFileSync(recipePath, 'utf-8');
    return parseRecipe(content, slug);
  } catch (error) {
    if (error instanceof RecipeParseError) {
      console.error(`Failed to parse recipe ${slug}: ${error.message}`);
    } else {
      console.error(`Failed to read recipe ${slug}: ${error}`);
    }
    return null;
  }
}

/**
 * Read all recipes
 */
export function getAllRecipes(
  isDemo = false,
  config = DEFAULT_CONFIG
): Recipe[] {
  const slugs = getRecipeSlugs(isDemo, config);
  const recipes: Recipe[] = [];

  for (const slug of slugs) {
    const recipe = getRecipeBySlug(slug, isDemo, config);
    if (recipe) {
      recipes.push(recipe);
    }
  }

  return recipes;
}

/**
 * Convert a Recipe to a RecipeCard (lighter data for listings)
 */
export function recipeToCard(recipe: Recipe): RecipeCard {
  return {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime ?? recipe.prepTime + recipe.cookTime,
    tags: recipe.tags,
    images: recipe.images,
    status: recipe.status,
  };
}

/**
 * Get all recipe cards (optimized for listing pages)
 */
export function getAllRecipeCards(
  isDemo = false,
  config = DEFAULT_CONFIG
): RecipeCard[] {
  const recipes = getAllRecipes(isDemo, config);
  return recipes.map(recipeToCard);
}

/**
 * Get all unique tags from all recipes
 */
export function getAllTags(isDemo = false, config = DEFAULT_CONFIG): string[] {
  const recipes = getAllRecipes(isDemo, config);
  const tagSet = new Set<string>();

  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Get recipe image path
 */
export function getRecipeImagePath(
  slug: string,
  imageName: string,
  isDemo = false
): string {
  const basePath = isDemo ? '/demo' : '/recipes';
  return `${basePath}/${slug}/images/${imageName}`;
}

/**
 * Check if a recipe exists
 */
export function recipeExists(
  slug: string,
  isDemo = false,
  config = DEFAULT_CONFIG
): boolean {
  const contentDir = getContentDir(isDemo, config);
  const recipePath = path.join(contentDir, slug, 'index.md');
  return fs.existsSync(recipePath);
}
