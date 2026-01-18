#!/usr/bin/env node

// src/index.ts
import { Command as Command5 } from "commander";
import chalk5 from "chalk";

// src/commands/create.ts
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import fs from "fs/promises";
import path from "path";

// src/providers/openai.ts
var OpenAIProvider = class {
  type = "openai";
  model;
  apiKey;
  baseUrl;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "gpt-4-turbo-preview";
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
  }
  async complete(options) {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "",
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      model: data.model,
      raw: data
    };
  }
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// src/providers/anthropic.ts
var AnthropicProvider = class {
  type = "anthropic";
  model;
  apiKey;
  baseUrl;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "claude-3-5-sonnet-latest";
    this.baseUrl = config.baseUrl || "https://api.anthropic.com";
  }
  async complete(options) {
    const messages = [];
    for (const msg of options.messages) {
      if (msg.role === "system") {
        continue;
      }
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    let systemPrompt = options.systemPrompt || "";
    const systemMessages = options.messages.filter((m) => m.role === "system");
    if (systemMessages.length > 0) {
      systemPrompt = systemMessages.map((m) => m.content).join("\n\n") + (systemPrompt ? "\n\n" + systemPrompt : "");
    }
    const body = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    const textContent = data.content.filter((block) => block.type === "text").map((block) => block.text).join("");
    return {
      content: textContent,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model: data.model,
      raw: data
    };
  }
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 1
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// src/providers/ollama.ts
var OllamaProvider = class {
  type = "ollama";
  model;
  baseUrl;
  constructor(config) {
    this.model = config.model || "llama3.2";
    this.baseUrl = config.baseUrl || "http://localhost:11434";
  }
  async complete(options) {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens || 4096
        }
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return {
      content: data.message?.content || "",
      usage: data.prompt_eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      } : void 0,
      model: data.model,
      raw: data
    };
  }
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  /**
   * List available models in Ollama
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }
};

// src/providers/index.ts
function createProvider(config) {
  switch (config.type) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}
var DEFAULT_MODELS = {
  openai: "gpt-4-turbo-preview",
  anthropic: "claude-3-5-sonnet-latest",
  ollama: "llama3.2"
};
function getProviderFromEnv() {
  const providerType = process.env.RECIPE_AI_PROVIDER;
  if (providerType === "ollama") {
    return {
      type: "ollama",
      model: process.env.RECIPE_OLLAMA_MODEL || DEFAULT_MODELS.ollama,
      baseUrl: process.env.RECIPE_OLLAMA_URL || "http://localhost:11434"
    };
  }
  if (providerType === "anthropic" || process.env.ANTHROPIC_API_KEY) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return {
      type: "anthropic",
      apiKey,
      model: process.env.RECIPE_ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic
    };
  }
  if (providerType === "openai" || process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return {
      type: "openai",
      apiKey,
      model: process.env.RECIPE_OPENAI_MODEL || DEFAULT_MODELS.openai
    };
  }
  return null;
}

// src/utils/template.ts
function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}
function getTodayDate() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function recipeToMarkdown(recipe) {
  const { frontmatter, description, ingredients, instructions, notes } = recipe;
  const yamlLines = [
    "---",
    `title: "${frontmatter.title}"`,
    `slug: "${frontmatter.slug}"`,
    `status: ${frontmatter.status}`,
    `servings: ${frontmatter.servings}`,
    `prepTime: ${frontmatter.prepTime}`,
    `cookTime: ${frontmatter.cookTime}`,
    `difficulty: ${frontmatter.difficulty}`,
    `tags: [${frontmatter.tags.map((t) => `"${t}"`).join(", ")}]`,
    `images: []`,
    `headerImageRotation: ${frontmatter.headerImageRotation}`
  ];
  if (frontmatter.sources.length > 0) {
    yamlLines.push("sources:");
    for (const source of frontmatter.sources) {
      yamlLines.push(`  - url: "${source.url}"`);
      if (source.title) {
        yamlLines.push(`    title: "${source.title}"`);
      }
    }
  } else {
    yamlLines.push("sources: []");
  }
  yamlLines.push(`createdAt: "${frontmatter.createdAt}"`);
  yamlLines.push("---");
  const contentLines = [
    "",
    description,
    "",
    "## Ingredients",
    ""
  ];
  for (const ingredient of ingredients) {
    const isServingSuggestion = /for serving|to taste|garnish|optional/i.test(ingredient);
    const scaleMark = isServingSuggestion ? "" : " {scale}";
    contentLines.push(`- ${ingredient}${scaleMark}`);
  }
  contentLines.push("", "## Instructions", "");
  instructions.forEach((instruction, index) => {
    contentLines.push(`${index + 1}. ${instruction}`);
    contentLines.push("");
  });
  if (notes && notes.length > 0) {
    contentLines.push("## Notes", "");
    for (const note of notes) {
      contentLines.push(`- ${note}`);
    }
    contentLines.push("");
  }
  return [...yamlLines, ...contentLines].join("\n");
}
var RECIPE_SYSTEM_PROMPT = `You are a helpful cooking assistant that creates detailed recipes in a structured JSON format.

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
var RECIPE_IMPORT_PROMPT = `You are a recipe extraction assistant. Your job is to extract recipe information from web content and convert it to a structured JSON format.

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

// src/commands/create.ts
var createCommand = new Command("create").description("Create a new recipe using AI").argument("<description>", "Description of the recipe to create").option("-o, --output <path>", "Output directory (default: content/recipes)").option("-s, --servings <number>", "Number of servings", "4").option("-d, --difficulty <level>", "Difficulty level (easy, medium, hard)").option("-t, --tags <tags>", "Comma-separated tags").option("--draft", "Create as draft (default: true)", true).action(createRecipe);
async function createRecipe(description, options) {
  const providerConfig = getProviderFromEnv();
  if (!providerConfig) {
    console.log(chalk.red("Error: No AI provider configured."));
    console.log(chalk.dim('Run "recipe config" to see setup instructions.'));
    process.exit(1);
  }
  const spinner = ora("Generating recipe...").start();
  try {
    const provider = createProvider(providerConfig);
    let userPrompt = `Create a recipe for: ${description}`;
    if (options.servings) {
      userPrompt += `
Servings: ${options.servings}`;
    }
    if (options.difficulty) {
      userPrompt += `
Difficulty: ${options.difficulty}`;
    }
    if (options.tags) {
      userPrompt += `
Include these tags: ${options.tags}`;
    }
    userPrompt += `
Today's date (for createdAt): ${getTodayDate()}`;
    const result = await provider.complete({
      systemPrompt: RECIPE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.7
    });
    spinner.text = "Parsing response...";
    let recipeData;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      recipeData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      spinner.fail("Failed to parse AI response");
      console.log(chalk.dim("\nRaw response:"));
      console.log(result.content);
      process.exit(1);
    }
    if (options.draft) {
      recipeData.frontmatter.status = "draft";
    }
    if (!recipeData.frontmatter.slug) {
      recipeData.frontmatter.slug = generateSlug(recipeData.frontmatter.title);
    }
    const markdown = recipeToMarkdown(recipeData);
    const outputDir = options.output || path.join(process.cwd(), "content", "recipes");
    const recipeDir = path.join(outputDir, recipeData.frontmatter.slug);
    const outputFile = path.join(recipeDir, "index.md");
    await fs.mkdir(recipeDir, { recursive: true });
    await fs.writeFile(outputFile, markdown, "utf-8");
    spinner.succeed(`Recipe created: ${chalk.green(recipeData.frontmatter.title)}`);
    console.log(chalk.dim(`  File: ${outputFile}`));
    console.log("");
    console.log(chalk.bold("Recipe Summary:"));
    console.log(`  Servings:   ${recipeData.frontmatter.servings}`);
    console.log(`  Prep Time:  ${recipeData.frontmatter.prepTime} min`);
    console.log(`  Cook Time:  ${recipeData.frontmatter.cookTime} min`);
    console.log(`  Difficulty: ${recipeData.frontmatter.difficulty}`);
    console.log(`  Tags:       ${recipeData.frontmatter.tags.join(", ")}`);
    console.log(`  Status:     ${recipeData.frontmatter.status}`);
    if (result.usage) {
      console.log("");
      console.log(chalk.dim(`Tokens used: ${result.usage.totalTokens}`));
    }
  } catch (error) {
    spinner.fail("Failed to create recipe");
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}

// src/commands/import.ts
import { Command as Command2 } from "commander";
import chalk2 from "chalk";
import ora2 from "ora";
import fs2 from "fs/promises";
import path2 from "path";
var importCommand = new Command2("import").description("Import a recipe from a URL").argument("<url>", "URL of the recipe to import").option("-o, --output <path>", "Output directory (default: content/recipes)").option("--draft", "Create as draft (default: true)", true).action(importRecipe);
async function fetchUrl(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RecipeCLI/1.0; +https://github.com/recipes)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }
  return response.text();
}
function extractTextFromHtml(html) {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, " ").trim();
  const maxLength = 15e3;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + "...";
  }
  return text;
}
function extractJsonLd(html) {
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!jsonLdMatches) return null;
  for (const match of jsonLdMatches) {
    try {
      const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, "");
      const data = JSON.parse(jsonContent);
      if (data["@type"] === "Recipe") {
        return data;
      }
      if (Array.isArray(data)) {
        const recipe = data.find((item) => item["@type"] === "Recipe");
        if (recipe) return recipe;
      }
      if (data["@graph"]) {
        const recipe = data["@graph"].find(
          (item) => item["@type"] === "Recipe"
        );
        if (recipe) return recipe;
      }
    } catch {
    }
  }
  return null;
}
async function importRecipe(url, options) {
  try {
    new URL(url);
  } catch {
    console.log(chalk2.red("Error: Invalid URL provided."));
    process.exit(1);
  }
  const providerConfig = getProviderFromEnv();
  if (!providerConfig) {
    console.log(chalk2.red("Error: No AI provider configured."));
    console.log(chalk2.dim('Run "recipe config" to see setup instructions.'));
    process.exit(1);
  }
  const spinner = ora2("Fetching recipe...").start();
  try {
    const html = await fetchUrl(url);
    spinner.text = "Extracting content...";
    const jsonLd = extractJsonLd(html);
    let contentForAi;
    if (jsonLd) {
      spinner.text = "Found structured data, processing...";
      contentForAi = `Structured recipe data (JSON-LD):
${JSON.stringify(jsonLd, null, 2)}`;
    } else {
      spinner.text = "Extracting text content...";
      contentForAi = extractTextFromHtml(html);
    }
    spinner.text = "Generating recipe with AI...";
    const provider = createProvider(providerConfig);
    const userPrompt = `Import this recipe from the following URL: ${url}

Today's date (for createdAt): ${getTodayDate()}

Content from the webpage:
---
${contentForAi}
---

Extract the recipe information and return it as JSON.`;
    const result = await provider.complete({
      systemPrompt: RECIPE_IMPORT_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3
      // Lower temperature for more faithful extraction
    });
    spinner.text = "Parsing response...";
    let recipeData;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      recipeData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      spinner.fail("Failed to parse AI response");
      console.log(chalk2.dim("\nRaw response:"));
      console.log(result.content);
      process.exit(1);
    }
    if (options.draft) {
      recipeData.frontmatter.status = "draft";
    }
    if (!recipeData.frontmatter.sources) {
      recipeData.frontmatter.sources = [];
    }
    const hasSourceUrl = recipeData.frontmatter.sources.some((s) => s.url === url);
    if (!hasSourceUrl) {
      recipeData.frontmatter.sources.unshift({
        url,
        title: "Original Source"
      });
    }
    if (!recipeData.frontmatter.slug) {
      recipeData.frontmatter.slug = generateSlug(recipeData.frontmatter.title);
    }
    const markdown = recipeToMarkdown(recipeData);
    const outputDir = options.output || path2.join(process.cwd(), "content", "recipes");
    const recipeDir = path2.join(outputDir, recipeData.frontmatter.slug);
    const outputFile = path2.join(recipeDir, "index.md");
    await fs2.mkdir(recipeDir, { recursive: true });
    await fs2.writeFile(outputFile, markdown, "utf-8");
    spinner.succeed(`Recipe imported: ${chalk2.green(recipeData.frontmatter.title)}`);
    console.log(chalk2.dim(`  Source: ${url}`));
    console.log(chalk2.dim(`  File: ${outputFile}`));
    console.log("");
    console.log(chalk2.bold("Recipe Summary:"));
    console.log(`  Servings:   ${recipeData.frontmatter.servings}`);
    console.log(`  Prep Time:  ${recipeData.frontmatter.prepTime} min`);
    console.log(`  Cook Time:  ${recipeData.frontmatter.cookTime} min`);
    console.log(`  Difficulty: ${recipeData.frontmatter.difficulty}`);
    console.log(`  Tags:       ${recipeData.frontmatter.tags.join(", ")}`);
    console.log(`  Status:     ${recipeData.frontmatter.status}`);
    if (result.usage) {
      console.log("");
      console.log(chalk2.dim(`Tokens used: ${result.usage.totalTokens}`));
    }
  } catch (error) {
    spinner.fail("Failed to import recipe");
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk2.red(`Error: ${message}`));
    process.exit(1);
  }
}

// src/commands/validate.ts
import { Command as Command3 } from "commander";
import chalk3 from "chalk";
import fs3 from "fs/promises";
import path3 from "path";
import { z } from "zod";
var RecipeFrontmatterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  status: z.enum(["draft", "published"]),
  servings: z.number().positive("Servings must be positive"),
  prepTime: z.number().nonnegative("Prep time cannot be negative"),
  cookTime: z.number().nonnegative("Cook time cannot be negative"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()),
  images: z.array(z.string()).optional(),
  headerImageRotation: z.boolean().optional(),
  sources: z.array(
    z.object({
      url: z.string().url("Source URL must be valid"),
      title: z.string().optional()
    })
  ).optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional()
});
var validateCommand = new Command3("validate").description("Validate recipe markdown files").argument("[path]", "Path to recipe file or directory", "content").option("-s, --strict", "Enable strict validation").option("--fix", "Attempt to fix common issues (not yet implemented)").action(validateRecipes);
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const yamlContent = match[1];
  const body = match[2];
  const frontmatter = {};
  let currentKey = "";
  let inArray = false;
  let arrayItems = [];
  for (const line of yamlContent.split("\n")) {
    if (!line.trim()) continue;
    if (line.match(/^\s+-/)) {
      const value2 = line.replace(/^\s+-\s*/, "").trim();
      if (value2.startsWith("url:")) {
        const obj = {};
        obj.url = value2.replace("url:", "").trim().replace(/^["']|["']$/g, "");
        arrayItems.push(obj);
      } else {
        arrayItems.push(value2.replace(/^["']|["']$/g, ""));
      }
      continue;
    }
    if (line.match(/^\s+\w+:/) && arrayItems.length > 0) {
      const [key2, ...valueParts] = line.trim().split(":");
      const value2 = valueParts.join(":").trim().replace(/^["']|["']$/g, "");
      const lastItem = arrayItems[arrayItems.length - 1];
      if (typeof lastItem === "object" && lastItem !== null) {
        lastItem[key2] = value2;
      }
      continue;
    }
    if (inArray && currentKey) {
      frontmatter[currentKey] = arrayItems;
      arrayItems = [];
      inArray = false;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if (typeof value === "string" && value.startsWith("[")) {
      const arrayMatch = value.match(/^\[(.*)\]$/);
      if (arrayMatch) {
        value = arrayMatch[1].split(",").map((item) => item.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      }
    } else if (value === "" || value === "[]") {
      inArray = true;
      currentKey = key;
      arrayItems = [];
      continue;
    } else if (typeof value === "string") {
      let strValue = value.replace(/^["']|["']$/g, "");
      if (/^\d+$/.test(strValue)) {
        value = parseInt(strValue, 10);
      } else if (/^\d+\.\d+$/.test(strValue)) {
        value = parseFloat(strValue);
      } else if (strValue === "true") {
        value = true;
      } else if (strValue === "false") {
        value = false;
      } else {
        value = strValue;
      }
    }
    frontmatter[key] = value;
  }
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayItems;
  }
  return { frontmatter, body };
}
async function validateFile(filePath, options) {
  const result = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: []
  };
  try {
    const content = await fs3.readFile(filePath, "utf-8");
    const parsed = parseFrontmatter(content);
    if (!parsed) {
      result.errors.push("Missing or invalid frontmatter (must be wrapped in ---)");
      result.valid = false;
      return result;
    }
    const { frontmatter, body } = parsed;
    const validation = RecipeFrontmatterSchema.safeParse(frontmatter);
    if (!validation.success) {
      for (const error of validation.error.issues) {
        result.errors.push(`${error.path.join(".")}: ${error.message}`);
      }
      result.valid = false;
    }
    if (!body.includes("## Ingredients")) {
      result.errors.push('Missing "## Ingredients" section');
      result.valid = false;
    }
    if (!body.includes("## Instructions")) {
      result.errors.push('Missing "## Instructions" section');
      result.valid = false;
    }
    if (!body.match(/^- .+/m)) {
      result.warnings.push('No ingredients found (expected "- item" format)');
    }
    if (!body.match(/^\d+\. .+/m)) {
      result.warnings.push("No numbered instructions found");
    }
    if (options.strict) {
      if (!frontmatter.tags || Array.isArray(frontmatter.tags) && frontmatter.tags.length === 0) {
        result.warnings.push("No tags specified");
      }
      if (frontmatter.status === "published" && !frontmatter.images) {
        result.warnings.push("Published recipe has no images");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Failed to read file: ${message}`);
    result.valid = false;
  }
  return result;
}
async function findRecipeFiles(dirPath) {
  const files = [];
  async function walk(dir) {
    const entries = await fs3.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path3.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          await walk(fullPath);
        }
      } else if (entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }
  await walk(dirPath);
  return files;
}
async function validateRecipes(inputPath, options) {
  console.log(chalk3.bold("\nValidating recipes...\n"));
  let files;
  try {
    const stat = await fs3.stat(inputPath);
    if (stat.isDirectory()) {
      files = await findRecipeFiles(inputPath);
    } else {
      files = [inputPath];
    }
  } catch {
    console.error(chalk3.red(`Error: Path not found: ${inputPath}`));
    process.exit(1);
  }
  if (files.length === 0) {
    console.log(chalk3.yellow("No markdown files found."));
    return;
  }
  console.log(chalk3.dim(`Found ${files.length} file(s) to validate
`));
  let validCount = 0;
  let invalidCount = 0;
  for (const file of files) {
    const result = await validateFile(file, options);
    const relativePath = path3.relative(process.cwd(), file);
    if (result.valid && result.warnings.length === 0) {
      console.log(chalk3.green(`\u2713 ${relativePath}`));
      validCount++;
    } else if (result.valid) {
      console.log(chalk3.yellow(`\u26A0 ${relativePath}`));
      for (const warning of result.warnings) {
        console.log(chalk3.dim(`    Warning: ${warning}`));
      }
      validCount++;
    } else {
      console.log(chalk3.red(`\u2717 ${relativePath}`));
      for (const error of result.errors) {
        console.log(chalk3.red(`    Error: ${error}`));
      }
      for (const warning of result.warnings) {
        console.log(chalk3.dim(`    Warning: ${warning}`));
      }
      invalidCount++;
    }
  }
  console.log("");
  console.log(chalk3.bold("Summary:"));
  console.log(chalk3.green(`  Valid:   ${validCount}`));
  if (invalidCount > 0) {
    console.log(chalk3.red(`  Invalid: ${invalidCount}`));
    process.exit(1);
  }
}

// src/commands/config.ts
import { Command as Command4 } from "commander";
import chalk4 from "chalk";
var configCommand = new Command4("config").description("Manage AI provider configuration").action(showConfig);
configCommand.command("show").description("Show current configuration").action(showConfig);
configCommand.command("test").description("Test connection to the configured AI provider").action(testConnection);
async function showConfig() {
  console.log(chalk4.bold("\nRecipe CLI Configuration\n"));
  const config = getProviderFromEnv();
  if (!config) {
    console.log(chalk4.yellow("No AI provider configured.\n"));
    printSetupInstructions();
    return;
  }
  console.log(chalk4.green("\u2713 AI Provider configured\n"));
  console.log(`  Provider: ${chalk4.cyan(config.type)}`);
  console.log(`  Model:    ${chalk4.cyan(config.model)}`);
  if (config.baseUrl) {
    console.log(`  Base URL: ${chalk4.cyan(config.baseUrl)}`);
  }
  if (config.apiKey) {
    const maskedKey = config.apiKey.slice(0, 8) + "..." + config.apiKey.slice(-4);
    console.log(`  API Key:  ${chalk4.dim(maskedKey)}`);
  }
  console.log("");
}
async function testConnection() {
  const config = getProviderFromEnv();
  if (!config) {
    console.log(chalk4.red("Error: No AI provider configured.\n"));
    printSetupInstructions();
    process.exit(1);
  }
  console.log(chalk4.dim(`Testing connection to ${config.type}...`));
  try {
    const provider = createProvider(config);
    const isHealthy = await provider.healthCheck();
    if (isHealthy) {
      console.log(chalk4.green(`\u2713 Successfully connected to ${config.type}`));
      console.log(chalk4.dim(`  Model: ${config.model}`));
    } else {
      console.log(chalk4.red(`\u2717 Failed to connect to ${config.type}`));
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(chalk4.red(`\u2717 Connection failed: ${message}`));
    process.exit(1);
  }
}
function printSetupInstructions() {
  console.log(chalk4.bold("Setup Instructions:\n"));
  console.log(chalk4.underline("Option 1: OpenAI"));
  console.log("  Set the following environment variables:");
  console.log(chalk4.dim('    export OPENAI_API_KEY="your-api-key"'));
  console.log(chalk4.dim(`    export RECIPE_OPENAI_MODEL="${DEFAULT_MODELS.openai}"  # optional`));
  console.log("");
  console.log(chalk4.underline("Option 2: Anthropic"));
  console.log("  Set the following environment variables:");
  console.log(chalk4.dim('    export ANTHROPIC_API_KEY="your-api-key"'));
  console.log(chalk4.dim(`    export RECIPE_ANTHROPIC_MODEL="${DEFAULT_MODELS.anthropic}"  # optional`));
  console.log("");
  console.log(chalk4.underline("Option 3: Ollama (Local)"));
  console.log("  Set the following environment variables:");
  console.log(chalk4.dim('    export RECIPE_AI_PROVIDER="ollama"'));
  console.log(chalk4.dim(`    export RECIPE_OLLAMA_MODEL="${DEFAULT_MODELS.ollama}"  # optional`));
  console.log(chalk4.dim('    export RECIPE_OLLAMA_URL="http://localhost:11434"  # optional'));
  console.log("");
  console.log(chalk4.dim("Tip: Add these to your .env file or shell profile."));
  console.log("");
}

// src/index.ts
var program = new Command5();
program.name("recipe").description("CLI tool for creating and importing recipes using AI").version("0.1.0");
program.addCommand(createCommand);
program.addCommand(importCommand);
program.addCommand(validateCommand);
program.addCommand(configCommand);
program.exitOverride();
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "CommanderError") {
        process.exit(0);
      }
      console.error(chalk5.red(`Error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}
main();
