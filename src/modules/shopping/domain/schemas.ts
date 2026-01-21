/**
 * Shopping list domain schemas using Zod
 * Provides validation for data structures
 */

import { z } from 'zod';

/**
 * Schema for recipe reference in shopping list
 */
export const recipeReferenceSchema = z.object({
  slug: z.string().min(1, 'Recipe slug is required'),
  servings: z.number().int().min(1).max(100),
});

/**
 * Schema for shopping list data (URL payload)
 */
export const shoppingListDataSchema = z.object({
  title: z.string().min(1).max(200),
  recipes: z.array(recipeReferenceSchema).min(1, 'At least one recipe is required'),
});

/**
 * Type inference from schemas
 */
export type RecipeReferenceSchema = z.infer<typeof recipeReferenceSchema>;
export type ShoppingListDataSchema = z.infer<typeof shoppingListDataSchema>;
