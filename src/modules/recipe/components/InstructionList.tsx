'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface InstructionListProps {
  instructions: string[];
}

/**
 * Recipe instruction list with step completion tracking
 */
export function InstructionList({ instructions }: InstructionListProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  if (instructions.length === 0) {
    return (
      <p className="text-muted-foreground">No instructions available.</p>
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

  const progress = (completedSteps.size / instructions.length) * 100;

  return (
    <div>
      {/* Progress bar */}
      {completedSteps.size > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {completedSteps.size} of {instructions.length} steps
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
        {instructions.map((instruction, index) => {
          const isCompleted = completedSteps.has(index);

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
                    ? `Mark step ${index + 1} as incomplete`
                    : `Mark step ${index + 1} as complete`
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
                  {instruction}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Completion message */}
      {completedSteps.size === instructions.length && (
        <div className="mt-8 rounded-xl bg-green-50 p-6 text-center dark:bg-green-950/20">
          <div className="mb-2 text-4xl">🎉</div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            All done!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            Enjoy your delicious creation!
          </p>
        </div>
      )}
    </div>
  );
}
