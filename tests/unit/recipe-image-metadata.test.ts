// @vitest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRecipeImageDimensions } from '@/lib/recipe-image-metadata';

let directory: string;
beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recipe-image-metadata-')); await fs.mkdir(path.join(directory, 'mousse/images'), { recursive: true }); });
afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

describe('recipe photo dimensions', () => {
  it('reserves the actual shape of landscape and portrait images including EXIF rotation', async () => {
    await sharp({ create: { width: 120, height: 80, channels: 3, background: '#aaa' } }).png().toFile(path.join(directory, 'mousse/images/landscape.png'));
    await sharp({ create: { width: 120, height: 80, channels: 3, background: '#aaa' } }).withMetadata({ orientation: 6 }).jpeg().toFile(path.join(directory, 'mousse/images/portrait.jpg'));
    expect(await getRecipeImageDimensions('mousse', 'landscape.png', directory)).toEqual({ width: 120, height: 80 });
    expect(await getRecipeImageDimensions('mousse', 'portrait.jpg', directory)).toEqual({ width: 80, height: 120 });
  });

  it('falls back safely for external, invalid, missing and unreadable images', async () => {
    for (const image of [undefined, 'https://example.com/photo.jpg', '../photo.jpg', 'missing.jpg', 'bad.svg']) expect(await getRecipeImageDimensions('mousse', image, directory)).toBeUndefined();
    expect(await getRecipeImageDimensions('../mousse', 'test.png', directory)).toBeUndefined();
    await fs.writeFile(path.join(directory, 'mousse/images/bad.png'), 'invalid image');
    expect(await getRecipeImageDimensions('mousse', 'bad.png', directory)).toBeUndefined();
    expect(await getRecipeImageDimensions('mousse', 'photo.jpg', path.join(directory, 'missing'))).toBeUndefined();
  });

  it('rejects a symlink escaping the recipe directory', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'outside-recipe-'));
    try {
      await fs.writeFile(path.join(outside, 'photo.png'), 'private');
      await fs.symlink(path.join(outside, 'photo.png'), path.join(directory, 'mousse/images/link.png'));
      expect(await getRecipeImageDimensions('mousse', 'link.png', directory)).toBeUndefined();
    } finally { await fs.rm(outside, { recursive: true, force: true }); }
  });
});
