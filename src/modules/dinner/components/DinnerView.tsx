import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Recipe } from '@/modules/recipe/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat, ArrowLeft, ImageIcon, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime, formatDate } from '@/modules/shared/utils';
import { getDifficultyConfig } from '@/modules/recipe/components/RecipeCard';

/**
 * Check if an image path is an external URL
 */
function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

/**
 * Get the full image source path
 */
function getImageSrc(image: string, slug: string): string {
  if (isExternalUrl(image)) {
    return image;
  }
  return `/content/recipes/${slug}/images/${image}`;
}

interface DinnerViewProps {
  title: string;
  recipes: Recipe[];
  locale: string;
}

export function DinnerView({ title, recipes, locale }: DinnerViewProps) {
  const t = useTranslations();
  const difficultyConfig = getDifficultyConfig(t);
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex gap-2 print:hidden">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href={`/${locale}`}>
              <Home className="mr-2 h-4 w-4" />
              {t('navigation.home')}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}/dinner/plan`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('dinner.createOwn')}
            </Link>
          </Button>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('dinner.courseCount', { count: recipes.length })}
        </p>
      </div>

      {/* Courses - Timeline with Card Stack */}
      <div className="relative max-w-5xl mx-auto">
        {recipes.map((recipe, index) => {
          const difficulty = difficultyConfig[recipe.difficulty];
          const isLast = index === recipes.length - 1;
          
          return (
            <div key={recipe.slug} className="relative">
              {/* Timeline Line - Hidden on mobile */}
              {!isLast && (
                <div className="absolute left-6 md:left-[52px] top-12 md:top-[52px] bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent hidden md:block" />
              )}

              {/* Course Card */}
              <div className="relative flex flex-col md:flex-row gap-4 md:gap-6 pb-8 md:pb-10">
                {/* Timeline Dot & Course Number */}
                <div className="relative flex md:flex-col items-center gap-3 md:gap-0 shrink-0">
                  <div className="flex h-12 w-12 md:h-[104px] md:w-[104px] items-center justify-center">
                    <div className="flex h-10 w-10 md:h-16 md:w-16 items-center justify-center rounded-full border-4 border-primary bg-background shadow-lg">
                      <span className="text-base md:text-xl font-bold text-primary">{index + 1}</span>
                    </div>
                  </div>
                  {/* Mobile course title hint */}
                  <span className="text-sm font-medium text-muted-foreground md:hidden">{t('dinner.courseNumber', { number: index + 1 })}</span>
                </div>

                {/* Card Content */}
                <Card className="flex-1 overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl group bg-card rounded-xl">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row min-h-[200px] md:min-h-[220px]">
                      {/* Image Section */}
                      <div className="relative w-full md:w-72 lg:w-80 shrink-0">
                        <Link href={`/${locale}/recipe/${recipe.slug}`} className="block h-full">
                          {recipe.images.length > 0 ? (
                            <div className="relative aspect-[16/9] md:aspect-auto md:h-full w-full overflow-hidden bg-muted md:rounded-l-xl">
                              <Image
                                src={getImageSrc(recipe.images[0], recipe.slug)}
                                alt={recipe.title}
                                fill
                                className="object-cover transition-all duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 320px"
                                unoptimized={isExternalUrl(recipe.images[0])}
                              />
                              {/* Subtle gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-transparent" />
                              {/* Image counter badge */}
                              {recipe.images.length > 1 && (
                                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  {recipe.images.length}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex aspect-[16/9] md:aspect-auto md:h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 md:rounded-l-xl">
                              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                          )}
                        </Link>
                      </div>

                      {/* Recipe Details */}
                      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
                        {/* Title */}
                        <Link
                          href={`/${locale}/recipe/${recipe.slug}`}
                          className="group/title inline-block"
                        >
                          <h2 className="mb-2 text-2xl font-bold tracking-tight transition-colors group-hover/title:text-primary">
                            {recipe.title}
                          </h2>
                        </Link>
                        
                        {/* Description */}
                        {recipe.description && (
                          <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {recipe.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5 text-blue-500">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(recipe.prepTime)}</span>
                            <span className="text-muted-foreground">{t('time.prep')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-orange-500">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(recipe.cookTime)}</span>
                            <span className="text-muted-foreground">{t('time.cook')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ChefHat className={`h-4 w-4 ${difficulty.className.includes('emerald') ? 'text-emerald-600' : difficulty.className.includes('amber') ? 'text-amber-600' : 'text-rose-600'}`} />
                            <span className="font-medium">{difficulty.label}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {recipe.tags.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-1.5">
                            {recipe.tags.map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary"
                                className="px-2 py-0.5 text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* View Recipe Link */}
                        <Link
                          href={`/${locale}/recipe/${recipe.slug}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all hover:gap-2 hover:underline"
                        >
                          {t('recipe.viewFull')}
                          <span className="transition-transform">→</span>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center print:hidden">
        <Button asChild>
          <Link href={`/${locale}/dinner/plan`}>{t('dinner.createYourOwnPlan')}</Link>
        </Button>
      </div>
    </div>
  );
}
