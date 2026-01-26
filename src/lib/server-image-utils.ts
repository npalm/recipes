/**
 * Server-side image utility functions
 * These can only be used in Server Components and API routes
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Cache for file hashes to avoid re-computing
 */
const hashCache = new Map<string, string>();

/**
 * Generate a content-based hash for an image file (SERVER-SIDE ONLY)
 * 
 * @param imagePath - Relative path from project root
 * @returns Short hash of the file content (first 8 chars of MD5)
 */
export function getImageHash(imagePath: string): string {
  if (hashCache.has(imagePath)) {
    return hashCache.get(imagePath)!;
  }

  try {
    const fullPath = path.join(process.cwd(), imagePath);
    const fileBuffer = fs.readFileSync(fullPath);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const shortHash = hash.substring(0, 8);
    
    hashCache.set(imagePath, shortHash);
    return shortHash;
  } catch (error) {
    console.warn(`Failed to generate hash for image: ${imagePath}`, error);
    return '';
  }
}

/**
 * Get a versioned URL for a recipe image (SERVER-SIDE ONLY)
 * 
 * @param recipeSlug - Recipe slug
 * @param imageName - Image filename  
 * @returns Versioned URL path with query parameter
 */
export function getVersionedRecipeImageUrl(recipeSlug: string, imageName: string): string {
  const imagePath = `content/recipes/${recipeSlug}/images/${imageName}`;
  const hash = getImageHash(imagePath);
  const url = `/content/recipes/${recipeSlug}/images/${imageName}`;
  return hash ? `${url}?v=${hash}` : url;
}
