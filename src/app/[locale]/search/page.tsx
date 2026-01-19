import { Suspense } from 'react';
import { Metadata } from 'next';
import { createRecipeService } from '@/modules/recipe/services';
import { SearchPageClient } from './SearchPageClient';
import { PageLoading } from '@/modules/shared/ui';

export const metadata: Metadata = {
  title: 'Search Recipes',
  description: 'Search and filter recipes by name, ingredients, tags, and more',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SearchPage({ params }: Props) {
  const { locale } = await params;
  const recipeService = createRecipeService(locale);
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
