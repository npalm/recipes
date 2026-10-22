import type { Ingredient, Recipe } from '../domain';
import { config } from '@/lib/config';

export interface CookingSection {
  id: string;
  name: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  originalServings: number;
}

export interface CookingStep {
  id: string;
  sectionId: string;
  sectionName: string | null;
  text: string;
  originalServings: number;
}

export interface CookingProgress {
  fingerprint: string;
  activeStep: number;
  completedSteps: string[];
  checkedIngredients: string[];
  servings: number;
}

export function buildCookingRecipe(recipe: Recipe) {
  const sections: CookingSection[] = [
    { id: 'recipe', name: null, ingredients: recipe.ingredients, instructions: recipe.instructions, originalServings: recipe.servings },
    ...(recipe.components ?? []).map((component, index) => ({
      id: `component-${index}`,
      name: component.name,
      ingredients: component.ingredients,
      instructions: component.instructions,
      originalServings: component.reference?.sourceServings ?? recipe.servings,
    })),
  ].filter(section => section.ingredients.length || section.instructions.length);

  const steps: CookingStep[] = sections.flatMap(section => section.instructions.map((text, index) => ({
    id: `${section.id}-step-${index}`,
    sectionId: section.id,
    sectionName: section.name,
    text,
    originalServings: section.originalServings,
  })));
  // Invalidate saved progress when the recipe's instructions or ingredients change.
  const fingerprint = JSON.stringify(sections);
  return { sections, steps, fingerprint };
}

export function restoreCookingProgress(
  saved: string | null,
  recipe: ReturnType<typeof buildCookingRecipe>,
  servings: number,
): CookingProgress {
  const fallback: CookingProgress = {
    fingerprint: recipe.fingerprint, activeStep: 0, completedSteps: [], checkedIngredients: [],
    servings: Math.max(config.minServings, Math.min(config.maxServings, servings)),
  };
  try {
    const value: unknown = saved ? JSON.parse(saved) : null;
    if (!value || typeof value !== 'object') return fallback;
    const data = value as Partial<CookingProgress>;
    if (data.fingerprint !== recipe.fingerprint) return fallback;
    const stepIds = new Set(recipe.steps.map(step => step.id));
    const ingredientIds = new Set(recipe.sections.flatMap(section => section.ingredients.map((_, index) => `${section.id}-ingredient-${index}`)));
    const validIds = (values: unknown, allowed: Set<string>) => Array.isArray(values)
      ? [...new Set(values.filter((id): id is string => typeof id === 'string' && allowed.has(id)))] : [];
    return {
      fingerprint: recipe.fingerprint,
      activeStep: typeof data.activeStep === 'number' && Number.isInteger(data.activeStep)
        ? Math.max(0, Math.min(recipe.steps.length, data.activeStep)) : 0,
      completedSteps: validIds(data.completedSteps, stepIds),
      checkedIngredients: validIds(data.checkedIngredients, ingredientIds),
      servings: typeof data.servings === 'number' && Number.isInteger(data.servings) &&
        data.servings >= config.minServings && data.servings <= config.maxServings ? data.servings : fallback.servings,
    };
  } catch {
    return fallback;
  }
}
