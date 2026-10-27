// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/local-image-editor/route';

const fetchEditor = vi.fn();
beforeEach(() => { vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('IMAGE_STUDIO_PORT', '4317'); vi.stubGlobal('fetch', fetchEditor); fetchEditor.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('maps originals, existing edits and exported jobs without exposing editor secrets', async () => {
  fetchEditor.mockResolvedValue(Response.json({ token: 'secret', jobs: [{ prompt: 'private' }], photos: [{
    id: 'mousse/original.jpg', slug: 'mousse', filename: 'original.jpg', variants: [
      { id: 'job:one', filename: 'enhanced.jpg', appliedFilename: 'saved.jpg', kind: 'local' },
      { id: 'mousse/artistic.jpg', filename: 'artistic.jpg', kind: 'existing' },
      { id: 'job:draft', filename: 'draft.jpg', kind: 'codex' },
    ],
  }] }));
  const response = await GET();
  expect(response.headers.get('cache-control')).toBe('no-store');
  const result = await response.json();
  expect(result).toEqual({ available: true, origin: 'http://localhost:4317', images: {
    'mousse/original.jpg': { photo: 'mousse/original.jpg', variant: 'mousse/original.jpg' },
    'mousse/saved.jpg': { photo: 'mousse/original.jpg', variant: 'job:one' },
    'mousse/artistic.jpg': { photo: 'mousse/original.jpg', variant: 'mousse/artistic.jpg' },
  } });
});

it('hides links quietly when the editor is offline', async () => {
  fetchEditor.mockRejectedValue(new Error('connection refused'));
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ available: false });
});

it('never contacts the editor in production or with an invalid port', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  expect((await GET()).status).toBe(404);
  expect(fetchEditor).not.toHaveBeenCalled();
  vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('IMAGE_STUDIO_PORT', '0');
  expect(await (await GET()).json()).toEqual({ available: false });
  expect(fetchEditor).not.toHaveBeenCalled();
});
