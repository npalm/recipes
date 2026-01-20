/**
 * Validate Command
 *
 * Validate recipe markdown files for correct structure and frontmatter.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Zod schema for recipe frontmatter validation
const RecipeFrontmatterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  status: z.enum(['draft', 'published']),
  servings: z.number().positive('Servings must be positive'),
  prepTime: z.number().nonnegative('Prep time cannot be negative'),
  cookTime: z.number().nonnegative('Cook time cannot be negative'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()),
  images: z.array(z.string()).optional(),
  headerImageRotation: z.boolean().optional(),
  sources: z
    .array(
      z.object({
        url: z.string().url('Source URL must be valid'),
        title: z.string().optional(),
      })
    )
    .optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  updatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
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
}

export const validateCommand = new Command('validate')
  .description('Validate recipe markdown files')
  .argument('[path]', 'Path to recipe file or directory', 'content')
  .option('-s, --strict', 'Enable strict validation')
  .option('--fix', 'Attempt to fix common issues (not yet implemented)')
  .action(validateRecipes);

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for frontmatter
  const frontmatter: Record<string, unknown> = {};
  let currentKey = '';
  let inArray = false;
  let arrayItems: unknown[] = [];

  for (const line of yamlContent.split('\n')) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check for array item
    if (line.match(/^\s+-/)) {
      const value = line.replace(/^\s+-\s*/, '').trim();
      if (value.startsWith('url:')) {
        // Object in array
        const obj: Record<string, string> = {};
        obj.url = value.replace('url:', '').trim().replace(/^["']|["']$/g, '');
        arrayItems.push(obj);
      } else {
        arrayItems.push(value.replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    // Check for nested property in object
    if (line.match(/^\s+\w+:/) && arrayItems.length > 0) {
      const [key, ...valueParts] = line.trim().split(':');
      const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
      const lastItem = arrayItems[arrayItems.length - 1];
      if (typeof lastItem === 'object' && lastItem !== null) {
        (lastItem as Record<string, string>)[key] = value;
      }
      continue;
    }

    // Save previous array if we're starting a new key
    if (inArray && currentKey) {
      frontmatter[currentKey] = arrayItems;
      arrayItems = [];
      inArray = false;
    }

    // Parse key-value pair
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Handle inline arrays [a, b, c]
    if (typeof value === 'string' && value.startsWith('[')) {
      const arrayMatch = value.match(/^\[(.*)\]$/);
      if (arrayMatch) {
        value = arrayMatch[1]
          .split(',')
          .map((item) => item.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    } else if (value === '' || value === '[]') {
      // Empty value might be start of array
      inArray = true;
      currentKey = key;
      arrayItems = [];
      continue;
    } else if (typeof value === 'string') {
      // Remove quotes
      const strValue: string = value.replace(/^["']|["']$/g, '');

      // Parse numbers
      if (/^\d+$/.test(strValue)) {
        value = parseInt(strValue, 10);
      } else if (/^\d+\.\d+$/.test(strValue)) {
        value = parseFloat(strValue);
      } else if (strValue === 'true') {
        // Parse booleans
        value = true;
      } else if (strValue === 'false') {
        value = false;
      } else {
        value = strValue;
      }
    }

    frontmatter[key] = value;
  }

  // Save final array if needed
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayItems;
  }

  return { frontmatter, body };
}

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

    // Check for frontmatter
    const parsed = parseFrontmatter(content);
    if (!parsed) {
      result.errors.push('Missing or invalid frontmatter (must be wrapped in ---)');
      result.valid = false;
      return result;
    }

    const { frontmatter, body } = parsed;

    // Validate frontmatter with Zod
    const validation = RecipeFrontmatterSchema.safeParse(frontmatter);
    if (!validation.success) {
      for (const error of validation.error.issues) {
        result.errors.push(`${error.path.join('.')}: ${error.message}`);
      }
      result.valid = false;
    }

    // Check for required sections
    if (!body.includes('## Ingredients')) {
      result.errors.push('Missing "## Ingredients" section');
      result.valid = false;
    }

    if (!body.includes('## Instructions')) {
      result.errors.push('Missing "## Instructions" section');
      result.valid = false;
    }

    // Warnings (non-fatal)
    if (!body.match(/^- .+/m)) {
      result.warnings.push('No ingredients found (expected "- item" format)');
    }

    if (!body.match(/^\d+\. .+/m)) {
      result.warnings.push('No numbered instructions found');
    }

    if (options.strict) {
      // Additional strict checks
      if (!frontmatter.tags || (Array.isArray(frontmatter.tags) && frontmatter.tags.length === 0)) {
        result.warnings.push('No tags specified');
      }

      if (frontmatter.status === 'published' && !frontmatter.images) {
        result.warnings.push('Published recipe has no images');
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
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  await walk(dirPath);
  return files;
}

async function validateRecipes(inputPath: string, options: ValidateOptions): Promise<void> {
  console.log(chalk.bold('\nValidating recipes...\n'));

  let files: string[];

  try {
    const stat = await fs.stat(inputPath);

    if (stat.isDirectory()) {
      files = await findRecipeFiles(inputPath);
    } else {
      files = [inputPath];
    }
  } catch {
    console.error(chalk.red(`Error: Path not found: ${inputPath}`));
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(chalk.yellow('No markdown files found.'));
    return;
  }

  console.log(chalk.dim(`Found ${files.length} file(s) to validate\n`));

  let validCount = 0;
  let invalidCount = 0;

  for (const file of files) {
    const result = await validateFile(file, options);
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
  }

  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(chalk.green(`  Valid:   ${validCount}`));

  if (invalidCount > 0) {
    console.log(chalk.red(`  Invalid: ${invalidCount}`));
    process.exit(1);
  }
}
