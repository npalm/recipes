/**
 * Recipe Repository
 *
 * Handles reading recipes from the file system.
 */

import fs from 'fs';
import path from 'path';
import { Recipe, RecipeCard } from '@/modules/recipe/domain';
import { parseRecipe, RecipeParseError } from '@/lib/markdown/parser';
import { resolveComponentReferences } from '@/modules/recipe/services/componentResolver';

/**
 * Configuration for the recipe repository
 */
export interface RecipeRepositoryConfig {
  contentDir: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RecipeRepositoryConfig = {
  contentDir: path.join(process.cwd(), 'content', 'recipes'),
};

/**
 * Read all recipe slugs from the content directory
 */
export function getRecipeSlugs(
  locale: string = 'en',
  config = DEFAULT_CONFIG
): string[] {
  const contentDir = config.contentDir;

  try {
    if (!fs.existsSync(contentDir)) {
      return [];
    }

    const entries = fs.readdirSync(contentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => {
        // Check if directory contains an index.{locale}.md file
        const indexPath = path.join(contentDir, name, `index.${locale}.md`);
        return fs.existsSync(indexPath);
      });
  } catch (error) {
    console.error(`Failed to read recipe slugs: ${error}`);
    return [];
  }
}

/**
 * Read a single recipe by slug
 * Note: This function is async to support component reference resolution
 */
export async function getRecipeBySlug(
  slug: string,
  locale: string = 'en',
  config = DEFAULT_CONFIG
): Promise<Recipe | null> {
  const contentDir = config.contentDir;
  const recipePath = path.join(contentDir, slug, `index.${locale}.md`);

  try {
    if (!fs.existsSync(recipePath)) {
      return null;
    }

    const content = fs.readFileSync(recipePath, 'utf-8');
    let recipe = parseRecipe(content, slug);

    // Resolve component references if any exist
    if (recipe.components?.some((c) => c.reference)) {
      recipe = await resolveComponentReferences(
        recipe,
        { getRecipeBySlug: (s, l) => getRecipeBySlug(s, l, config) },
        { locale }
      );
    }

    return recipe;
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
 * Note: This function is async to support component reference resolution
 */
export async function getAllRecipes(
  locale: string = 'en',
  config = DEFAULT_CONFIG
): Promise<Recipe[]> {
  const slugs = getRecipeSlugs(locale, config);
  const recipes: Recipe[] = [];

  for (const slug of slugs) {
    const recipe = await getRecipeBySlug(slug, locale, config);
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
export async function getAllRecipeCards(
  locale: string = 'en',
  config = DEFAULT_CONFIG
): Promise<RecipeCard[]> {
  const recipes = await getAllRecipes(locale, config);
  return recipes.map(recipeToCard);
}

/**
 * Get all unique tags from all recipes
 */
export async function getAllTags(
  locale: string = 'en',
  config = DEFAULT_CONFIG
): Promise<string[]> {
  const recipes = await getAllRecipes(locale, config);
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
export function getRecipeImagePath(slug: string, imageName: string): string {
  return `/content/recipes/${slug}/images/${imageName}`;
}

/**
 * Check if a recipe exists
 */
export function recipeExists(
  slug: string,
  locale: string = 'en',
  config = DEFAULT_CONFIG
): boolean {
  const contentDir = config.contentDir;
  const recipePath = path.join(contentDir, slug, `index.${locale}.md`);
  return fs.existsSync(recipePath);
}
