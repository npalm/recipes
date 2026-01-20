'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Difficulty, RecipeFilters } from '@/modules/recipe/domain';
import { config } from '@/lib/config';
import { useTranslations } from 'next-intl';

interface FilterPanelProps {
  filters: RecipeFilters;
  availableTags: string[];
  onFiltersChange: (filters: RecipeFilters) => void;
}

/**
 * Filter panel for recipe search
 */
export function FilterPanel({
  filters,
  availableTags,
  onFiltersChange,
}: FilterPanelProps) {
  const t = useTranslations();
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
  };

  const toggleDifficulty = (difficulty: Difficulty) => {
    const current = filters.difficulty || [];
    const newDifficulty = current.includes(difficulty)
      ? current.filter((d) => d !== difficulty)
      : [...current, difficulty];
    onFiltersChange({
      ...filters,
      difficulty: newDifficulty.length > 0 ? newDifficulty : undefined,
    });
  };

  const setMaxTime = (time: number | undefined) => {
    onFiltersChange({
      ...filters,
      maxTotalTime: time === Infinity ? undefined : time,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    (filters.tags && filters.tags.length > 0) ||
    (filters.difficulty && filters.difficulty.length > 0) ||
    filters.maxTotalTime !== undefined;

  return (
    <div className="space-y-6">
      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
          {t('search.clearFilters')}
        </Button>
      )}

      {/* Difficulty filter */}
      <div>
        <Label className="mb-3 block text-sm font-medium">{t('search.filterByDifficulty')}</Label>
        <div className="flex flex-wrap gap-2">
          {difficulties.map((difficulty) => {
            const isActive = filters.difficulty?.includes(difficulty);
            return (
              <Badge
                key={difficulty}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleDifficulty(difficulty)}
              >
                {t(`recipe.difficultyLevels.${difficulty}`)}
              </Badge>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Time filter */}
      <div>
        <Label className="mb-3 block text-sm font-medium">{t('search.filterByTime')}</Label>
        <div className="flex flex-wrap gap-2">
          {config.timeFilters.map(({ label, value }) => {
            const isActive =
              value === Infinity
                ? filters.maxTotalTime === undefined
                : filters.maxTotalTime === value;
            
            // Map time filter values to translation keys
            let translationKey = 'time.anyTime';
            if (value === 30) translationKey = 'time.quick';
            else if (value === 60) translationKey = 'time.medium';
            else if (value === 120) translationKey = 'time.long';
            
            return (
              <Badge
                key={label}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setMaxTime(value)}
              >
                {t(translationKey)}
              </Badge>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <div>
          <Label className="mb-3 block text-sm font-medium">{t('search.filterByTags')}</Label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isActive = filters.tags?.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isActive ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline filters for mobile
 */
export function InlineFilters({
  filters,
  availableTags, // eslint-disable-line @typescript-eslint/no-unused-vars
  onFiltersChange,
}: FilterPanelProps) {
  const t = useTranslations();
  const hasActiveFilters =
    (filters.tags && filters.tags.length > 0) ||
    (filters.difficulty && filters.difficulty.length > 0) ||
    filters.maxTotalTime !== undefined;

  const activeCount =
    (filters.tags?.length || 0) +
    (filters.difficulty?.length || 0) +
    (filters.maxTotalTime !== undefined ? 1 : 0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <Badge variant="outline" className="flex-shrink-0">
        {t('search.filters')} {activeCount > 0 && `(${activeCount})`}
      </Badge>
      
      {/* Show active filters */}
      {filters.difficulty?.map((d) => (
        <Badge key={d} variant="secondary" className="flex-shrink-0 capitalize">
          {d}
        </Badge>
      ))}
      {filters.tags?.map((tag) => (
        <Badge key={tag} variant="secondary" className="flex-shrink-0">
          {tag}
        </Badge>
      ))}
      {filters.maxTotalTime !== undefined && (
        <Badge variant="secondary" className="flex-shrink-0">
          &lt; {filters.maxTotalTime} min
        </Badge>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="flex-shrink-0 text-xs"
        >
          {t('common.clear')}
        </Button>
      )}
    </div>
  );
}
