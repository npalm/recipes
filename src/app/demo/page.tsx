import { Layout } from '@/components/layout';
import { RecipeGrid } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { Badge } from '@/components/ui/badge';

export default function DemoHomePage() {
  const recipeService = createRecipeService(true); // Demo mode
  const recipes = recipeService.getRecipeCards(
    { status: ['published'] },
    { field: 'createdAt', direction: 'desc' }
  );

  return (
    <Layout isDemo>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Demo Recipes
          </h1>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            Demo Mode
          </Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Explore sample recipes to see how the app works
        </p>
      </div>

      <RecipeGrid recipes={recipes} isDemo />

      {recipes.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Demo recipes not found. Run the CLI to generate demo content.
          </p>
        </div>
      )}
    </Layout>
  );
}
