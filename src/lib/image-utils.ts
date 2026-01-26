/**
 * Image utility functions for cache busting and optimization
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Check if an image path is an external URL
 */
export function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

/**
 * Cache for file hashes to avoid re-computing during the same process
 */
const hashCache = new Map<string, string>();

/**
 * Generate a content-based hash for an image file
 * This hash changes only when the file content changes, making it Git-friendly
 * 
 * @param imagePath - Relative path from project root (e.g., "content/recipes/tuna/images/pic.jpg")
 * @returns Short hash of the file content (first 8 chars of MD5)
 */
export function getImageHash(imagePath: string): string {
  // Check cache first
  if (hashCache.has(imagePath)) {
    return hashCache.get(imagePath)!;
  }

  try {
    const fullPath = path.join(process.cwd(), imagePath);
    const fileBuffer = fs.readFileSync(fullPath);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const shortHash = hash.substring(0, 8); // Use first 8 chars for shorter URLs
    
    hashCache.set(imagePath, shortHash);
    return shortHash;
  } catch (error) {
    // If file doesn't exist or can't be read, return empty string
    // This prevents breaking the page if an image is missing
    console.warn(`Failed to generate hash for image: ${imagePath}`, error);
    return '';
  }
}

/**
 * Add cache-busting version parameter to an image URL
 * Uses content hash so the URL only changes when the file content changes
 * 
 * @param imagePath - Relative path from project root
 * @returns Image path with version query parameter (e.g., "path/image.jpg?v=abc123de")
 */
export function getVersionedImageUrl(imagePath: string): string {
  const hash = getImageHash(imagePath);
  if (!hash) {
    // If hash generation failed, return path without version
    return imagePath;
  }
  return `${imagePath}?v=${hash}`;
}

/**
 * Get a versioned URL for a recipe image
 * Convenience function for recipe images
 * 
 * @param recipeSlug - Recipe slug (e.g., "tuna-tataki")
 * @param imageName - Image filename (e.g., "tuna-tataki.jpg")
 * @returns Versioned URL (e.g., "/content/recipes/tuna-tataki/images/tuna-tataki.jpg?v=abc123de")
 */
export function getRecipeImageUrl(recipeSlug: string, imageName: string): string {
  const imagePath = `/content/recipes/${recipeSlug}/images/${imageName}`;
  return getVersionedImageUrl(imagePath);
}

/**
 * Get the full image source path with cache busting
 * Works with both external URLs and local recipe images
 * This is the primary function components should use for image URLs
 * 
 * @param image - Image filename or external URL
 * @param slug - Recipe slug (only used for local images)
 * @returns Full image URL with version parameter if local, or external URL as-is
 */
export function getImageSrc(image: string, slug: string): string {
  if (isExternalUrl(image)) {
    return image;
  }
  return getRecipeImageUrl(slug, image);
}
