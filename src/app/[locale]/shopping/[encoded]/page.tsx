/**
 * Shopping List View Page
 * Server component that decodes the shopping list data and fetches recipes
 */

import { notFound } from 'next/navigation';
import { getRecipeBySlug } from '@/modules/recipe/repository';
import type { Recipe } from '@/modules/recipe/domain/types';
import { ShoppingListEncoder } from '@/modules/shopping/services/encoder';
import { IngredientAggregator } from '@/modules/shopping/services/aggregation';
import { UnitConverter } from '@/modules/shopping/services/unitConverter';
import { ShoppingList } from '@/modules/shopping/components/ShoppingList';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';

export default async function ShoppingPage({
  params,
}: {
  params: Promise<{ encoded: string; locale: string }>;
}) {
  const { encoded, locale } = await params;

  // Normalize the encoded string for consistent localStorage key
  // Remove URL encoding artifacts
  const normalizedEncoded = decodeURIComponent(encoded);

  // Decode shopping list data
  const encoder = new ShoppingListEncoder();
  const shoppingData = encoder.decode(normalizedEncoded);

  if (!shoppingData) {
    notFound();
  }

  // Fetch all recipes with locale
  const recipesPromises = shoppingData.recipes.map(async (ref) => {
    try {
      const recipe = await getRecipeBySlug(ref.slug, locale);
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

  // Aggregate ingredients
  const aggregator = new IngredientAggregator(new UnitConverter());
  const shoppingItems = aggregator.aggregate(
    validRecipes.map((r) => r.recipe),
    validRecipes.map((r) => r.servings)
  );

  // Prepare recipe info for display
  const recipeInfo = validRecipes.map((r) => ({
    slug: r.recipe.slug,
    title: r.recipe.title,
    servings: r.servings,
  }));

  // Generate unique list ID for localStorage (use the normalized encoded string as ID)
  const listId = normalizedEncoded;

  return (
    <ShoppingList
      title={shoppingData.title}
      recipes={recipeInfo}
      items={shoppingItems}
      locale={locale}
      listId={listId}
      encodedListData={normalizedEncoded}
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
  const normalizedEncoded = decodeURIComponent(encoded);
  const encoder = new ShoppingListEncoder();
  const shoppingData = encoder.decode(normalizedEncoded);

  if (!shoppingData) {
    return {
      title: 'Shopping List Not Found',
    };
  }

  const baseUrl = await getBaseUrl();
  const shoppingUrl = `${baseUrl}/${locale}/shopping/${encoded}`;
  const title = `${shoppingData.title} - Shopping List`;
  const description = `Shopping list for ${shoppingData.recipes.length} recipe(s)`;

  return {
    title,
    description,
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
