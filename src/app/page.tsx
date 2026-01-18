import { Layout } from '@/components/layout';
import { RecipeGrid } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';

export default function HomePage() {
  const recipeService = createRecipeService(false);
  const recipes = recipeService.getRecipeCards(
    { status: ['published'] },
    { field: 'createdAt', direction: 'desc' }
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          My Recipes
        </h1>
        <p className="mt-2 text-muted-foreground">
          A collection of my favorite recipes
        </p>
      </div>

      <RecipeGrid recipes={recipes} />

      {recipes.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            No recipes yet. Add your first recipe to get started!
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check out the <a href="/demo" className="text-primary hover:underline">demo</a> to see example recipes.
          </p>
        </div>
      )}
    </Layout>
  );
}
