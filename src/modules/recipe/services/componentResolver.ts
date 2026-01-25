/**
 * Component Reference Resolver
 *
 * Resolves component references (@include:) in recipes.
 * Loads source recipes and copies component ingredients/instructions.
 */

import { Recipe } from '@/modules/recipe/domain';

/**
 * Custom error for component reference resolution failures
 */
export class ComponentReferenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ComponentReferenceError';
  }
}

/**
 * Context for resolving component references
 * Provides access to recipe repository functions
 */
export interface ResolverContext {
  getRecipeBySlug: (slug: string, locale: string) => Promise<Recipe | null>;
}

/**
 * Options for component reference resolution
 */
export interface ResolutionOptions {
  locale: string;
  maxDepth?: number; // Prevent infinite recursion (default: 5)
  resolutionStack?: string[]; // Track resolution path for circular reference detection
}

/**
 * Resolves all component references in a recipe
 *
 * For each component with a reference:
 * 1. Loads the source recipe
 * 2. Finds the referenced component by slug
 * 3. Copies ingredients and instructions
 * 4. Stores source servings for scaling
 *
 * Supports nested references (component → component → component)
 * Detects and prevents circular references
 *
 * @param recipe Recipe with potential component references
 * @param context Repository access for loading source recipes
 * @param options Resolution options (locale, max depth, etc.)
 * @returns Recipe with all component references resolved
 * @throws ComponentReferenceError if resolution fails
 */
export async function resolveComponentReferences(
  recipe: Recipe,
  context: ResolverContext,
  options: ResolutionOptions
): Promise<Recipe> {
  const { locale, maxDepth = 5, resolutionStack = [] } = options;

  // Check for circular references
  if (resolutionStack.includes(recipe.slug)) {
    throw new ComponentReferenceError(
      `Circular component reference detected: ${[...resolutionStack, recipe.slug].join(' → ')}`
    );
  }

  // Check max depth
  if (resolutionStack.length >= maxDepth) {
    throw new ComponentReferenceError(
      `Maximum reference depth (${maxDepth}) exceeded: ${resolutionStack.join(' → ')}`
    );
  }

  // If no components or no references, return as-is
  if (!recipe.components?.some((c) => c.reference)) {
    return recipe;
  }

  // Resolve each component
  const resolvedComponents = await Promise.all(
    recipe.components.map(async (component) => {
      // If no reference, return component as-is
      if (!component.reference) {
        return component;
      }

      // Only handle 'recipe' type for now
      if (component.reference.type !== 'recipe') {
        throw new ComponentReferenceError(
          `Component library references not yet supported: @include:component:${component.reference.componentSlug}`
        );
      }

      // Load source recipe
      let sourceRecipe: Recipe;
      try {
        const loadedRecipe = await context.getRecipeBySlug(
          component.reference.recipeSlug,
          locale
        );
        
        if (!loadedRecipe) {
          throw new ComponentReferenceError(
            `Source recipe "${component.reference.recipeSlug}" not found for locale "${locale}"`
          );
        }
        
        sourceRecipe = loadedRecipe;
      } catch (error) {
        if (error instanceof ComponentReferenceError) {
          throw error;
        }
        throw new ComponentReferenceError(
          `Source recipe "${component.reference.recipeSlug}" not found for locale "${locale}"`,
          { cause: error }
        );
      }

      // Recursively resolve source recipe's references first
      if (sourceRecipe.components?.some((c) => c.reference)) {
        sourceRecipe = await resolveComponentReferences(sourceRecipe, context, {
          locale,
          maxDepth,
          resolutionStack: [...resolutionStack, recipe.slug],
        });
      }

      // Find the component in source recipe by slug
      const sourceComponent = sourceRecipe.components?.find(
        (c) => c.slug === component.reference!.componentSlug
      );

      if (!sourceComponent) {
        const availableComponents =
          sourceRecipe.components
            ?.filter((c) => c.slug) // Only list components with slugs
            .map((c) => `${c.slug} (${c.name})`) || [];

        throw new ComponentReferenceError(
          `Component with slug "${component.reference.componentSlug}" not found in recipe "${component.reference.recipeSlug}". ` +
            `Available components with slugs: ${availableComponents.length > 0 ? availableComponents.join(', ') : 'none'}`
        );
      }

      // Copy ingredients, instructions, and timing from source
      // Keep the component name from the current recipe (might be in different language)
      return {
        name: component.name,
        slug: component.slug,
        prepTime: sourceComponent.prepTime, // Copy prepTime from source
        cookTime: sourceComponent.cookTime, // Copy cookTime from source
        waitTime: sourceComponent.waitTime, // Copy waitTime from source
        ingredients: [...sourceComponent.ingredients], // Deep copy
        instructions: [...sourceComponent.instructions], // Deep copy
        reference: {
          ...component.reference,
          sourceServings: sourceRecipe.servings, // Store for scaling
        },
      };
    })
  );

  // Recalculate totalTime after resolution using Option C
  // (Some components may have gained prepTime/cookTime/waitTime from their references)
  const componentTimes = resolvedComponents.map((c) => {
    const activeTime = (c.prepTime ?? 0) + (c.cookTime ?? 0);
    const waitTime = c.waitTime ?? 0;
    return Math.max(activeTime, waitTime);
  });
  
  let recalculatedTotalTime = recipe.totalTime;
  if (componentTimes.length > 0) {
    recalculatedTotalTime = componentTimes.reduce((sum, time) => sum + time, 0);
  }

  return {
    ...recipe,
    totalTime: recalculatedTotalTime,
    components: resolvedComponents,
  };
}
