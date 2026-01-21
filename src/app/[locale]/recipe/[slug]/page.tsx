import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Layout } from '@/components/layout';
import { RecipeDetail } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { config } from '@/lib/config';
import { locales } from '@/i18n';

interface RecipePageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const recipeService = createRecipeService(locale);
  const recipe = recipeService.getRecipe(slug);

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
    };
  }

  return {
    title: recipe.title,
    description: recipe.description || `${recipe.title} - ${config.appName}`,
  };
}

export async function generateStaticParams() {
  const allParams = [];
  
  for (const locale of locales) {
    const recipeService = createRecipeService(locale);
    const recipes = recipeService.getRecipeCards();
    
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
  const recipe = recipeService.getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <Layout>
      <RecipeDetail recipe={recipe} locale={locale} />
    </Layout>
  );
}
