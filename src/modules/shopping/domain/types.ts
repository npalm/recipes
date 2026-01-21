/**
 * Shopping list domain types
 * Follows SOLID principles with clear separation of concerns
 */

/**
 * Reference to a recipe with its serving size
 */
export type RecipeReference = {
  slug: string;
  servings: number;
};

/**
 * Data structure for a shopping list (encoded in URL)
 */
export type ShoppingListData = {
  title: string;
  recipes: RecipeReference[];
};

/**
 * Source recipe information for an ingredient
 */
export type IngredientSource = {
  slug: string;
  title: string;
  servings: number;
};

/**
 * Aggregated shopping list item
 */
export type ShoppingItem = {
  /** Normalized ingredient name (lowercase, trimmed) */
  name: string;
  /** Display name (original casing) */
  displayName: string;
  /** Merged quantity */
  quantity?: number;
  /** Maximum quantity for ranges */
  quantityMax?: number;
  /** Unit of measurement */
  unit?: string;
  /** Additional notes or modifiers */
  notes?: string;
  /** Source recipes that need this ingredient */
  sources: IngredientSource[];
  /** Unique identifier for this item */
  id: string;
};

/**
 * Checked state for shopping items
 */
export type ShoppingListState = {
  [itemId: string]: boolean;
};
