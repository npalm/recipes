/**
 * Ingredient Domain Types
 *
 * Core type definitions for ingredient parsing and scaling.
 */

/**
 * Common cooking units organized by type
 */
export const VOLUME_UNITS = [
  'ml',
  'l',
  'liter',
  'liters',
  'cup',
  'cups',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'fl oz',
  'fluid ounce',
  'fluid ounces',
  'pint',
  'pints',
  'quart',
  'quarts',
  'gallon',
  'gallons',
] as const;

export const WEIGHT_UNITS = [
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
] as const;

export const COUNT_UNITS = [
  'piece',
  'pieces',
  'slice',
  'slices',
  'clove',
  'cloves',
  'head',
  'heads',
  'bunch',
  'bunches',
  'sprig',
  'sprigs',
  'leaf',
  'leaves',
  'stalk',
  'stalks',
  'can',
  'cans',
  'jar',
  'jars',
  'package',
  'packages',
  'packet',
  'packets',
] as const;

export const APPROXIMATE_UNITS = [
  'pinch',
  'pinches',
  'dash',
  'dashes',
  'handful',
  'handfuls',
  'splash',
  'some',
  'to taste',
] as const;

export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type CountUnit = (typeof COUNT_UNITS)[number];
export type ApproximateUnit = (typeof APPROXIMATE_UNITS)[number];
export type IngredientUnit = VolumeUnit | WeightUnit | CountUnit | ApproximateUnit | string;

/**
 * Parsed ingredient structure
 */
export interface ParsedIngredient {
  raw: string;
  quantity?: number;
  quantityMax?: number; // For ranges like "2-3"
  unit?: string;
  name: string;
  notes?: string; // e.g., "finely chopped", "optional"
  scalable: boolean;
}

/**
 * Scaled ingredient (after applying serving multiplier)
 */
export interface ScaledIngredient extends ParsedIngredient {
  scaledQuantity?: number;
  scaledQuantityMax?: number;
  displayQuantity: string; // Formatted for display (e.g., "1/2", "2-3")
  originalServings: number;
  targetServings: number;
}

/**
 * Common fractions for display
 */
export const COMMON_FRACTIONS: Record<number, string> = {
  0.125: '1/8',
  0.25: '1/4',
  0.333: '1/3',
  0.375: '3/8',
  0.5: '1/2',
  0.625: '5/8',
  0.666: '2/3',
  0.75: '3/4',
  0.875: '7/8',
};

/**
 * Unit conversion rates to base units
 * Volume: ml, Weight: g
 */
export const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  // Volume to ml
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  liter: { base: 'ml', factor: 1000 },
  liters: { base: 'ml', factor: 1000 },
  tsp: { base: 'ml', factor: 5 },
  teaspoon: { base: 'ml', factor: 5 },
  teaspoons: { base: 'ml', factor: 5 },
  tbsp: { base: 'ml', factor: 15 },
  tablespoon: { base: 'ml', factor: 15 },
  tablespoons: { base: 'ml', factor: 15 },
  cup: { base: 'ml', factor: 240 },
  cups: { base: 'ml', factor: 240 },
  'fl oz': { base: 'ml', factor: 30 },
  'fluid ounce': { base: 'ml', factor: 30 },
  'fluid ounces': { base: 'ml', factor: 30 },
  pint: { base: 'ml', factor: 473 },
  pints: { base: 'ml', factor: 473 },
  quart: { base: 'ml', factor: 946 },
  quarts: { base: 'ml', factor: 946 },
  gallon: { base: 'ml', factor: 3785 },
  gallons: { base: 'ml', factor: 3785 },

  // Weight to g
  g: { base: 'g', factor: 1 },
  gram: { base: 'g', factor: 1 },
  grams: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  kilogram: { base: 'g', factor: 1000 },
  kilograms: { base: 'g', factor: 1000 },
  oz: { base: 'g', factor: 28.35 },
  ounce: { base: 'g', factor: 28.35 },
  ounces: { base: 'g', factor: 28.35 },
  lb: { base: 'g', factor: 453.6 },
  lbs: { base: 'g', factor: 453.6 },
  pound: { base: 'g', factor: 453.6 },
  pounds: { base: 'g', factor: 453.6 },
};
