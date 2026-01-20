/**
 * Validate Command
 *
 * Validate recipe markdown files for correct structure and frontmatter.
 * Uses the same validation schema as the main application for consistency.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Import shared validation schema from main app
// Note: This will be resolved via TypeScript path mapping or direct import
// For now, we'll use a local implementation that matches the main app
import { z } from 'zod';

/**
 * Recipe frontmatter schema (synced with src/modules/recipe/domain/schemas.ts)
 */
const difficultySchema = z.enum(['easy', 'medium', 'hard']);
const recipeStatusSchema = z.enum(['draft', 'published']);

const recipeSourceSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().optional(),
  importedAt: z.string().datetime().optional(),
});

const recipeFrontmatterSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only'
    ),
  status: recipeStatusSchema.default('published'),
  servings: z
    .number()
    .int()
    .positive('Servings must be a positive integer')
    .max(100, 'Servings cannot exceed 100'),
  prepTime: z
    .number()
    .int()
    .nonnegative('Prep time cannot be negative')
    .max(2880, 'Prep time cannot exceed 48 hours'),
  cookTime: z
    .number()
    .int()
    .nonnegative('Cook time cannot be negative')
    .max(4320, 'Cook time cannot exceed 72 hours'),
  totalTime: z
    .number()
    .int()
    .nonnegative('Total time cannot be negative')
    .optional(),
  difficulty: difficultySchema,
  tags: z.array(z.string().min(1).max(50)).default([]),
  images: z.array(z.string()).default([]),
  headerImageRotation: z.boolean().default(true),
  sources: z.array(recipeSourceSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidateOptions {
  strict?: boolean;
  fix?: boolean;
  json?: boolean;
}

export const validateCommand = new Command('validate')
  .description('Validate recipe markdown files')
  .argument('[path]', 'Path to recipe file or directory', 'content/recipes')
  .option('-s, --strict', 'Enable strict validation')
  .option('--fix', 'Attempt to fix common issues (not yet implemented)')
  .option('--json', 'Output results as JSON')
  .action(validateRecipes);

/**
 * Validate a single recipe file
 */
async function validateFile(filePath: string, options: ValidateOptions): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter using gray-matter (same as main app)
    let parsed;
    try {
      parsed = matter(content);
    } catch (error) {
      result.errors.push(
        `Failed to parse frontmatter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.valid = false;
      return result;
    }

    const { data: frontmatter, content: body } = parsed;

    // Validate frontmatter with Zod
    const validation = recipeFrontmatterSchema.safeParse(frontmatter);
    if (!validation.success) {
      for (const error of validation.error.issues) {
        result.errors.push(`${error.path.join('.')}: ${error.message}`);
      }
      result.valid = false;
    }

    // Check for required sections (support both English and Dutch)
    const hasIngredients = body.includes('## Ingredients') || body.includes('## Ingrediënten');
    const hasInstructions = body.includes('## Instructions') || body.includes('## Bereiding');
    const hasComponents = body.includes('## Components') || body.includes('## Onderdelen');

    // Recipe must have either top-level ingredients/instructions OR components
    if (!hasComponents) {
      if (!hasIngredients) {
        result.errors.push('Missing "## Ingredients" or "## Ingrediënten" section');
        result.valid = false;
      }

      if (!hasInstructions) {
        result.errors.push('Missing "## Instructions" or "## Bereiding" section');
        result.valid = false;
      }
    } else {
      // Component-based recipe - check for ### sections
      if (!body.match(/^###\s+.+/m)) {
        result.warnings.push('Components section found but no ### subsections detected');
      }
    }

    // Warnings (non-fatal)
    if (!hasComponents) {
      if (!body.match(/^- .+/m)) {
        result.warnings.push('No ingredients found (expected "- item" format)');
      }

      if (!body.match(/^\d+\. .+/m)) {
        result.warnings.push('No numbered instructions found');
      }
    }

    if (options.strict) {
      // Additional strict checks
      if (!frontmatter.tags || (Array.isArray(frontmatter.tags) && frontmatter.tags.length === 0)) {
        result.warnings.push('No tags specified');
      }

      if (frontmatter.status === 'published' && (!frontmatter.images || frontmatter.images.length === 0)) {
        result.warnings.push('Published recipe has no images');
      }

      // Check if images exist
      if (frontmatter.images && Array.isArray(frontmatter.images)) {
        const recipeDir = path.dirname(filePath);
        const imagesDir = path.join(recipeDir, 'images');
        
        for (const image of frontmatter.images) {
          const imagePath = path.join(imagesDir, image);
          try {
            await fs.access(imagePath);
          } catch {
            result.warnings.push(`Image file not found: ${image}`);
          }
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Failed to read file: ${message}`);
    result.valid = false;
  }

  return result;
}

/**
 * Find all recipe markdown files in a directory
 */
async function findRecipeFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath);
        }
      } else if (entry.name.match(/^index\.(en|nl)\.md$/)) {
        // Only validate index.{locale}.md files
        files.push(fullPath);
      }
    }
  }

  await walk(dirPath);
  return files;
}

async function validateRecipes(inputPath: string, options: ValidateOptions): Promise<void> {
  let files: string[];

  try {
    const stat = await fs.stat(inputPath);

    if (stat.isDirectory()) {
      files = await findRecipeFiles(inputPath);
    } else {
      files = [inputPath];
    }
  } catch {
    if (!options.json) {
      console.error(chalk.red(`Error: Path not found: ${inputPath}`));
    } else {
      console.log(JSON.stringify({ error: `Path not found: ${inputPath}` }));
    }
    process.exit(1);
  }

  if (files.length === 0) {
    if (!options.json) {
      console.log(chalk.yellow('No recipe markdown files found.'));
    } else {
      console.log(JSON.stringify({ files: [], valid: 0, invalid: 0 }));
    }
    return;
  }

  if (!options.json) {
    console.log(chalk.bold('\nValidating recipes...\n'));
    console.log(chalk.dim(`Found ${files.length} file(s) to validate\n`));
  }

  let validCount = 0;
  let invalidCount = 0;
  const results: ValidationResult[] = [];

  for (const file of files) {
    const result = await validateFile(file, options);
    results.push(result);

    if (!options.json) {
      const relativePath = path.relative(process.cwd(), file);

      if (result.valid && result.warnings.length === 0) {
        console.log(chalk.green(`✓ ${relativePath}`));
        validCount++;
      } else if (result.valid) {
        console.log(chalk.yellow(`⚠ ${relativePath}`));
        for (const warning of result.warnings) {
          console.log(chalk.dim(`    Warning: ${warning}`));
        }
        validCount++;
      } else {
        console.log(chalk.red(`✗ ${relativePath}`));
        for (const error of result.errors) {
          console.log(chalk.red(`    Error: ${error}`));
        }
        for (const warning of result.warnings) {
          console.log(chalk.dim(`    Warning: ${warning}`));
        }
        invalidCount++;
      }
    } else {
      if (result.valid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          files: results.map((r) => ({
            file: path.relative(process.cwd(), r.file),
            valid: r.valid,
            errors: r.errors,
            warnings: r.warnings,
          })),
          valid: validCount,
          invalid: invalidCount,
          success: invalidCount === 0,
        },
        null,
        2
      )
    );
  } else {
    console.log('');
    console.log(chalk.bold('Summary:'));
    console.log(chalk.green(`  Valid:   ${validCount}`));

    if (invalidCount > 0) {
      console.log(chalk.red(`  Invalid: ${invalidCount}`));
    }
  }

  if (invalidCount > 0) {
    process.exit(1);
  }
}
