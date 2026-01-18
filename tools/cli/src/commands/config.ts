/**
 * Config Command
 *
 * Manage AI provider configuration and display current settings.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  getProviderFromEnv,
  DEFAULT_MODELS,
  createProvider,
} from '../providers/index.js';

export const configCommand = new Command('config')
  .description('Manage AI provider configuration')
  .action(showConfig);

configCommand
  .command('show')
  .description('Show current configuration')
  .action(showConfig);

configCommand
  .command('test')
  .description('Test connection to the configured AI provider')
  .action(testConnection);

/**
 * Display current configuration
 */
async function showConfig(): Promise<void> {
  console.log(chalk.bold('\nRecipe CLI Configuration\n'));

  const config = getProviderFromEnv();

  if (!config) {
    console.log(chalk.yellow('No AI provider configured.\n'));
    printSetupInstructions();
    return;
  }

  console.log(chalk.green('✓ AI Provider configured\n'));
  console.log(`  Provider: ${chalk.cyan(config.type)}`);
  console.log(`  Model:    ${chalk.cyan(config.model)}`);

  if (config.baseUrl) {
    console.log(`  Base URL: ${chalk.cyan(config.baseUrl)}`);
  }

  if (config.apiKey) {
    const maskedKey = config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4);
    console.log(`  API Key:  ${chalk.dim(maskedKey)}`);
  }

  console.log('');
}

/**
 * Test connection to the AI provider
 */
async function testConnection(): Promise<void> {
  const config = getProviderFromEnv();

  if (!config) {
    console.log(chalk.red('Error: No AI provider configured.\n'));
    printSetupInstructions();
    process.exit(1);
  }

  console.log(chalk.dim(`Testing connection to ${config.type}...`));

  try {
    const provider = createProvider(config);
    const isHealthy = await provider.healthCheck();

    if (isHealthy) {
      console.log(chalk.green(`✓ Successfully connected to ${config.type}`));
      console.log(chalk.dim(`  Model: ${config.model}`));
    } else {
      console.log(chalk.red(`✗ Failed to connect to ${config.type}`));
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(chalk.red(`✗ Connection failed: ${message}`));
    process.exit(1);
  }
}

/**
 * Print setup instructions for configuring AI providers
 */
function printSetupInstructions(): void {
  console.log(chalk.bold('Setup Instructions:\n'));

  console.log(chalk.underline('Option 1: OpenAI'));
  console.log('  Set the following environment variables:');
  console.log(chalk.dim('    export OPENAI_API_KEY="your-api-key"'));
  console.log(chalk.dim(`    export RECIPE_OPENAI_MODEL="${DEFAULT_MODELS.openai}"  # optional`));
  console.log('');

  console.log(chalk.underline('Option 2: Anthropic'));
  console.log('  Set the following environment variables:');
  console.log(chalk.dim('    export ANTHROPIC_API_KEY="your-api-key"'));
  console.log(chalk.dim(`    export RECIPE_ANTHROPIC_MODEL="${DEFAULT_MODELS.anthropic}"  # optional`));
  console.log('');

  console.log(chalk.underline('Option 3: Ollama (Local)'));
  console.log('  Set the following environment variables:');
  console.log(chalk.dim('    export RECIPE_AI_PROVIDER="ollama"'));
  console.log(chalk.dim(`    export RECIPE_OLLAMA_MODEL="${DEFAULT_MODELS.ollama}"  # optional`));
  console.log(chalk.dim('    export RECIPE_OLLAMA_URL="http://localhost:11434"  # optional'));
  console.log('');

  console.log(chalk.dim('Tip: Add these to your .env file or shell profile.'));
  console.log('');
}
