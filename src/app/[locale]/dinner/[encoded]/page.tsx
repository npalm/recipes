import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getPublishedRecipeBySlug } from '@/modules/recipe/repository';
import { DinnerView } from '@/modules/dinner/components/DinnerView';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';
import { getVersionedRecipeImageUrl } from '@/lib/server-image-utils';

import { decodeDinnerData } from '@/modules/dinner/services/encoder';

export default async function DinnerPage({
  params,
}: {
  params: Promise<{ encoded: string; locale: string }>;
}) {
  const { encoded, locale } = await params;
  const dinnerData = decodeDinnerData(encoded);

  if (!dinnerData) {
    notFound();
  }

  // Fetch all recipes with locale
  const recipes = await Promise.all(
    dinnerData.recipes.map(async (slug) => {
      try {
        return await getPublishedRecipeBySlug(slug, locale);
      } catch {
        return null;
      }
    })
  );

  // Filter out any null recipes (in case a slug is invalid)
  const validRecipes = recipes.filter((r) => r !== null);

  if (validRecipes.length === 0) {
    notFound();
  }

  return <DinnerView title={dinnerData.title} recipes={validRecipes} locale={locale} />;
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
  const t = await getTranslations({ locale, namespace: 'dinner' });
  const dinnerData = decodeDinnerData(encoded);

  if (!dinnerData) {
    return {
      title: t('notFound'),
    };
  }

  // Fetch all recipes to include their details in the metadata
  const recipes = await Promise.all(
    dinnerData.recipes.map(async (slug) => {
      try {
        return await getPublishedRecipeBySlug(slug, locale);
      } catch {
        return null;
      }
    })
  );

  const validRecipes = recipes.filter((r) => r !== null);
  
  const baseUrl = await getBaseUrl();
  const dinnerUrl = `${baseUrl}/${locale}/dinner/${encoded}`;
  const title = `${dinnerData.title} - ${t('yourPlan')}`;
  
  // Create a rich description with recipe names
  const recipeNames = validRecipes.map(r => r.title).join(', ');
  const description = `${t('courseCount', { count: validRecipes.length })}: ${recipeNames}`;

  // Use the first recipe's first image for Open Graph with cache busting
  const firstRecipeWithImage = validRecipes.find(r => r.images && r.images.length > 0);
  const ogImage = firstRecipeWithImage
    ? {
        url: `${baseUrl}${getVersionedRecipeImageUrl(firstRecipeWithImage.slug, firstRecipeWithImage.images[0])}`,
        alt: dinnerData.title,
      }
    : undefined;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | ${config.appName}`,
      description,
      url: dinnerUrl,
      siteName: config.appName,
      locale: locale,
      type: 'website',
      images: ogImage ? [ogImage] : [],
    },
  };
}
