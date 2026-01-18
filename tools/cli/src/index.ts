#!/usr/bin/env node
/**
 * Recipe CLI - Main entry point
 *
 * A CLI tool for creating and importing recipes using AI providers
 * (OpenAI, Anthropic, or local Ollama).
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createCommand } from './commands/create.js';
import { importCommand } from './commands/import.js';
import { validateCommand } from './commands/validate.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('recipe')
  .description('CLI tool for creating and importing recipes using AI')
  .version('0.1.0');

// Register commands
program.addCommand(createCommand);
program.addCommand(importCommand);
program.addCommand(validateCommand);
program.addCommand(configCommand);

// Global error handling
program.exitOverride();

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      // CommanderError for --help, --version, etc.
      if (error.name === 'CommanderError') {
        process.exit(0);
      }
      console.error(chalk.red(`Error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();
