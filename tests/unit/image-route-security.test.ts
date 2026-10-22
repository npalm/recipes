// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GET } from '@/app/content/recipes/[slug]/images/[image]/route';

describe('public recipe image access', () => {
  let root: string;
  let images: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'recipes-image-security-'));
    images = path.join(root, 'content', 'recipes', 'test-recipe', 'images');
    await mkdir(images, { recursive: true });
    await writeFile(path.join(images, 'photo.jpg'), 'image bytes');
    await writeFile(path.join(root, 'private.jpg'), 'private bytes');
    vi.spyOn(process, 'cwd').mockReturnValue(root);
  });
  afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });

  const request = (slug: string, image: string) => GET(undefined as never, { params: Promise.resolve({ slug, image }) });

  it('serves supported images with explicit MIME type and nosniff', async () => {
    const response = await request('test-recipe', 'photo.jpg');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await response.text()).toBe('image bytes');
  });

  it.each([
    ['test-recipe', '../../../../private.jpg'], ['../test-recipe', 'photo.jpg'],
    ['test-recipe', '..%2fprivate.jpg'], ['test-recipe', 'private.svg'],
    ['test-recipe', 'package.json'], ['test-recipe', 'missing.jpg'],
    ['unknown', 'photo.jpg'], ['test-recipe', '.hidden.jpg'],
  ])('rejects invalid image access: %s / %s', async (slug, image) => {
    expect((await request(slug, image)).status).toBe(404);
  });

  it('rejects symlinks from an image to a file outside its directory', async () => {
    await symlink(path.join(root, 'private.jpg'), path.join(images, 'linked.jpg'));
    expect((await request('test-recipe', 'linked.jpg')).status).toBe(404);
  });

  it('rejects a recipe directory symlink outside the recipe root', async () => {
    const outside = path.join(root, 'outside', 'images');
    await mkdir(outside, { recursive: true });
    await writeFile(path.join(outside, 'photo.jpg'), 'private bytes');
    await symlink(path.dirname(outside), path.join(root, 'content', 'recipes', 'linked-recipe'));
    expect((await request('linked-recipe', 'photo.jpg')).status).toBe(404);
  });

  it('rejects directories with image filenames', async () => {
    await mkdir(path.join(images, 'directory.jpg'));
    expect((await request('test-recipe', 'directory.jpg')).status).toBe(404);
  });
});
