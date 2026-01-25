/**
 * Recipe Domain Types
 *
 * Core type definitions for the recipe module.
 * These types represent the domain model and are used throughout the application.
 */

/**
 * Difficulty level for a recipe
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Recipe status - draft recipes are not yet ready for publication
 */
export type RecipeStatus = 'draft' | 'published';

/**
 * Source reference for a recipe (original inspiration, video tutorial, etc.)
 */
export interface RecipeSource {
  url: string;
  title?: string;
  importedAt?: string;
}

/**
 * Recipe metadata extracted from frontmatter
 */
export interface RecipeMetadata {
  title: string;
  slug: string;
  status: RecipeStatus;
  servings: number;
  prepTime: number; // Active preparation time in minutes
  cookTime: number; // Active cooking time in minutes
  waitTime?: number; // Passive waiting time in minutes (marinating, chilling, brining)
  totalTime?: number; // Total time in minutes, auto-calculated if omitted
  difficulty: Difficulty;
  tags: string[];
  images: string[];
  headerImageRotation: boolean;
  sources: RecipeSource[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Parsed ingredient with structured data for scaling
 */
export interface Ingredient {
  raw: string; // Original text
  quantity?: number;
  quantityMax?: number; // For ranges like "2-3 cups"
  unit?: string;
  name: string;
  notes?: string;
  scalable: boolean; // Whether this ingredient scales with servings
}

/**
 * Reference to a component from another recipe or shared component library
 */
export interface ComponentReference {
  type: 'recipe' | 'library'; // 'recipe' for cross-recipe refs, 'library' for future shared components
  recipeSlug: string; // Source recipe slug (or component slug for library type)
  componentSlug: string; // Component slug in source recipe
  sourceServings: number; // Original servings for scaling calculations
}

/**
 * A recipe component (sub-recipe) with its own ingredients and instructions
 * Examples: "Sauce", "Marinade", "Dressing", "Assembly"
 */
export interface RecipeComponent {
  name: string; // e.g., "Salsa Verde", "Seasoned Beef", "Assembly"
  slug?: string; // Optional English slug for cross-recipe references (e.g., "beetroot-tartare")
  prepTime?: number; // Active preparation time in minutes (optional)
  cookTime?: number; // Active cooking time in minutes (optional)
  waitTime?: number; // Passive waiting time in minutes (optional, for marinating, chilling, etc.)
  ingredients: Ingredient[];
  instructions: string[];
  reference?: ComponentReference; // If this component references another component
}

/**
 * Full recipe including content
 * 
 * Recipes can be either:
 * 1. Simple: ingredients and instructions at top level
 * 2. Component-based: organized into named components (e.g., Sauce, Meat, Assembly)
 *    When components exist, top-level ingredients/instructions are empty
 */
export interface Recipe extends RecipeMetadata {
  description: string;
  ingredients: Ingredient[];
  instructions: string[]; // Each step as a separate string
  components?: RecipeComponent[]; // Optional component-based structure
  notes?: string;
  content: string; // Raw markdown content (for rendering)
}

/**
 * Recipe card data (lighter version for listing)
 */
export interface RecipeCard {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  tags: string[];
  images: string[];
  status: RecipeStatus;
}

/**
 * Recipe filter options
 */
export interface RecipeFilters {
  tags?: string[];
  difficulty?: Difficulty[];
  maxTotalTime?: number;
  status?: RecipeStatus[];
  searchQuery?: string;
}

/**
 * Recipe sort options
 */
export type RecipeSortField = 'title' | 'createdAt' | 'totalTime' | 'difficulty';
export type SortDirection = 'asc' | 'desc';

export interface RecipeSort {
  field: RecipeSortField;
  direction: SortDirection;
}
