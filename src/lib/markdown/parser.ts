/**
 * Markdown Parser
 *
 * Parses recipe markdown files with frontmatter.
 * Extracts metadata, ingredients, and instructions.
 * Supports both simple recipes and component-based recipes.
 */

import matter from 'gray-matter';
import {
  Recipe,
  RecipeMetadata,
  RecipeComponent,
  safeValidateRecipeFrontmatter,
} from '@/modules/recipe/domain';
import { parseIngredientsFromMarkdown } from '@/modules/ingredient/services/parser';

/**
 * Result of parsing a recipe markdown file
 */
export interface ParsedRecipeComponent {
  name: string;
  slug?: string;
  prepTime?: number;
  cookTime?: number;
  waitTime?: number;
  ingredientsMarkdown: string;
  instructionsMarkdown: string;
  reference?: {
    recipeSlug: string;
    componentSlug: string;
  };
}

export interface ParsedRecipe {
  metadata: RecipeMetadata;
  description: string;
  ingredientsMarkdown: string;
  instructionsMarkdown: string;
  components?: ParsedRecipeComponent[];
  notesMarkdown?: string;
  rawContent: string;
}

/**
 * Error thrown when recipe parsing fails
 */
export class RecipeParseError extends Error {
  constructor(
    message: string,
    public readonly slug: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RecipeParseError';
  }
}

/**
 * Extract a section from markdown content
 * Returns the content between a heading and the next heading of same or higher level
 */
function extractSection(
  content: string,
  sectionName: string
): string | undefined {
  // Match ## Section Name and capture content until next ## heading or end of content
  const regex = new RegExp(
    `^##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`,
    'm'
  );
  const match = content.match(regex);
  
  // If \Z doesn't work (it's not standard JS), try alternative approach
  if (!match) {
    // Alternative: split by headings and find the right section
    const sections = content.split(/^(##\s+.+)$/m);
    for (let i = 0; i < sections.length; i++) {
      const heading = sections[i];
      if (heading && new RegExp(`^##\\s+${sectionName}\\s*$`, 'i').test(heading)) {
        const sectionContent = sections[i + 1];
        return sectionContent ? sectionContent.trim() : undefined;
      }
    }
    return undefined;
  }
  
  return match[1].trim();
}

/**
 * Extract description (first paragraph only, before first ## heading)
 */
function extractDescription(content: string): string {
  const firstHeadingIndex = content.search(/^##\s/m);
  const contentBeforeHeading = firstHeadingIndex === -1 
    ? content 
    : content.slice(0, firstHeadingIndex);
  
  // Extract only the first paragraph (content before first blank line)
  const firstBlankLine = contentBeforeHeading.search(/\n\s*\n/);
  if (firstBlankLine === -1) {
    return contentBeforeHeading.trim();
  }
  
  return contentBeforeHeading.slice(0, firstBlankLine).trim();
}

/**
 * Parse numbered or bulleted instructions into an array
 */
function parseInstructions(markdown: string | undefined): string[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const instructions: string[] = [];
  let currentInstruction = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines between instructions
    if (!trimmed) {
      if (currentInstruction) {
        instructions.push(currentInstruction.trim());
        currentInstruction = '';
      }
      continue;
    }

    // Match numbered list (1. 2. etc) or bulleted list (- *)
    const listMatch = trimmed.match(/^(?:\d+[.)]\s*|[-*]\s+)(.+)$/);
    if (listMatch) {
      if (currentInstruction) {
        instructions.push(currentInstruction.trim());
      }
      currentInstruction = listMatch[1];
    } else {
      // Continuation of previous instruction
      currentInstruction += ' ' + trimmed;
    }
  }

  // Don't forget the last instruction
  if (currentInstruction) {
    instructions.push(currentInstruction.trim());
  }

  return instructions;
}

/**
 * Check if content has a ## Components section (English or Dutch)
 */
function hasComponentsSection(content: string): boolean {
  return /^##\s+(Components|Onderdelen)\s*$/m.test(content);
}

/**
 * Extract sub-section from a component (#### level headings)
 * Used for getting Ingredients or Instructions within a component
 */
function extractSubSection(componentContent: string, sectionName: string): string {
  const sections = componentContent.split(/^(####\s+.+)$/m);
  for (let i = 0; i < sections.length; i++) {
    const heading = sections[i];
    if (heading && new RegExp(`^####\\s+${sectionName}\\s*$`, 'i').test(heading)) {
      const sectionContent = sections[i + 1];
      return sectionContent ? sectionContent.trim() : '';
    }
  }
  return '';
}

/**
 * Parse the ## Components section into individual components
 */
function parseComponentsSection(content: string): ParsedRecipeComponent[] {
  // Find the Components section (English or Dutch)
  const sections = content.split(/^(##\s+.+)$/m);
  let componentsContent = '';
  
  for (let i = 0; i < sections.length; i++) {
    const heading = sections[i];
    if (heading && /^##\s+(Components|Onderdelen)\s*$/i.test(heading)) {
      // Get content until next ## heading
      componentsContent = sections[i + 1] || '';
      break;
    }
  }
  
  if (!componentsContent) return [];
  
  // Split by ### headings (component names)
  const componentSections = componentsContent.split(/^(###\s+.+)$/m);
  const components: ParsedRecipeComponent[] = [];
  
  for (let i = 0; i < componentSections.length; i++) {
    const heading = componentSections[i];
    if (heading && /^###\s+(.+)$/.test(heading)) {
      const nameMatch = heading.match(/^###\s+(.+)$/);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const componentBody = componentSections[i + 1] || '';
        
        // Parse slug, prepTime, cookTime, waitTime, and reference from component body
        const { slug, prepTime, cookTime, waitTime, reference, cleanedBody } = parseComponentMetadata(componentBody);
        
        components.push({
          name,
          slug,
          prepTime,
          cookTime,
          waitTime,
          reference,
          ingredientsMarkdown: extractSubSection(cleanedBody, 'Ingredients') || extractSubSection(cleanedBody, 'Ingrediënten'),
          instructionsMarkdown: extractSubSection(cleanedBody, 'Instructions') || extractSubSection(cleanedBody, 'Bereiding'),
        });
      }
    }
  }
  
  return components;
}

/**
 * Parse component metadata (slug, reference, and time) from component body
 * Returns cleaned body with metadata lines removed
 */
function parseComponentMetadata(componentBody: string): {
  slug?: string;
  prepTime?: number;
  cookTime?: number;
  waitTime?: number;
  reference?: { recipeSlug: string; componentSlug: string };
  cleanedBody: string;
} {
  const lines = componentBody.split('\n');
  let slug: string | undefined;
  let prepTime: number | undefined;
  let cookTime: number | undefined;
  let waitTime: number | undefined;
  let reference: { recipeSlug: string; componentSlug: string } | undefined;
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for slug: line
    const slugMatch = trimmed.match(/^slug:\s*([a-z0-9-]+)\s*$/);
    if (slugMatch) {
      slug = slugMatch[1];
      continue; // Don't include this line in cleaned body
    }
    
    // Check for prepTime: line (in minutes)
    const prepTimeMatch = trimmed.match(/^prepTime:\s*(\d+)\s*$/);
    if (prepTimeMatch) {
      prepTime = parseInt(prepTimeMatch[1], 10);
      continue; // Don't include this line in cleaned body
    }
    
    // Check for cookTime: line (in minutes)
    const cookTimeMatch = trimmed.match(/^cookTime:\s*(\d+)\s*$/);
    if (cookTimeMatch) {
      cookTime = parseInt(cookTimeMatch[1], 10);
      continue; // Don't include this line in cleaned body
    }
    
    // Check for waitTime: line (in minutes)
    const waitTimeMatch = trimmed.match(/^waitTime:\s*(\d+)\s*$/);
    if (waitTimeMatch) {
      waitTime = parseInt(waitTimeMatch[1], 10);
      continue; // Don't include this line in cleaned body
    }
    
    // Check for @include: line
    const includeMatch = trimmed.match(/^@include:([a-z0-9-]+)#([a-z0-9-]+)\s*$/);
    if (includeMatch) {
      reference = {
        recipeSlug: includeMatch[1],
        componentSlug: includeMatch[2],
      };
      continue; // Don't include this line in cleaned body
    }
    
    // Keep all other lines
    cleanedLines.push(line);
  }
  
  return {
    slug,
    prepTime,
    cookTime,
    waitTime,
    reference,
    cleanedBody: cleanedLines.join('\n'),
  };
}

/**
 * Parse a recipe markdown file
 */
export function parseRecipeMarkdown(
  content: string,
  slug: string
): ParsedRecipe {
  try {
    // Parse frontmatter
    const { data: rawFrontmatter, content: bodyContent } = matter(content);

    // Validate frontmatter
    const validationResult = safeValidateRecipeFrontmatter({
      ...rawFrontmatter,
      slug,
      // Don't auto-calculate totalTime here - will be done in parsedRecipeToRecipe
      // based on whether it's component-based or not
      totalTime: rawFrontmatter.totalTime,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((e) => `${String(e.path.join('.'))}: ${e.message}`)
        .join(', ');
      throw new RecipeParseError(
        `Invalid frontmatter: ${errors}`,
        slug,
        validationResult.error
      );
    }

    const metadata = validationResult.data as RecipeMetadata;

    // Extract description (content before first ## heading)
    const description = extractDescription(bodyContent);
    
    // Check if this is a component-based recipe
    const isComponentBased = hasComponentsSection(bodyContent);
    
    if (isComponentBased) {
      // Parse component-based recipe
      const components = parseComponentsSection(bodyContent);
      const notesMarkdown = extractSection(bodyContent, 'Notes');
      
      return {
        metadata,
        description,
        ingredientsMarkdown: '', // Components have their own ingredients
        instructionsMarkdown: '', // Components have their own instructions
        components,
        notesMarkdown,
        rawContent: content,
      };
    }

    // Parse simple recipe (original format) - support both English and Dutch
    const ingredientsMarkdown = extractSection(bodyContent, 'Ingredients') || extractSection(bodyContent, 'Ingrediënten') || '';
    const instructionsMarkdown = extractSection(bodyContent, 'Instructions') || extractSection(bodyContent, 'Bereiding') || '';
    const notesMarkdown = extractSection(bodyContent, 'Notes') || extractSection(bodyContent, 'Notities');

    return {
      metadata,
      description,
      ingredientsMarkdown,
      instructionsMarkdown,
      notesMarkdown,
      rawContent: content,
    };
  } catch (error) {
    if (error instanceof RecipeParseError) {
      throw error;
    }
    throw new RecipeParseError(
      `Failed to parse recipe: ${error instanceof Error ? error.message : 'Unknown error'}`,
      slug,
      error
    );
  }
}

/**
 * Convert parsed recipe to full Recipe object
 */
export function parsedRecipeToRecipe(parsed: ParsedRecipe): Recipe {
  // Check if this is a component-based recipe
  if (parsed.components && parsed.components.length > 0) {
    const components: RecipeComponent[] = parsed.components.map((comp) => ({
      name: comp.name,
      slug: comp.slug,
      prepTime: comp.prepTime,
      cookTime: comp.cookTime,
      waitTime: comp.waitTime,
      ingredients: parseIngredientsFromMarkdown(comp.ingredientsMarkdown),
      instructions: parseInstructions(comp.instructionsMarkdown),
      // Add reference if present (will be resolved later by componentResolver)
      reference: comp.reference
        ? {
            type: 'recipe' as const,
            recipeSlug: comp.reference.recipeSlug,
            componentSlug: comp.reference.componentSlug,
            sourceServings: 0, // Will be populated by resolver
          }
        : undefined,
    }));

    // Auto-calculate totalTime from components if not explicitly set
    // Using Option C: max(activeTime, waitTime) per component
    let calculatedTotalTime = parsed.metadata.totalTime;
    if (!calculatedTotalTime) {
      const componentTimes = components.map((c) => {
        const activeTime = (c.prepTime ?? 0) + (c.cookTime ?? 0);
        const waitTime = c.waitTime ?? 0;
        // Total time for a component is active time + wait time
        // Wait time is in addition to active time (cooling, setting, etc.)
        return activeTime + waitTime;
      });
      
      const totalComponentTime = componentTimes.reduce((sum, time) => sum + time, 0);
      
      if (totalComponentTime > 0) {
        // Sum across all components (different components can be done in parallel in theory,
        // but we sum them as a conservative estimate)
        calculatedTotalTime = totalComponentTime;
      } else {
        // Fallback to recipe-level times if no component times
        const activeTime = parsed.metadata.prepTime + parsed.metadata.cookTime;
        const waitTime = parsed.metadata.waitTime ?? 0;
        calculatedTotalTime = activeTime + waitTime;
      }
    }

    return {
      ...parsed.metadata,
      totalTime: calculatedTotalTime,
      description: parsed.description,
      ingredients: [], // Empty for component-based recipes
      instructions: [], // Empty for component-based recipes
      components,
      notes: parsed.notesMarkdown,
      content: parsed.rawContent,
    };
  }

  // Simple recipe format
  const ingredients = parseIngredientsFromMarkdown(parsed.ingredientsMarkdown);
  const instructions = parseInstructions(parsed.instructionsMarkdown);

  // Calculate totalTime if not explicitly set in frontmatter
  // Use max of (prepTime + cookTime) and waitTime
  const totalTime = parsed.metadata.totalTime ?? 
    Math.max(
      parsed.metadata.prepTime + parsed.metadata.cookTime,
      parsed.metadata.waitTime ?? 0
    );

  return {
    ...parsed.metadata,
    totalTime,
    description: parsed.description,
    ingredients,
    instructions,
    notes: parsed.notesMarkdown,
    content: parsed.rawContent,
  };
}

/**
 * Full parsing pipeline: markdown string to Recipe object
 */
export function parseRecipe(content: string, slug: string): Recipe {
  const parsed = parseRecipeMarkdown(content, slug);
  return parsedRecipeToRecipe(parsed);
}
