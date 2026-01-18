import { Suspense } from 'react';
import { Metadata } from 'next';
import { createRecipeService } from '@/modules/recipe/services';
import { SearchPageClient } from '../../search/SearchPageClient';
import { PageLoading } from '@/modules/shared/ui';

export const metadata: Metadata = {
  title: 'Search Demo Recipes',
  description: 'Search and filter demo recipes',
};

export default function DemoSearchPage() {
  const recipeService = createRecipeService(true); // Demo mode
  const recipes = recipeService.getRecipeCards({ status: ['published'] });
  const tags = recipeService.getTags();

  return (
    <Suspense fallback={<PageLoading />}>
      <SearchPageClient
        initialRecipes={recipes}
        availableTags={tags}
        isDemo={true}
      />
    </Suspense>
  );
}
