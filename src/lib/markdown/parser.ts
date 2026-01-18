/**
 * Markdown Parser
 *
 * Parses recipe markdown files with frontmatter.
 * Extracts metadata, ingredients, and instructions.
 */

import matter from 'gray-matter';
import {
  Recipe,
  RecipeMetadata,
  recipeFrontmatterSchema,
  safeValidateRecipeFrontmatter,
} from '@/modules/recipe/domain';
import { parseIngredientsFromMarkdown } from '@/modules/ingredient/services/parser';

/**
 * Result of parsing a recipe markdown file
 */
export interface ParsedRecipe {
  metadata: RecipeMetadata;
  description: string;
  ingredientsMarkdown: string;
  instructionsMarkdown: string;
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
 * Extract description (content before first ## heading)
 */
function extractDescription(content: string): string {
  const firstHeadingIndex = content.search(/^##\s/m);
  if (firstHeadingIndex === -1) {
    return content.trim();
  }
  return content.slice(0, firstHeadingIndex).trim();
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
      // Calculate totalTime if not provided
      totalTime:
        rawFrontmatter.totalTime ??
        (rawFrontmatter.prepTime ?? 0) + (rawFrontmatter.cookTime ?? 0),
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

    // Extract sections
    const description = extractDescription(bodyContent);
    const ingredientsMarkdown = extractSection(bodyContent, 'Ingredients') ?? '';
    const instructionsMarkdown = extractSection(bodyContent, 'Instructions') ?? '';
    const notesMarkdown = extractSection(bodyContent, 'Notes');

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
  const ingredients = parseIngredientsFromMarkdown(parsed.ingredientsMarkdown);
  const instructions = parseInstructions(parsed.instructionsMarkdown);

  return {
    ...parsed.metadata,
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
