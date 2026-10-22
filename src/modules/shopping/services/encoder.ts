/**
 * Shopping List URL Encoder/Decoder Service
 * Follows Single Responsibility Principle
 * Handles encoding and decoding shopping list data to/from URL-safe format
 */

import { encodeSharedData, decodeSharedData } from '@/lib/share-codec';
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

    return encodeSharedData(validated);
  }

  decode(encoded: string): ShoppingListData | null {
    try {
      return shoppingListDataSchema.parse(decodeSharedData(encoded));
    } catch {
      return null;
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
