'use client';

import Link from 'next/link';
import {
  Clock,
  Users,
  ChefHat,
  Calendar,
  ExternalLink,
  Printer,
  ArrowLeft,
  Timer,
  Flame,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Recipe } from '@/modules/recipe/domain';
import { ImageGallery } from './ImageGallery';
import { IngredientList } from './IngredientList';
import { InstructionList } from './InstructionList';
import { ComponentIngredientList, ComponentInstructionList } from './ComponentList';
import { formatTime, formatDate } from '@/modules/shared/utils';
import { difficultyConfig } from './RecipeCard';

interface RecipeDetailProps {
  recipe: Recipe;
  isDemo?: boolean;
}

/**
 * Full recipe detail view
 */
export function RecipeDetail({ recipe, isDemo = false }: RecipeDetailProps) {
  const basePath = isDemo ? '/demo' : '';
  const difficulty = difficultyConfig[recipe.difficulty];

  const handlePrint = () => {
    window.print();
  };

  return (
    <article className="mx-auto max-w-5xl">
      {/* Back navigation */}
      <div className="mb-6 print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href={`${basePath}/`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to recipes
          </Link>
        </Button>
      </div>

      {/* Header section with image */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-card shadow-sm">
        <ImageGallery
          images={recipe.images}
          slug={recipe.slug}
          title={recipe.title}
          isDemo={isDemo}
          autoRotate={recipe.headerImageRotation}
        />

        <div className="p-6 md:p-8">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {recipe.status === 'draft' && (
                  <Badge className="bg-yellow-500 text-white">Draft</Badge>
                )}
                <Badge
                  variant="secondary"
                  className={`${difficulty.className} flex items-center gap-0.5 border-0`}
                >
                  {difficulty.icon}
                  <span className="ml-1">{difficulty.label}</span>
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                {recipe.title}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden print:hidden md:flex"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {recipe.description}
            </p>
          )}

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recipe.servings}</p>
                <p className="text-xs text-muted-foreground">Servings</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Timer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTime(recipe.prepTime)}</p>
                <p className="text-xs text-muted-foreground">Prep time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTime(recipe.cookTime)}</p>
                <p className="text-xs text-muted-foreground">Cook time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatTime(recipe.totalTime ?? recipe.prepTime + recipe.cookTime)}
                </p>
                <p className="text-xs text-muted-foreground">Total time</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <Link key={tag} href={`${basePath}/search?tag=${tag}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      {recipe.components && recipe.components.length > 0 ? (
        /* Component-based recipe layout */
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Ingredients sidebar */}
          <div className="lg:col-span-4">
            <Card className="sticky top-24 border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
                  <Layers className="h-5 w-5 text-primary" />
                  Ingredients
                  <Badge variant="secondary" className="ml-auto">
                    {recipe.components.length} parts
                  </Badge>
                </h2>
                <ComponentIngredientList
                  components={recipe.components}
                  defaultServings={recipe.servings}
                />
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
                  Instructions
                  <Badge variant="secondary" className="ml-2">
                    {recipe.components.length} parts
                  </Badge>
                </h2>
                <ComponentInstructionList components={recipe.components} />
              </CardContent>
            </Card>

            {/* Notes */}
            {recipe.notes && (
              <Card className="mt-6 border-0 bg-amber-50 shadow-sm dark:bg-amber-950/20">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-200">
                    <span className="text-xl">💡</span>
                    Tips & Notes
                  </h2>
                  <ul className="space-y-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                    {recipe.notes.split('\n').filter(line => line.trim()).map((note, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-amber-600 dark:text-amber-400">•</span>
                        <span>{note.replace(/^[-•]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            {recipe.sources.length > 0 && (
              <Card className="mt-6 border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold">Inspired by</h2>
                  <ul className="space-y-2">
                    {recipe.sources.map((source, index) => (
                      <li key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Simple recipe layout */
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Ingredients sidebar */}
          <div className="lg:col-span-4">
            <Card className="sticky top-24 border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
                  <ChefHat className="h-5 w-5 text-primary" />
                  Ingredients
                </h2>
                <IngredientList
                  ingredients={recipe.ingredients}
                  defaultServings={recipe.servings}
                />
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <h2 className="mb-6 text-xl font-semibold">Instructions</h2>
                <InstructionList instructions={recipe.instructions} />
              </CardContent>
            </Card>

            {/* Notes */}
            {recipe.notes && (
              <Card className="mt-6 border-0 bg-amber-50 shadow-sm dark:bg-amber-950/20">
                <CardContent className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-200">
                    <span className="text-xl">💡</span>
                    Tips & Notes
                  </h2>
                  <ul className="space-y-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                    {recipe.notes.split('\n').filter(line => line.trim()).map((note, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-amber-600 dark:text-amber-400">•</span>
                        <span>{note.replace(/^[-•]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            {recipe.sources.length > 0 && (
              <Card className="mt-6 border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold">Inspired by</h2>
                  <ul className="space-y-2">
                    {recipe.sources.map((source, index) => (
                      <li key={index}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Footer meta */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Created: {formatDate(recipe.createdAt)}
          </span>
          {recipe.updatedAt && (
            <span>Last updated: {formatDate(recipe.updatedAt)}</span>
          )}
        </div>
        <Button variant="outline" size="sm" asChild className="print:hidden">
          <Link href={`${basePath}/`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to recipes
          </Link>
        </Button>
      </div>
    </article>
  );
}
