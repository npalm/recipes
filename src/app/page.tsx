import Link from 'next/link';
import { Search, ChefHat, BookOpen, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout';
import { RecipeGrid } from '@/modules/recipe/components';
import { Button } from '@/components/ui/button';
import { createRecipeService } from '@/modules/recipe/services';

export default function HomePage() {
  const recipeService = createRecipeService(false);
  const recipes = recipeService.getRecipeCards(
    { status: ['published'] },
    { field: 'createdAt', direction: 'desc' }
  );

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12">
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Personal Recipe Collection
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            My Recipes
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            A curated collection of my favorite recipes. Simple, delicious, and
            always at your fingertips.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                Search Recipes
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">
                <BookOpen className="mr-2 h-4 w-4" />
                View Demo
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Stats Section (if recipes exist) */}
      {recipes.length > 0 && (
        <section className="mb-10">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ChefHat className="h-4 w-4 text-primary" />
              </div>
              <span>
                <strong className="text-foreground">{recipes.length}</strong> recipes
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Recipes Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Latest Recipes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/search">View all</Link>
          </Button>
        </div>

        <RecipeGrid recipes={recipes} />

        {/* Empty State */}
        {recipes.length === 0 && (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">No recipes yet</h3>
            <p className="mb-6 text-muted-foreground">
              Add your first recipe to get started! You can also check out the demo
              to see example recipes.
            </p>
            <Button asChild>
              <Link href="/demo">
                <BookOpen className="mr-2 h-4 w-4" />
                View Demo Recipes
              </Link>
            </Button>
          </div>
        )}
      </section>
    </Layout>
  );
}
