# Recipe Validation System

This document describes the validation system for recipe markdown files.

## Overview

The recipe validation system ensures that all recipe markdown files meet the required standards before they are committed or deployed. It uses a unified validation schema across both the CLI tool and the main application.

## Components

### 1. Validation Schema

**Location:** `src/modules/recipe/domain/schemas.ts`

The validation schema defines the rules for recipe frontmatter:

- **Title**: Required, max 200 characters
- **Slug**: Required, lowercase with hyphens only
- **Status**: `draft` or `published` (default: `published`)
- **Servings**: Positive integer, max 100
- **Prep Time**: 0-2880 minutes (0-48 hours)
- **Cook Time**: 0-4320 minutes (0-72 hours)
- **Difficulty**: `easy`, `medium`, or `hard`
- **Tags**: Array of strings (1-50 chars each)
- **Images**: Array of image filenames
- **Created At**: Required, YYYY-MM-DD format

**Extended limits for sous vide and multi-day recipes:**
- Prep time: Up to 48 hours (2880 minutes)
- Cook time: Up to 72 hours (4320 minutes)

### 2. CLI Validation Tool

**Location:** `tools/cli/src/commands/validate.ts`

The CLI tool validates recipe markdown files using the same schema as the main application.

#### Usage

```bash
# Validate all recipes
npm run lint:recipes

# Validate specific file or directory
npm run recipe validate <path>

# Strict mode (additional checks)
npm run recipe validate --strict

# JSON output (for CI/CD)
npm run recipe validate --json
```

#### Features

- **Frontmatter validation**: Validates all required fields and data types
- **Section detection**: Checks for required sections (Ingredients, Instructions, or Components)
- **Bilingual support**: Supports both English and Dutch section names
- **Image validation** (strict mode): Verifies that referenced images exist
- **Component-based recipes**: Validates recipes with multiple components

### 3. Pre-commit Hooks

**Files:** `.husky/pre-commit`, `.lintstagedrc.js`

Automatically validates changed recipe files before commit.

#### Configuration

```javascript
// .lintstagedrc.js
export default {
  'content/recipes/**/*.md': [
    'npm run recipe validate --'
  ],
  '*.{ts,tsx}': [
    'eslint --fix'
  ]
};
```

#### How it works

1. When you commit changes, husky triggers `lint-staged`
2. Only changed `.md` files in `content/recipes/` are validated
3. If validation fails, the commit is blocked
4. Fix the issues and try committing again

### 4. GitHub Actions Workflows

#### Recipe Validation Workflow

**File:** `.github/workflows/validate-recipes.yml`

**Purpose:** Validates recipes only when recipe-related files change

**Triggers on:**
- Pull requests that modify:
  - Recipe markdown files (`content/recipes/**/*.md`)
  - Recipe validation schema (`src/modules/recipe/domain/schemas.ts`)
  - CLI validation tool (`tools/cli/src/**`)
- Pushes to `main` branch with recipe-related changes
- Manual workflow dispatch

**Jobs:**
1. **Standard validation**: Validates all recipe markdown files
2. **Strict validation**: Checks for image file existence (informational only)

**Why a separate workflow?**
- ⚡ **Faster feedback**: Only runs when recipes or validation code changes
- 💰 **Efficient**: Doesn't waste CI minutes on every code change
- 🎯 **Clear separation**: Recipe validation status is independent from main CI

#### Main CI Workflow

**File:** `.github/workflows/ci.yml`

**Purpose:** Validates code quality and builds the application

**Jobs:**
1. **Lint**: Runs ESLint on TypeScript files
2. **Test**: Runs unit tests and coverage
3. **Build**: Builds the Next.js application
4. **CI Success**: Summary job ensuring all checks passed

#### Security Features (Both Workflows)

✅ **Minimal permissions**: Each job has only necessary permissions  
✅ **Actions pinned to SHA**: All actions locked to specific commit hashes  
✅ **No credential persistence**: Checkouts don't persist credentials  
✅ **Validated with zizmor**: Security linter for GitHub Actions

## Common Validation Errors

### cookTime exceeds maximum

**Error:** `cookTime: Cook time cannot exceed 72 hours`

**Solution:** The recipe's cooking time exceeds 72 hours (4320 minutes). If this is correct, the schema needs to be updated. Otherwise, check if you meant 12 hours (720 min) instead of 120 hours (7200 min).

### Missing section

**Error:** `Missing "## Ingredients" or "## Ingrediënten" section`

**Solution:** Add the required section to your recipe. For component-based recipes, use `## Components` or `## Onderdelen` instead.

### Invalid slug format

**Error:** `slug: Slug must be lowercase with hyphens only`

**Solution:** Update your slug to use only lowercase letters, numbers, and hyphens. Example: `sous-vide-veal-cheeks-langoustine`

### Image not found (strict mode)

**Warning:** `Image file not found: veal-cheeks.jpg`

**Solution:** Ensure the image file exists in the `images/` subdirectory of your recipe folder.

## Bypassing Validation (Not Recommended)

### Skip pre-commit hooks

```bash
git commit --no-verify
```

⚠️ **Warning:** This bypasses all pre-commit checks. The CI pipeline will still validate your recipes.

## Updating Validation Rules

If you need to update validation rules:

1. **Update the schema** in `src/modules/recipe/domain/schemas.ts`
2. **Sync the CLI tool** in `tools/cli/src/commands/validate.ts`
3. **Rebuild the CLI**: `npm run recipe:build`
4. **Test validation**: `npm run lint:recipes`
5. **Update this README** with new rules

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall husky
npm run prepare
```

### Validation passing locally but failing in CI

- Ensure you've rebuilt the CLI tool: `npm run recipe:build`
- Check that all changes are committed
- Run `npm run lint:recipes` to see full validation output

### All recipes suddenly failing validation

- Check recent schema changes in `src/modules/recipe/domain/schemas.ts`
- Ensure CLI tool is rebuilt: `npm run recipe:build`
- Run with `--json` flag to get detailed error messages

## Resources

- [Zod Documentation](https://zod.dev/) - Schema validation library
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parser
- [Husky](https://typicode.github.io/husky/) - Git hooks
- [lint-staged](https://github.com/lint-staged/lint-staged) - Run linters on staged files
- [zizmor](https://github.com/woodruffw/zizmor) - GitHub Actions security linter
