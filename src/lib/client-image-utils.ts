/**
 * Client-side image utility functions
 * Uses pre-generated image manifest for cache busting
 */

import imageManifest from './image-manifest';

/**
 * Check if an image path is an external URL
 */
export function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

/**
 * Get versioned image URL for cache busting (CLIENT-SAFE)
 * 
 * @param slug - Recipe slug
 * @param imageName - Image filename
 * @returns URL with cache-busting hash if available
 */
export function getVersionedImageUrl(slug: string, imageName: string): string {
  // Handle external URLs
  if (isExternalUrl(imageName)) {
    return imageName;
  }

  // Build base URL
  const baseUrl = `/content/recipes/${slug}/images/${imageName}`;
  
  // Look up hash in manifest
  const manifestKey = `${slug}/${imageName}`;
  const hash = imageManifest[manifestKey];
  
  // Return versioned URL if hash exists
  return hash ? `${baseUrl}?v=${hash}` : baseUrl;
}

/**
 * Legacy function name for backwards compatibility
 */
export function getImageSrc(image: string, slug: string): string {
  return getVersionedImageUrl(slug, image);
}
