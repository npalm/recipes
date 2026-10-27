// @vitest-environment node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { expect, it } from 'vitest';
import { getCardImageCrops, getRecipeImageCrops } from '@/lib/card-image-crops';

it('defaults to natural images and loads only valid card-specific crop settings', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'card-crops-'));
  try {
    const dir = path.join(root, 'recipes');
    expect(await getCardImageCrops(dir)).toEqual([]);
    const crop = { slug: 'mousse', filename: 'rum.jpg', ratio: '4:3', x: 30, y: 60, zoom: 1.8 };
    await fs.writeFile(path.join(root, 'card-image-crops.json'), JSON.stringify({ crops: [crop, { ...crop, x: 101 }, { ...crop, zoom: 8 }, { ...crop, ratio: 'invalid' }, null] }));
    expect(await getCardImageCrops(dir)).toEqual([crop]);
    const free = { ...crop, ratio: '0.564:1', free: true };
    await fs.writeFile(path.join(root, 'card-image-crops.json'), JSON.stringify({ crops: [free, { ...free, ratio: '0:1' }, { ...free, ratio: '1:0' }, { ...free, free: 'yes' }] }));
    expect(await getCardImageCrops(dir)).toEqual([free]);
    await fs.writeFile(path.join(root, 'card-image-crops.json'), '{');
    expect(await getCardImageCrops(dir)).toEqual([]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});


it('loads recipe crops from their own file independently of card crops', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'recipe-crops-'));
  try {
    const dir = path.join(root, 'recipes');
    expect(await getRecipeImageCrops(dir)).toEqual([]);
    const recipeCrop = { slug: 'mousse', filename: 'rum.jpg', ratio: '1:1', x: 20, y: 40 };
    const cardCrop = { ...recipeCrop, ratio: '3:2' };
    await fs.writeFile(path.join(root, 'recipe-image-crops.json'), JSON.stringify({ crops: [recipeCrop] }));
    await fs.writeFile(path.join(root, 'card-image-crops.json'), JSON.stringify({ crops: [cardCrop] }));
    expect(await getRecipeImageCrops(dir)).toEqual([recipeCrop]);
    expect(await getCardImageCrops(dir)).toEqual([cardCrop]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
