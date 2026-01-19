'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Layout } from '@/components/layout';
import { RecipeGrid } from '@/modules/recipe/components';
import { SearchBar, FilterPanel } from '@/modules/search/components';
import { createSearchIndex, SearchResult } from '@/modules/search/services';
import { RecipeCard, RecipeFilters } from '@/modules/recipe/domain';
import { filterRecipeCards } from '@/modules/recipe/services/filters';

interface SearchPageClientProps {
  initialRecipes: RecipeCard[];
  availableTags: string[];
}

export function SearchPageClient({
  initialRecipes,
  availableTags,
}: SearchPageClientProps) {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get('tag');
  const t = useTranslations();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<RecipeFilters>(() => ({
    tags: initialTag ? [initialTag] : undefined,
  }));
  const [results, setResults] = useState<RecipeCard[]>(initialRecipes);

  // Create search index
  const [searchIndex] = useState(() => createSearchIndex(initialRecipes));

  useEffect(() => {
    let filteredRecipes: RecipeCard[];

    if (query.trim()) {
      // Use search index for text search
      const searchResults = searchIndex.search(query);
      filteredRecipes = searchResults.map((r) => r.item);
    } else {
      filteredRecipes = initialRecipes;
    }

    // Apply additional filters
    if (
      filters.tags?.length ||
      filters.difficulty?.length ||
      filters.maxTotalTime
    ) {
      filteredRecipes = filterRecipeCards(filteredRecipes, filters);
    }

    setResults(filteredRecipes);
  }, [query, filters, initialRecipes, searchIndex]);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t('search.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('search.searchDescription')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Filters sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h2 className="mb-4 font-semibold">{t('search.filters')}</h2>
            <FilterPanel
              filters={filters}
              availableTags={availableTags}
              onFiltersChange={setFilters}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <SearchBar
              initialQuery={query}
              onSearch={setQuery}
              autoFocus
            />
          </div>

          {/* Results count */}
          <p className="mb-4 text-sm text-muted-foreground">
            {t('search.resultsCount', { count: results.length })}
          </p>

          {/* Recipe grid */}
          <RecipeGrid recipes={results} />
        </div>
      </div>
    </Layout>
  );
}
