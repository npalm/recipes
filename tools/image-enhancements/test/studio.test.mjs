import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import http from 'node:http';
import sharp from 'sharp';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';
import { Library } from '../library.mjs';
import { JobQueue, codexEnhance } from '../runner.mjs';
import { buildPrompt } from '../prompts.mjs';
import { createStudio } from '../server.mjs';

const originalId = 'mousse/original.png';
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'image-studio-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dir = path.join(root, 'content/recipes/mousse');
  await fs.mkdir(path.join(dir, 'images'), { recursive: true });
  await sharp({ create: { width: 96, height: 64, channels: 3, background: '#92784a' } }).png().toFile(path.join(dir, 'images/original.png'));
  for (const locale of ['nl', 'en']) await fs.writeFile(path.join(dir, `index.${locale}.md`), `---\ntitle: "Mousse & rum"\nslug: mousse\nimages:\n  - original.png\n  - extra.png\nservings: 2\n---\n\nLaat de recepttekst exact staan.\n`);
  await fs.copyFile(path.join(dir, 'images/original.png'), path.join(dir, 'images/extra.png'));
  const library = new Library(root);
  await library.init();
  return { root, dir, library, original: path.join(dir, 'images/original.png') };
}
async function finished(library, ids) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const jobs = (await library.jobs()).filter(job => ids.includes(job.id));
    if (jobs.length === ids.length && jobs.every(j => !['running', 'queued'].includes(j.status))) return jobs;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Testopdracht liep vast.');
}
const request = (overrides = {}) => ({ photoId: originalId, baseId: originalId, mode: 'local', ...overrides });

test('local variants preserve the original bytes, dimensions, provenance and restart history', async t => {
  const { library, original, root } = await fixture(t);
  const before = await fs.readFile(original);
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const jobs = await queue.enqueue(request({ count: 3 }));
  const done = await finished(library, jobs.map(j => j.id));
  assert.ok(done.every(j => j.status === 'completed'));
  assert.deepEqual(await fs.readFile(original), before);
  const photos = (await library.catalog()).photos;
  const photo = photos.find(p => p.id === originalId);
  assert.equal(photo.variants.length, 3);
  assert.equal(photo.active, 'original.png');
  const buffers = [];
  for (const job of done) {
    const result = await library.image(`job:${job.id}`);
    const meta = await sharp(result.file).metadata();
    assert.equal(meta.width, 96); assert.equal(meta.height, 64);
    buffers.push(await fs.readFile(result.file));
    assert.equal(job.baseId, originalId);
  }
  assert.notDeepEqual(buffers[0], buffers[1]);
  const reopened = new Library(root); await reopened.init();
  assert.equal((await reopened.jobs()).filter(j => j.status === 'completed').length, 3);
});

test('applying and restoring updates all locales, preserves other images and recipe text', async t => {
  const { library, original, dir } = await fixture(t);
  const before = await fs.readFile(original);
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const [job] = await queue.enqueue(request());
  await finished(library, [job.id]);
  const result = await library.apply(originalId, `job:${job.id}`);
  assert.equal(result.locales, 2);
  assert.match(result.filename, /^original-enhanced-/);
  for (const locale of ['nl', 'en']) {
    const content = await fs.readFile(path.join(dir, `index.${locale}.md`), 'utf8');
    assert.deepEqual(matter(content).data.images, [result.filename, 'extra.png']);
    assert.ok(content.endsWith('\n\nLaat de recepttekst exact staan.\n'));
  }
  assert.equal((await library.catalog()).photos.find(p => p.id === originalId).variants.length, 1);
  // Applied images must remain selectable in a checkout without local job history.
  const freshCheckout = new Library(library.root, path.join(library.root, '.fresh-studio'));
  await freshCheckout.init();
  const stored = (await freshCheckout.photo(originalId)).variants;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].filename, result.filename);
  await library.apply(originalId, originalId);
  assert.deepEqual(await fs.readFile(original), before);
  assert.deepEqual(matter(await fs.readFile(path.join(dir, 'index.nl.md'), 'utf8')).data.images, ['original.png', 'extra.png']);
});

test('AI receives explicit instructions and can start from a previous variant', async t => {
  const { library } = await fixture(t);
  const calls = [];
  const queue = new JobQueue(library, async input => {
    calls.push(input);
    const file = path.join(input.directory, 'result.png');
    await sharp(input.base).modulate({ brightness: 1.1 }).png().toFile(file);
    return file;
  }); t.after(() => queue.stop());
  const [local] = await queue.enqueue(request()); await finished(library, [local.id]);
  const [ai] = await queue.enqueue(request({ mode: 'codex', baseId: `job:${local.id}`, instructions: 'Behoud de rumfles en maak het licht zachter.', preserve: 'Rumetiket en glazen' }));
  const [done] = await finished(library, [ai.id]);
  assert.equal(done.status, 'completed'); assert.equal(calls.length, 1);
  assert.notEqual(calls[0].original, calls[0].base);
  assert.match(calls[0].prompt, /Rumetiket en glazen/);
  assert.match(calls[0].prompt, /Behoud de rumfles/);
  assert.match(calls[0].prompt, /bottles, labels/);
});

test('failed or cancelled AI jobs never change the site and queued jobs can be cancelled', async t => {
  const { library, dir } = await fixture(t);
  const before = await fs.readFile(path.join(dir, 'index.nl.md'), 'utf8');
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const queue = new JobQueue(library, async ({ signal }) => {
    started();
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('geannuleerd')), { once: true }));
  }); t.after(() => queue.stop());
  const [first, second] = await queue.enqueue(request({ mode: 'codex', count: 2 }));
  await ready; await queue.cancel(second.id); await queue.cancel(first.id);
  assert.ok((await finished(library, [first.id, second.id])).every(j => j.status === 'cancelled'));
  assert.equal(await fs.readFile(path.join(dir, 'index.nl.md'), 'utf8'), before);
  await assert.rejects(library.apply(originalId, `job:${first.id}`));
  const failing = new JobQueue(library, async () => { throw new Error('geen beeldbewerking'); });
  t.after(() => failing.stop());
  const [third] = await failing.enqueue(request({ mode: 'codex' }));
  const [done] = await finished(library, [third.id]);
  assert.equal(done.status, 'failed'); assert.match(done.error, /geen beeldbewerking/);
});

test('rejects traversal, outside symlinks, unrelated photos and invalid generation settings', async t => {
  const { library, root, dir } = await fixture(t);
  await fs.writeFile(path.join(root, 'private.png'), 'private');
  await fs.symlink(path.join(root, 'private.png'), path.join(dir, 'images/escape.png'));
  await assert.rejects(library.image('mousse/../private.png'));
  await assert.rejects(library.image('mousse/escape.png'));
  const queue = new JobQueue(library); t.after(() => queue.stop());
  await assert.rejects(queue.enqueue(request({ baseId: 'mousse/extra.png' })));
  await assert.rejects(queue.enqueue(request({ count: 100 })));
  await assert.rejects(queue.enqueue(request({ settings: { brightness: -1 } })));
  await assert.rejects(library.apply(originalId, 'mousse/extra.png'));
});

test('Codex runner passes input without a shell and captures an actual artifact', async t => {
  const { root, original } = await fixture(t);
  const directory = path.join(root, 'isolated'); await fs.mkdir(directory);
  const binary = path.join(root, 'fake-codex.mjs');
  await fs.writeFile(binary, `#!${process.execPath}\nimport fs from 'node:fs';\nlet input='';for await(const chunk of process.stdin)input+=chunk;\nfs.writeFileSync('received.json',JSON.stringify({args:process.argv.slice(2),input}));\nfs.copyFileSync(process.argv[process.argv.indexOf('--image')+1],'result.png');\n`, { mode: 0o755 });
  const prompt = 'Keep rum $(touch /tmp/not-executed) `unchanged`; "labels"';
  const result = await codexEnhance({ directory, original, base: original, prompt, binary, onProgress: () => {} });
  assert.equal(path.basename(result), 'result.png');
  const received = JSON.parse(await fs.readFile(path.join(directory, 'received.json'), 'utf8'));
  assert.ok(received.input.includes(prompt));
  assert.equal(received.args[received.args.indexOf('--sandbox') + 1], 'workspace-write');
  assert.ok(!received.args.includes('--yolo'));
  assert.ok(received.input.includes('$imagegen'));
  assert.deepEqual(await fs.readFile(result), await fs.readFile(original));
});

async function runningStudio(t) {
  const fixtureData = await fixture(t);
  const studio = await createStudio({ projectRoot: fixtureData.root, status: () => ({ available: true, version: 'test' }) });
  studio.server.listen(0, '127.0.0.1'); await once(studio.server, 'listening');
  t.after(async () => { await studio.queue.stop(); studio.server.closeAllConnections(); await new Promise(resolve => studio.server.close(resolve)); });
  const origin = `http://127.0.0.1:${studio.server.address().port}`;
  const config = await (await fetch(origin + '/api/config')).json();
  const post = (route, body, headers = {}) => fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Token': config.token, ...headers }, body: JSON.stringify(body) });
  return { ...fixtureData, ...studio, origin, config, post };
}

test('HTTP endpoints enforce local origin and token; generation and apply work end to end', async t => {
  const { origin, post, library } = await runningStudio(t);
  assert.equal((await fetch(origin + '/')).status, 200);
  const unexpectedHostStatus = await new Promise((resolve, reject) => {
    const req = http.get(origin + '/api/library', { headers: { Host: 'evil.example' } }, response => {
      response.resume(); resolve(response.statusCode);
    });
    req.on('error', reject);
  });
  assert.equal(unexpectedHostStatus, 403);
  assert.equal((await post('/api/generate', request(), { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/api/generate', request(), { 'X-Studio-Token': 'wrong' })).status, 403);
  assert.equal((await fetch(origin + '/api/image?id=mousse%2F..%2Fprivate.png')).status, 400);
  const response = await post('/api/generate', request()); assert.equal(response.status, 202);
  const { jobs } = await response.json(); await finished(library, jobs.map(j => j.id));
  const image = await fetch(origin + `/api/image?id=job:${jobs[0].id}`);
  assert.equal(image.headers.get('content-type'), 'image/jpeg');
  assert.ok((await image.arrayBuffer()).byteLength > 100);
  const applied = await post('/api/apply', { photoId: originalId, imageId: `job:${jobs[0].id}` });
  assert.equal(applied.status, 200); assert.equal((await applied.json()).locales, 2);
});

test('browser interface loads originals, creates a variant and selects it without applying', async t => {
  const { origin, library } = await runningStudio(t);
  const html = await (await fetch(origin + '/')).text();
  const dom = new JSDOM(html, { url: origin, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
  dom.window.sharedBuildPrompt = buildPrompt;
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
  const document = dom.window.document;
  assert.equal(document.querySelectorAll('.photo-item').length, 2);
  const originalButton = [...document.querySelectorAll('.photo-item')].find(b => b.textContent.includes('varianten') && b.querySelector('img').src.includes('original.png'));
  originalButton.click();
  assert.equal(document.getElementById('base').value, originalId);
  document.getElementById('generate-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const deadline = Date.now() + 5000;
  while (!(await library.jobs()).length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  const [job] = await library.jobs(); await finished(library, [job.id]);
  while (document.querySelectorAll('.variant-card').length < 2 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(document.querySelectorAll('.variant-card').length, 2);
  assert.equal(document.getElementById('preview-label').textContent, 'Fotocorrectie');
  assert.equal((await library.photo(originalId)).active, 'original.png');
  assert.equal(document.getElementById('apply').disabled, false);
  // Preview the chosen variant's card crop without applying or generating again.
  const selectedSource = document.getElementById('preview-image').src;
  const previewMode = document.getElementById('preview-mode');
  previewMode.value = 'card';
  previewMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok(document.getElementById('photo-comparison').classList.contains('site-card-preview'));
  assert.equal(document.getElementById('zoom').disabled, true);
  assert.equal(document.getElementById('card-hover-control').hidden, false);
  const hover = document.getElementById('card-hover'); hover.checked = true;
  hover.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok(document.getElementById('photo-comparison').classList.contains('site-card-hover'));
  assert.equal(document.getElementById('preview-image').src, selectedSource);
  assert.equal((await library.photo(originalId)).active, 'original.png');
  assert.equal((await library.jobs()).length, 1);
  previewMode.value = 'full';
  previewMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok(!document.getElementById('photo-comparison').classList.contains('site-card-preview'));
  assert.ok(!document.getElementById('photo-comparison').classList.contains('site-card-hover'));
  assert.equal(document.getElementById('zoom').disabled, false);
  const codexRadio = document.querySelector('input[value=codex]'); codexRadio.checked = true;
  codexRadio.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const instructions = document.getElementById('instructions'); instructions.value = 'Bewaar de rumfles.';
  instructions.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.ok(document.getElementById('prompt-preview').textContent.includes('Bewaar de rumfles.'));
  assert.equal(document.getElementById('ai-options').hidden, false);
});

test('URL restores photo, variant and crop after reload and supports browser history', async t => {
  const { origin, library, queue } = await runningStudio(t);
  const [job] = await queue.enqueue(request());
  await finished(library, [job.id]);
  const html = await (await fetch(origin + '/')).text();
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  const open = async url => {
    // No localStorage copied: the link alone must be sufficient.
    const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
    dom.window.sharedBuildPrompt = buildPrompt;
    await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
    return dom;
  };
  const url = new URL(origin);
  url.search = new URLSearchParams({ photo: originalId, variant: `job:${job.id}`, view: 'card', hover: '1' });
  const first = await open(url.href);
  const { document } = first.window;
  assert.equal(document.getElementById('photo-filename').textContent, 'original.png');
  assert.equal(document.getElementById('preview-label').textContent, 'Fotocorrectie');
  assert.equal(document.getElementById('preview-mode').value, 'card');
  assert.ok(document.getElementById('photo-comparison').classList.contains('site-card-hover'));
  const selectedSource = document.getElementById('preview-image').src;
  const reloaded = await open(first.window.location.href);
  assert.equal(reloaded.window.document.getElementById('preview-image').src, selectedSource);
  assert.equal(reloaded.window.document.getElementById('preview-mode').value, 'card');
  document.querySelector('.variant-card').click();
  assert.equal(new URL(first.window.location.href).searchParams.get('variant'), originalId);
  const back = new Promise(resolve => first.window.addEventListener('popstate', resolve, { once: true }));
  first.window.history.back(); await back;
  assert.equal(document.getElementById('preview-image').src, selectedSource);
  const forward = new Promise(resolve => first.window.addEventListener('popstate', resolve, { once: true }));
  first.window.history.forward(); await forward;
  assert.equal(document.getElementById('preview-label').textContent, 'Origineel');
  const missing = await open(`${origin}/?photo=missing&variant=job:missing`);
  assert.ok(missing.window.document.getElementById('preview-image').src.includes('/api/image'));
  assert.notEqual(new URL(missing.window.location.href).searchParams.get('photo'), 'missing');
  const missingVariant = await open(`${origin}/?${new URLSearchParams({ photo: originalId, variant: 'job:missing' })}`);
  assert.equal(missingVariant.window.document.getElementById('preview-label').textContent, 'Origineel');
  assert.equal((await library.photo(originalId)).active, 'original.png');
  assert.equal((await library.jobs()).length, 1);
});
