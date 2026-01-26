import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Layout } from '@/components/layout';
import { RecipeDetail } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';
import { getVersionedRecipeImageUrl } from '@/lib/server-image-utils';
import { locales } from '@/i18n';

interface RecipePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const recipeService = createRecipeService(locale);
  const recipe = await recipeService.getRecipe(slug);

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
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
    ? `${recipe.description} • ${recipe.servings} servings • ${recipe.totalTime || recipe.prepTime + recipe.cookTime} min • ${recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}`
    : `${recipe.title} - ${config.appName}`;

  return {
    title: recipe.title,
    description,
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
    const recipes = await recipeService.getRecipeCards();
    
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

  if (!recipe) {
    notFound();
  }

  return (
    <Layout>
      <RecipeDetail recipe={recipe} locale={locale} />
    </Layout>
  );
}
