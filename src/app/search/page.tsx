import { Suspense } from 'react';
import { Metadata } from 'next';
import { createRecipeService } from '@/modules/recipe/services';
import { SearchPageClient } from './SearchPageClient';
import { PageLoading } from '@/modules/shared/ui';

export const metadata: Metadata = {
  title: 'Search Recipes',
  description: 'Search and filter recipes by name, ingredients, tags, and more',
};

export default function SearchPage() {
  const recipeService = createRecipeService();
  const recipes = recipeService.getRecipeCards({ status: ['published'] });
  const tags = recipeService.getTags();

  return (
    <Suspense fallback={<PageLoading />}>
      <SearchPageClient
        initialRecipes={recipes}
        availableTags={tags}
      />
    </Suspense>
  );
}
