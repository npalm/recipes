import { notFound } from 'next/navigation';
import { getRecipeBySlug } from '@/modules/recipe/repository';
import { DinnerView } from '@/modules/dinner/components/DinnerView';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';

interface DinnerData {
  title: string;
  recipes: string[];
}

function decodeDinnerData(encoded: string): DinnerData | null {
  try {
    // URL-decode first (Next.js might have already done this, but be safe)
    const urlDecoded = decodeURIComponent(encoded);
    const decoded = atob(urlDecoded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

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
        return await getRecipeBySlug(slug, locale);
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
  const dinnerData = decodeDinnerData(encoded);

  if (!dinnerData) {
    return {
      title: 'Dinner Plan Not Found',
    };
  }

  // Fetch all recipes to include their details in the metadata
  const recipes = await Promise.all(
    dinnerData.recipes.map(async (slug) => {
      try {
        return await getRecipeBySlug(slug, locale);
      } catch {
        return null;
      }
    })
  );

  const validRecipes = recipes.filter((r) => r !== null);
  
  const baseUrl = await getBaseUrl();
  const dinnerUrl = `${baseUrl}/${locale}/dinner/${encoded}`;
  const title = `${dinnerData.title} - Dinner Plan`;
  
  // Create a rich description with recipe names
  const recipeNames = validRecipes.map(r => r.title).join(', ');
  const courseText = validRecipes.length === 1 ? 'course' : 'courses';
  const description = validRecipes.length > 0 
    ? `A ${validRecipes.length}-${courseText} dinner featuring: ${recipeNames}`
    : `Dinner plan with ${dinnerData.recipes.length} recipe(s)`;

  // Use the first recipe's first image for Open Graph
  const firstRecipeWithImage = validRecipes.find(r => r.images && r.images.length > 0);
  const ogImage = firstRecipeWithImage
    ? {
        url: `${baseUrl}/content/recipes/${firstRecipeWithImage.slug}/images/${firstRecipeWithImage.images[0]}`,
        alt: `${dinnerData.title} dinner menu`,
      }
    : undefined;

  return {
    title,
    description,
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
