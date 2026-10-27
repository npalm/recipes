import fs from 'node:fs/promises';
import path from 'node:path';

export interface CardImageCrop {
  ratio: string;
  x: number;
  y: number;
  zoom?: number;
  free?: boolean;
}
interface SavedCardCrop extends CardImageCrop { slug: string; filename: string }

async function getImageCrops(contentDir: string, kind: 'card' | 'recipe'): Promise<SavedCardCrop[]> {
  try {
    const value = JSON.parse(await fs.readFile(path.join(contentDir, '..', `${kind}-image-crops.json`), 'utf8'));
    if (!Array.isArray(value?.crops)) return [];
    return value.crops.filter((item: SavedCardCrop) => item && typeof item.slug === 'string' && typeof item.filename === 'string'
      && typeof item.ratio === 'string' && item.ratio.length <= 64 && /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(item.ratio)
      && item.ratio.split(':').every(n => Number(n) > 0 && Number.isFinite(Number(n)))
      && Number.isFinite(Number(item.ratio.split(':')[0]) / Number(item.ratio.split(':')[1]))
      && [item.x, item.y].every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0 && number <= 100)
      && (item.free === undefined || typeof item.free === 'boolean')
      && (item.zoom === undefined || (typeof item.zoom === 'number' && Number.isFinite(item.zoom) && item.zoom >= 1 && item.zoom <= 4)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return [];
    throw error;
  }
}

export const getCardImageCrops = (contentDir: string) => getImageCrops(contentDir, 'card');
export const getRecipeImageCrops = (contentDir: string) => getImageCrops(contentDir, 'recipe');
