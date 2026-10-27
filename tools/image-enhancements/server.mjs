import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Library, imageMime } from './library.mjs';
import { JobQueue, codexStatus } from './runner.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);

async function jsonBody(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('JSON-invoer vereist.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32768) throw new Error('Opdracht is te groot.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function createStudio({ projectRoot = root, dataRoot, generate, status = codexStatus } = {}) {
  const library = new Library(projectRoot, dataRoot);
  await library.init();
  const queue = new JobQueue(library, generate);
  const token = randomBytes(32).toString('hex');
  let applyChain = Promise.resolve();
  const server = http.createServer(async (request, response) => {
    const port = server.address()?.port;
    const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    const send = (code, value) => {
      response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(value));
    };
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: https:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (!allowedHosts.includes(request.headers.host)) return send(403, { error: 'Alleen lokaal bereikbaar.' });
    const origin = request.headers.origin;
    if (origin && !allowedHosts.map(host => `http://${host}`).includes(origin)) return send(403, { error: 'Andere oorsprong geweigerd.' });
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (request.method === 'GET' && url.pathname === '/prompts.mjs') {
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        return response.end(await fs.readFile(path.join(directory, 'prompts.mjs')));
      }
      if (request.method === 'GET' && staticFiles.has(url.pathname)) {
        const [file, mime] = staticFiles.get(url.pathname);
        response.setHeader('Content-Type', mime);
        return response.end(await fs.readFile(path.join(directory, 'public', file)));
      }
      if (request.method === 'GET' && url.pathname === '/api/config') return send(200, { token, codex: status() });
      if (request.method === 'GET' && url.pathname === '/api/library') return send(200, await library.catalog());
      if (request.method === 'GET' && url.pathname === '/api/image') {
        const { file } = await library.image(url.searchParams.get('id'));
        response.setHeader('Content-Type', imageMime[path.extname(file).toLowerCase()] || 'application/octet-stream');
        return response.end(await fs.readFile(file));
      }
      if (request.method === 'POST') {
        if (request.headers['x-studio-token'] !== token) return send(403, { error: 'Ververs de pagina om opnieuw te verbinden.' });
        const body = await jsonBody(request);
        if (url.pathname === '/api/generate') {
          if (body.mode === 'codex' && !status().available) throw new Error('Codex CLI is niet gevonden. Installeer Codex en voer codex login uit.');
          const generate = applyChain.then(() => queue.enqueue(body));
          applyChain = generate.catch(() => {});
          return send(202, { jobs: await generate });
        }
        if (url.pathname === '/api/cancel') { await queue.cancel(body.id); return send(200, { ok: true }); }
        if (url.pathname === '/api/apply' || url.pathname === '/api/gallery' || url.pathname === '/api/highlights' || url.pathname === '/api/card-crop' || url.pathname === '/api/recipe-crop' || url.pathname === '/api/delete-variant') {
          const apply = applyChain.then(() => url.pathname === '/api/delete-variant' ? library.deleteVariant(body) : url.pathname === '/api/recipe-crop' ? library.recipeCrop(body) : url.pathname === '/api/card-crop' ? library.cardCrop(body) : url.pathname === '/api/highlights' ? library.highlights(body) : url.pathname === '/api/gallery' ? library.gallery(body) : library.apply(body.photoId, body.imageId));
          applyChain = apply.catch(() => {});
          return send(200, await apply);
        }
      }
      send(404, { error: 'Niet gevonden.' });
    } catch (error) {
      send(400, { error: error.code === 'ENOENT' ? 'Bestand niet gevonden.' : error.message });
    }
  });
  server.requestTimeout = 30_000;
  return { server, library, queue };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.IMAGE_STUDIO_PORT || 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('IMAGE_STUDIO_PORT moet tussen 1024 en 65535 liggen.');
  const studio = await createStudio();
  studio.server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Poort ${port} is bezet. Kies een andere IMAGE_STUDIO_PORT.` : error.message);
    process.exitCode = 1;
  });
  studio.server.listen(port, '127.0.0.1', () => console.log(`\n  Fotostudio · http://localhost:${port}\n  Alleen lokaal. Stoppen: Ctrl+C.\n`));
  let closing = false;
  const stop = async () => {
    if (closing) return; closing = true;
    studio.server.close();
    await studio.queue.stop();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
