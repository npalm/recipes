import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; image: string }> }
) {
  const { slug, image } = await params;
  
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  };
  const contentType = contentTypeMap[path.extname(image).toLowerCase()];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(image) || !contentType) {
    return new NextResponse('Image not found', { status: 404 });
  }

  try {
    const root = await fs.realpath(path.join(process.cwd(), 'content', 'recipes'));
    const imageDirectory = await fs.realpath(path.join(root, slug, 'images'));
    const filePath = await fs.realpath(path.join(imageDirectory, image));
    // Resolve symlinks too: a lexical path check alone does not contain file access.
    if (!imageDirectory.startsWith(root + path.sep) ||
        !filePath.startsWith(imageDirectory + path.sep) ||
        !(await fs.stat(filePath)).isFile()) {
      return new NextResponse('Image not found', { status: 404 });
    }
    return new NextResponse(new Uint8Array(await fs.readFile(filePath)), {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}
