import { z } from 'zod';
import { recipeSlugSchema } from '@/modules/shopping/domain/schemas';
import { decodeSharedData, encodeSharedData } from '@/lib/share-codec';

export const dinnerDataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  recipes: z.array(recipeSlugSchema).min(1).max(30),
});

export function encodeDinnerData(data: z.input<typeof dinnerDataSchema>): string {
  return encodeSharedData(dinnerDataSchema.parse(data));
}

export function decodeDinnerData(encoded: string) {
  try {
    return dinnerDataSchema.parse(decodeSharedData(encoded));
  } catch {
    return null;
  }
}
