import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; image: string }> }
) {
  const { slug, image } = await params;
  
  // Construct the file path
  const filePath = path.join(
    process.cwd(),
    'content',
    'recipes',
    slug,
    'images',
    image
  );

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Image not found', { status: 404 });
  }

  // Read the file
  const fileBuffer = fs.readFileSync(filePath);

  // Determine content type based on file extension
  const ext = path.extname(image).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  // Return the image
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
