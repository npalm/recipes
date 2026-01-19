import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Layout } from '@/components/layout';
import { RecipeDetail } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { config } from '@/lib/config';

interface RecipePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipeService = createRecipeService();
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
  const recipeService = createRecipeService();
  const recipes = recipeService.getRecipeCards();

  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }));
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;
  const recipeService = createRecipeService();
  const recipe = recipeService.getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <Layout>
      <RecipeDetail recipe={recipe} />
    </Layout>
  );
}
