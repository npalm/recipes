'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { scaleInstructionText, parseInstructionSegments } from '@/modules/instruction/services';

interface InstructionListProps {
  instructions: string[];
  originalServings?: number;
  currentServings?: number;
}

/**
 * Recipe instruction list with step completion tracking and quantity scaling
 */
export function InstructionList({ 
  instructions,
  originalServings,
  currentServings,
}: InstructionListProps) {
  const t = useTranslations();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Always scale instructions to process {{...}} annotations
  // Even when servings match, we need to remove the braces
  const scaledInstructions = originalServings && currentServings
    ? instructions.map(inst => scaleInstructionText(inst, originalServings, currentServings))
    : instructions;
  
  const shouldHighlight = originalServings && currentServings && originalServings !== currentServings;

  if (scaledInstructions.length === 0) {
    return (
      <p className="text-muted-foreground">{t('recipe.noInstructions')}</p>
    );
  }

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const progress = (completedSteps.size / scaledInstructions.length) * 100;

  return (
    <div>
      {/* Progress bar */}
      {completedSteps.size > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{t('recipe.progress')}</span>
            <span className="text-muted-foreground">
              {t('recipe.stepsCount', { completed: completedSteps.size, total: scaledInstructions.length })}
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

      {/* Steps */}
      <ol className="space-y-6">
        {scaledInstructions.map((instruction, index) => {
          const isCompleted = completedSteps.has(index);
          
          // Parse segments to identify scaled quantities for highlighting
          const segments = shouldHighlight && originalServings && currentServings
            ? parseInstructionSegments(instructions[index], instruction, originalServings, currentServings)
            : [{ text: instruction, isScaled: false }];

          return (
            <li
              key={index}
              className={`group flex gap-4 ${isCompleted ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => toggleStep(index)}
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

      {/* Completion message */}
      {completedSteps.size === scaledInstructions.length && (
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
