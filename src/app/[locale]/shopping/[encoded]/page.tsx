/**
 * Shopping List View Page
 * Server component that decodes the shopping list data and fetches recipes
 */

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getPublishedRecipeBySlug } from '@/modules/recipe/repository';
import type { Recipe } from '@/modules/recipe/domain/types';
import { ShoppingListEncoder } from '@/modules/shopping/services/encoder';
import { ShoppingList } from '@/modules/shopping/components/ShoppingList';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';

export default async function ShoppingPage({
  params,
}: {
  params: Promise<{ encoded: string; locale: string }>;
}) {
  const { encoded, locale } = await params;

  // Decode shopping list data
  const encoder = new ShoppingListEncoder();
  const shoppingData = encoder.decode(encoded);

  if (!shoppingData) {
    notFound();
  }

  // Fetch all recipes with locale
  const recipesPromises = shoppingData.recipes.map(async (ref) => {
    try {
      const recipe = await getPublishedRecipeBySlug(ref.slug, locale);
      if (!recipe) return null;
      return { recipe, servings: ref.servings };
    } catch {
      return null;
    }
  });

  const recipesWithServings = await Promise.all(recipesPromises);

  // Filter out any null recipes (in case a slug is invalid)
  const validRecipes = recipesWithServings.filter(
    (r): r is { recipe: Recipe; servings: number } => r !== null
  );

  if (validRecipes.length === 0) {
    notFound();
  }

  // Prepare recipe info for display
  const recipeInfo = validRecipes.map((r) => ({
    slug: r.recipe.slug,
    title: r.recipe.title,
    servings: r.servings,
  }));

  // Route params are already URL-decoded. Decode errors are handled by the encoder.
  const listId = encoded;

  return (
    <ShoppingList
      title={shoppingData.title}
      recipes={recipeInfo}
      sourceRecipes={validRecipes.map(({ recipe: { slug, title, servings, ingredients, components } }) => ({
        slug, title, servings, ingredients, components,
      }))}
      locale={locale}
      listId={listId}
    />
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ encoded: string; locale: string }>;
}) {
  const { encoded, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shopping' });
  const encoder = new ShoppingListEncoder();
  const shoppingData = encoder.decode(encoded);

  if (!shoppingData) {
    return {
      title: t('notFound'),
    };
  }

  const baseUrl = await getBaseUrl();
  const shoppingUrl = `${baseUrl}/${locale}/shopping/${encoded}`;
  const title = `${shoppingData.title} - ${t('title')}`;
  const description = t('description', { count: shoppingData.recipes.length });

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | ${config.appName}`,
      description,
      url: shoppingUrl,
      siteName: config.appName,
      locale: locale,
      type: 'website',
    },
  };
}
