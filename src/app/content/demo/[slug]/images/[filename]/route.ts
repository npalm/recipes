import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type RouteParams = Promise<{ slug: string; filename: string }>;

/**
 * Serve images from content/demo/[slug]/images/[filename]
 * This allows demo recipe images to be stored alongside the markdown files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { slug, filename } = await params;
  
  // Prevent directory traversal attacks
  if (slug.includes('..') || filename.includes('..')) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const imagePath = path.join(process.cwd(), 'content', 'demo', slug, 'images', filename);

  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return new NextResponse('Image not found', { status: 404 });
  }

  // Read the file
  const imageBuffer = fs.readFileSync(imagePath);

  // Determine content type based on extension
  const ext = path.extname(filename).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
