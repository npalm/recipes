'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for a recipe card
 */
export function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4">
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="mb-4 h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for recipe grid
 */
export function RecipeGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Loading skeleton for recipe detail page
 */
export function RecipeDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Header image */}
      <Skeleton className="mb-6 aspect-video w-full rounded-lg" />

      {/* Title and meta */}
      <Skeleton className="mb-4 h-10 w-3/4" />
      <div className="mb-6 flex gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Description */}
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-8 h-4 w-2/3" />

      {/* Two columns */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Ingredients */}
        <div>
          <Skeleton className="mb-4 h-6 w-32" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-4 w-full" />
          ))}
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <Skeleton className="mb-4 h-6 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-4 h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic page loading state
 */
export function PageLoading() {
  const t = useTranslations();
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
}
