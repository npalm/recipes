/**
 * Ingredient Scaling Service
 *
 * Handles scaling ingredients based on serving adjustments.
 * Converts quantities and formats them for display.
 */

import {
  ParsedIngredient,
  ScaledIngredient,
  COMMON_FRACTIONS,
} from '../domain/types';

/**
 * Round a number to a reasonable precision for cooking
 */
function roundForCooking(value: number): number {
  if (value === 0) return 0;

  // For small values, round to 2 decimal places
  if (value < 1) {
    return Math.round(value * 100) / 100;
  }

  // For medium values, round to 1 decimal place
  if (value < 10) {
    return Math.round(value * 10) / 10;
  }

  // For larger values, round to nearest integer
  return Math.round(value);
}

/**
 * Find the closest common fraction to a decimal value
 */
function findClosestFraction(decimal: number): string | null {
  const fractionalPart = decimal % 1;
  if (fractionalPart === 0) return null;

  // Find the closest common fraction
  let closestFraction: string | null = null;
  let closestDiff = Infinity;

  for (const [value, fraction] of Object.entries(COMMON_FRACTIONS)) {
    const diff = Math.abs(fractionalPart - parseFloat(value));
    if (diff < closestDiff && diff < 0.05) {
      // Within 5% tolerance
      closestDiff = diff;
      closestFraction = fraction;
    }
  }

  return closestFraction;
}

/**
 * Format a quantity for display
 * Converts decimals to fractions where appropriate
 *
 * @example
 * formatQuantity(0.5) // "1/2"
 * formatQuantity(1.5) // "1 1/2"
 * formatQuantity(2.25) // "2 1/4"
 * formatQuantity(2.3) // "2.3"
 */
export function formatQuantity(value: number | undefined): string {
  if (value === undefined || value === null) return '';
  if (value === 0) return '0';

  const rounded = roundForCooking(value);
  const wholePart = Math.floor(rounded);
  const fraction = findClosestFraction(rounded);

  if (fraction) {
    if (wholePart === 0) {
      return fraction;
    }
    return `${wholePart} ${fraction}`;
  }

  // No close fraction found, use decimal
  if (rounded === wholePart) {
    return wholePart.toString();
  }

  return rounded.toString();
}

/**
 * Format a quantity range for display
 *
 * @example
 * formatQuantityRange(2, 3) // "2-3"
 * formatQuantityRange(0.5, 1) // "1/2-1"
 */
export function formatQuantityRange(
  min: number | undefined,
  max: number | undefined
): string {
  if (min === undefined && max === undefined) return '';
  if (min === undefined) return formatQuantity(max);
  if (max === undefined) return formatQuantity(min);

  return `${formatQuantity(min)}-${formatQuantity(max)}`;
}

/**
 * Scale a single ingredient based on serving adjustment
 */
export function scaleIngredient(
  ingredient: ParsedIngredient,
  originalServings: number,
  targetServings: number
): ScaledIngredient {
  const scaleFactor = targetServings / originalServings;

  let scaledQuantity: number | undefined;
  let scaledQuantityMax: number | undefined;
  let displayQuantity: string;

  if (ingredient.scalable && ingredient.quantity !== undefined) {
    scaledQuantity = ingredient.quantity * scaleFactor;
    scaledQuantityMax = ingredient.quantityMax
      ? ingredient.quantityMax * scaleFactor
      : undefined;

    displayQuantity = scaledQuantityMax
      ? formatQuantityRange(scaledQuantity, scaledQuantityMax)
      : formatQuantity(scaledQuantity);
  } else {
    // Non-scalable or no quantity
    scaledQuantity = ingredient.quantity;
    scaledQuantityMax = ingredient.quantityMax;
    displayQuantity = ingredient.quantityMax
      ? formatQuantityRange(ingredient.quantity, ingredient.quantityMax)
      : formatQuantity(ingredient.quantity);
  }

  return {
    ...ingredient,
    scaledQuantity,
    scaledQuantityMax,
    displayQuantity,
    originalServings,
    targetServings,
  };
}

/**
 * Scale multiple ingredients
 */
export function scaleIngredients(
  ingredients: ParsedIngredient[],
  originalServings: number,
  targetServings: number
): ScaledIngredient[] {
  // Validate inputs
  if (originalServings <= 0 || targetServings <= 0) {
    throw new Error('Servings must be positive numbers');
  }

  return ingredients.map((ingredient) =>
    scaleIngredient(ingredient, originalServings, targetServings)
  );
}

/**
 * Format a scaled ingredient for display
 *
 * @example
 * formatScaledIngredient(scaledIngredient)
 * // "1 1/2 cups all-purpose flour"
 */
export function formatScaledIngredient(ingredient: ScaledIngredient): string {
  const parts: string[] = [];

  if (ingredient.displayQuantity) {
    parts.push(ingredient.displayQuantity);
  }

  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }

  parts.push(ingredient.name);

  if (ingredient.notes) {
    parts.push(`(${ingredient.notes})`);
  }

  return parts.join(' ');
}

/**
 * Check if scaling would result in impractical quantities
 * (e.g., scaling down to 0.1 cups)
 */
export function isScalingPractical(
  ingredient: ScaledIngredient,
  minThreshold = 0.1
): boolean {
  if (!ingredient.scalable || ingredient.scaledQuantity === undefined) {
    return true;
  }

  return ingredient.scaledQuantity >= minThreshold;
}

/**
 * Suggest a practical serving count for scaling
 * Returns multiples that result in nice ingredient quantities
 */
export function suggestServingSizes(
  originalServings: number,
  maxSuggestions = 5
): number[] {
  const suggestions = new Set<number>();

  // Always include original
  suggestions.add(originalServings);

  // Half and double
  if (originalServings >= 2) {
    suggestions.add(Math.floor(originalServings / 2));
  }
  suggestions.add(originalServings * 2);

  // Common serving sizes
  [2, 4, 6, 8, 10, 12].forEach((size) => {
    if (size !== originalServings) {
      suggestions.add(size);
    }
  });

  return Array.from(suggestions)
    .sort((a, b) => a - b)
    .slice(0, maxSuggestions);
}
