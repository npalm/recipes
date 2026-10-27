import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Reserve the actual height of local portrait and landscape photos. */
export async function getRecipeImageDimensions(slug: string, image: string | undefined, contentDir: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !image || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp|avif)$/i.test(image)) return undefined;
  try {
    const root = await fs.realpath(contentDir);
    const file = await fs.realpath(path.join(root, slug, 'images', image));
    if (!file.startsWith(root + path.sep)) return undefined;
    const metadata = await sharp(file).metadata();
    if (!metadata.width || !metadata.height) return undefined;
    const rotated = (metadata.orientation ?? 1) >= 5;
    return { width: rotated ? metadata.height : metadata.width, height: rotated ? metadata.width : metadata.height };
  } catch {
    return undefined;
  }
}
