import Link from 'next/link';
import { Clock, ChefHat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecipeCard as RecipeCardType } from '@/modules/recipe/domain';
import { RecipeThumbnail } from './ImageGallery';
import { formatTime, truncate } from '@/modules/shared/utils';

interface RecipeCardProps {
  recipe: RecipeCardType;
  isDemo?: boolean;
}

/**
 * Recipe card for grid display
 */
export function RecipeCard({ recipe, isDemo = false }: RecipeCardProps) {
  const basePath = isDemo ? '/demo' : '';
  const href = `${basePath}/recipe/${recipe.slug}`;

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-amber-100 text-amber-800',
    hard: 'bg-red-100 text-red-800',
  };

  return (
    <Link href={href} className="group">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <RecipeThumbnail
          images={recipe.images}
          slug={recipe.slug}
          title={recipe.title}
          isDemo={isDemo}
        />
        <CardContent className="p-4">
          <h3 className="mb-1 font-semibold leading-tight group-hover:text-primary">
            {recipe.title}
          </h3>
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {truncate(recipe.description, 100)}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTime(recipe.totalTime)}
            </span>
            <Badge
              variant="secondary"
              className={`${difficultyColors[recipe.difficulty]} border-0`}
            >
              {recipe.difficulty}
            </Badge>
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{recipe.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Draft indicator */}
          {recipe.status === 'draft' && (
            <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">
              Draft
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Grid of recipe cards
 */
export function RecipeGrid({
  recipes,
  isDemo = false,
}: {
  recipes: RecipeCardType[];
  isDemo?: boolean;
}) {
  if (recipes.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No recipes found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} isDemo={isDemo} />
      ))}
    </div>
  );
}
