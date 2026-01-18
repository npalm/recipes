'use client';

import Link from 'next/link';
import { Clock, Users, ChefHat, Calendar, ExternalLink, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Recipe } from '@/modules/recipe/domain';
import { ImageGallery } from './ImageGallery';
import { IngredientList } from './IngredientList';
import { InstructionList } from './InstructionList';
import { formatTime, formatDate } from '@/modules/shared/utils';

interface RecipeDetailProps {
  recipe: Recipe;
  isDemo?: boolean;
}

/**
 * Full recipe detail view
 */
export function RecipeDetail({ recipe, isDemo = false }: RecipeDetailProps) {
  const basePath = isDemo ? '/demo' : '';

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-amber-100 text-amber-800',
    hard: 'bg-red-100 text-red-800',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <article className="mx-auto max-w-4xl">
      {/* Header Image */}
      <ImageGallery
        images={recipe.images}
        slug={recipe.slug}
        title={recipe.title}
        isDemo={isDemo}
        autoRotate={recipe.headerImageRotation}
      />

      {/* Title and Meta */}
      <div className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {recipe.title}
            </h1>
            {recipe.status === 'draft' && (
              <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">
                Draft
              </Badge>
            )}
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

        {/* Meta info */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {recipe.servings} servings
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatTime(recipe.totalTime ?? recipe.prepTime + recipe.cookTime)}
          </span>
          <Badge
            variant="secondary"
            className={`${difficultyColors[recipe.difficulty]} border-0`}
          >
            <ChefHat className="mr-1 h-3 w-3" />
            {recipe.difficulty}
          </Badge>
        </div>

        {/* Time breakdown */}
        <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
          <span>Prep: {formatTime(recipe.prepTime)}</span>
          <span>Cook: {formatTime(recipe.cookTime)}</span>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <Link key={tag} href={`${basePath}/search?tag=${tag}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Description */}
        {recipe.description && (
          <p className="mt-6 text-lg text-muted-foreground">{recipe.description}</p>
        )}
      </div>

      <Separator className="my-8" />

      {/* Main content grid */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Ingredients */}
        <div className="md:col-span-1">
          <h2 className="mb-4 text-xl font-semibold">Ingredients</h2>
          <IngredientList
            ingredients={recipe.ingredients}
            defaultServings={recipe.servings}
          />
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Instructions</h2>
          <InstructionList instructions={recipe.instructions} />
        </div>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="mb-4 text-xl font-semibold">Notes</h2>
            <div className="rounded-lg bg-muted p-4 text-sm">{recipe.notes}</div>
          </div>
        </>
      )}

      {/* Sources */}
      {recipe.sources.length > 0 && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="mb-4 text-xl font-semibold">Sources</h2>
            <ul className="space-y-2">
              {recipe.sources.map((source, index) => (
                <li key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Dates */}
      <div className="mt-8 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Created: {formatDate(recipe.createdAt)}
        </span>
        {recipe.updatedAt && (
          <span>Updated: {formatDate(recipe.updatedAt)}</span>
        )}
      </div>
    </article>
  );
}
