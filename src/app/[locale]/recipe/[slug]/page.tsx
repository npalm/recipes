import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { Layout } from '@/components/layout';
import { RecipeDetail } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';
import { getVersionedRecipeImageUrl } from '@/lib/server-image-utils';
import path from 'node:path';
import { getRecipeImageCrops } from '@/lib/card-image-crops';
import { locales } from '@/routing';

interface RecipePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale });
  const recipeService = createRecipeService(locale);
  const recipe = await recipeService.getRecipe(slug);

  if (!recipe || recipe.status !== 'published') {
    return {
      title: t('recipe.notFound'),
    };
  }

  const baseUrl = await getBaseUrl();
  const recipeUrl = `${baseUrl}/${locale}/recipe/${slug}`;
  
  // Construct absolute image URL with cache busting for Open Graph
  const imageUrl = recipe.images.length > 0
    ? `${baseUrl}${getVersionedRecipeImageUrl(slug, recipe.images[0])}`
    : undefined;

  // Create rich description with recipe metadata
  const description = recipe.description 
    ? `${recipe.description} • ${t('recipe.metadataServings', { count: recipe.servings })} • ${recipe.totalTime || recipe.prepTime + recipe.cookTime} min • ${t(`recipe.difficultyLevels.${recipe.difficulty}`)}`
    : `${recipe.title} - ${config.appName}`;

  return {
    title: recipe.title,
    description,
    alternates: { canonical: recipeUrl },
    openGraph: {
      title: recipe.title,
      description,
      url: recipeUrl,
      siteName: config.appName,
      locale: locale,
      type: 'website',
      images: imageUrl ? [
        {
          url: imageUrl,
          alt: recipe.title,
        }
      ] : [],
    },
  };
}

export async function generateStaticParams() {
  const allParams = [];
  
  for (const locale of locales) {
    const recipeService = createRecipeService(locale);
    const recipes = await recipeService.getRecipeCards({ status: ['published'] });
    
    for (const recipe of recipes) {
      allParams.push({
        locale,
        slug: recipe.slug,
      });
    }
  }
  
  return allParams;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug, locale } = await params;
  const recipeService = createRecipeService(locale);
  const recipe = await recipeService.getRecipe(slug);

  if (!recipe || recipe.status !== 'published') {
    notFound();
  }

  const imageCrop = (await getRecipeImageCrops(path.join(process.cwd(), 'content', 'recipes'))).find(crop => crop.slug === slug && crop.filename === recipe.images[0]);

  return (
    <Layout>
      <RecipeDetail recipe={recipe} locale={locale} imageCrop={imageCrop} />
    </Layout>
  );
}
