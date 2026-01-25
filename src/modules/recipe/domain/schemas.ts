/**
 * Recipe Validation Schemas
 *
 * Zod schemas for validating recipe data.
 * Provides runtime validation and type inference.
 */

import { z } from 'zod';

/**
 * Difficulty enum schema
 */
export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

/**
 * Recipe status enum schema
 */
export const recipeStatusSchema = z.enum(['draft', 'published']);

/**
 * Recipe source schema (external links/inspirations)
 */
export const recipeSourceSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().optional(),
  importedAt: z.string().datetime().optional(),
});

/**
 * Recipe frontmatter schema (metadata from markdown files)
 */
export const recipeFrontmatterSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only'
    ),
  status: recipeStatusSchema.default('published'),
  servings: z
    .number()
    .int()
    .positive('Servings must be a positive integer')
    .max(100, 'Servings cannot exceed 100'),
  prepTime: z
    .number()
    .int()
    .nonnegative('Prep time cannot be negative')
    .max(2880, 'Prep time cannot exceed 48 hours'),
  cookTime: z
    .number()
    .int()
    .nonnegative('Cook time cannot be negative')
    .max(4320, 'Cook time cannot exceed 72 hours'),
  waitTime: z
    .number()
    .int()
    .nonnegative('Wait time cannot be negative')
    .max(10080, 'Wait time cannot exceed 7 days')
    .optional(),
  totalTime: z
    .number()
    .int()
    .nonnegative('Total time cannot be negative')
    .optional(),
  difficulty: difficultySchema,
  tags: z.array(z.string().min(1).max(50)).default([]),
  images: z.array(z.string()).default([]),
  headerImageRotation: z.boolean().default(true),
  sources: z.array(recipeSourceSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

/**
 * Ingredient schema
 */
export const ingredientSchema = z.object({
  raw: z.string().min(1, 'Ingredient text is required'),
  quantity: z.number().positive().optional(),
  quantityMax: z.number().positive().optional(),
  unit: z.string().optional(),
  name: z.string().min(1, 'Ingredient name is required'),
  notes: z.string().optional(),
  scalable: z.boolean().default(true),
});

/**
 * Component reference schema (for cross-recipe component references)
 */
export const componentReferenceSchema = z.object({
  type: z.enum(['recipe', 'library']),
  recipeSlug: z
    .string()
    .min(1, 'Recipe slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Recipe slug must be lowercase with hyphens only'
    ),
  componentSlug: z
    .string()
    .min(1, 'Component slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Component slug must be lowercase with hyphens only'
    ),
  sourceServings: z
    .number()
    .int()
    .positive('Source servings must be a positive integer'),
});

/**
 * Recipe component schema (sub-recipe)
 */
export const recipeComponentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      'Component slug must be lowercase with hyphens only'
    )
    .optional(),
  prepTime: z.number().int().nonnegative('Prep time cannot be negative').optional(),
  cookTime: z.number().int().nonnegative('Cook time cannot be negative').optional(),
  waitTime: z.number().int().nonnegative('Wait time cannot be negative').optional(),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.array(z.string().min(1)).default([]),
  reference: componentReferenceSchema.optional(),
});

/**
 * Full recipe schema
 * 
 * Supports two formats:
 * 1. Simple recipes: ingredients and instructions at top level
 * 2. Component-based: organized into named components (ingredients/instructions can be empty)
 */
export const recipeSchema = recipeFrontmatterSchema.extend({
  description: z.string().default(''),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.array(z.string().min(1)).default([]),
  components: z.array(recipeComponentSchema).optional(),
  notes: z.string().optional(),
  content: z.string(),
}).refine(
  (data) => {
    // Must have either top-level ingredients/instructions OR components
    const hasTopLevel = data.ingredients.length > 0 || data.instructions.length > 0;
    const hasComponents = data.components && data.components.length > 0;
    return hasTopLevel || hasComponents;
  },
  {
    message: 'Recipe must have either ingredients/instructions or components',
  }
);

/**
 * Recipe filter schema for search/filtering
 */
export const recipeFiltersSchema = z.object({
  tags: z.array(z.string()).optional(),
  difficulty: z.array(difficultySchema).optional(),
  maxTotalTime: z.number().positive().optional(),
  status: z.array(recipeStatusSchema).optional(),
  searchQuery: z.string().optional(),
});

/**
 * Type exports inferred from schemas
 */
export type DifficultySchema = z.infer<typeof difficultySchema>;
export type RecipeStatusSchema = z.infer<typeof recipeStatusSchema>;
export type RecipeSourceSchema = z.infer<typeof recipeSourceSchema>;
export type RecipeFrontmatterSchema = z.infer<typeof recipeFrontmatterSchema>;
export type IngredientSchema = z.infer<typeof ingredientSchema>;
export type ComponentReferenceSchema = z.infer<typeof componentReferenceSchema>;
export type RecipeComponentSchema = z.infer<typeof recipeComponentSchema>;
export type RecipeSchema = z.infer<typeof recipeSchema>;
export type RecipeFiltersSchema = z.infer<typeof recipeFiltersSchema>;

/**
 * Validation helper functions
 */
export function validateRecipeFrontmatter(data: unknown): RecipeFrontmatterSchema {
  return recipeFrontmatterSchema.parse(data);
}

export function validateRecipe(data: unknown): RecipeSchema {
  return recipeSchema.parse(data);
}

export function safeValidateRecipeFrontmatter(data: unknown) {
  return recipeFrontmatterSchema.safeParse(data);
}

export function safeValidateRecipe(data: unknown) {
  return recipeSchema.safeParse(data);
}
