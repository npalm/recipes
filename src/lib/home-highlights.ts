import fs from 'node:fs/promises';
import path from 'node:path';
import type { RecipeCard } from '@/modules/recipe/domain/types';
import { getRecipeImageDimensions } from './recipe-image-metadata';

export interface HomeSlide {
  slug: string;
  filename: string;
  title: string;
  description: string;
  portrait?: boolean;
  desktopPosition?: { x: number; y: number; zoom?: number };
}

export async function getHomeHighlights(recipes: RecipeCard[], root = process.cwd()): Promise<HomeSlide[]> {
  let value;
  try {
    value = JSON.parse(await fs.readFile(path.join(root, 'content/home-highlights.json'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return [];
    throw error;
  }
  if (!Array.isArray(value?.slides)) return [];
  const slides: HomeSlide[] = [];
  for (const item of value.slides) {
    if (!item || typeof item.slug !== 'string' || typeof item.filename !== 'string') continue;
    const recipe = recipes.find(recipe => recipe.slug === item.slug && recipe.status === 'published');
    if (!recipe || slides.some(s => s.slug === item.slug && s.filename === item.filename)) continue;
    const dimensions = await getRecipeImageDimensions(item.slug, item.filename, path.join(root, 'content/recipes'));
    if (!dimensions) continue;
    const position = item.desktopPosition;
    const desktopPosition = position && ['x', 'y'].every(key => typeof position[key] === 'number' && Number.isFinite(position[key]) && position[key] >= 0 && position[key] <= 100)
      ? { x: position.x, y: position.y, ...(typeof position.zoom === 'number' && Number.isFinite(position.zoom) && position.zoom >= 1 && position.zoom <= 4 ? { zoom: position.zoom } : {}) } : undefined;
    slides.push({ ...(desktopPosition ? { desktopPosition } : {}), slug: item.slug, filename: item.filename, title: recipe.title, description: recipe.description, portrait: dimensions.height > dimensions.width });
    if (slides.length === 5) break;
  }
  return slides;
}
