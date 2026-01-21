/**
 * Instruction Domain Types
 * Type definitions for instruction scaling and parsing
 */

/**
 * A matched quantity pattern in instruction text
 */
export interface QuantityMatch {
  /** Original text including braces: "{{50ml}}" */
  original: string;
  /** Parsed numeric value: 50 */
  quantity: number;
  /** Optional max value for ranges: "{{10-15ml}}" */
  quantityMax?: number;
  /** Unit string: "ml", "g", "tbsp" */
  unit: string;
  /** Start position in text */
  startIndex: number;
  /** End position in text */
  endIndex: number;
  /** Whether this quantity should scale with servings */
  shouldScale: boolean;
}

/**
 * Text segment with scaling information
 */
export interface TextSegment {
  /** The text content */
  text: string;
  /** Whether this segment contains a scaled quantity */
  isScaled: boolean;
}
