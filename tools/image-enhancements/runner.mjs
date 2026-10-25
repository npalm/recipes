import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { buildPrompt } from './prompts.mjs';
import { inside } from './library.mjs';

export function codexStatus(binary = process.env.IMAGE_STUDIO_CODEX || 'codex') {
  const result = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 5000, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  return { available: result.status === 0, version: result.status === 0 ? result.stdout.trim() : null };
}

export function validateRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ongeldige opdracht.');
  const { photoId, baseId, mode = 'local', instructions = '', preserve = '', style = 'subtle', count = 1 } = input;
  if (typeof photoId !== 'string' || typeof baseId !== 'string') throw new Error('Kies een originele foto en een basisfoto.');
  if (!['local', 'codex'].includes(mode)) throw new Error('Onbekende bewerking.');
  if (!['subtle', 'editorial'].includes(style)) throw new Error('Onbekende stijl.');
  if (typeof instructions !== 'string' || instructions.length > 4000 || typeof preserve !== 'string' || preserve.length > 1000) throw new Error('Instructies zijn te lang.');
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new Error('Kies 1 tot 4 varianten.');
  const supplied = input.settings ?? {};
  const settings = {};
  for (const [key, fallback, min, max] of [['brightness', 1.03, 0.7, 1.3], ['saturation', 1.02, 0.5, 1.5], ['contrast', 1.03, 0.8, 1.25], ['sharpness', 0.4, 0, 2]]) {
    const value = supplied[key] ?? fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Ongeldige instelling: ${key}.`);
    settings[key] = value;
  }
  return { photoId, baseId, mode, instructions: instructions.trim(), preserve: preserve.trim(), style, count, settings };
}

export async function localEnhance(input, output, settings) {
  let image = sharp(input).rotate().toColourspace('srgb')
    .modulate({ brightness: settings.brightness, saturation: settings.saturation })
    .linear(settings.contrast, 128 * (1 - settings.contrast));
  if (settings.sharpness > 0) image = image.sharpen({ sigma: 0.5 + settings.sharpness / 2, m1: settings.sharpness, m2: settings.sharpness });
  await image.jpeg({ quality: 95, mozjpeg: true }).toFile(output);
}

export async function codexEnhance({ directory, original, base, prompt, signal, onProgress, binary = process.env.IMAGE_STUDIO_CODEX || 'codex' }) {
  // No shell: user instructions and filenames remain data, never command text.
  const args = ['exec', '--ephemeral', '--json', '--sandbox', 'workspace-write', '--skip-git-repo-check', '--cd', directory,
    '--image', original];
  if (base !== original) args.push('--image', base);
  args.push('-');
  const task = [
    '$imagegen', prompt,
    'Execution requirements: use the built-in image editor. Do not use the API, install packages, spawn subagents, or modify any project files.',
    'Save exactly one final edited raster image in the working directory as result.png (or result.jpg/webp). If the built-in tool saves elsewhere, copy its output here. Do not change input files. Do not substitute the original or use code to fake an AI edit.',
    'If the built-in tool is unavailable, report that clearly and do not create a result file.',
  ].join('\n\n');
  await fs.writeFile(path.join(directory, 'prompt.txt'), task);
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: directory, shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let settled = false;
    let buffer = '';
    let diagnostic = '';
    let stoppedReason;
    let forceTimer;
    const stop = reason => {
      stoppedReason = reason;
      const kill = signal => {
        try { if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal); } catch { /* Already stopped. */ }
      };
      kill('SIGTERM');
      forceTimer = setTimeout(() => kill('SIGKILL'), 3000);
      forceTimer.unref();
    };
    const abort = () => stop('Opdracht geannuleerd.');
    const timer = setTimeout(() => stop('Codex heeft na 15 minuten geen foto opgeleverd.'), 15 * 60 * 1000);
    const cleanup = () => { clearTimeout(timer); clearTimeout(forceTimer); signal?.removeEventListener('abort', abort); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.on('data', data => {
      buffer += data.toString();
      // Image tool events can be large. Only surface concise text events.
      if (buffer.length > 1024 * 1024) buffer = buffer.slice(-8192);
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        try {
          const event = JSON.parse(line);
          if (event.type === 'error' || event.type === 'turn.failed') diagnostic = String(event.message || event.error?.message || 'Codex-opdracht mislukt.').slice(-2000);
          if (event.item?.type === 'agent_message' && event.item.text) onProgress(String(event.item.text).slice(0, 800));
        } catch { /* Partial or non-JSON diagnostic. */ }
      }
    });
    child.stderr.on('data', data => { diagnostic = (diagnostic + data.toString()).slice(-2000); });
    child.stdin.on('error', () => { /* Process error is handled below. */ });
    child.stdin.end(task);
    child.on('error', error => {
      if (settled) return; settled = true; cleanup();
      reject(new Error(error.code === 'ENOENT' ? 'Codex CLI niet gevonden. Installeer Codex en voer codex login uit.' : error.message));
    });
    child.on('close', async code => {
      if (settled) return; settled = true; cleanup();
      if (stoppedReason) return reject(new Error(stoppedReason));
      if (code !== 0) return reject(new Error(`Codex is gestopt (${code}). ${diagnostic || 'Controleer codex login in je terminal.'}`));
      try {
        const name = (await fs.readdir(directory)).find(name => /^result\.(png|jpe?g|webp)$/i.test(name));
        if (!name) throw new Error(`Codex leverde geen beeldbestand op. ${diagnostic || 'Controleer of beeldgeneratie beschikbaar is voor je Codex-account.'}`);
        resolve(await inside(directory, path.join(directory, name)));
      } catch (error) { reject(error); }
    });
  });
}

export class JobQueue {
  constructor(library, generate = codexEnhance) {
    this.library = library;
    this.generate = generate;
    this.pending = [];
    this.current = null;
    this.stopping = false;
  }

  async enqueue(raw) {
    if (this.stopping) throw new Error('De tool wordt afgesloten.');
    if (this.pending.length + (this.current ? 1 : 0) > 12) throw new Error('De wachtrij is vol. Wacht tot een opdracht klaar is.');
    const input = validateRequest(raw);
    const photo = await this.library.photo(input.photoId);
    if (![photo.id, ...photo.variants.map(v => v.id)].includes(input.baseId)) throw new Error('De basisfoto hoort niet bij dit origineel.');
    await this.library.image(input.baseId);
    const jobs = [];
    for (let index = 1; index <= input.count; index++) {
      const settings = { ...input.settings };
      // Local alternatives are small, predictable exposure changes.
      if (input.mode === 'local' && input.count > 1) settings.brightness = Math.min(1.3, Math.max(0.7, settings.brightness + (index - (input.count + 1) / 2) * 0.025));
      const job = { ...input, settings, id: randomUUID(), createdAt: new Date().toISOString(), status: 'queued',
        prompt: buildPrompt({ ...input, variant: index }), progress: 'Wachten op eerdere opdrachten…' };
      await this.library.saveJob(job);
      jobs.push(job);
    }
    this.pending.push(...jobs);
    void this.drain();
    return jobs;
  }

  async cancel(id) {
    if (this.current?.job.id === id) { this.current.controller.abort(); return; }
    const index = this.pending.findIndex(j => j.id === id);
    if (index < 0) throw new Error('Deze opdracht staat niet in de wachtrij.');
    const [job] = this.pending.splice(index, 1);
    job.status = 'cancelled'; job.progress = 'Geannuleerd.';
    await this.library.saveJob(job);
  }

  async stop() {
    this.stopping = true;
    this.current?.controller.abort();
    for (const job of this.pending.splice(0)) {
      job.status = 'cancelled'; job.progress = 'De tool is afgesloten.';
      await this.library.saveJob(job);
    }
    // Let the active process finish cancellation and persist its final state.
    if (this.draining) await this.draining;
  }

  drain() {
    if (this.draining) return this.draining;
    this.draining = this.run().finally(() => { this.draining = null; });
    return this.draining;
  }

  async run() {
    while (this.pending.length && !this.stopping) {
      const job = this.pending.shift();
      const controller = new AbortController();
      this.current = { job, controller };
      try {
        job.status = 'running'; job.progress = job.mode === 'codex' ? 'Codex maakt een nieuwe variant…' : 'Licht, kleur en detail aanpassen…';
        await this.library.saveJob(job);
        const directory = this.library.jobDir(job.id);
        const originalFile = (await this.library.image(job.photoId)).file;
        const baseFile = (await this.library.image(job.baseId)).file;
        const original = path.join(directory, 'original' + path.extname(originalFile));
        await fs.copyFile(originalFile, original);
        const base = baseFile === originalFile ? original : path.join(directory, 'base' + path.extname(baseFile));
        if (base !== original) await fs.copyFile(baseFile, base);
        const target = path.join(directory, 'enhanced.jpg');
        if (job.mode === 'local') await localEnhance(base, target, job.settings);
        else {
          let progress = job.progress;
          const generated = await this.generate({ directory, original, base, prompt: job.prompt, signal: controller.signal,
            onProgress: text => { progress = text; } });
          job.progress = progress;
          if (controller.signal.aborted) throw new Error('Opdracht geannuleerd.');
          await sharp(generated).rotate().jpeg({ quality: 95, mozjpeg: true }).toFile(target);
        }
        if (controller.signal.aborted) throw new Error('Opdracht geannuleerd.');
        const metadata = await sharp(target).metadata();
        job.output = 'enhanced.jpg'; job.width = metadata.width; job.height = metadata.height;
        job.status = 'completed'; job.progress = 'Klaar om te vergelijken.';
      } catch (error) {
        job.status = controller.signal.aborted ? 'cancelled' : 'failed';
        job.error = error.message;
      }
      job.finishedAt = new Date().toISOString();
      await this.library.saveJob(job);
      this.current = null;
    }
  }
}
