import { Suspense } from 'react';
import { Metadata } from 'next';
import { createRecipeService } from '@/modules/recipe/services';
import { SearchPageClient } from './SearchPageClient';
import { PageLoading } from '@/modules/shared/ui';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = await getBaseUrl();
  const searchUrl = `${baseUrl}/${locale}/search`;

  return {
    title: 'Search Recipes',
    description: 'Search and filter recipes by name, ingredients, tags, and more',
    openGraph: {
      title: `Search Recipes | ${config.appName}`,
      description: 'Search and filter recipes by name, ingredients, tags, and more',
      url: searchUrl,
      siteName: config.appName,
      locale: locale,
      type: 'website',
    },
  };
}

export default async function SearchPage({ params }: Props) {
  const { locale } = await params;
  const recipeService = createRecipeService(locale);
  const recipes = await recipeService.getRecipeCards({ status: ['published'] });
  const tags = await recipeService.getTags();

  return (
    <Suspense fallback={<PageLoading />}>
      <SearchPageClient
        initialRecipes={recipes}
        availableTags={tags}
      />
    </Suspense>
  );
}
