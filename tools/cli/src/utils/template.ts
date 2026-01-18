/**
 * Recipe Template Utilities
 *
 * Template and schema definitions for generating recipe markdown files.
 */

/**
 * Recipe frontmatter schema for AI generation
 */
export interface RecipeFrontmatter {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  images: string[];
  headerImageRotation: boolean;
  sources: Array<{
    url: string;
    title?: string;
  }>;
  createdAt: string;
}

/**
 * Full recipe structure for AI generation
 */
export interface RecipeData {
  frontmatter: RecipeFrontmatter;
  description: string;
  ingredients: string[];
  instructions: string[];
  notes?: string[];
}

/**
 * Generate a slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Convert recipe data to markdown string
 */
export function recipeToMarkdown(recipe: RecipeData): string {
  const { frontmatter, description, ingredients, instructions, notes } = recipe;

  // Build frontmatter YAML
  const yamlLines = [
    '---',
    `title: "${frontmatter.title}"`,
    `slug: "${frontmatter.slug}"`,
    `status: ${frontmatter.status}`,
    `servings: ${frontmatter.servings}`,
    `prepTime: ${frontmatter.prepTime}`,
    `cookTime: ${frontmatter.cookTime}`,
    `difficulty: ${frontmatter.difficulty}`,
    `tags: [${frontmatter.tags.map((t) => `"${t}"`).join(', ')}]`,
    `images: []`,
    `headerImageRotation: ${frontmatter.headerImageRotation}`,
  ];

  // Add sources
  if (frontmatter.sources.length > 0) {
    yamlLines.push('sources:');
    for (const source of frontmatter.sources) {
      yamlLines.push(`  - url: "${source.url}"`);
      if (source.title) {
        yamlLines.push(`    title: "${source.title}"`);
      }
    }
  } else {
    yamlLines.push('sources: []');
  }

  yamlLines.push(`createdAt: "${frontmatter.createdAt}"`);
  yamlLines.push('---');

  // Build markdown content
  const contentLines = [
    '',
    description,
    '',
    '## Ingredients',
    '',
  ];

  // Add ingredients with {scale} marker for scalable items
  for (const ingredient of ingredients) {
    // Most ingredients are scalable, except serving suggestions
    const isServingSuggestion = /for serving|to taste|garnish|optional/i.test(ingredient);
    const scaleMark = isServingSuggestion ? '' : ' {scale}';
    contentLines.push(`- ${ingredient}${scaleMark}`);
  }

  contentLines.push('', '## Instructions', '');

  // Add numbered instructions
  instructions.forEach((instruction, index) => {
    contentLines.push(`${index + 1}. ${instruction}`);
    contentLines.push('');
  });

  // Add notes if present
  if (notes && notes.length > 0) {
    contentLines.push('## Notes', '');
    for (const note of notes) {
      contentLines.push(`- ${note}`);
    }
    contentLines.push('');
  }

  return [...yamlLines, ...contentLines].join('\n');
}

/**
 * System prompt for AI recipe generation
 */
export const RECIPE_SYSTEM_PROMPT = `You are a helpful cooking assistant that creates detailed recipes in a structured JSON format.

When given a recipe request, you must respond with a valid JSON object containing the following structure:

{
  "frontmatter": {
    "title": "Recipe Title",
    "slug": "recipe-title",
    "status": "draft",
    "servings": 4,
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "easy" | "medium" | "hard",
    "tags": ["tag1", "tag2"],
    "images": [],
    "headerImageRotation": true,
    "sources": [],
    "createdAt": "YYYY-MM-DD"
  },
  "description": "A brief, appetizing description of the dish (1-2 sentences).",
  "ingredients": [
    "1 cup flour",
    "2 eggs",
    "1/2 teaspoon salt"
  ],
  "instructions": [
    "First instruction step.",
    "Second instruction step.",
    "Third instruction step."
  ],
  "notes": [
    "Optional tip or variation.",
    "Storage instructions."
  ]
}

Guidelines:
- Use standard US measurements (cups, tablespoons, teaspoons, pounds, ounces)
- Include precise quantities for all ingredients
- Write clear, step-by-step instructions
- Estimate realistic prep and cook times
- Choose appropriate difficulty based on techniques required
- Include helpful notes about variations, substitutions, or tips
- Generate a URL-friendly slug from the title
- Tags should include cuisine type, meal type, main ingredient, and any dietary info

IMPORTANT: Respond ONLY with the JSON object, no additional text.`;

/**
 * System prompt for importing/transforming external recipes
 */
export const RECIPE_IMPORT_PROMPT = `You are a recipe extraction assistant. Your job is to extract recipe information from web content and convert it to a structured JSON format.

Given raw content from a recipe webpage, extract and structure the recipe into this JSON format:

{
  "frontmatter": {
    "title": "Recipe Title",
    "slug": "recipe-title",
    "status": "draft",
    "servings": 4,
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "easy" | "medium" | "hard",
    "tags": ["tag1", "tag2"],
    "images": [],
    "headerImageRotation": true,
    "sources": [{"url": "original_url", "title": "Source Name"}],
    "createdAt": "YYYY-MM-DD"
  },
  "description": "A brief description of the dish.",
  "ingredients": [
    "1 cup flour",
    "2 eggs"
  ],
  "instructions": [
    "First instruction step.",
    "Second instruction step."
  ],
  "notes": [
    "Optional tips or variations."
  ]
}

Guidelines:
- Extract the exact ingredients and instructions from the source
- Standardize measurements to US units when possible
- Clean up any ads, promotional content, or unnecessary text
- Infer difficulty based on techniques and ingredient count
- Generate appropriate tags based on the recipe content
- Preserve the original source URL in the sources array
- If information is missing, make reasonable assumptions and note them

IMPORTANT: Respond ONLY with the JSON object, no additional text.`;
