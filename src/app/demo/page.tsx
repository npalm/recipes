import Link from 'next/link';
import { Layout } from '@/components/layout';
import { RecipeGrid } from '@/modules/recipe/components';
import { createRecipeService } from '@/modules/recipe/services';
import { Button } from '@/components/ui/button';
import { ChefHat, ArrowRight, Sparkles } from 'lucide-react';

export default function DemoHomePage() {
  const recipeService = createRecipeService(true); // Demo mode
  const recipes = recipeService.getRecipeCards(
    { status: ['published'] },
    { field: 'createdAt', direction: 'desc' }
  );

  return (
    <Layout isDemo>
      {/* Hero Section */}
      <section className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-background p-8 dark:from-amber-950/30 dark:via-orange-950/20 md:p-12">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-200/50 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <Sparkles className="h-4 w-4" />
            Demo Mode
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Sample Recipes
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
            Explore these example recipes to see how the app works. Try adjusting
            servings, marking steps as complete, and browsing through the collection.
          </p>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowRight className="mr-2 h-4 w-4" />
              Exit Demo & View My Recipes
            </Link>
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-900/20" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-900/10" />
      </section>

      {/* Stats */}
      {recipes.length > 0 && (
        <section className="mb-10">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <ChefHat className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span>
                <strong className="text-foreground">{recipes.length}</strong> demo recipes
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Recipes Grid */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">All Demo Recipes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/demo/search">Search</Link>
          </Button>
        </div>

        <RecipeGrid recipes={recipes} isDemo />

        {recipes.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Demo recipes not found</h3>
            <p className="text-muted-foreground">
              The demo content may not be set up yet. Check the content/demo directory.
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
}
