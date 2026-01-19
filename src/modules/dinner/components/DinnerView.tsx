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

      {/* Courses - Magazine Style */}
      <div className="space-y-12">
        {recipes.map((recipe, index) => {
          const difficulty = difficultyConfig[recipe.difficulty];
          
          return (
            <article key={recipe.slug} className="group">
              {/* Course Number Badge - Positioned absolutely over image */}
              <div className="relative mb-6">
                <Badge 
                  variant="secondary" 
                  className="absolute -top-3 left-4 z-10 bg-background shadow-lg border-2 px-4 py-1.5 text-base font-semibold"
                >
                  Course {index + 1}
                </Badge>
              </div>

              <Card className="overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl">
                {/* Hero Image with Overlay Effects */}
                <Link href={`/recipe/${recipe.slug}`} className="block">
                  {recipe.images.length > 0 ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                      <Image
                        src={getImageSrc(recipe.images[0], recipe.slug)}
                        alt={recipe.title}
                        fill
                        className="object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                        priority={index === 0}
                        unoptimized={isExternalUrl(recipe.images[0])}
                      />
                      {/* Gradient overlay for better text contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      
                      {/* Image counter badge */}
                      {recipe.images.length > 1 && (
                        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
                          <ImageIcon className="h-4 w-4" />
                          {recipe.images.length}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-t-lg bg-gradient-to-br from-muted via-muted/80 to-muted/50">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </Link>

                <CardContent className="p-8 md:p-10">
                  {/* Recipe Title */}
                  <Link
                    href={`/recipe/${recipe.slug}`}
                    className="group/title inline-block"
                  >
                    <h2 className="mb-4 text-3xl font-bold tracking-tight transition-colors group-hover/title:text-primary md:text-4xl">
                      {recipe.title}
                    </h2>
                  </Link>
                  
                  {/* Description */}
                  {recipe.description && (
                    <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
                      {recipe.description}
                    </p>
                  )}

                  {/* Stats Grid - Without Servings */}
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{formatTime(recipe.prepTime)}</div>
                        <div className="text-xs text-muted-foreground">Prep Time</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                        <Clock className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{formatTime(recipe.cookTime)}</div>
                        <div className="text-xs text-muted-foreground">Cook Time</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${difficulty.className}`}>
                        <ChefHat className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{difficulty.label}</div>
                        <div className="text-xs text-muted-foreground">Difficulty</div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {recipe.tags.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      {recipe.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary"
                          className="px-3 py-1 text-sm font-medium"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* View Recipe Button */}
                  <Link
                    href={`/recipe/${recipe.slug}`}
                    className="inline-flex items-center gap-2 text-base font-medium text-primary transition-all hover:gap-3 hover:underline"
                  >
                    View full recipe
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </CardContent>
              </Card>
            </article>
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
