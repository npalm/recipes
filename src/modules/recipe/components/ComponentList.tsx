'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Minus, Plus, RotateCcw, Users, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RecipeComponent } from '@/modules/recipe/domain';
import {
  scaleIngredients,
  formatScaledIngredient,
} from '@/modules/ingredient/services';
import { scaleInstructionText, parseInstructionSegments } from '@/modules/instruction/services';
import { config } from '@/lib/config';

interface ComponentIngredientsProps {
  components: RecipeComponent[];
  defaultServings: number;
  servings?: number;
  onServingsChange?: (servings: number) => void;
}

/**
 * Interactive ingredient list grouped by components with serving adjustment
 * Can be controlled (servings + onServingsChange) or uncontrolled (internal state)
 */
export function ComponentIngredientList({
  components,
  defaultServings,
  servings: controlledServings,
  onServingsChange,
}: ComponentIngredientsProps) {
  const t = useTranslations();
  const [internalServings, setInternalServings] = useState(defaultServings);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(
    new Set(components.map((c) => c.name))
  );

  // Use controlled value if provided, otherwise use internal state
  const servings = controlledServings ?? internalServings;
  const setServings = onServingsChange ?? setInternalServings;

  const handleServingsChange = (newServings: number) => {
    const clamped = Math.max(
      config.minServings,
      Math.min(config.maxServings, newServings)
    );
    setServings(clamped);
  };

  const increment = () => handleServingsChange(servings + 1);
  const decrement = () => handleServingsChange(servings - 1);

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleExpanded = (name: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const isModified = servings !== defaultServings;

  return (
    <div>
      {/* Servings control */}
      <div className="mb-6 rounded-xl bg-muted/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          {t('recipe.servings')}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={decrement}
              disabled={servings <= config.minServings}
              aria-label={t('recipe.decreaseServings')}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-2xl font-bold">{servings}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={increment}
              disabled={servings >= config.maxServings}
              aria-label={t('recipe.increaseServings')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {isModified && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setServings(defaultServings)}
              className="text-muted-foreground"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              {t('common.reset')}
            </Button>
          )}
        </div>
        {isModified && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('recipe.originalServes', { count: defaultServings })}
          </p>
        )}
      </div>

      {/* Components with ingredients */}
      <div className="space-y-4">
        {components.map((component) => {
          const isExpanded = expandedComponents.has(component.name);
          // Use source servings for referenced components, otherwise use recipe servings
          const componentBaseServings = component.reference?.sourceServings ?? defaultServings;
          const scaledIngredients = scaleIngredients(
            component.ingredients,
            componentBaseServings,
            servings
          );
          const componentCheckedCount = component.ingredients.filter((_, idx) =>
            checkedItems.has(`${component.name}-${idx}`)
          ).length;

          // Skip components with no ingredients
          if (component.ingredients.length === 0) return null;

          return (
            <div key={component.name} className="rounded-lg border bg-card">
              <button
                onClick={() => toggleExpanded(component.name)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">{component.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {t('recipe.itemsCount', { count: component.ingredients.length })}
                  </span>
                </div>
                {componentCheckedCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {componentCheckedCount}/{component.ingredients.length}
                  </span>
                )}
              </button>

              {isExpanded && (
                <ul className="space-y-1 border-t px-4 pb-4 pt-2">
                  {scaledIngredients.map((ingredient, index) => {
                    const key = `${component.name}-${index}`;
                    const isChecked = checkedItems.has(key);
                    const isScaled = ingredient.scalable && isModified;

                    return (
                      <li
                        key={key}
                        className={`group flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 ${
                          isChecked ? 'opacity-50' : ''
                        }`}
                        onClick={() => toggleChecked(key)}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleChecked(key);
                          }
                        }}
                      >
                        <span
                          className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            isChecked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30 group-hover:border-primary/50'
                          }`}
                        >
                          {isChecked && (
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`text-sm leading-relaxed ${
                            isChecked ? 'line-through' : ''
                          } ${isScaled ? 'font-medium text-primary' : ''}`}
                        >
                          {formatScaledIngredient(ingredient)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {checkedItems.size > 0 && (
        <div className="mt-4 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCheckedItems(new Set())}
            className="w-full text-muted-foreground"
          >
            {t('recipe.clearCheckedItems', { count: checkedItems.size })}
          </Button>
        </div>
      )}
    </div>
  );
}

interface ComponentInstructionsProps {
  components: RecipeComponent[];
  originalServings?: number;
  currentServings?: number;
}

/**
 * Instruction list grouped by components with step completion tracking and quantity scaling
 */
export function ComponentInstructionList({ 
  components,
  originalServings,
  currentServings,
}: ComponentInstructionsProps) {
  const t = useTranslations();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(
    new Set(components.map((c) => c.name))
  );

  // Always scale instructions to process {{...}} annotations
  // Even when servings match, we need to remove the braces
  const shouldHighlight = originalServings && currentServings && originalServings !== currentServings;

  // Calculate total steps across all components
  const totalSteps = components.reduce(
    (sum, comp) => sum + comp.instructions.length,
    0
  );

  if (totalSteps === 0) {
    return (
      <p className="text-muted-foreground">{t('recipe.noInstructions')}</p>
    );
  }

  const toggleStep = (key: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleExpanded = (name: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const progress = (completedSteps.size / totalSteps) * 100;

  return (
    <div>
      {/* Progress bar */}
      {completedSteps.size > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{t('recipe.progress')}</span>
            <span className="text-muted-foreground">
              {t('recipe.stepsCount', { completed: completedSteps.size, total: totalSteps })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Components with instructions */}
      <div className="space-y-6">
        {components.map((component) => {
          const isExpanded = expandedComponents.has(component.name);
          const componentCompletedCount = component.instructions.filter(
            (_, idx) => completedSteps.has(`${component.name}-${idx}`)
          ).length;
          const isComponentComplete =
            componentCompletedCount === component.instructions.length;

          // Use source servings for referenced components, otherwise use recipe servings
          const componentBaseServings = component.reference?.sourceServings ?? originalServings;

          // Skip components with no instructions
          if (component.instructions.length === 0) return null;

          return (
            <div key={component.name} className="rounded-xl border bg-card">
              <button
                onClick={() => toggleExpanded(component.name)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">{component.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {t('recipe.stepsCountLabel', { count: component.instructions.length })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {componentCompletedCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {componentCompletedCount}/{component.instructions.length}
                    </span>
                  )}
                  {isComponentComplete && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <ol className="space-y-4 border-t px-4 pb-4 pt-4 md:px-6">
                  {component.instructions.map((instruction, index) => {
                    const key = `${component.name}-${index}`;
                    const isCompleted = completedSteps.has(key);
                    
                    // Always scale instruction to process {{...}} annotations
                    const scaledInstruction = componentBaseServings && currentServings
                      ? scaleInstructionText(instruction, componentBaseServings, currentServings)
                      : instruction;
                    
                    // Parse segments for highlighting
                    const segments = shouldHighlight && componentBaseServings && currentServings
                      ? parseInstructionSegments(instruction, scaledInstruction, componentBaseServings, currentServings)
                      : [{ text: scaledInstruction, isScaled: false }];

                    return (
                      <li
                        key={key}
                        className={`group flex gap-4 ${
                          isCompleted ? 'opacity-60' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleStep(key)}
                          className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                            isCompleted
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
                          }`}
                          aria-label={
                            isCompleted
                              ? t('recipe.markStepIncomplete', { number: index + 1 })
                              : t('recipe.markStepComplete', { number: index + 1 })
                          }
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </button>
                        <div className="flex-1 pt-1">
                          <p
                            className={`leading-relaxed ${
                              isCompleted ? 'line-through' : ''
                            }`}
                          >
                            {segments.map((segment, segIndex) => (
                              segment.isScaled ? (
                                <span 
                                  key={segIndex}
                                  className="font-medium text-primary/90 underline decoration-primary/30 decoration-dotted underline-offset-2"
                                >
                                  {segment.text}
                                </span>
                              ) : (
                                <span key={segIndex}>{segment.text}</span>
                              )
                            ))}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {completedSteps.size === totalSteps && totalSteps > 0 && (
        <div className="mt-8 rounded-xl bg-green-50 p-6 text-center dark:bg-green-950/20">
          <div className="mb-2 text-4xl">🎉</div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            {t('recipe.allDone')}
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            {t('recipe.enjoyCreation')}
          </p>
        </div>
      )}
    </div>
  );
}
