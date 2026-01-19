import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/modules/recipe/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat, ArrowLeft, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime, formatDate } from '@/modules/shared/utils';
import { difficultyConfig } from '@/modules/recipe/components/RecipeCard';

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
}

export function DinnerView({ title, recipes }: DinnerViewProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 print:hidden">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href="/dinner/plan">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Create your own dinner
            </Link>
          </Button>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {recipes.length} {recipes.length === 1 ? 'course' : 'courses'}
        </p>
      </div>

      {/* Courses - Timeline with Card Stack */}
      <div className="relative max-w-5xl mx-auto">
        {recipes.map((recipe, index) => {
          const difficulty = difficultyConfig[recipe.difficulty];
          const isLast = index === recipes.length - 1;
          
          return (
            <div key={recipe.slug} className="relative">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-[52px] top-[80px] bottom-[-40px] w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
              )}

              {/* Course Card */}
              <div className="relative flex gap-6 pb-10">
                {/* Timeline Dot & Course Number */}
                <div className="relative flex flex-col items-center shrink-0">
                  <div className="flex h-[104px] w-[104px] items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary bg-background shadow-lg">
                      <span className="text-xl font-bold text-primary">{index + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <Card className="flex-1 overflow-hidden border shadow-lg transition-all duration-300 hover:shadow-xl group">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-0 md:flex-row">
                      {/* Thumbnail Image */}
                      <div className="relative md:w-64 shrink-0">
                        <Link href={`/recipe/${recipe.slug}`} className="block">
                          {recipe.images.length > 0 ? (
                            <div className="relative aspect-[4/3] md:aspect-square w-full overflow-hidden bg-muted">
                              <Image
                                src={getImageSrc(recipe.images[0], recipe.slug)}
                                alt={recipe.title}
                                fill
                                className="object-cover transition-all duration-500 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, 256px"
                                unoptimized={isExternalUrl(recipe.images[0])}
                              />
                              {/* Image counter badge */}
                              {recipe.images.length > 1 && (
                                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                  <ImageIcon className="h-3 w-3" />
                                  {recipe.images.length}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex aspect-[4/3] md:aspect-square w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                              <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                        </Link>
                      </div>

                      {/* Recipe Details */}
                      <div className="flex-1 p-6">
                        {/* Course Label */}
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs font-medium">
                            Course {index + 1}
                          </Badge>
                        </div>

                        {/* Title */}
                        <Link
                          href={`/recipe/${recipe.slug}`}
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

                        {/* Stats Inline */}
                        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-blue-500">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(recipe.prepTime)}</span>
                            <span className="text-muted-foreground">prep</span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <div className="flex items-center gap-1.5 text-orange-500">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{formatTime(recipe.cookTime)}</span>
                            <span className="text-muted-foreground">cook</span>
                          </div>
                          <span className="text-muted-foreground">•</span>
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
                          href={`/recipe/${recipe.slug}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all hover:gap-2 hover:underline"
                        >
                          View full recipe
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
          <Link href="/dinner/plan">Create Your Own Dinner Plan</Link>
        </Button>
      </div>
    </div>
  );
}
