import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Layout } from '@/components/layout';
import { RecipeDetail } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { config } from '@/lib/config';

interface DemoRecipePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DemoRecipePageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipeService = createRecipeService(true);
  const recipe = recipeService.getRecipe(slug);

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
    };
  }

  return {
    title: `${recipe.title} (Demo)`,
    description: recipe.description || `${recipe.title} - ${config.appName} Demo`,
  };
}

export async function generateStaticParams() {
  const recipeService = createRecipeService(true);
  const recipes = recipeService.getRecipeCards();

  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }));
}

export default async function DemoRecipePage({ params }: DemoRecipePageProps) {
  const { slug } = await params;
  const recipeService = createRecipeService(true);
  const recipe = recipeService.getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <Layout isDemo>
      <RecipeDetail recipe={recipe} isDemo />
    </Layout>
  );
}
