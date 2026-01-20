/**
 * Create Command
 *
 * Create a new recipe using AI assistance.
 * User provides a description, AI generates the full recipe.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { getProviderFromEnv, createProvider } from '../providers/index.js';
import {
  RECIPE_SYSTEM_PROMPT,
  recipeToMarkdown,
  generateSlug,
  getTodayDate,
  type RecipeData,
} from '../utils/template.js';

interface CreateOptions {
  output?: string;
  servings?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string;
  draft?: boolean;
}

export const createCommand = new Command('create')
  .description('Create a new recipe using AI')
  .argument('<description>', 'Description of the recipe to create')
  .option('-o, --output <path>', 'Output directory (default: content/recipes)')
  .option('-s, --servings <number>', 'Number of servings', '4')
  .option('-d, --difficulty <level>', 'Difficulty level (easy, medium, hard)')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--draft', 'Create as draft (default: true)', true)
  .action(createRecipe);

async function createRecipe(
  description: string,
  options: CreateOptions
): Promise<void> {
  // Check for AI provider
  const providerConfig = getProviderFromEnv();
  if (!providerConfig) {
    console.log(chalk.red('Error: No AI provider configured.'));
    console.log(chalk.dim('Run "recipe config" to see setup instructions.'));
    process.exit(1);
  }

  const spinner = ora('Generating recipe...').start();

  try {
    const provider = createProvider(providerConfig);

    // Build the user prompt
    let userPrompt = `Create a recipe for: ${description}`;

    if (options.servings) {
      userPrompt += `\nServings: ${options.servings}`;
    }

    if (options.difficulty) {
      userPrompt += `\nDifficulty: ${options.difficulty}`;
    }

    if (options.tags) {
      userPrompt += `\nInclude these tags: ${options.tags}`;
    }

    userPrompt += `\nToday's date (for createdAt): ${getTodayDate()}`;

    // Generate recipe with AI
    const result = await provider.complete({
      systemPrompt: RECIPE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.7,
    });

    spinner.text = 'Parsing response...';

    // Parse the JSON response
    let recipeData: RecipeData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      recipeData = JSON.parse(jsonMatch[0]);
    } catch {
      spinner.fail('Failed to parse AI response');
      console.log(chalk.dim('\nRaw response:'));
      console.log(result.content);
      process.exit(1);
    }

    // Override with user options
    if (options.draft) {
      recipeData.frontmatter.status = 'draft';
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

    spinner.succeed(`Recipe created: ${chalk.green(recipeData.frontmatter.title)}`);
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
    spinner.fail('Failed to create recipe');
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}
