/** Discover local editor links without exposing job data or the editor's token. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  if (process.env.NODE_ENV !== 'development') return Response.json({ available: false }, { status: 404, headers });
  const port = Number(process.env.IMAGE_STUDIO_PORT || 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return Response.json({ available: false }, { headers });
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/library`, { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error('Editor unavailable');
    const library = await response.json();
    if (!Array.isArray(library.photos)) throw new Error('Invalid editor response');
    const images: Record<string, { photo: string; variant: string }> = {};
    for (const photo of library.photos) {
      images[`${photo.slug}/${photo.filename}`] = { photo: photo.id, variant: photo.id };
      for (const variant of photo.variants || []) {
        const filename = variant.appliedFilename || (variant.kind === 'existing' ? variant.filename : undefined);
        if (filename) images[`${photo.slug}/${filename}`] = { photo: photo.id, variant: variant.id };
      }
    }
    return Response.json({ available: true, origin: `http://localhost:${port}`, images }, { headers });
  } catch {
    return Response.json({ available: false }, { headers });
  }
}
