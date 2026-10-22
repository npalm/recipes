// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getPublishedRecipeBySlug, getRecipeBySlug } from '@/modules/recipe/repository';

describe('public recipe access', () => {
  let contentDir: string;
  beforeEach(async () => {
    contentDir = await mkdtemp(path.join(tmpdir(), 'recipes-public-access-'));
    const original = await readFile('content/recipes/tuna-tataki/index.en.md', 'utf8');
    for (const status of ['draft', 'published']) {
      await mkdir(path.join(contentDir, status));
      await writeFile(path.join(contentDir, status, 'index.en.md'), original.replace('status: published', `status: ${status}`));
    }
  });
  afterEach(async () => { vi.restoreAllMocks(); await rm(contentDir, { recursive: true, force: true }); });

  it('hides drafts while keeping them available for internal tooling', async () => {
    expect((await getRecipeBySlug('draft', 'en', { contentDir }))?.status).toBe('draft');
    expect(await getPublishedRecipeBySlug('draft', 'en', { contentDir })).toBeNull();
    expect((await getPublishedRecipeBySlug('published', 'en', { contentDir }))?.status).toBe('published');
  });

  it.each([['../draft', 'en'], ['draft', '../../en'], ['draft', 'fr']])('rejects unsafe slugs and unsupported locales', async (slug, locale) => {
    expect(await getPublishedRecipeBySlug(slug, locale, { contentDir })).toBeNull();
    expect(await getRecipeBySlug(slug, locale, { contentDir })).toBeNull();
  });

  it('stops recursive repository loads before reading a cyclic or excessively deep reference', async () => {
    expect(await getRecipeBySlug('published', 'en', { contentDir, resolutionStack: ['published'] })).toBeNull();
    expect(await getRecipeBySlug('published', 'en', { contentDir, resolutionStack: Array(5).fill('other') })).toBeNull();
  });
});
