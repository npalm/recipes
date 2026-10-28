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

test('applying an existing gallery variant retains the previous hero and synchronizes locales', async t => {
  const { library, dir, original } = await fixture(t);
  await fs.copyFile(original, path.join(dir, 'images/original-artistic.png'));
  const nlFile = path.join(dir, 'index.nl.md');
  const nl = await fs.readFile(nlFile, 'utf8');
  await fs.writeFile(nlFile, nl.replace('  - extra.png', '  - original-artistic.png\n  - extra.png'));
  const enFile = path.join(dir, 'index.en.md');
  const en = await fs.readFile(enFile, 'utf8');
  await fs.writeFile(enFile, en.replace('extra.png', 'english-only.png'));
  const variantId = 'mousse/original-artistic.png';
  await library.apply(originalId, variantId);
  await library.apply(originalId, variantId); // Selecting the current hero is idempotent.
  for (const locale of ['nl', 'en']) {
    const content = await fs.readFile(path.join(dir, `index.${locale}.md`), 'utf8');
    assert.deepEqual(matter(content).data.images, ['original-artistic.png', 'original.png', 'extra.png']);
    assert.equal(matter(content).content, matter(locale === 'nl' ? nl : en).content);
  }
});

test('partial locale writes and failed replacements preserve every locale and clean temporary files', async t => {
  for (const operation of ['writeFile', 'rename']) {
    await t.test(operation, async t => {
      const { library, dir } = await fixture(t);
      const files = await library.recipeFiles('mousse');
      const target = files[1].file;
      const original = fs[operation];
      let failed = false;
      t.mock.method(fs, operation, async (file, ...args) => {
        if (!failed && (operation === 'writeFile' ? file.startsWith(target + '.') : args[0] === target)) {
          failed = true;
          if (operation === 'writeFile') await original(file, 'partial content', args[1]);
          throw new Error('simulated locale failure');
        }
        return original(file, ...args);
      });
      await assert.rejects(library.writeImages('mousse', () => ['extra.png']), /simulated locale failure/);
      assert.ok(failed);
      for (const file of files) assert.equal(await fs.readFile(file.file, 'utf8'), file.content);
      assert.deepEqual((await fs.readdir(dir)).filter(name => name.endsWith('.tmp')), []);
    });
  }
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
  const confirmation = document.getElementById('apply-dialog');
  assert.equal(confirmation.getAttribute('aria-labelledby'), 'confirm-title');
  assert.equal(confirmation.getAttribute('aria-describedby'), 'confirm-description');
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
  // Preview the chosen variant in both site frames without applying or generating again.
  const selectedSource = document.getElementById('preview-image').src;
  const previewMode = document.getElementById('preview-mode');
  previewMode.value = 'card';
  previewMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok(document.getElementById('photo-comparison').classList.contains('site-card-preview'));
  assert.equal(document.getElementById('zoom').disabled, true);
  previewMode.value = 'hero';
  previewMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok(document.getElementById('photo-comparison').classList.contains('site-hero-preview'));
  assert.equal(document.getElementById('preview-image').src, selectedSource);
  assert.equal((await library.photo(originalId)).active, 'original.png');
  assert.equal((await library.jobs()).length, 1);
  previewMode.value = 'full';
  previewMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.ok(!document.getElementById('photo-comparison').classList.contains('site-card-preview'));
  assert.ok(!document.getElementById('photo-comparison').classList.contains('site-hero-preview'));
  assert.equal(document.getElementById('zoom').disabled, false);
  const codexRadio = document.querySelector('input[value=codex]'); codexRadio.checked = true;
  codexRadio.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const instructions = document.getElementById('instructions'); instructions.value = 'Bewaar de rumfles.';
  instructions.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.ok(document.getElementById('prompt-preview').textContent.includes('Bewaar de rumfles.'));
  assert.equal(document.getElementById('ai-options').hidden, false);
  document.getElementById('add-gallery').click();
  const addedDeadline = Date.now() + 5000;
  while (!document.getElementById('add-gallery').disabled && Date.now() < addedDeadline) await new Promise(resolve => setTimeout(resolve, 20));
  while ((await library.photo(originalId)).gallery.length < 3 && Date.now() < addedDeadline) await new Promise(resolve => setTimeout(resolve, 20));
  while (document.querySelectorAll('.gallery-item').length < 3 && Date.now() < addedDeadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(document.querySelectorAll('.gallery-item').length, 3);
  assert.equal((await library.photo(originalId)).active, 'original.png');
  assert.equal(document.getElementById('add-gallery').disabled, true);
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
  url.search = new URLSearchParams({ photo: originalId, variant: `job:${job.id}`, view: 'hero' });
  const first = await open(url.href);
  const { document } = first.window;
  assert.equal(document.getElementById('photo-filename').textContent, 'original.png');
  assert.equal(document.getElementById('preview-label').textContent, 'Fotocorrectie');
  assert.equal(document.getElementById('preview-mode').value, 'hero');
  assert.ok(document.getElementById('photo-comparison').classList.contains('site-hero-preview'));
  const selectedSource = document.getElementById('preview-image').src;
  const reloaded = await open(first.window.location.href);
  assert.equal(reloaded.window.document.getElementById('preview-image').src, selectedSource);
  assert.equal(reloaded.window.document.getElementById('preview-mode').value, 'hero');
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

test('gallery additions, hero choice, ordering and removal persist in all locales without deleting files', async t => {
  const { library, dir, original } = await fixture(t);
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const before = await fs.readFile(original);
  const [job] = await queue.enqueue(request()); await finished(library, [job.id]);
  const added = await library.gallery({ photoId: originalId, action: 'add', imageId: `job:${job.id}` });
  assert.equal(added.locales, 2);
  assert.deepEqual(added.images, ['original.png', 'extra.png', added.filename]);
  await library.gallery({ photoId: originalId, action: 'add', imageId: `job:${job.id}` });
  assert.equal((await library.photo(originalId)).gallery.length, 3);
  const moved = await library.gallery({ photoId: originalId, action: 'move', filename: added.filename, direction: -1 });
  assert.deepEqual(moved.images, ['original.png', added.filename, 'extra.png']);
  const promoted = await library.gallery({ photoId: originalId, action: 'hero', filename: added.filename });
  assert.deepEqual(promoted.images, [added.filename, 'original.png', 'extra.png']);
  const changed = await library.gallery({ photoId: originalId, action: 'remove', filename: added.filename });
  assert.deepEqual(changed.images, ['original.png', 'extra.png']);
  await fs.access(path.join(dir, 'images', added.filename));
  assert.deepEqual(await fs.readFile(original), before);
  for (const locale of ['nl', 'en']) {
    const content = await fs.readFile(path.join(dir, `index.${locale}.md`), 'utf8');
    assert.deepEqual(matter(content).data.images, ['original.png', 'extra.png']);
    assert.ok(content.endsWith('\n\nLaat de recepttekst exact staan.\n'));
  }
  await library.gallery({ photoId: originalId, action: 'remove', filename: 'extra.png' });
  await assert.rejects(library.gallery({ photoId: originalId, action: 'remove', filename: 'original.png' }), /minstens/);
  await assert.rejects(library.gallery({ photoId: originalId, action: 'hero', filename: '../outside.png' }), /niet in deze galerij/);
  await assert.rejects(library.gallery({ photoId: originalId, action: 'move', filename: 'original.png', direction: 1 }), /niet verder/);
  await assert.rejects(library.gallery({ photoId: originalId, action: 'move', filename: 'original.png', direction: 12 }), /Ongeldige/);
  assert.equal((await library.photo(originalId)).active, 'original.png');
});

test('gallery actions intentionally synchronize divergent locale lists using the Dutch gallery', async t => {
  for (const action of ['add', 'hero', 'remove', 'move', 'apply']) {
    await t.test(action, async t => {
      const { library, dir, original } = await fixture(t);
      await fs.copyFile(original, path.join(dir, 'images/original-artistic.png'));
      const enFile = path.join(dir, 'index.en.md');
      await fs.writeFile(enFile, (await fs.readFile(enFile, 'utf8')).replace('extra.png', 'english-only.png'));
      if (action === 'apply') await library.apply(originalId, 'mousse/original-artistic.png');
      else await library.gallery({ photoId: originalId, action, imageId: 'mousse/original-artistic.png', filename: 'extra.png', direction: -1 });
      const expected = {
        add: ['original.png', 'extra.png', 'original-artistic.png'],
        hero: ['extra.png', 'original.png'],
        remove: ['original.png'],
        move: ['extra.png', 'original.png'],
        apply: ['original-artistic.png', 'extra.png'],
      }[action];
      for (const locale of ['nl', 'en']) {
        const content = await fs.readFile(path.join(dir, `index.${locale}.md`), 'utf8');
        assert.deepEqual(matter(content).data.images, expected);
        assert.ok(content.endsWith('\n\nLaat de recepttekst exact staan.\n'));
      }
    });
  }
});

test('gallery endpoint requires a token and rejects unrelated image references', async t => {
  const { post, library } = await runningStudio(t);
  assert.equal((await post('/api/gallery', { photoId: originalId, action: 'remove', filename: 'extra.png' }, { 'X-Studio-Token': 'wrong' })).status, 403);
  assert.equal((await post('/api/gallery', { photoId: originalId, action: 'add', imageId: 'mousse/extra.png' })).status, 400);
  const response = await post('/api/gallery', { photoId: originalId, action: 'hero', filename: 'extra.png' });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).images, ['extra.png', 'original.png']);
  assert.equal((await library.photo(originalId)).active, 'extra.png');
});

test('homepage highlights persist variant files independently of recipe galleries and support ordering/removal', async t => {
  const { library, dir, root } = await fixture(t);
  const before = await fs.readFile(path.join(dir, 'index.nl.md'));
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const [job] = await queue.enqueue(request()); await finished(library, [job.id]);
  const added = await library.highlights({ action: 'add', photoId: originalId, imageId: `job:${job.id}` });
  const first = added.slides[0];
  assert.match(first.filename, /^original-enhanced-/);
  await fs.access(path.join(dir, 'images', first.filename));
  await library.highlights({ action: 'add', photoId: originalId, imageId: `job:${job.id}` });
  assert.equal((await library.readHighlights()).length, 1);
  await library.highlights({ action: 'add', photoId: originalId, imageId: originalId });
  const moved = await library.highlights({ action: 'move', ...first, direction: 1 });
  assert.equal(moved.slides[0].filename, 'original.png');
  await assert.rejects(library.highlights({ action: 'move', ...first, direction: 1 }), /niet verder/);
  const reopened = new Library(root, path.join(root, '.new-history'));
  assert.deepEqual(await reopened.readHighlights(), moved.slides);
  assert.equal((await reopened.catalog()).highlights[1].title, 'Mousse & rum');
  await library.highlights({ action: 'remove', ...first });
  await fs.access(path.join(dir, 'images', first.filename));
  assert.deepEqual(await fs.readFile(path.join(dir, 'index.nl.md')), before);

  for (let i = 0; i < 4; i++) {
    await fs.copyFile(path.join(dir, 'images/original.png'), path.join(dir, `images/extra-${i}.png`));
    await library.highlights({ action: 'add', photoId: `mousse/extra-${i}.png`, imageId: `mousse/extra-${i}.png` });
  }
  await assert.rejects(library.highlights({ action: 'add', photoId: 'mousse/extra.png', imageId: 'mousse/extra.png' }), /maximaal vijf/);
  await assert.rejects(library.highlights({ action: 'remove', slug: 'mousse', filename: '../private.png' }), /niet in/);
  await fs.writeFile(path.join(dir, 'index.nl.md'), (await fs.readFile(path.join(dir, 'index.nl.md'), 'utf8')).replace('slug: mousse', 'slug: mousse\nstatus: draft'));
  await assert.rejects(library.highlights({ action: 'add', photoId: originalId, imageId: originalId }), /Publiceer/);
});

test('homepage editor can select, reorder and remove highlights with authenticated endpoints', async t => {
  const { origin, post, library } = await runningStudio(t);
  assert.equal((await post('/api/highlights', { action: 'add', photoId: originalId, imageId: originalId }, { 'X-Studio-Token': 'wrong' })).status, 403);
  assert.equal((await post('/api/highlights', { action: 'add', photoId: originalId, imageId: 'mousse/extra.png' })).status, 400);
  const dom = new JSDOM(await (await fetch(origin + '/')).text(), { url: origin + '/?photo=' + encodeURIComponent(originalId), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
  dom.window.sharedBuildPrompt = buildPrompt;
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
  const doc = dom.window.document;
  doc.getElementById('add-highlight').click();
  const waitFor = async predicate => {
    const deadline = Date.now() + 3000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(predicate());
  };
  await waitFor(() => doc.getElementById('highlight-count').textContent === '1 / 5 foto’s' && doc.getElementById('add-highlight').disabled);
  assert.equal((await library.readHighlights())[0].filename, 'original.png');
  const second = await post('/api/highlights', { action: 'add', photoId: 'mousse/extra.png', imageId: 'mousse/extra.png' });
  assert.equal(second.status, 200);
  const moved = await post('/api/highlights', { action: 'move', slug: 'mousse', filename: 'extra.png', direction: -1 });
  assert.equal((await moved.json()).slides[0].filename, 'extra.png');
  doc.querySelector('#highlights button[aria-label^="Uit carousel verwijderen"]').click();
  await waitFor(() => doc.getElementById('highlight-count').textContent === '1 / 5 foto’s' && !doc.getElementById('add-highlight').disabled);
  assert.deepEqual((await library.readHighlights()).map(s => s.filename), ['extra.png']);
});

test('desktop carousel position survives reload and reordering and resets without touching photo bytes or recipe metadata', async t => {
  const { library, root, dir, original } = await fixture(t);
  const imageBefore = await fs.readFile(original);
  const recipeBefore = await fs.readFile(path.join(dir, 'index.nl.md'));
  await library.highlights({ action: 'add', photoId: originalId, imageId: originalId });
  await library.highlights({ action: 'add', photoId: 'mousse/extra.png', imageId: 'mousse/extra.png' });
  const reference = { slug: 'mousse', filename: 'original.png' };
  await library.highlights({ action: 'position', ...reference, desktopPosition: { x: 25, y: 80 } });
  await library.highlights({ action: 'move', ...reference, direction: 1 });
  assert.deepEqual((await new Library(root).readHighlights())[1].desktopPosition, { x: 25, y: 80 });
  for (const desktopPosition of [{ x: -1, y: 0 }, { x: 50, y: 101 }, { x: '50', y: 50 }, { x: 0 }, undefined]) {
    await assert.rejects(library.highlights({ action: 'position', ...reference, desktopPosition }), /Ongeldige desktopuitsnede/);
  }
  assert.deepEqual(await fs.readFile(original), imageBefore);
  assert.deepEqual(await fs.readFile(path.join(dir, 'index.nl.md')), recipeBefore);
  await library.highlights({ action: 'position', ...reference, desktopPosition: null });
  assert.equal((await library.readHighlights())[1].desktopPosition, undefined);
});

test('card crops are per active photo, preserve originals and carousel, and can be reset', async t => {
  const { library, dir, root, original } = await fixture(t);
  const imageBefore = await fs.readFile(original);
  const recipeBefore = await fs.readFile(path.join(dir, 'index.nl.md'));
  await library.highlights({ action: 'add', photoId: originalId, imageId: originalId });
  const highlightsBefore = await library.readHighlights();
  const crop = { ratio: '4:3', x: 20, y: 70, zoom: 1.5 };
  await library.cardCrop({ photoId: originalId, filename: 'original.png', crop });
  const reopened = new Library(root);
  assert.deepEqual((await reopened.photo(originalId)).cardCrop, { slug: 'mousse', filename: 'original.png', ...crop });
  assert.deepEqual(await library.readHighlights(), highlightsBefore);
  assert.deepEqual(await fs.readFile(original), imageBefore);
  assert.deepEqual(await fs.readFile(path.join(dir, 'index.nl.md')), recipeBefore);
  for (const invalid of [{ ...crop, ratio: 'bad' }, { ...crop, x: -1 }, { ...crop, zoom: 0.5 }, { ...crop, zoom: 20 }]) await assert.rejects(library.cardCrop({ photoId: originalId, filename: 'original.png', crop: invalid }), /Ongeldige/);
  await assert.rejects(library.cardCrop({ photoId: originalId, filename: '../private.png', crop }), /hoofdfoto is gewijzigd/);
  await library.gallery({ photoId: originalId, action: 'hero', filename: 'extra.png' });
  assert.equal((await library.photo(originalId)).cardCrop, null);
  await library.gallery({ photoId: originalId, action: 'hero', filename: 'original.png' });
  assert.equal((await library.photo(originalId)).cardCrop.zoom, 1.5);
  await library.cardCrop({ photoId: originalId, filename: 'original.png', crop: null });
  assert.equal((await reopened.photo(originalId)).cardCrop, null);
});

test('card crop endpoints require a token and retain carousel zoom through reordering', async t => {
  const { post, library } = await runningStudio(t);
  const body = { photoId: originalId, filename: 'original.png', crop: { ratio: '1:1', x: 50, y: 50, zoom: 2 } };
  assert.equal((await post('/api/card-crop', body, { 'X-Studio-Token': 'wrong' })).status, 403);
  assert.equal((await post('/api/card-crop', body)).status, 200);
  assert.equal((await library.photo(originalId)).cardCrop.zoom, 2);
  await library.highlights({ action: 'add', photoId: originalId, imageId: originalId });
  await library.highlights({ action: 'add', photoId: 'mousse/extra.png', imageId: 'mousse/extra.png' });
  const reference = { slug: 'mousse', filename: 'original.png' };
  await library.highlights({ action: 'position', ...reference, desktopPosition: { x: 20, y: 30, zoom: 2 } });
  await library.highlights({ action: 'move', ...reference, direction: 1 });
  assert.equal((await library.readHighlights())[1].desktopPosition.zoom, 2);
  await assert.rejects(library.highlights({ action: 'position', ...reference, desktopPosition: { x: 20, y: 30, zoom: 5 } }), /Ongeldige/);
});

test('crop dialogs close after saving, recover an expired token and show failures inside the dialog', async t => {
  const { origin, library } = await runningStudio(t);
  await library.highlights({ action: 'add', photoId: originalId, imageId: originalId });
  const dom = new JSDOM(await (await fetch(origin + '/')).text(), { url: origin + '/?photo=' + encodeURIComponent(originalId), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  let expired = true; let fail = false; let configRequests = 0;
  dom.window.fetch = (url, options) => {
    if (url === '/api/config') configRequests++;
    if (url === '/api/card-crop' && expired) { expired = false; return Promise.resolve(Response.json({ error: 'Ververs de pagina om opnieuw te verbinden.' }, { status: 403 })); }
    if (url === '/api/card-crop' && fail) return Promise.resolve(Response.json({ error: 'Opslaan mislukt — probeer opnieuw.' }, { status: 400 }));
    return fetch(new URL(url, origin), options);
  };
  dom.window.sharedBuildPrompt = buildPrompt;
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
  const doc = dom.window.document;
  const waitFor = async predicate => {
    const deadline = Date.now() + 3000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(predicate());
  };
  doc.getElementById('card-crop').click();
  assert.ok(doc.getElementById('crop-dialog').open);
  doc.getElementById('crop-save').click();
  await waitFor(() => !doc.getElementById('crop-dialog').open && !doc.getElementById('crop-save').disabled);
  assert.equal(configRequests, 2);
  assert.ok((await library.photo(originalId)).cardCrop);
  const highlightButton = () => doc.querySelector('#highlights button[aria-label^="Carouseluitsnede"]');
  assert.equal(highlightButton().disabled, false);

  fail = true;
  doc.getElementById('card-crop').click(); doc.getElementById('crop-save').click();
  await waitFor(() => !doc.getElementById('crop-error').hidden && !doc.getElementById('crop-save').disabled);
  assert.ok(doc.getElementById('crop-dialog').open);
  assert.match(doc.getElementById('crop-error').textContent, /Opslaan mislukt/);
  fail = false; doc.getElementById('crop-save').click();
  await waitFor(() => !doc.getElementById('crop-dialog').open && !doc.getElementById('crop-save').disabled);
  highlightButton().click();
  doc.getElementById('crop-zoom-in').click();
  doc.getElementById('crop-save').click();
  await waitFor(() => !doc.getElementById('crop-dialog').open && !doc.getElementById('crop-save').disabled);
  assert.equal((await library.readHighlights())[0].desktopPosition.zoom, 1.15);
  const cardBefore = (await library.photo(originalId)).cardCrop;
  doc.getElementById('preview-mode').value = 'hero';
  doc.getElementById('preview-mode').dispatchEvent(new dom.window.Event('change'));
  assert.equal(doc.getElementById('card-crop').textContent, 'Receptuitsnede — grote foto');
  doc.getElementById('card-crop').click();
  assert.match(doc.getElementById('crop-eyebrow').textContent, /RECEPTUITSNEDE/);
  doc.getElementById('crop-save').click();
  await waitFor(() => !doc.getElementById('crop-dialog').open && !doc.getElementById('crop-save').disabled);
  assert.ok((await library.photo(originalId)).recipeCrop);
  assert.deepEqual((await library.photo(originalId)).cardCrop, cardBefore);
});

test('free card ratios and their unlocked mode survive saving and reject invalid ratios', async t => {
  const { library } = await fixture(t);
  const crop = { ratio: '0.563721:1', x: 30, y: 40, zoom: 1.2, free: true };
  await library.cardCrop({ photoId: originalId, filename: 'original.png', crop });
  const saved = (await library.photo(originalId)).cardCrop;
  assert.equal(saved.ratio, crop.ratio); assert.equal(saved.free, true);
  for (const ratio of ['0:1', '1:0', '-1:1', 'auto', '1 / 1', 'NaN:1', '1:1;background:red']) {
    await assert.rejects(library.cardCrop({ photoId: originalId, filename: 'original.png', crop: { ...crop, ratio } }), /Ongeldige/);
  }
  assert.equal((await library.photo(originalId)).cardCrop.ratio, crop.ratio);
});

test('recipe crops are independent of card and carousel crops and bind to the active recipe photo', async t => {
  const { post, library, dir } = await runningStudio(t);
  const before = await fs.readFile(path.join(dir, 'index.nl.md'));
  const crop = { ratio: '0.7:1', x: 30, y: 60, zoom: 1.3, free: true };
  const reference = { photoId: originalId, filename: 'original.png' };
  await library.cardCrop({ ...reference, crop: { ...crop, ratio: '4:3' } });
  assert.equal((await post('/api/recipe-crop', { ...reference, crop }, { 'X-Studio-Token': 'bad' })).status, 403);
  assert.equal((await post('/api/recipe-crop', { ...reference, crop })).status, 200);
  const photo = await library.photo(originalId);
  assert.equal(photo.recipeCrop.ratio, '0.7:1');
  assert.equal(photo.cardCrop.ratio, '4:3');
  assert.equal((await library.readHighlights()).length, 0);
  assert.deepEqual(await fs.readFile(path.join(dir, 'index.nl.md')), before);
  await library.gallery({ photoId: originalId, action: 'hero', filename: 'extra.png' });
  assert.equal((await library.photo(originalId)).recipeCrop, null);
  await library.gallery({ photoId: originalId, action: 'hero', filename: 'original.png' });
  await library.recipeCrop({ ...reference, crop: null });
  assert.equal((await library.photo(originalId)).recipeCrop, null);
  assert.equal((await library.photo(originalId)).cardCrop.ratio, '4:3');

});

test('cropping an unselected site variant stores its own crop without changing the site photo', async t => {
  const { origin, library, queue } = await runningStudio(t);
  const [job] = await queue.enqueue(request()); await finished(library, [job.id]);
  const before = (await library.photo(originalId)).active;
  const url = origin + '/?' + new URLSearchParams({ photo: originalId, variant: `job:${job.id}`, view: 'hero' });
  const dom = new JSDOM(await (await fetch(origin + '/')).text(), { url, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
  dom.window.sharedBuildPrompt = buildPrompt;
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
  const doc = dom.window.document;
  doc.getElementById('card-crop').click();
  assert.equal(new URL(doc.getElementById('crop-image').src).searchParams.get('id'), `job:${job.id}`);
  doc.getElementById('crop-save').click();
  const deadline = Date.now() + 3000;
  while ((doc.getElementById('crop-dialog').open || doc.getElementById('crop-save').disabled) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(doc.getElementById('crop-dialog').open, false);
  const photo = await library.photo(originalId);
  assert.equal(photo.active, before);
  assert.equal(photo.recipeCrop, null);
  const exported = photo.variants.find(v => v.id === `job:${job.id}`).appliedFilename;
  assert.equal(photo.crops.recipe[0].filename, exported);
  assert.match(doc.getElementById('toast').textContent, /geselecteerde variant/);
  assert.equal(doc.querySelector('.variant-delete').disabled, false);
  await library.apply(originalId, `job:${job.id}`);
  assert.equal((await library.photo(originalId)).recipeCrop.filename, exported);
});

test('originals with variant-like filenames cannot be listed or deleted as variants', async t => {
  const { library, dir, original } = await fixture(t);
  const filename = 'original-enhanced-detail.png';
  const imageId = `mousse/${filename}`;
  const secondOriginal = path.join(dir, 'images', filename);
  await fs.copyFile(original, secondOriginal);
  const before = await fs.readFile(secondOriginal);
  const catalog = await library.catalog();
  const photo = catalog.photos.find(p => p.id === originalId);
  assert.ok(catalog.photos.some(p => p.id === imageId));
  assert.ok(!photo.variants.some(v => v.id === imageId));
  await assert.rejects(library.deleteVariant({ photoId: originalId, imageId }), /niet gevonden/);
  // Server protection also rejects an original if stale or malformed variant metadata exposes it.
  photo.variants.push({ id: imageId, filename, kind: 'existing' });
  t.mock.method(library, 'catalog', async () => catalog);
  await assert.rejects(library.deleteVariant({ photoId: originalId, imageId }), /Originele/);
  assert.deepEqual(await fs.readFile(secondOriginal), before);
  assert.deepEqual(await fs.readFile(original), before);
});

test('deleting an unused generated variant archives its job and exported copy while preserving originals', async t => {
  const { library, original, dir } = await fixture(t);
  const before = await fs.readFile(original);
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const [job] = await queue.enqueue(request()); await finished(library, [job.id]);
  const saved = await library.cardCrop({ photoId: originalId, imageId: `job:${job.id}`, crop: { ratio: '4:3', x: 50, y: 40 } });
  const output = await fs.readFile((await library.image(`job:${job.id}`)).file);
  const result = await library.deleteVariant({ photoId: originalId, imageId: `job:${job.id}` });
  assert.equal(result.deleted, true);
  assert.equal((await library.photo(originalId)).variants.length, 0);
  assert.equal((await library.jobs()).length, 0);
  await assert.rejects(fs.access(path.join(dir, 'images', saved.filename)));
  const trash = path.join(library.dataRoot, 'trash', result.trashId);
  assert.deepEqual(await fs.readFile(path.join(trash, 'job', 'enhanced.jpg')), output);
  assert.deepEqual(await fs.readFile(path.join(trash, 'images', saved.filename)), output);
  assert.equal(JSON.parse(await fs.readFile(path.join(trash, 'manifest.json'), 'utf8')).imageId, `job:${job.id}`);
  assert.deepEqual(await fs.readFile(original), before);
  await fs.access(path.join(dir, 'images/extra.png'));
  await assert.rejects(library.deleteVariant({ photoId: originalId, imageId: originalId }), /Originele/);
  await assert.rejects(library.deleteVariant({ photoId: originalId, imageId: 'mousse/extra.png' }), /niet gevonden/);
});

test('deleting variants is blocked by every locale, carousel membership and active edits', async t => {
  const { library, dir } = await fixture(t);
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const [job] = await queue.enqueue(request()); await finished(library, [job.id]);
  const reference = { photoId: originalId, imageId: `job:${job.id}` };
  const applied = await library.apply(originalId, reference.imageId);
  await assert.rejects(library.deleteVariant(reference), /receptgalerij/);
  await library.apply(originalId, originalId);
  const enFile = path.join(dir, 'index.en.md');
  const en = await fs.readFile(enFile, 'utf8');
  await fs.writeFile(enFile, en.replace('"original.png"', JSON.stringify(applied.filename)));
  await assert.rejects(library.deleteVariant(reference), /receptgalerij/);
  await fs.writeFile(enFile, en);
  await library.highlights({ ...reference, action: 'add' });
  await assert.rejects(library.deleteVariant(reference), /homepagecarousel/);
  await library.highlights({ action: 'remove', slug: 'mousse', filename: applied.filename });
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const active = new JobQueue(library, async ({ signal }) => {
    started();
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }));
  }); t.after(() => active.stop());
  const [edit] = await active.enqueue(request({ mode: 'codex', baseId: reference.imageId }));
  await ready;
  await assert.rejects(library.deleteVariant(reference), /lopende bewerking/);
  await active.cancel(edit.id);
  await finished(library, [edit.id]);
  assert.equal((await library.deleteVariant(reference)).deleted, true);
});

test('delete endpoint requires authentication and supports existing generated files without local history', async t => {
  const { post, library, dir, original } = await runningStudio(t);
  await fs.copyFile(original, path.join(dir, 'images/original-artistic.png'));
  const reference = { photoId: originalId, imageId: 'mousse/original-artistic.png' };
  assert.equal((await post('/api/delete-variant', reference, { 'X-Studio-Token': 'bad' })).status, 403);
  assert.equal((await post('/api/delete-variant', { photoId: originalId, imageId: '../private.png' })).status, 400);
  assert.equal((await post('/api/delete-variant', reference)).status, 200);
  assert.equal((await library.photo(originalId)).variants.length, 0);
  await fs.access(original);
});

test('highlight, gallery, apply and restore actions reenable controls after refreshing', async t => {
  const { origin } = await runningStudio(t);
  const dom = new JSDOM(await (await fetch(origin + '/')).text(), { url: origin + '/?photo=' + encodeURIComponent(originalId), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
  dom.window.sharedBuildPrompt = buildPrompt;
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
  const doc = dom.window.document;
  const waitFor = async predicate => {
    const deadline = Date.now() + 3000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(predicate());
  };
  const enabled = selector => [...doc.querySelectorAll(selector)].some(button => !button.disabled);
  const controlsReady = () => !doc.getElementById('recipe-crop').disabled && enabled('#site-gallery .gallery-actions button') && enabled('#highlights .gallery-actions button');
  doc.getElementById('add-highlight').click();
  await waitFor(controlsReady);
  doc.querySelector('#site-gallery button[title="Naar achteren"]').click();
  await waitFor(controlsReady);
  assert.equal(doc.querySelector('#site-gallery .gallery-image img').src.includes('extra.png'), true);
  const confirm = async filename => {
    await waitFor(() => doc.getElementById('apply-dialog').open);
    const dialog = doc.getElementById('apply-dialog');
    dialog.returnValue = 'apply'; dialog.open = false;
    dialog.dispatchEvent(new dom.window.Event('close'));
    await waitFor(() => doc.querySelector('#site-gallery .gallery-image img').src.includes(filename) && controlsReady());
  };
  doc.getElementById('restore').click(); await confirm('original.png');
  doc.querySelectorAll('#site-gallery .gallery-image')[1].click();
  doc.getElementById('apply').click(); await confirm('extra.png');
});

test('free selection resizes width independently, while presets lock proportions and persist after saving', async t => {
  const { origin, library } = await runningStudio(t);
  const dom = new JSDOM(await (await fetch(origin + '/')).text(), { url: origin + '/?photo=' + encodeURIComponent(originalId), runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  dom.window.HTMLElement.prototype.setPointerCapture = function () {};
  dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
  dom.window.sharedBuildPrompt = buildPrompt;
  const source = await fs.readFile(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
  await dom.window.eval(`(async () => { ${source.replace("import { buildPrompt } from '/prompts.mjs';", 'const buildPrompt = window.sharedBuildPrompt;')} })()`);
  const doc = dom.window.document;
  const image = doc.getElementById('crop-source-image');
  Object.defineProperties(image, { naturalWidth: { value: 400, configurable: true }, naturalHeight: { value: 400, configurable: true } });
  const stage = doc.getElementById('crop-source');
  stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });
  const pointer = (element, type, x, y) => element.dispatchEvent(new dom.window.PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
  const waitForClose = async () => {
    const deadline = Date.now() + 3000;
    while ((doc.getElementById('crop-dialog').open || doc.getElementById('crop-save').disabled) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(doc.getElementById('crop-dialog').open, false);
  };
  doc.getElementById('card-crop').click();
  assert.equal(doc.getElementById('crop-ratio').value, 'free');
  pointer(doc.getElementById('crop-handle-right'), 'pointerdown', 400, 200);
  pointer(stage, 'pointermove', 200, 200); pointer(stage, 'pointerup', 200, 200);
  assert.equal(doc.getElementById('crop-selection').style.width, '50%');
  assert.equal(doc.getElementById('crop-selection').style.height, '100%');
  doc.getElementById('crop-save').click(); await waitForClose();
  assert.equal((await library.photo(originalId)).cardCrop.ratio, '0.5:1');
  doc.getElementById('card-crop').click();
  assert.equal(doc.getElementById('crop-ratio').value, 'free');
  doc.getElementById('crop-ratio').value = '4:3';
  doc.getElementById('crop-ratio').dispatchEvent(new dom.window.Event('change'));
  assert.ok(doc.getElementById('crop-handle-right').hidden);
  pointer(doc.getElementById('crop-handle'), 'pointerdown', 400, 350);
  pointer(stage, 'pointermove', 300, 275); pointer(stage, 'pointerup', 300, 275);
  const selection = doc.getElementById('crop-selection');
  assert.ok(Math.abs(parseFloat(selection.style.width) / parseFloat(selection.style.height) - 4 / 3) < .001);
  doc.getElementById('crop-save').click(); await waitForClose();
  assert.equal((await library.photo(originalId)).cardCrop.ratio, '4:3');
  doc.getElementById('card-crop').click();
  doc.getElementById('crop-ratio').value = 'original';
  doc.getElementById('crop-ratio').dispatchEvent(new dom.window.Event('change'));
  doc.getElementById('crop-save').click(); await waitForClose();
  assert.equal((await library.photo(originalId)).cardCrop.free, false);
  doc.getElementById('card-crop').click();
  assert.equal(doc.getElementById('crop-ratio').value, '1:1');
  assert.ok(doc.getElementById('crop-handle-right').hidden);
  doc.getElementById('crop-cancel').click();
  Object.defineProperties(image, { naturalWidth: { value: 96, configurable: true }, naturalHeight: { value: 64, configurable: true } });
  doc.getElementById('card-crop').click();
  doc.getElementById('crop-ratio').value = 'original';
  doc.getElementById('crop-ratio').dispatchEvent(new dom.window.Event('change'));
  doc.getElementById('crop-save').click(); await waitForClose();
  doc.getElementById('card-crop').click();
  assert.equal(doc.getElementById('crop-ratio').value, '1.5:1');
  assert.ok(doc.getElementById('crop-handle-right').hidden);
  assert.ok(doc.getElementById('crop-handle-bottom').hidden);
  doc.getElementById('crop-save').click(); await waitForClose();
  assert.equal((await library.photo(originalId)).cardCrop.free, false);
});

test('failed variant archiving rolls previously moved image files back into place', async t => {
  const { library, dir } = await fixture(t);
  const queue = new JobQueue(library); t.after(() => queue.stop());
  const [job] = await queue.enqueue(request()); await finished(library, [job.id]);
  const imageId = `job:${job.id}`;
  const saved = await library.cardCrop({ photoId: originalId, imageId, crop: { ratio: '1:1', x: 50, y: 50 } });
  const rename = fs.rename;
  t.mock.method(fs, 'rename', async (source, target) => {
    if (source === library.jobDir(job.id)) throw new Error('simulated archive failure');
    return rename(source, target);
  });
  await assert.rejects(library.deleteVariant({ photoId: originalId, imageId }), /simulated archive failure/);
  await fs.access(path.join(dir, 'images', saved.filename));
  await fs.access((await library.image(imageId)).file);
  assert.equal((await library.photo(originalId)).variants.length, 1);
});
