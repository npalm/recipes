import Link from 'next/link';
import { Clock, ChefHat, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecipeCard as RecipeCardType, Difficulty } from '@/modules/recipe/domain';
import { RecipeThumbnail } from './ImageGallery';
import { formatTime, truncate } from '@/modules/shared/utils';

/**
 * Difficulty badge configuration
 */
const difficultyConfig: Record<
  Difficulty,
  { label: string; className: string; icon: React.ReactNode }
> = {
  easy: {
    label: 'Easy',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <Flame className="h-3 w-3" />,
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: (
      <>
        <Flame className="h-3 w-3" />
        <Flame className="-ml-1.5 h-3 w-3" />
      </>
    ),
  },
  hard: {
    label: 'Hard',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: (
      <>
        <Flame className="h-3 w-3" />
        <Flame className="-ml-1.5 h-3 w-3" />
        <Flame className="-ml-1.5 h-3 w-3" />
      </>
    ),
  },
};

interface RecipeCardProps {
  recipe: RecipeCardType;
}

/**
 * Recipe card for grid display
 */
export function RecipeCard({ recipe }: RecipeCardProps) {
  const href = `/recipe/${recipe.slug}`;
  const difficulty = difficultyConfig[recipe.difficulty];

  return (
    <Link href={href} className="group block">
      <Card className="h-full overflow-hidden border-0 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="relative">
          <RecipeThumbnail
            images={recipe.images}
            slug={recipe.slug}
            title={recipe.title}
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          
          {/* Time badge on image */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm dark:bg-black/80 dark:text-gray-200">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(recipe.totalTime)}
          </div>

          {/* Draft indicator */}
          {recipe.status === 'draft' && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-yellow-500 text-white shadow-sm">Draft</Badge>
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Title */}
          <h3 className="mb-2 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {recipe.title}
          </h3>

          {/* Description */}
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {truncate(recipe.description, 100)}
          </p>

          {/* Meta row */}
          <div className="mb-4 flex items-center gap-3">
            <Badge
              variant="secondary"
              className={`${difficulty.className} flex items-center gap-0.5 border-0 text-xs font-medium`}
            >
              {difficulty.icon}
              <span className="ml-1">{difficulty.label}</span>
            </Badge>
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  +{recipe.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Grid of recipe cards
 */
export function RecipeGrid({ recipes }: { recipes: RecipeCardType[] }) {
  if (recipes.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ChefHat className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No recipes found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} />
      ))}
    </div>
  );
}

export { difficultyConfig };
