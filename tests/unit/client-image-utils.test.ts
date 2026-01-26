import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getVersionedImageUrl, getImageSrc, isExternalUrl } from '../../src/lib/client-image-utils';

// Mock the image manifest
vi.mock('../../src/lib/image-manifest', () => ({
  default: {
    'test-recipe/hero.jpg': 'abc12345',
    'another-recipe/image.png': 'def67890',
  },
}));

describe('client-image-utils', () => {
  describe('isExternalUrl', () => {
    it('identifies http URLs as external', () => {
      expect(isExternalUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('identifies https URLs as external', () => {
      expect(isExternalUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('identifies relative paths as not external', () => {
      expect(isExternalUrl('/content/recipes/test/image.jpg')).toBe(false);
      expect(isExternalUrl('image.jpg')).toBe(false);
    });
  });

  describe('getVersionedImageUrl', () => {
    it('returns versioned URL for images in manifest', () => {
      const url = getVersionedImageUrl('test-recipe', 'hero.jpg');
      expect(url).toBe('/content/recipes/test-recipe/images/hero.jpg?v=abc12345');
    });

    it('returns unversioned URL for images not in manifest', () => {
      const url = getVersionedImageUrl('missing-recipe', 'image.jpg');
      expect(url).toBe('/content/recipes/missing-recipe/images/image.jpg');
    });

    it('returns external URLs unchanged', () => {
      const externalUrl = 'https://example.com/image.jpg';
      const url = getVersionedImageUrl('any-slug', externalUrl);
      expect(url).toBe(externalUrl);
    });

    it('handles different image extensions', () => {
      const url = getVersionedImageUrl('another-recipe', 'image.png');
      expect(url).toBe('/content/recipes/another-recipe/images/image.png?v=def67890');
    });
  });

  describe('getImageSrc (legacy)', () => {
    it('calls getVersionedImageUrl with correct parameters', () => {
      const url = getImageSrc('hero.jpg', 'test-recipe');
      expect(url).toBe('/content/recipes/test-recipe/images/hero.jpg?v=abc12345');
    });

    it('handles external URLs', () => {
      const externalUrl = 'https://example.com/image.jpg';
      const url = getImageSrc(externalUrl, 'any-slug');
      expect(url).toBe(externalUrl);
    });
  });
});
