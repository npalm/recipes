/**
 * Instruction Scaling Service
 * 
 * Parses {{quantity unit}} syntax in instruction text and scales quantities
 * proportionally when servings are adjusted.
 * 
 * @example
 * // Scaling quantities
 * scaleInstructionText("Add {{50ml}} water", 4, 2)
 * // Returns: "Add 25ml water"
 * 
 * scaleInstructionText("Cook for {{20 minutes}}", 4, 2)
 * // Returns: "Cook for 20 minutes" (time doesn't scale)
 */

import { QuantityMatch, TextSegment } from '../domain/types';
import { formatQuantity } from '@/modules/ingredient/services/scaling';

/**
 * Units that should NOT scale with servings
 */
const NON_SCALABLE_UNITS = new Set([
  // Time units
  'minute', 'minutes', 'min', 'mins',
  'hour', 'hours', 'hr', 'hrs',
  'second', 'seconds', 'sec', 'secs',
  // Temperature units
  '°c', '°f', 'c', 'f', 'degree', 'degrees', 'celsius', 'fahrenheit',
]);

/**
 * Check if a unit should scale with servings
 */
function shouldScaleUnit(unit: string): boolean {
  const normalized = unit.toLowerCase().trim();
  return !NON_SCALABLE_UNITS.has(normalized);
}

/**
 * Parse a fraction string to decimal
 * @example
 * parseFraction("1/2") => 0.5
 * parseFraction("1 1/2") => 1.5
 */
function parseFraction(str: string): number | null {
  // Match "1 1/2" or "1/2"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    return whole + numerator / denominator;
  }

  // Match "1/2"
  const simpleMatch = str.match(/^(\d+)\/(\d+)$/);
  if (simpleMatch) {
    const numerator = parseInt(simpleMatch[1], 10);
    const denominator = parseInt(simpleMatch[2], 10);
    return numerator / denominator;
  }

  return null;
}

/**
 * Parse a quantity string (handles decimals, fractions, ranges)
 * @example
 * parseQuantityString("50") => { quantity: 50 }
 * parseQuantityString("1/2") => { quantity: 0.5 }
 * parseQuantityString("10-15") => { quantity: 10, quantityMax: 15 }
 */
function parseQuantityString(str: string): { quantity: number; quantityMax?: number } | null {
  const trimmed = str.trim();

  // Check for range: "10-15"
  const rangeMatch = trimmed.match(/^([\d.\/\s]+)-([\d.\/\s]+)$/);
  if (rangeMatch) {
    const min = rangeMatch[1].trim();
    const max = rangeMatch[2].trim();

    const minValue = parseFraction(min) ?? parseFloat(min);
    const maxValue = parseFraction(max) ?? parseFloat(max);

    if (!isNaN(minValue) && !isNaN(maxValue)) {
      return { quantity: minValue, quantityMax: maxValue };
    }
  }

  // Try fraction first
  const fractionValue = parseFraction(trimmed);
  if (fractionValue !== null) {
    return { quantity: fractionValue };
  }

  // Try decimal
  const decimalValue = parseFloat(trimmed);
  if (!isNaN(decimalValue)) {
    return { quantity: decimalValue };
  }

  return null;
}

/**
 * Parse instruction text for {{...}} quantity patterns
 * 
 * @example
 * parseInstructionQuantities("Add {{50ml}} water and cook for {{20 minutes}}")
 * // Returns array with 2 matches
 */
export function parseInstructionQuantities(text: string): QuantityMatch[] {
  const matches: QuantityMatch[] = [];
  const pattern = /\{\{([^}]+)\}\}/g;
  
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const original = match[0]; // "{{50ml}}"
    const content = match[1].trim(); // "50ml"
    const startIndex = match.index;
    const endIndex = startIndex + original.length;

    // Try to parse: split into quantity and unit
    // Patterns to match:
    // - "50ml", "50 ml"
    // - "1/2 cup"
    // - "10-15g"
    // - "1 1/2 tbsp"
    const contentMatch = content.match(/^([\d.\/\s\-]+)\s*([a-zA-Z°]+)?\s*$/);
    
    if (!contentMatch) {
      // Malformed, skip
      continue;
    }

    const quantityStr = contentMatch[1];
    const unit = contentMatch[2] || '';

    const parsed = parseQuantityString(quantityStr);
    if (!parsed) {
      // Can't parse quantity, skip
      continue;
    }

    matches.push({
      original,
      quantity: parsed.quantity,
      quantityMax: parsed.quantityMax,
      unit,
      startIndex,
      endIndex,
      shouldScale: shouldScaleUnit(unit),
    });
  }

  return matches;
}

/**
 * Scale a single instruction text based on serving adjustment
 * 
 * @param instruction The instruction text with {{...}} annotations
 * @param originalServings Original serving count
 * @param targetServings Target serving count
 * @returns Scaled instruction text with {{...}} replaced
 * 
 * @example
 * scaleInstructionText("Add {{50ml}} water", 4, 2)
 * // Returns: "Add 25ml water"
 */
export function scaleInstructionText(
  instruction: string,
  originalServings: number,
  targetServings: number
): string {
  const matches = parseInstructionQuantities(instruction);
  
  if (matches.length === 0) {
    // No quantities to scale
    return instruction;
  }

  const scaleFactor = targetServings / originalServings;
  let result = '';
  let lastIndex = 0;

  for (const match of matches) {
    // Append text before this match
    result += instruction.slice(lastIndex, match.startIndex);

    if (match.shouldScale) {
      // Scale the quantity
      const scaledQuantity = match.quantity * scaleFactor;
      const scaledQuantityMax = match.quantityMax
        ? match.quantityMax * scaleFactor
        : undefined;

      // Format the scaled quantity
      const formattedQuantity = scaledQuantityMax
        ? `${formatQuantity(scaledQuantity)}-${formatQuantity(scaledQuantityMax)}`
        : formatQuantity(scaledQuantity);

      // Append scaled value with unit (add space before unit)
      result += match.unit ? `${formattedQuantity} ${match.unit}` : formattedQuantity;
    } else {
      // Don't scale (time/temperature), just remove braces
      const formattedQuantity = match.quantityMax
        ? `${formatQuantity(match.quantity)}-${formatQuantity(match.quantityMax)}`
        : formatQuantity(match.quantity);
      
      // For temperature symbols (°C, °F), don't add extra space
      const needsSpace = !match.unit.startsWith('°');
      result += match.unit
        ? `${formattedQuantity}${needsSpace ? ' ' : ''}${match.unit}`
        : formattedQuantity;
    }

    lastIndex = match.endIndex;
  }

  // Append remaining text
  result += instruction.slice(lastIndex);

  return result;
}

/**
 * Parse instruction text into segments with scaling information
 * Used for highlighting scaled quantities in the UI
 * 
 * @param original Original instruction text with {{...}}
 * @param scaled Scaled instruction text (output of scaleInstructionText)
 * @param originalServings Original serving count
 * @param targetServings Target serving count
 * @returns Array of text segments with isScaled flag
 */
export function parseInstructionSegments(
  original: string,
  scaled: string,
  originalServings: number,
  targetServings: number
): TextSegment[] {
  const matches = parseInstructionQuantities(original);
  
  if (matches.length === 0 || originalServings === targetServings) {
    // No scaling occurred
    return [{ text: scaled, isScaled: false }];
  }

  const segments: TextSegment[] = [];
  let lastOriginalIndex = 0;

  for (const match of matches) {
    // Add non-scaled text before this match
    if (match.startIndex > lastOriginalIndex) {
      const beforeText = original.slice(lastOriginalIndex, match.startIndex);
      segments.push({ text: beforeText, isScaled: false });
    }

    const scaleFactor = targetServings / originalServings;
    
    if (match.shouldScale) {
      // This was scaled - calculate new value
      const scaledQuantity = match.quantity * scaleFactor;
      const scaledQuantityMax = match.quantityMax
        ? match.quantityMax * scaleFactor
        : undefined;

      const formattedQuantity = scaledQuantityMax
        ? `${formatQuantity(scaledQuantity)}-${formatQuantity(scaledQuantityMax)}`
        : formatQuantity(scaledQuantity);

      const scaledText = match.unit ? `${formattedQuantity}${match.unit}` : formattedQuantity;
      segments.push({ text: scaledText, isScaled: true });
    } else {
      // This was NOT scaled (time/temperature) - keep original
      const formattedQuantity = match.quantityMax
        ? `${formatQuantity(match.quantity)}-${formatQuantity(match.quantityMax)}`
        : formatQuantity(match.quantity);
      
      const unscaledText = match.unit ? `${formattedQuantity} ${match.unit}` : formattedQuantity;
      segments.push({ text: unscaledText, isScaled: false });
    }

    lastOriginalIndex = match.endIndex;
  }

  // Add remaining text
  if (lastOriginalIndex < original.length) {
    segments.push({ text: original.slice(lastOriginalIndex), isScaled: false });
  }

  return segments;
}
