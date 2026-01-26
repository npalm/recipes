import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMetadata } from '@/app/[locale]/recipe/[slug]/page';
import type { Recipe } from '@/modules/recipe/domain/types';

// Mock dependencies
vi.mock('@/modules/recipe/services', () => ({
  createRecipeService: vi.fn(),
}));

vi.mock('@/lib/server-utils', () => ({
  getBaseUrl: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    appName: 'Niek Kookt',
    productionUrl: 'https://keuken.guldenstraat.nl',
  },
}));

describe('Recipe Page - generateMetadata', () => {
  const mockRecipe: Recipe = {
    title: 'Tuna Tataki',
    slug: 'tuna-tataki',
    status: 'published' as const,
    servings: 4,
    prepTime: 20,
    cookTime: 5,
    totalTime: 25,
    difficulty: 'easy' as const,
    tags: ['tuna', 'japanese'],
    images: ['tuna-tetaki.jpg'],
    headerImageRotation: false,
    sources: [],
    createdAt: '2026-01-20',
    description: 'A Japanese-inspired dish featuring briefly seared tuna',
    ingredients: [],
    instructions: [],
    content: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates complete Open Graph metadata for a recipe', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');
    const { getBaseUrl } = await import('@/lib/server-utils');

    const mockGetRecipe = vi.fn().mockResolvedValue(mockRecipe);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);
    vi.mocked(getBaseUrl).mockResolvedValue('https://keuken.guldenstraat.nl');

    const params = Promise.resolve({ slug: 'tuna-tataki', locale: 'en' });
    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe('Tuna Tataki');
    expect(metadata.description).toContain('A Japanese-inspired dish');
    expect(metadata.description).toContain('4 servings');
    expect(metadata.description).toContain('25 min');
    expect(metadata.description).toContain('Easy');
    
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe('Tuna Tataki');
    expect(metadata.openGraph?.siteName).toBe('Niek Kookt');
    expect(metadata.openGraph?.locale).toBe('en');
    expect(metadata.openGraph?.url).toBe('https://keuken.guldenstraat.nl/en/recipe/tuna-tataki');
  });

  it('includes recipe image in Open Graph metadata', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');
    const { getBaseUrl } = await import('@/lib/server-utils');

    const mockGetRecipe = vi.fn().mockResolvedValue(mockRecipe);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);
    vi.mocked(getBaseUrl).mockResolvedValue('https://keuken.guldenstraat.nl');

    const params = Promise.resolve({ slug: 'tuna-tataki', locale: 'en' });
    const metadata = await generateMetadata({ params });

    expect(metadata.openGraph?.images).toBeDefined();
    expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
    expect(metadata.openGraph?.images).toHaveLength(1);
    
    const image = (metadata.openGraph?.images as any[])[0];
    expect(image.url).toBe('https://keuken.guldenstraat.nl/content/recipes/tuna-tataki/images/tuna-tetaki.jpg');
    expect(image.alt).toBe('Tuna Tataki');
  });

  it('handles recipe without images gracefully', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');
    const { getBaseUrl } = await import('@/lib/server-utils');

    const recipeWithoutImage = { ...mockRecipe, images: [] };
    const mockGetRecipe = vi.fn().mockResolvedValue(recipeWithoutImage);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);
    vi.mocked(getBaseUrl).mockResolvedValue('https://keuken.guldenstraat.nl');

    const params = Promise.resolve({ slug: 'tuna-tataki', locale: 'en' });
    const metadata = await generateMetadata({ params });

    expect(metadata.openGraph?.images).toEqual([]);
  });

  it('handles recipe not found', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');

    const mockGetRecipe = vi.fn().mockResolvedValue(null);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);

    const params = Promise.resolve({ slug: 'non-existent', locale: 'en' });
    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe('Recipe Not Found');
    expect(metadata.openGraph).toBeUndefined();
  });

  it('handles recipe without description', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');
    const { getBaseUrl } = await import('@/lib/server-utils');
    const { config } = await import('@/lib/config');

    const recipeWithoutDescription = { ...mockRecipe, description: '' };
    const mockGetRecipe = vi.fn().mockResolvedValue(recipeWithoutDescription);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);
    vi.mocked(getBaseUrl).mockResolvedValue('https://keuken.guldenstraat.nl');

    const params = Promise.resolve({ slug: 'tuna-tataki', locale: 'en' });
    const metadata = await generateMetadata({ params });

    expect(metadata.description).toBe(`${mockRecipe.title} - ${config.appName}`);
  });

  it('uses different locales correctly', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');
    const { getBaseUrl } = await import('@/lib/server-utils');

    const mockGetRecipe = vi.fn().mockResolvedValue(mockRecipe);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);
    vi.mocked(getBaseUrl).mockResolvedValue('https://keuken.guldenstraat.nl');

    const params = Promise.resolve({ slug: 'tuna-tataki', locale: 'nl' });
    const metadata = await generateMetadata({ params });

    expect(metadata.openGraph?.locale).toBe('nl');
    expect(metadata.openGraph?.url).toBe('https://keuken.guldenstraat.nl/nl/recipe/tuna-tataki');
  });

  it('formats description with recipe metadata correctly', async () => {
    const { createRecipeService } = await import('@/modules/recipe/services');
    const { getBaseUrl } = await import('@/lib/server-utils');

    const mockGetRecipe = vi.fn().mockResolvedValue(mockRecipe);
    vi.mocked(createRecipeService).mockReturnValue({
      getRecipe: mockGetRecipe,
    } as any);
    vi.mocked(getBaseUrl).mockResolvedValue('https://keuken.guldenstraat.nl');

    const params = Promise.resolve({ slug: 'tuna-tataki', locale: 'en' });
    const metadata = await generateMetadata({ params });

    const description = metadata.description as string;
    expect(description).toMatch(/•\s*4 servings/);
    expect(description).toMatch(/•\s*25 min/);
    expect(description).toMatch(/•\s*Easy/);
  });
});
