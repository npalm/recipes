/**
 * Ingredient Parser Service
 *
 * Parses raw ingredient strings into structured data.
 * Handles various formats: "2 cups flour", "1/2 lb beef", "salt to taste", etc.
 */

import {
  ParsedIngredient,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  COUNT_UNITS,
  APPROXIMATE_UNITS,
} from '../domain/types';

// Build regex pattern for all known units
const ALL_UNITS = [
  ...VOLUME_UNITS,
  ...WEIGHT_UNITS,
  ...COUNT_UNITS,
  ...APPROXIMATE_UNITS,
];

// Sort by length descending to match longer units first (e.g., "tablespoons" before "tbsp")
const UNIT_PATTERN = ALL_UNITS.sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

// Patterns for parsing
const FRACTION_PATTERN = /(\d+)\s*\/\s*(\d+)/;
const MIXED_NUMBER_PATTERN = /(\d+)\s+(\d+)\s*\/\s*(\d+)/;
const DECIMAL_PATTERN = /(\d+(?:\.\d+)?)/;
const RANGE_PATTERN = /(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*[-–—to]+\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)/i;

/**
 * Convert a fraction string to a decimal number
 */
function fractionToDecimal(fraction: string): number {
  const mixedMatch = fraction.match(MIXED_NUMBER_PATTERN);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator === 0) return whole;
    return whole + numerator / denominator;
  }

  const fractionMatch = fraction.match(FRACTION_PATTERN);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  const decimal = parseFloat(fraction);
  return isNaN(decimal) ? 0 : decimal;
}

/**
 * Extract quantity from the start of an ingredient string
 * Returns the quantity (or range) and the remaining string
 */
function extractQuantity(text: string): {
  quantity?: number;
  quantityMax?: number;
  remaining: string;
} {
  const trimmed = text.trim();

  // Check for range first (e.g., "2-3", "1/2 - 1")
  const rangeMatch = trimmed.match(new RegExp(`^${RANGE_PATTERN.source}`, 'i'));
  if (rangeMatch) {
    const quantity = fractionToDecimal(rangeMatch[1]);
    const quantityMax = fractionToDecimal(rangeMatch[2]);
    const remaining = trimmed.slice(rangeMatch[0].length).trim();
    return { quantity, quantityMax, remaining };
  }

  // Check for mixed number (e.g., "1 1/2")
  const mixedMatch = trimmed.match(new RegExp(`^${MIXED_NUMBER_PATTERN.source}`));
  if (mixedMatch) {
    const quantity = fractionToDecimal(mixedMatch[0]);
    const remaining = trimmed.slice(mixedMatch[0].length).trim();
    return { quantity, remaining };
  }

  // Check for fraction (e.g., "1/2")
  const fractionMatch = trimmed.match(new RegExp(`^${FRACTION_PATTERN.source}`));
  if (fractionMatch) {
    const quantity = fractionToDecimal(fractionMatch[0]);
    const remaining = trimmed.slice(fractionMatch[0].length).trim();
    return { quantity, remaining };
  }

  // Check for decimal (e.g., "2", "2.5")
  const decimalMatch = trimmed.match(new RegExp(`^${DECIMAL_PATTERN.source}`));
  if (decimalMatch) {
    const quantity = parseFloat(decimalMatch[0]);
    const remaining = trimmed.slice(decimalMatch[0].length).trim();
    return { quantity, remaining };
  }

  return { remaining: trimmed };
}

/**
 * Extract unit from the start of a string
 */
function extractUnit(text: string): { unit?: string; remaining: string } {
  const trimmed = text.trim().toLowerCase();
  const unitRegex = new RegExp(`^(${UNIT_PATTERN})\\b`, 'i');
  const match = trimmed.match(unitRegex);

  if (match) {
    const unit = match[1].toLowerCase();
    const remaining = text.trim().slice(match[0].length).trim();
    return { unit, remaining };
  }

  return { remaining: text.trim() };
}

/**
 * Extract notes in parentheses from ingredient text
 */
function extractNotes(text: string): { name: string; notes?: string } {
  const parenMatch = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), notes: parenMatch[2].trim() };
  }

  // Check for comma-separated notes (e.g., "onion, finely diced")
  const commaMatch = text.match(/^(.+?),\s*(.+)$/);
  if (commaMatch) {
    const potentialName = commaMatch[1].trim();
    const potentialNotes = commaMatch[2].trim();
    // Only treat as notes if it looks like a preparation instruction
    const prepWords = /^(finely|roughly|thinly|freshly|coarsely|diced|chopped|minced|sliced|grated|peeled|crushed|optional|to taste|room temperature|softened|melted)/i;
    if (prepWords.test(potentialNotes)) {
      return { name: potentialName, notes: potentialNotes };
    }
  }

  return { name: text.trim() };
}

/**
 * Determine if an ingredient should scale with servings
 */
function isScalable(
  unit: string | undefined,
  notes: string | undefined,
  name: string
): boolean {
  // Non-scalable keywords
  const nonScalablePatterns = [
    /to taste/i,
    /as needed/i,
    /optional/i,
    /for (garnish|serving|decoration)/i,
  ];

  const textToCheck = [notes, name].filter(Boolean).join(' ');
  if (nonScalablePatterns.some((p) => p.test(textToCheck))) {
    return false;
  }

  // Approximate units are typically not scaled precisely
  if (unit && APPROXIMATE_UNITS.includes(unit as typeof APPROXIMATE_UNITS[number])) {
    return false;
  }

  return true;
}

/**
 * Remove the {scale} marker from ingredient text
 */
function removeScaleMarker(text: string): { text: string; hasMarker: boolean } {
  const marker = /{scale}/i;
  const hasMarker = marker.test(text);
  return { text: text.replace(marker, '').trim(), hasMarker };
}

/**
 * Parse a raw ingredient string into structured data
 *
 * @example
 * parseIngredient("2 cups all-purpose flour")
 * // { raw: "2 cups all-purpose flour", quantity: 2, unit: "cups", name: "all-purpose flour", scalable: true }
 *
 * parseIngredient("1/2 - 1 tsp salt")
 * // { raw: "1/2 - 1 tsp salt", quantity: 0.5, quantityMax: 1, unit: "tsp", name: "salt", scalable: true }
 *
 * parseIngredient("salt to taste")
 * // { raw: "salt to taste", name: "salt", notes: "to taste", scalable: false }
 */
export function parseIngredient(raw: string): ParsedIngredient {
  if (!raw || typeof raw !== 'string') {
    return { raw: '', name: '', scalable: false };
  }

  const { text: cleanedText, hasMarker } = removeScaleMarker(raw);

  // Extract quantity
  const { quantity, quantityMax, remaining: afterQuantity } =
    extractQuantity(cleanedText);

  // Extract unit
  const { unit, remaining: afterUnit } = extractUnit(afterQuantity);

  // Extract notes and name
  const { name, notes } = extractNotes(afterUnit);

  // Determine if scalable
  const scalable = hasMarker || isScalable(unit, notes, name);

  return {
    raw: raw.trim(),
    quantity,
    quantityMax,
    unit,
    name: name || raw.trim(),
    notes,
    scalable,
  };
}

/**
 * Parse multiple ingredient strings
 */
export function parseIngredients(ingredients: string[]): ParsedIngredient[] {
  return ingredients.map(parseIngredient);
}

/**
 * Parse ingredients from markdown list format
 * Handles lines starting with "- " or "* "
 */
export function parseIngredientsFromMarkdown(markdown: string): ParsedIngredient[] {
  const lines = markdown.split('\n');
  const ingredients: ParsedIngredient[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match list items
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      ingredients.push(parseIngredient(listMatch[1]));
    }
  }

  return ingredients;
}
