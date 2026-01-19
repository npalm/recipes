import { notFound } from 'next/navigation';
import { getRecipeBySlug } from '@/modules/recipe/repository';
import { DinnerView } from '@/modules/dinner/components/DinnerView';

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
