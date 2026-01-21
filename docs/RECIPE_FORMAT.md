# Recipe Markdown Format Guide

This guide explains how to write recipe markdown files for the Niek Kookt recipe application.

## Table of Contents

- [File Structure](#file-structure)
- [Frontmatter](#frontmatter)
- [Content Structure](#content-structure)
- [Ingredient Scaling](#ingredient-scaling)
- [Instruction Quantity Annotations](#instruction-quantity-annotations)
- [Examples](#examples)

## File Structure

Each recipe is stored in its own directory with the following structure:

```
content/recipes/
└── recipe-slug/
    ├── index.en.md          # English version
    ├── index.nl.md          # Dutch version
    └── images/
        └── image-name.jpg   # Recipe images
```

## Frontmatter

Every recipe starts with YAML frontmatter containing metadata:

```yaml
---
title: "Recipe Title"
slug: "recipe-slug"
status: published          # or "draft"
servings: 4
prepTime: 30              # minutes
cookTime: 45              # minutes
difficulty: medium        # easy, medium, or hard
tags: ["tag1", "tag2"]
images:
  - image-name.jpg
headerImageRotation: true # optional
createdAt: "2026-01-20"
updatedAt: "2026-01-21"   # optional
---
```

### Field Descriptions

- **title**: Recipe name (required, max 200 characters)
- **slug**: URL-friendly identifier (required, lowercase with hyphens only)
- **status**: Publication status (`published` or `draft`, default: `published`)
- **servings**: Number of servings (required, positive integer, max 100)
- **prepTime**: Preparation time in minutes (0-2880, i.e., 0-48 hours)
- **cookTime**: Cooking time in minutes (0-4320, i.e., 0-72 hours)
- **difficulty**: Recipe complexity (`easy`, `medium`, or `hard`)
- **tags**: Array of category/search tags
- **images**: Array of image filenames (stored in `images/` subdirectory)
- **headerImageRotation**: Enable automatic image rotation in header
- **createdAt**: Recipe creation date (required, YYYY-MM-DD format)
- **updatedAt**: Last modification date (optional, YYYY-MM-DD format)

## Content Structure

After the frontmatter, write the recipe content in markdown.

### Simple Recipe Structure

```markdown
A brief description of the dish.

## Ingredients

- 500 g pasta {scale}
- 2 tbsp olive oil {scale}
- Salt and pepper to taste

## Instructions

1. Boil water in a large pot.
2. Add {{500g}} pasta and cook for {{10 minutes}}.
3. Drain and serve.

## Notes

- Optional tips and variations
- Storage instructions
- Wine pairings
```

### Component-Based Recipe Structure

For complex recipes with multiple components (like multi-course dishes):

```markdown
A brief description of the dish.

## Components

### Component Name 1

#### Ingredients

- 200 g ingredient {scale}
- 1 tbsp spice {scale}

#### Instructions

1. First step with {{200g}} ingredient.
2. Second step, cook for {{15 minutes}}.

### Component Name 2

#### Ingredients

- 100 ml liquid {scale}

#### Instructions

1. Heat {{100ml}} liquid.

## Notes

- Assembly instructions
- Tips and variations
```

## Ingredient Scaling

Mark scalable ingredients with `{scale}` to enable automatic quantity adjustment when users change serving sizes.

### Syntax

```markdown
- 250 g flour {scale}
- 2 eggs {scale}
- Salt to taste          # no {scale} - won't scale
- Pinch of nutmeg        # no {scale} - won't scale
```

### What Gets Scaled

**Should scale:**
- Precise quantities: `250 g flour`, `2 cups milk`, `3 eggs`
- Ingredients critical to recipe proportions

**Should NOT scale:**
- Approximate amounts: `Salt to taste`, `Pepper as needed`
- Small imprecise quantities: `Pinch of salt`, `Dash of vinegar`
- Optional garnishes
- Instructions like `Water for boiling`

## Instruction Quantity Annotations

**NEW:** You can now add scalable quantities directly in instruction steps using double curly braces.

### Syntax

```markdown
{{quantity unit}}
```

### Examples

```markdown
1. Add {{50ml}} water to the pan.
2. Heat to {{180°C}} for {{30 minutes}}.
3. Use {{1/2 cup}} sugar and {{2 tbsp}} butter.
4. Mix {{10-15ml}} soy sauce to taste.
```

### What Gets Scaled

**Scalable units** (will adjust with serving size):
- **Volume**: ml, l, cups, tbsp, tsp, fl oz
- **Weight**: g, kg, oz, lb, lbs

**Non-scalable units** (remain fixed):
- **Time**: minutes, hours, seconds, min, mins, hr, hrs
- **Temperature**: °C, °F, degrees

### Formatting Rules

1. **Use space between quantity and unit**: `{{50 ml}}` not `{{50ml}}`
2. **Supports fractions**: `{{1/2 cup}}`, `{{1 1/4 tsp}}`
3. **Supports decimals**: `{{2.5 g}}`, `{{0.5 ml}}`
4. **Supports ranges**: `{{10-15 ml}}`, `{{2-3 cups}}`
5. **Case insensitive units**: `{{50 ML}}` works same as `{{50 ml}}`
6. **Plain numbers work too**: `{{4}}` glasses scales to `{{8}}` glasses

### Display Format

When rendered, annotations are replaced with properly formatted quantities:

- **Space between quantity and unit**: `{{50 ml}}` → `25 ml` (when scaled 4→2)
- **Fractions used where appropriate**: `{{2.5 g}}` → `1 1/4 g` (when scaled 4→2)
- **Large values rounded**: `{{100 g}}` → `67 g` (when scaled 3→2, not "66 2/3 g")

### Visual Highlighting

When servings are adjusted, scaled quantities in instructions are highlighted with a subtle dotted underline to show users which measurements have changed.

### Best Practices

1. **Use annotations for scalable measurements only**
   ```markdown
   ✅ Add {{50 ml}} water to the mixture.
   ❌ Cook for {{20 minutes}}.  # Time doesn't scale - use plain text
   ```

2. **Ingredient quantities should still use {scale}**
   ```markdown
   ## Ingredients
   - 50 ml water {scale}          # Still needed!
   
   ## Instructions
   1. Add {{50 ml}} water...       # Also annotated for instructions
   ```

3. **Don't over-annotate**
   ```markdown
   ✅ Add {{50 ml}} water and stir for 2 minutes.
   ❌ Add {{50 ml}} water and stir for {{2 minutes}}.  # Time is NOT scalable
   ```

4. **Use for key measurements**
   ```markdown
   ✅ Add {{50 ml}} soy sauce (about {{50 g}} salt per liter)
   ❌ Add a splash of soy sauce ({{tiny bit}} salt)  # Vague quantities
   ```

## Examples

### Simple Recipe Example

```markdown
---
title: "Simple Pasta"
slug: "simple-pasta"
status: published
servings: 4
prepTime: 10
cookTime: 15
difficulty: easy
tags: ["pasta", "quick"]
images:
  - pasta.jpg
createdAt: "2026-01-20"
---

Quick and delicious pasta dish perfect for weeknight dinners.

## Ingredients

- 400 g pasta {scale}
- 2 tbsp olive oil {scale}
- 3 cloves garlic, minced {scale}
- 100 ml pasta water {scale}
- Salt and pepper to taste
- Fresh basil for garnish

## Instructions

1. Bring a large pot of salted water to boil. Add {{400 g}} pasta.

2. Cook for 8-10 minutes until al dente. Reserve {{100 ml}} pasta water.

3. Heat {{2 tbsp}} olive oil in a pan, add garlic and sauté.

4. Add cooked pasta and reserved pasta water, toss well.

5. Season with salt, pepper, and garnish with fresh basil.

## Notes

- Use good quality pasta for best results.
- Adjust garlic to taste.
```

### Component-Based Recipe Example

```markdown
---
title: "Gourmet Dinner"
slug: "gourmet-dinner"
status: published
servings: 4
prepTime: 60
cookTime: 120
difficulty: hard
tags: ["gourmet", "main course"]
images:
  - dish.jpg
createdAt: "2026-01-20"
---

An elegant multi-component dish.

## Components

### Main Protein

#### Ingredients

- 800 g meat {scale}
- 50 ml oil {scale}
- Salt and pepper

#### Instructions

1. Season meat and sear in {{50ml}} hot oil.
2. Cook until internal temperature reaches 63°C.

### Sauce

#### Ingredients

- 200 ml stock {scale}
- 50 ml wine {scale}
- 2 tbsp butter {scale}

#### Instructions

1. Reduce {{200ml}} stock with {{50ml}} wine by half.
2. Whisk in {{2 tbsp}} butter.

## Notes

- Can be prepared ahead.
- Pairs well with red wine.
```

## Validation

All recipe markdown files are validated automatically:

- **Pre-commit**: Validates changed recipes before commit
- **CI/CD**: Validates all recipes in pull requests
- **Manual**: Run `npm run lint:recipes` to validate

See [VALIDATION.md](./VALIDATION.md) for details on validation rules and troubleshooting.

## Resources

- [Markdown Syntax](https://www.markdownguide.org/basic-syntax/)
- [YAML Frontmatter](https://jekyllrb.com/docs/front-matter/)
- [Recipe Validation Guide](./VALIDATION.md)
