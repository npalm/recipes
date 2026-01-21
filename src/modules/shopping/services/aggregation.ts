/**
 * Ingredient Aggregation Service
 * Follows SOLID principles:
 * - Single Responsibility: Aggregates ingredients from multiple recipes
 * - Open/Closed: Extensible for new aggregation rules
 * - Dependency Inversion: Depends on abstractions (UnitConverter)
 */

import type { Recipe } from '@/modules/recipe/domain/types';
import type { Ingredient } from '@/modules/recipe/domain/types';
import type { ShoppingItem, IngredientSource } from '../domain/types';
import type { ScaledIngredient } from '@/modules/ingredient/domain/types';
import { UnitConverter } from './unitConverter';
import { scaleIngredient } from '@/modules/ingredient/services/scaling';

/**
 * Generate a deterministic ID based on ingredient content
 * This ensures the same item gets the same ID across page reloads
 */
function generateId(name: string, sources: Array<{slug: string}> = []): string {
  const sourceKeys = sources.map(s => s.slug).sort().join(',');
  const combined = `${name.toLowerCase().trim()}|${sourceKeys}`;
  
  // Simple hash function for generating consistent IDs
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `item-${Math.abs(hash)}`;
}

/**
 * Service for aggregating ingredients from multiple recipes into a shopping list
 */
export class IngredientAggregator {
  private unitConverter: UnitConverter;

  constructor(unitConverter: UnitConverter = new UnitConverter()) {
    this.unitConverter = unitConverter;
  }

  /**
   * Aggregate ingredients from multiple recipes
   * @param recipes Array of recipes to aggregate
   * @param servings Array of serving sizes for each recipe (same order as recipes)
   * @returns Aggregated shopping items sorted alphabetically
   */
  aggregate(recipes: Recipe[], servings: number[]): ShoppingItem[] {
    if (recipes.length !== servings.length) {
      throw new Error('Recipes and servings arrays must have the same length');
    }

    // Step 1: Extract and scale all ingredients from all recipes
    const allIngredients = this.extractAllIngredients(recipes, servings);

    // Step 2: Group ingredients by normalized name
    const groupedIngredients = this.groupByName(allIngredients);

    // Step 3: Merge ingredients within each group
    const mergedItems = this.mergeGroups(groupedIngredients);

    // Step 4: Sort alphabetically by display name
    return mergedItems.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Extract all ingredients from all recipes and scale them
   */
  private extractAllIngredients(
    recipes: Recipe[],
    servings: number[]
  ): Array<{
    ingredient: Ingredient;
    source: IngredientSource;
  }> {
    const result: Array<{ ingredient: Ingredient; source: IngredientSource }> = [];

    recipes.forEach((recipe, index) => {
      const targetServings = servings[index];
      const originalServings = recipe.servings;

      // Handle both simple and component-based recipes
      const ingredients = this.getAllIngredientsFromRecipe(recipe);

      ingredients.forEach((ingredient) => {
        // Scale the ingredient if needed
        let scaledIngredient: Ingredient;
        
        if (targetServings !== originalServings) {
          const scaled: ScaledIngredient = scaleIngredient(ingredient, originalServings, targetServings);
          scaledIngredient = {
            ...ingredient,
            quantity: scaled.scaledQuantity ?? ingredient.quantity,
            quantityMax: scaled.scaledQuantityMax ?? ingredient.quantityMax,
          };
        } else {
          scaledIngredient = ingredient;
        }

        result.push({
          ingredient: scaledIngredient,
          source: {
            slug: recipe.slug,
            title: recipe.title,
            servings: targetServings,
          },
        });
      });
    });

    return result;
  }

  /**
   * Get all ingredients from a recipe (handles both simple and component-based)
   */
  private getAllIngredientsFromRecipe(recipe: Recipe): Ingredient[] {
    const ingredients: Ingredient[] = [];

    // Add top-level ingredients if present
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      ingredients.push(...recipe.ingredients);
    }

    // Add component ingredients if present
    if (recipe.components && recipe.components.length > 0) {
      recipe.components.forEach((component) => {
        if (component.ingredients) {
          ingredients.push(...component.ingredients);
        }
      });
    }

    return ingredients;
  }

  /**
   * Group ingredients by normalized name
   */
  private groupByName(
    items: Array<{ ingredient: Ingredient; source: IngredientSource }>
  ): Map<string, Array<{ ingredient: Ingredient; source: IngredientSource }>> {
    const groups = new Map<
      string,
      Array<{ ingredient: Ingredient; source: IngredientSource }>
    >();

    items.forEach((item) => {
      const normalizedName = this.normalizeName(item.ingredient.name);
      
      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      
      groups.get(normalizedName)!.push(item);
    });

    return groups;
  }

  /**
   * Normalize ingredient name for comparison
   * Simple approach: lowercase and trim
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * Merge ingredients within a group
   * Attempts to combine quantities if units are compatible
   */
  private mergeGroups(
    groups: Map<string, Array<{ ingredient: Ingredient; source: IngredientSource }>>
  ): ShoppingItem[] {
    const items: ShoppingItem[] = [];

    groups.forEach((group, normalizedName) => {
      // Get display name from first occurrence (preserves original casing)
      const displayName = group[0].ingredient.name;

      // Collect all sources
      const sources = group.map((item) => item.source);

      // Try to merge quantities
      const mergedItem = this.mergeQuantities(group, normalizedName, displayName, sources);
      items.push(mergedItem);
    });

    return items;
  }

  /**
   * Merge quantities from multiple ingredient instances
   * If units are compatible, combine them
   * If not, keep as separate entries or handle specially
   */
  private mergeQuantities(
    group: Array<{ ingredient: Ingredient; source: IngredientSource }>,
    normalizedName: string,
    displayName: string,
    sources: IngredientSource[]
  ): ShoppingItem {
    // Separate items with quantities from those without
    const withQuantity = group.filter((item) => item.ingredient.quantity !== undefined);
    const withoutQuantity = group.filter((item) => item.ingredient.quantity === undefined);

    // If all items have no quantity, return a simple item
    if (withQuantity.length === 0) {
      const notes = this.combineNotes(group.map((item) => item.ingredient.notes));
      return {
        id: generateId(normalizedName, sources),
        name: normalizedName,
        displayName,
        notes,
        sources,
      };
    }

    // Group by unit to merge compatible quantities
    const unitGroups = new Map<string, typeof withQuantity>();
    
    withQuantity.forEach((item) => {
      const unit = (item.ingredient.unit || '').toLowerCase().trim();
      if (!unitGroups.has(unit)) {
        unitGroups.set(unit, []);
      }
      unitGroups.get(unit)!.push(item);
    });

    // If all items have the same unit (or no unit), merge them
    if (unitGroups.size === 1) {
      const [unit, items] = Array.from(unitGroups.entries())[0];
      const totalQuantity = items.reduce(
        (sum, item) => sum + (item.ingredient.quantity || 0),
        0
      );

      // Also sum quantityMax if any items have it
      const totalQuantityMax = items.some(item => item.ingredient.quantityMax)
        ? items.reduce((sum, item) => sum + (item.ingredient.quantityMax || item.ingredient.quantity || 0), 0)
        : undefined;

      // Try to convert to a better unit
      const converted = this.unitConverter.convertToBetterUnit(
        totalQuantity,
        unit || undefined
      );

      const convertedMax = totalQuantityMax !== undefined
        ? this.unitConverter.convertToBetterUnit(totalQuantityMax, unit || undefined)
        : undefined;

      const notes = this.combineNotes([
        ...items.map((item) => item.ingredient.notes),
        ...withoutQuantity.map((item) => item.ingredient.notes),
      ]);

      return {
        id: generateId(normalizedName, sources),
        name: normalizedName,
        displayName,
        quantity: converted.quantity,
        quantityMax: convertedMax?.quantity,
        unit: converted.unit || undefined,
        notes,
        sources,
      };
    }

    // Try to merge units that are compatible (e.g., ml + L)
    const mergedUnits = this.tryMergeCompatibleUnits(unitGroups);
    
    if (mergedUnits.length === 1) {
      const notes = this.combineNotes([
        ...withQuantity.map((item) => item.ingredient.notes),
        ...withoutQuantity.map((item) => item.ingredient.notes),
      ]);

      return {
        id: generateId(normalizedName, sources),
        name: normalizedName,
        displayName,
        quantity: mergedUnits[0].quantity,
        unit: mergedUnits[0].unit,
        notes,
        sources,
      };
    }

    // Multiple incompatible units - keep the first one and add a note
    const firstUnit = Array.from(unitGroups.values())[0];
    const totalQuantity = firstUnit.reduce(
      (sum, item) => sum + (item.ingredient.quantity || 0),
      0
    );

    const otherUnits = Array.from(unitGroups.entries())
      .slice(1)
      .map(([unit, items]) => {
        const qty = items.reduce((sum, item) => sum + (item.ingredient.quantity || 0), 0);
        return `${qty}${unit}`;
      })
      .join(', ');

    const notes = this.combineNotes([
      ...withQuantity.map((item) => item.ingredient.notes),
      ...withoutQuantity.map((item) => item.ingredient.notes),
      otherUnits ? `also needed: ${otherUnits}` : undefined,
    ]);

    return {
      id: generateId(normalizedName, sources),
      name: normalizedName,
      displayName,
      quantity: totalQuantity,
      unit: firstUnit[0].ingredient.unit,
      notes,
      sources,
    };
  }

  /**
   * Try to merge unit groups that have compatible units
   */
  private tryMergeCompatibleUnits(
    unitGroups: Map<string, Array<{ ingredient: Ingredient; source: IngredientSource }>>
  ): Array<{ quantity: number; unit: string }> {
    const units = Array.from(unitGroups.keys());
    
    // Check if all units are compatible
    let allCompatible = true;
    for (let i = 0; i < units.length - 1; i++) {
      if (!this.unitConverter.areUnitsCompatible(units[i] || undefined, units[i + 1] || undefined)) {
        allCompatible = false;
        break;
      }
    }

    if (!allCompatible) {
      return Array.from(unitGroups.entries()).map(([unit, items]) => ({
        quantity: items.reduce((sum, item) => sum + (item.ingredient.quantity || 0), 0),
        unit,
      }));
    }

    // All compatible - merge them
    let totalQuantity = 0;
    let baseUnit = units[0] || '';

    for (const [unit, items] of unitGroups.entries()) {
      const qty = items.reduce((sum, item) => sum + (item.ingredient.quantity || 0), 0);
      
      try {
        const result = this.unitConverter.addQuantities(totalQuantity, baseUnit, qty, unit);
        totalQuantity = result.quantity;
        baseUnit = result.unit;
      } catch {
        // If conversion fails, just add to total
        totalQuantity += qty;
      }
    }

    return [{ quantity: totalQuantity, unit: baseUnit }];
  }

  /**
   * Combine notes from multiple ingredients
   */
  private combineNotes(notes: (string | undefined)[]): string | undefined {
    const uniqueNotes = Array.from(
      new Set(notes.filter((note): note is string => note !== undefined && note.trim() !== ''))
    );

    return uniqueNotes.length > 0 ? uniqueNotes.join('; ') : undefined;
  }
}
