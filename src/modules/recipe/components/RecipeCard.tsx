import { Link } from '@/navigation';
import { Clock, ChefHat, Flame, Images } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecipeCard as RecipeCardType, Difficulty } from '@/modules/recipe/domain';
import { LocalImageEditorLink } from './LocalImageEditorLink';
import { RecipeThumbnail } from './ImageGallery';
import { formatTime } from '@/modules/shared/utils';

/**
 * Difficulty badge configuration
 */
const getDifficultyConfig = (t: (key: string) => string): Record<
  Difficulty,
  { label: string; className: string; icon: React.ReactNode }
> => ({
  easy: {
    label: t('recipe.difficultyLevels.easy'),
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <Flame className="h-3 w-3" />,
  },
  medium: {
    label: t('recipe.difficultyLevels.medium'),
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: (
      <>
        <Flame className="h-3 w-3" />
        <Flame className="-ml-1.5 h-3 w-3" />
      </>
    ),
  },
  hard: {
    label: t('recipe.difficultyLevels.hard'),
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: (
      <>
        <Flame className="h-3 w-3" />
        <Flame className="-ml-1.5 h-3 w-3" />
        <Flame className="-ml-1.5 h-3 w-3" />
      </>
    ),
  },
});

interface RecipeCardProps {
  recipe: RecipeCardType;
}

/**
 * Recipe card for grid display
 */
export function RecipeCard({ recipe }: RecipeCardProps) {
  const t = useTranslations();
  const href = `/recipe/${recipe.slug}`;
  const difficultyConfig = getDifficultyConfig(t);
  const difficulty = difficultyConfig[recipe.difficulty];

  return (
    <div className="relative mb-6 break-inside-avoid lg:mb-8">
    <Link href={href} className="group block rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">
      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card py-0 shadow-none transition-[border-color,box-shadow] duration-200 group-hover:border-primary/30 group-hover:shadow-md">
        <div className="relative">
          <RecipeThumbnail
            images={recipe.images}
            slug={recipe.slug}
            title={recipe.title}
            dimensions={recipe.imageDimensions}
            crop={recipe.imageCrop}
          />
          {/* Draft indicator */}
          {recipe.status === 'draft' && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-yellow-500 text-white shadow-sm">{t('recipe.draft')}</Badge>
            </div>
          )}
        </div>

        <CardContent className="flex flex-col p-5">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5" aria-label={`${t('recipe.totalTime')}: ${formatTime(recipe.totalTime)}`}>
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatTime(recipe.totalTime)}
            </span>
            <span aria-hidden="true">·</span><span>{difficulty.label}</span>
            {recipe.images.length > 1 && <span className="ml-auto inline-flex items-center gap-1.5" aria-label={t('recipe.photosCount', { count: recipe.images.length })}><Images className="h-3.5 w-3.5" aria-hidden="true" />{recipe.images.length}</span>}
          </div>
          {/* Title */}
          <h3 className="mb-2 font-display text-lg font-semibold leading-[1.3] tracking-[-0.025em] transition-colors group-hover:text-primary sm:text-xl">
            {recipe.title}
          </h3>

          {/* Description */}
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {recipe.description}
          </p>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="lowercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
    <LocalImageEditorLink slug={recipe.slug} image={recipe.images[0]} view="card" className="left-3 top-3" />
    </div>
  );
}

/**
 * Grid of recipe cards
 */
export function RecipeGrid({ recipes }: { recipes: RecipeCardType[] }) {
  const t = useTranslations();
  
  if (recipes.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ChefHat className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t('search.noResults')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('search.tryAdjustingFilters')}
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 lg:gap-8">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} />
      ))}
    </div>
  );
}

export { getDifficultyConfig };
