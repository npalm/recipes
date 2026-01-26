import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getImageHash, getVersionedRecipeImageUrl } from '../../src/lib/server-image-utils';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
  },
}));

describe('server-image-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getImageHash', () => {
    it('generates hash for existing image file', async () => {
      const fs = await import('fs');
      
      // Mock file content
      const mockBuffer = Buffer.from('fake image content');
      vi.mocked(fs.default.readFileSync).mockReturnValue(mockBuffer);

      const hash = getImageHash('content/recipes/test/images/test.jpg');
      
      expect(hash).toBe('50e7825d'); // First 8 chars of MD5 of 'fake image content'
      expect(fs.default.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('content/recipes/test/images/test.jpg')
      );
    });

    it('caches hash after first calculation', async () => {
      const fs = await import('fs');
      
      const mockBuffer = Buffer.from('fake image content');
      vi.mocked(fs.default.readFileSync).mockReturnValue(mockBuffer);

      // First call
      const hash1 = getImageHash('content/recipes/test/images/cached.jpg');
      // Second call should use cache
      const hash2 = getImageHash('content/recipes/test/images/cached.jpg');
      
      expect(hash1).toBe(hash2);
      // Should only read file once due to caching
      expect(fs.default.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('returns empty string when file does not exist', async () => {
      const fs = await import('fs');
      
      vi.mocked(fs.default.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const hash = getImageHash('content/recipes/nonexistent/images/missing.jpg');
      
      expect(hash).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate hash for image'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('returns empty string when file read fails', async () => {
      const fs = await import('fs');
      
      vi.mocked(fs.default.readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const hash = getImageHash('content/recipes/test/images/forbidden.jpg');
      
      expect(hash).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getVersionedRecipeImageUrl', () => {
    it('generates versioned URL for existing image', async () => {
      const fs = await import('fs');
      
      const mockBuffer = Buffer.from('recipe image content');
      vi.mocked(fs.default.readFileSync).mockReturnValue(mockBuffer);

      const url = getVersionedRecipeImageUrl('banana-bread', 'hero.jpg');
      
      expect(url).toMatch(/^\/content\/recipes\/banana-bread\/images\/hero\.jpg\?v=[a-f0-9]{8}$/);
    });

    it('returns URL without version when hash generation fails', async () => {
      const fs = await import('fs');
      
      vi.mocked(fs.default.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const url = getVersionedRecipeImageUrl('missing-recipe', 'image.jpg');
      
      expect(url).toBe('/content/recipes/missing-recipe/images/image.jpg');
      expect(url).not.toContain('?v=');
      
      consoleSpy.mockRestore();
    });

    it('generates correct path structure', async () => {
      const fs = await import('fs');
      
      const mockBuffer = Buffer.from('test content');
      vi.mocked(fs.default.readFileSync).mockReturnValue(mockBuffer);

      const url = getVersionedRecipeImageUrl('chocolate-cake', 'step-1.jpg');
      
      expect(url).toContain('/content/recipes/chocolate-cake/images/step-1.jpg');
    });
  });
});
