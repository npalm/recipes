/**
 * Shopping List URL Encoder/Decoder Service
 * Follows Single Responsibility Principle
 * Handles encoding and decoding shopping list data to/from URL-safe format
 */

import { shoppingListDataSchema } from '../domain/schemas';
import type { ShoppingListData } from '../domain/types';

/**
 * Service for encoding and decoding shopping list data in URLs
 * Uses Base64 encoding consistent with dinner planner approach
 */
export class ShoppingListEncoder {
  /**
   * Encode shopping list data to URL-safe string
   * @param data Shopping list data
   * @returns Base64 encoded URL-safe string
   * @throws Error if data is invalid
   */
  encode(data: ShoppingListData): string {
    // Validate data
    const validated = shoppingListDataSchema.parse(data);

    // Convert to JSON
    const json = JSON.stringify(validated);

    // Encode to Base64
    const base64 = this.toBase64(json);

    // Make URL-safe
    const urlSafe = encodeURIComponent(base64);

    return urlSafe;
  }

  /**
   * Decode URL parameter to shopping list data
   * @param encoded URL-safe encoded string
   * @returns Decoded shopping list data or null if invalid
   */
  decode(encoded: string): ShoppingListData | null {
    try {
      // Decode URL encoding
      const base64 = decodeURIComponent(encoded);

      // Decode Base64
      const json = this.fromBase64(base64);

      // Parse JSON
      const data = JSON.parse(json);

      // Validate against schema
      const validated = shoppingListDataSchema.parse(data);

      return validated;
    } catch (error) {
      console.error('Failed to decode shopping list data:', error);
      return null;
    }
  }

  /**
   * Convert string to Base64 (works in both browser and Node.js)
   */
  private toBase64(str: string): string {
    if (typeof window !== 'undefined') {
      // Browser environment
      return btoa(str);
    } else {
      // Node.js environment
      return Buffer.from(str, 'utf-8').toString('base64');
    }
  }

  /**
   * Convert Base64 to string (works in both browser and Node.js)
   */
  private fromBase64(base64: string): string {
    if (typeof window !== 'undefined') {
      // Browser environment
      return atob(base64);
    } else {
      // Node.js environment
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
  }

  /**
   * Generate a shareable URL for a shopping list
   * @param data Shopping list data
   * @param locale Current locale (e.g., 'en', 'nl')
   * @param origin Window origin (e.g., 'https://example.com')
   * @returns Complete URL
   */
  generateUrl(data: ShoppingListData, locale: string, origin: string): string {
    const encoded = this.encode(data);
    return `${origin}/${locale}/shopping/${encoded}`;
  }
}
