// @vitest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { getHomeHighlights } from '@/lib/home-highlights';
import type { RecipeCard } from '@/modules/recipe/domain/types';

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'home-highlights-'));
  await fs.mkdir(path.join(root, 'content/recipes/mousse/images'), { recursive: true });
  await sharp({ create: { width: 40, height: 60, channels: 3, background: '#aaa' } }).png().toFile(path.join(root, 'content/recipes/mousse/images/rum.png'));
});
afterEach(async () => { await fs.rm(root, { force: true, recursive: true }); });
const recipes = [{ slug: 'mousse', title: 'Mousse met rum', description: 'Chocolade', status: 'published' }] as RecipeCard[];

it('resolves saved photos against published localized recipes and ignores unsafe, missing and duplicate entries', async () => {
  await fs.writeFile(path.join(root, 'content/home-highlights.json'), JSON.stringify({ slides: [
    null, { slug: 'mousse', filename: '../rum.png' }, { slug: 'draft', filename: 'rum.png' },
    { slug: 'mousse', filename: 'missing.png' }, { slug: 'mousse', filename: 'rum.png' }, { slug: 'mousse', filename: 'rum.png' },
  ] }));
  expect(await getHomeHighlights(recipes, root)).toEqual([{ slug: 'mousse', filename: 'rum.png', title: 'Mousse met rum', description: 'Chocolade', portrait: true }]);
  expect(await getHomeHighlights([{ ...recipes[0], status: 'draft' }], root)).toEqual([]);
});

it('allows the original introduction when configuration is missing, empty or invalid', async () => {
  expect(await getHomeHighlights(recipes, root)).toEqual([]);
  for (const content of ['{', '{}', '{"slides":[]}']) {
    await fs.writeFile(path.join(root, 'content/home-highlights.json'), content);
    expect(await getHomeHighlights(recipes, root)).toEqual([]);
  }
});

it('loads validated desktop positions and ignores invalid coordinates', async () => {
  const file = path.join(root, 'content/home-highlights.json');
  await fs.writeFile(file, JSON.stringify({ slides: [{ slug: 'mousse', filename: 'rum.png', desktopPosition: { x: 30, y: 70 } }] }));
  expect((await getHomeHighlights(recipes, root))[0].desktopPosition).toEqual({ x: 30, y: 70 });
  await fs.writeFile(file, JSON.stringify({ slides: [{ slug: 'mousse', filename: 'rum.png', desktopPosition: { x: 1000, y: '70' } }] }));
  expect((await getHomeHighlights(recipes, root))[0].desktopPosition).toBeUndefined();
});
