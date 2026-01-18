/**
 * Import Command
 *
 * Import a recipe from an external URL using AI to extract and transform.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { getProviderFromEnv, createProvider } from '../providers/index.js';
import {
  RECIPE_IMPORT_PROMPT,
  recipeToMarkdown,
  generateSlug,
  getTodayDate,
  type RecipeData,
} from '../utils/template.js';

interface ImportOptions {
  output?: string;
  draft?: boolean;
}

export const importCommand = new Command('import')
  .description('Import a recipe from a URL')
  .argument('<url>', 'URL of the recipe to import')
  .option('-o, --output <path>', 'Output directory (default: content/recipes)')
  .option('--draft', 'Create as draft (default: true)', true)
  .action(importRecipe);

/**
 * Fetch content from a URL
 */
async function fetchUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; RecipeCLI/1.0; +https://github.com/recipes)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extract text content from HTML (basic extraction)
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags but keep content
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Limit text length to avoid token limits
  const maxLength = 15000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }

  return text;
}

/**
 * Try to extract JSON-LD recipe data from HTML
 */
function extractJsonLd(html: string): object | null {
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  if (!jsonLdMatches) return null;

  for (const match of jsonLdMatches) {
    try {
      const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
      const data = JSON.parse(jsonContent);

      // Check if it's a Recipe schema
      if (data['@type'] === 'Recipe') {
        return data;
      }

      // Check if it's an array containing a Recipe
      if (Array.isArray(data)) {
        const recipe = data.find((item) => item['@type'] === 'Recipe');
        if (recipe) return recipe;
      }

      // Check if it's a @graph containing a Recipe
      if (data['@graph']) {
        const recipe = data['@graph'].find(
          (item: { '@type': string }) => item['@type'] === 'Recipe'
        );
        if (recipe) return recipe;
      }
    } catch {
      // Continue to next match
    }
  }

  return null;
}

async function importRecipe(url: string, options: ImportOptions): Promise<void> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    console.log(chalk.red('Error: Invalid URL provided.'));
    process.exit(1);
  }

  // Check for AI provider
  const providerConfig = getProviderFromEnv();
  if (!providerConfig) {
    console.log(chalk.red('Error: No AI provider configured.'));
    console.log(chalk.dim('Run "recipe config" to see setup instructions.'));
    process.exit(1);
  }

  const spinner = ora('Fetching recipe...').start();

  try {
    // Fetch the URL content
    const html = await fetchUrl(url);

    spinner.text = 'Extracting content...';

    // Try to extract structured data first
    const jsonLd = extractJsonLd(html);
    let contentForAi: string;

    if (jsonLd) {
      spinner.text = 'Found structured data, processing...';
      contentForAi = `Structured recipe data (JSON-LD):\n${JSON.stringify(jsonLd, null, 2)}`;
    } else {
      spinner.text = 'Extracting text content...';
      contentForAi = extractTextFromHtml(html);
    }

    spinner.text = 'Generating recipe with AI...';

    const provider = createProvider(providerConfig);

    // Build the user prompt
    const userPrompt = `Import this recipe from the following URL: ${url}

Today's date (for createdAt): ${getTodayDate()}

Content from the webpage:
---
${contentForAi}
---

Extract the recipe information and return it as JSON.`;

    // Generate recipe with AI
    const result = await provider.complete({
      systemPrompt: RECIPE_IMPORT_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3, // Lower temperature for more faithful extraction
    });

    spinner.text = 'Parsing response...';

    // Parse the JSON response
    let recipeData: RecipeData;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      recipeData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      spinner.fail('Failed to parse AI response');
      console.log(chalk.dim('\nRaw response:'));
      console.log(result.content);
      process.exit(1);
    }

    // Set status and ensure source is recorded
    if (options.draft) {
      recipeData.frontmatter.status = 'draft';
    }

    // Ensure source URL is included
    if (!recipeData.frontmatter.sources) {
      recipeData.frontmatter.sources = [];
    }
    const hasSourceUrl = recipeData.frontmatter.sources.some((s) => s.url === url);
    if (!hasSourceUrl) {
      recipeData.frontmatter.sources.unshift({
        url,
        title: 'Original Source',
      });
    }

    // Ensure we have a valid slug
    if (!recipeData.frontmatter.slug) {
      recipeData.frontmatter.slug = generateSlug(recipeData.frontmatter.title);
    }

    // Convert to markdown
    const markdown = recipeToMarkdown(recipeData);

    // Determine output path
    const outputDir = options.output || path.join(process.cwd(), 'content', 'recipes');
    const recipeDir = path.join(outputDir, recipeData.frontmatter.slug);
    const outputFile = path.join(recipeDir, 'index.md');

    // Create directory and write file
    await fs.mkdir(recipeDir, { recursive: true });
    await fs.writeFile(outputFile, markdown, 'utf-8');

    spinner.succeed(`Recipe imported: ${chalk.green(recipeData.frontmatter.title)}`);
    console.log(chalk.dim(`  Source: ${url}`));
    console.log(chalk.dim(`  File: ${outputFile}`));
    console.log('');

    // Display summary
    console.log(chalk.bold('Recipe Summary:'));
    console.log(`  Servings:   ${recipeData.frontmatter.servings}`);
    console.log(`  Prep Time:  ${recipeData.frontmatter.prepTime} min`);
    console.log(`  Cook Time:  ${recipeData.frontmatter.cookTime} min`);
    console.log(`  Difficulty: ${recipeData.frontmatter.difficulty}`);
    console.log(`  Tags:       ${recipeData.frontmatter.tags.join(', ')}`);
    console.log(`  Status:     ${recipeData.frontmatter.status}`);

    if (result.usage) {
      console.log('');
      console.log(chalk.dim(`Tokens used: ${result.usage.totalTokens}`));
    }
  } catch (error) {
    spinner.fail('Failed to import recipe');
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}
