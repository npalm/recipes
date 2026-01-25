# Recipe Markdown Format Guide

This guide explains how to write recipe markdown files for the Niek Kookt recipe application.

## Table of Contents

- [File Structure](#file-structure)
- [Frontmatter](#frontmatter)
- [Content Structure](#content-structure)
- [Component References](#component-references)
- [Component Timing](#component-timing)
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
waitTime: 120             # minutes (optional, for passive waiting)
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
- **waitTime**: Passive waiting time in minutes (0-10080, i.e., 0-7 days, optional)
- **totalTime**: Total time (optional, calculated automatically if not specified)
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

## Component References

**NEW:** You can now reference components from other recipes to avoid duplication and maintain consistency.

### Why Use Component References?

When you have a component (like a sauce, puree, or preparation) that's used in multiple recipes, you can define it once and reference it elsewhere. This ensures:
- **No duplication**: Define components once, use them in many recipes
- **Automatic updates**: Changes to the source component reflect in all recipes that reference it
- **Proper scaling**: Referenced components scale correctly based on their original serving size

### Syntax

To make a component referenceable, add a slug (in English):

```markdown
### Bietentartaar
slug: beetroot-tartare

#### Ingredients
- 400 g raw beetroot {scale}
...
```

To reference a component from another recipe:

```markdown
### Bietentartaar
@include:recipe-slug#component-slug

### Your Component
#### Ingredients
...
```

### Complete Example

**Source Recipe** (`sous-vide-veal-cheeks-langoustine/index.nl.md`, 4 servings):

```markdown
## Onderdelen

### Bietentartaar
slug: beetroot-tartare

#### Ingrediënten
- 400 g rauwe bieten, geschild {scale}
- 2 el balsamicoazijn {scale}
- 1 el olijfolie {scale}

#### Bereiding
1. Snijd de bieten in grote stukken.
2. Gaar sous vide op 85°C gedurende 3 uur.
```

**Referencing Recipe** (`steak-with-beetroot/index.nl.md`, 2 servings):

```markdown
## Onderdelen

### Bietentartaar
@include:sous-vide-veal-cheeks-langoustine#beetroot-tartare

### Biefstuk
#### Ingrediënten
- 2 x 200g ribeye steaks {scale}
...
```

### How Scaling Works

Referenced components scale based on the **source recipe's servings** relative to the **target recipe's servings**:

**Example:**
- Source recipe (kalfswang): **4 servings**, Bietentartaar has 400g bieten
- Target recipe (biefstuk): **2 servings**, references Bietentartaar
- User sees: **200g bieten** (400g × 2/4 = 200g)

When user adjusts to 6 servings:
- User sees: **600g bieten** (400g × 6/4 = 600g)

### Rules and Requirements

1. **Slug is required** to reference a component
   - Slugs must be in English
   - Format: lowercase, hyphens only (`beetroot-tartare`)
   - Add `slug:` line immediately after component heading

2. **Source recipe must exist**
   - Recipe must exist in the same locale (nl/nl or en/en)
   - Recipe must be valid and parseable

3. **Component must have a slug**
   - Only components with slugs can be referenced
   - Components without slugs are local only

4. **Component name can differ**
   - In NL: `### Bietentartaar` can reference `beetroot-tartare`
   - In EN: `### Beetroot Tartare` can reference `beetroot-tartare`
   - The display name is locale-specific, the slug is the identifier

### When to Use References vs. Copy

**Use `@include:` when:**
- Component is used in multiple recipes unchanged
- You want updates to propagate automatically
- The component is a "standard" preparation

**Create new component when:**
- You need to modify the component for this recipe
- The component is unique to this recipe
- You want independence from the source recipe

### Validation

References are validated automatically:

```bash
npm run lint:recipes
```

**Validation checks:**
- ✅ Source recipe exists
- ✅ Component slug exists in source recipe
- ✅ No circular references (A→B→A)
- ✅ Slug format is valid
- ⚠️ Warning if source recipe is in draft status

### Error Messages

**Component not found:**
```
Component with slug "beetroot-tartare" not found in recipe "kalfswang"
Available components with slugs: parsnip-puree, langoustine
```

**Circular reference:**
```
Circular component reference detected: recipe-a → recipe-b → recipe-a
```

**Invalid slug format:**
```
Component slug must be lowercase with hyphens only
```

### Limitations

- Maximum reference depth: 5 levels (A→B→C→D→E)
- Cannot reference components from draft recipes (shows warning)
- Component library (`@include:component:name`) not yet supported (future feature)

### Best Practices

1. **Use English slugs** - Consistent across all locales
   ```markdown
   ✅ slug: beetroot-tartare
   ❌ slug: bietentartaar
   ```

2. **Keep slug simple** - Use the English translation
   ```markdown
   ✅ slug: garlic-butter-sauce
   ❌ slug: garlicbuttersauce-v2-final
   ```

3. **Only add slugs when needed** - Components without references don't need slugs
   ```markdown
   # Component used in multiple recipes
   ### Beetroot Tartare
   slug: beetroot-tartare
   
   # Component used only in this recipe
   ### Assembly Instructions
   # No slug needed
   ```

4. **Document shared components** - Add note in source recipe
   ```markdown
   ### Bietentartaar
   slug: beetroot-tartare
   
   #### Ingrediënten
   - 400 g rauwe bieten {scale}
   
    **Note:** This component is also used in the steak recipe.
    ```

## Component Timing

**NEW:** Components can now have timing information (prepTime and cookTime) to help users understand how long each part of a recipe takes.

### Purpose

Component timing provides:
- **Time breakdown**: See how long each component takes to prepare and cook
- **Better planning**: Understand which components can be made ahead or done in parallel
- **Auto-calculated totals**: Recipe total time is automatically summed from component times

### Syntax

Add `prepTime:`, `cookTime:`, and optionally `waitTime:` lines (in minutes) immediately after the component heading, before ingredients:

```markdown
### Sauce
prepTime: 10
cookTime: 20

#### Ingredients
- 200 ml stock {scale}
...
```

All three fields are optional. You can specify any combination:

```markdown
### Salad
prepTime: 15
# No cookTime or waitTime - not cooked, no waiting

### Bread Baking
prepTime: 10
cookTime: 45
# No waitTime - no passive waiting

### Sous Vide Meat
prepTime: 20
cookTime: 0
waitTime: 2160
# 20 min prep, no active cooking, 36 hours passive (sous vide)

### Marinated Vegetables
prepTime: 15
cookTime: 0
waitTime: 180
# 15 min prep, no cooking, 3 hours marinating

### Garnish
# No timing - trivial/quick
```

#### Field Meanings

- **prepTime**: Active preparation time (chopping, mixing, seasoning)
- **cookTime**: Active cooking time (searing, boiling, reducing - requires attention)
- **waitTime**: Passive waiting time (brining, marinating, sous vide, chilling, fermenting - no active work)

### Complete Example

```markdown
## Components

### Beetroot Tartare
slug: beetroot-tartare
prepTime: 10
cookTime: 0
waitTime: 180

#### Ingredients
- 400 g raw beetroot {scale}
- 2 tbsp balsamic vinegar {scale}

#### Instructions
1. Peel and dice beetroot (10 min prep).
2. Cook sous vide at 85°C for 3 hours (180 min passive wait).
3. Chill in refrigerator.

### Steak
prepTime: 5
cookTime: 10

#### Ingredients
- 2 x 200g ribeye steaks {scale}

#### Instructions
1. Season steaks with salt and pepper.
2. Sear for 3-4 minutes per side.

### Assembly
prepTime: 5

#### Instructions
1. Place steak on plate.
2. Add beetroot tartare on the side.
```

In this example, the recipe's total time would be automatically calculated as 210 minutes:
- Beetroot: 10 + 0 + 180 = 190 min (prep + cook + wait)
- Steak: 5 + 10 + 0 = 15 min
- Assembly: 5 + 0 + 0 = 5 min
- **Total: 210 minutes** (sum of component times)

### How Total Time Calculation Works

The total time is calculated differently depending on whether components have `waitTime` specified:

1. **With explicit totalTime in frontmatter**: Uses the frontmatter value
   ```yaml
   ---
   prepTime: 30
   cookTime: 60
   totalTime: 120  # This value is used (overrides calculation)
   ---
   ```

2. **With component times (including waitTime)**: Uses additive calculation
   - For each component: `componentTime = prepTime + cookTime + waitTime`
   - Recipe totalTime = sum of all componentTime values
   
   **Why this approach?** Wait time represents passive time (cooling, setting, marinating) that occurs *after* active prep/cook work. The total time includes both active and passive time sequentially.
   
   ```markdown
   ### Component A
   prepTime: 10
   cookTime: 20
   waitTime: 0
   # componentTime = 10 + 20 + 0 = 30 minutes
   
   ### Component B
   prepTime: 15
   cookTime: 0
   waitTime: 180
   # componentTime = 15 + 0 + 180 = 195 minutes (prep + waiting)
   
   # Total time = 30 + 195 = 225 minutes
   ```

3. **Without component times**: Falls back to recipe-level `prepTime + cookTime + (waitTime ?? 0)`
   ```yaml
   ---
   prepTime: 30
   cookTime: 60
   waitTime: 120
   # Total time = 30 + 60 + 120 = 210 minutes
   ---
   ```

4. **Mixed components**: Only components with timing are included in sum
   ```markdown
   ### Component A
   prepTime: 10
   cookTime: 20
   
   ### Component B
   # No timing specified
   
   ### Component C
   prepTime: 5
   waitTime: 60
   # Total time = max(10+20, 0) + max(5+0, 60) = 30 + 60 = 90 minutes (B ignored)
   ```

### Referenced Components

When you reference a component from another recipe, all timing fields are automatically inherited:

**Source Recipe** (4 servings):
```markdown
### Sauce
slug: tomato-sauce
prepTime: 15
cookTime: 30
waitTime: 60

#### Ingredients
- 400g tomatoes {scale}
```

**Target Recipe**:
```markdown
### Sauce
@include:other-recipe#tomato-sauce
# Automatically inherits prepTime: 15, cookTime: 30, waitTime: 60
```

The total time of the target recipe will include the inherited timing. The component time would be calculated as `max(15+30, 60) = 60 minutes`.

### Rules and Best Practices

1. **Timing is optional** - Only add when it provides value
   ```markdown
   ✅ ### Long Cooking Component
      prepTime: 20
      cookTime: 180
   
   ✅ ### Marinated Component
      prepTime: 10
      cookTime: 0
      waitTime: 1440
   
   ✅ ### Quick Garnish
      # No timing needed for trivial steps
   ```

2. **Use minutes as the unit** - All times are in minutes
   ```markdown
   ✅ prepTime: 30      # 30 minutes
   ✅ cookTime: 180     # 3 hours (in minutes)
   ✅ waitTime: 2160    # 36 hours (in minutes)
   ❌ cookTime: 3h      # Invalid - must be number
   ```

3. **Distinguish prep vs. cook vs. wait** - Help users understand time requirements
   ```markdown
   ✅ prepTime: 20     # Active: chopping, mixing, seasoning
      cookTime: 0      # No active cooking
      waitTime: 1440   # Passive: 24h brining in fridge
   
   ✅ prepTime: 15     # Active: searing, vacuum sealing
      cookTime: 0      # No active cooking (sous vide is passive)
      waitTime: 960    # Passive: 16h sous vide at 72°C
   
   ✅ prepTime: 10     # Active: mixing ingredients
      cookTime: 45     # Active: baking (requires monitoring)
      waitTime: 0      # No passive waiting
   ```

4. **Use waitTime for passive processes** - When no active work is needed
   ```markdown
   ✅ Sous vide cooking      → waitTime
   ✅ Marinating/brining     → waitTime
   ✅ Chilling/freezing      → waitTime
   ✅ Resting dough          → waitTime
   ✅ Fermenting             → waitTime
   
   ❌ Active simmering       → cookTime (needs monitoring)
   ❌ Slow roasting          → cookTime (needs checking)
   ```

5. **Timing is an indication** - It doesn't need to be exact
   ```markdown
   # Good enough
   prepTime: 10
   cookTime: 45
   waitTime: 1440
   
   # Too precise
   prepTime: 8
   cookTime: 43
   waitTime: 1438
   ```

6. **Referenced components keep their timing** - All timing fields are copied from source
   ```markdown
   ### Sauce
   @include:base-recipe#sauce
   # Don't add prepTime/cookTime/waitTime here - inherited from source
   ```

7. **Maximum waitTime** - Limited to 10,080 minutes (7 days)
   ```markdown
   ✅ waitTime: 2160    # 36 hours - typical sous vide
   ✅ waitTime: 4320    # 3 days - dry aging, curing
   ❌ waitTime: 20160   # 14 days - exceeds 7-day limit
   ```

### When to Use Component Timing

**Use component timing when:**
- Recipe has multiple distinct steps with significant time differences
- Components can be prepared ahead or in parallel
- Users benefit from knowing prep vs. cook vs. wait time breakdown
- Recipe is complex and time management is important
- Recipe involves passive waiting (brining, marinating, sous vide, chilling)

**Skip timing when:**
- Recipe is very simple (use recipe-level prepTime/cookTime instead)
- All components take roughly the same time
- Time is negligible or obvious (< 5 minutes)
- Component is just assembly with no real time investment

### Common waitTime Scenarios

**Sous Vide Cooking**
```markdown
### Sous Vide Beef
prepTime: 20        # Season, sear, vacuum seal
cookTime: 0         # No active cooking
waitTime: 2160      # 36h at 56°C (completely passive)
```

**Brining/Curing**
```markdown
### Brined Pork
prepTime: 15        # Mix brine, submerge meat
cookTime: 0         # No cooking yet
waitTime: 1440      # 24h brining in fridge
```

**Marinating**
```markdown
### Marinated Chicken
prepTime: 10        # Prepare marinade, coat chicken
cookTime: 30        # Grill or roast
waitTime: 180       # 3h marinating
```

**Chilling/Setting**
```markdown
### Panna Cotta
prepTime: 15        # Mix, heat, pour
cookTime: 5         # Brief heating
waitTime: 240       # 4h setting in fridge
```

**Dough Resting**
```markdown
### Bread Dough
prepTime: 20        # Mix, knead
cookTime: 45        # Baking
waitTime: 120       # 2h rising time
```

### Display

Component timing is displayed in the recipe UI to help users plan:
- Each component shows its preparation, cooking, and waiting time
- Total time is calculated using the Option C formula: `max(prepTime + cookTime, waitTime)` per component
- Users can see which components are most time-consuming
- Prep vs. cook vs. wait breakdown helps with planning parallel work and understanding time commitment
- Long waitTime values (e.g., 36h sous vide) help users know recipes require advance planning

### Recipe-Level waitTime (Simple Recipes)

For simple (non-component) recipes, you can also specify `waitTime` in the frontmatter:

```yaml
---
title: "Marinated Chicken"
slug: "marinated-chicken"
servings: 4
prepTime: 15
cookTime: 30
waitTime: 180    # 3 hours marinating
difficulty: easy
---
```

The total time calculation works the same way as components:
- `totalTime = max(prepTime + cookTime, waitTime)`
- If waitTime is 180 min and active time is 45 min (15 prep + 30 cook), totalTime = 180 min

**When to use recipe-level waitTime:**
- Simple recipes (no components) that require passive waiting
- Marinating, chilling, fermenting, or other passive processes
- When the waiting period is part of the main recipe flow

**When NOT to use recipe-level waitTime:**
- Component-based recipes (use component-level waitTime instead)
- Optional advance prep (like "can be made a day ahead")


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
