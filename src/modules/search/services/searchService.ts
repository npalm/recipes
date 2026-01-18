/**
 * Search Service
 *
 * Provides full-text search functionality for recipes using Fuse.js.
 * Builds a search index at build time for client-side searching.
 */

import Fuse, { IFuseOptions, FuseResult, FuseResultMatch } from 'fuse.js';
import { RecipeCard } from '@/modules/recipe/domain';

/**
 * Search result with score
 */
export interface SearchResult {
  item: RecipeCard;
  score: number;
  matches?: ReadonlyArray<{
    key: string;
    value: string;
    indices: ReadonlyArray<[number, number]>;
  }>;
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number; // 0 = perfect match, 1 = match anything
  includeMatches?: boolean;
}

/**
 * Default Fuse.js options optimized for recipe search
 */
const DEFAULT_FUSE_OPTIONS: IFuseOptions<RecipeCard> = {
  // Keys to search with their weights
  keys: [
    { name: 'title', weight: 2 },
    { name: 'description', weight: 1.5 },
    { name: 'tags', weight: 1 },
  ],
  // Search options
  threshold: 0.4, // Fairly lenient matching
  ignoreLocation: true, // Don't penalize matches at end of string
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  // Sorting
  shouldSort: true,
  // Field normalization
  findAllMatches: false,
  isCaseSensitive: false,
};

/**
 * Search index for recipes
 */
export class RecipeSearchIndex {
  private fuse: Fuse<RecipeCard>;
  private recipes: RecipeCard[];

  constructor(recipes: RecipeCard[], options?: Partial<IFuseOptions<RecipeCard>>) {
    this.recipes = recipes;
    this.fuse = new Fuse(recipes, { ...DEFAULT_FUSE_OPTIONS, ...options });
  }

  /**
   * Search recipes by query string
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const {
      limit = 20,
      threshold = DEFAULT_FUSE_OPTIONS.threshold,
      includeMatches = true,
    } = options;

    // Update fuse options for this search
    this.fuse.setCollection(this.recipes);

    const results = this.fuse.search(query, { limit });

    return results
      .filter((result: FuseResult<RecipeCard>) => (result.score ?? 1) <= (threshold ?? 1))
      .map((result: FuseResult<RecipeCard>) => ({
        item: result.item,
        score: result.score ?? 0,
        matches: includeMatches
          ? result.matches?.map((m: FuseResultMatch) => ({
              key: m.key ?? '',
              value: m.value ?? '',
              indices: m.indices,
            }))
          : undefined,
      }));
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(query: string, limit = 5): string[] {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const results = this.search(query, { limit, threshold: 0.6 });
    
    // Extract unique suggestions from titles and tags
    const suggestions = new Set<string>();
    
    for (const result of results) {
      // Add title if it matches
      if (result.item.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(result.item.title);
      }
      
      // Add matching tags
      for (const tag of result.item.tags) {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(tag);
        }
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get all recipes (unfiltered)
   */
  getAllRecipes(): RecipeCard[] {
    return this.recipes;
  }

  /**
   * Update the search index with new recipes
   */
  updateIndex(recipes: RecipeCard[]): void {
    this.recipes = recipes;
    this.fuse.setCollection(recipes);
  }
}

/**
 * Create a search index from recipe cards
 */
export function createSearchIndex(
  recipes: RecipeCard[],
  options?: Partial<IFuseOptions<RecipeCard>>
): RecipeSearchIndex {
  return new RecipeSearchIndex(recipes, options);
}

/**
 * Build search index data for static export
 * This data can be serialized and loaded client-side
 */
export function buildSearchIndexData(recipes: RecipeCard[]): {
  recipes: RecipeCard[];
  indexOptions: IFuseOptions<RecipeCard>;
} {
  return {
    recipes,
    indexOptions: DEFAULT_FUSE_OPTIONS,
  };
}

/**
 * Highlight matched text in a string
 * Returns an array of segments with highlight flag
 */
export function highlightMatches(
  text: string,
  indices: ReadonlyArray<[number, number]>
): Array<{ text: string; highlight: boolean }> {
  const segments: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  for (const [start, end] of indices) {
    // Add non-highlighted segment before match
    if (start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, start),
        highlight: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: text.slice(start, end + 1),
      highlight: true,
    });

    lastIndex = end + 1;
  }

  // Add remaining non-highlighted text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      highlight: false,
    });
  }

  return segments;
}
