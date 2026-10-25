import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';

const imageExtension = /\.(?:jpe?g|png|webp|avif)$/i;
const component = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
export const imageMime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };

export async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(temporary, file);
}

export async function inside(root, file) {
  const [realRoot, realFile] = await Promise.all([fs.realpath(root), fs.realpath(file)]);
  if (!realFile.startsWith(realRoot + path.sep)) throw new Error('Bestand valt buiten de fotomap.');
  return realFile;
}

export class Library {
  constructor(root, dataRoot = path.join(root, '.local/image-enhancements')) {
    this.root = root;
    this.recipes = path.join(root, 'content/recipes');
    this.dataRoot = dataRoot;
    this.jobsRoot = path.join(dataRoot, 'jobs');
  }

  async init() {
    await fs.mkdir(this.jobsRoot, { recursive: true });
    const jobs = await this.jobs();
    for (const job of jobs) {
      if (job.status === 'running' || job.status === 'queued') {
        job.status = 'failed';
        job.error = 'De tool is gestopt tijdens deze opdracht. Maak opnieuw een variant.';
        await this.saveJob(job);
      }
    }
  }

  jobDir(id) {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Ongeldig opdracht-ID.');
    return path.join(this.jobsRoot, id);
  }

  async saveJob(job) {
    await atomicJson(path.join(this.jobDir(job.id), 'job.json'), job);
  }

  async jobs() {
    let entries;
    try { entries = await fs.readdir(this.jobsRoot, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const jobs = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/.test(entry.name)) continue;
      try {
        const file = await inside(this.jobsRoot, path.join(this.jobsRoot, entry.name, 'job.json'));
        const job = JSON.parse(await fs.readFile(file, 'utf8'));
        if (job.id === entry.name) jobs.push(job);
      } catch (error) {
        console.warn(`Kan opdracht ${entry.name} niet lezen: ${error.message}`);
      }
    }
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async recipeFiles(slug) {
    if (!component.test(slug)) throw new Error('Ongeldig recept.');
    const dir = await inside(this.recipes, path.join(this.recipes, slug));
    const names = (await fs.readdir(dir)).filter(name => /^index\.[a-z-]+\.md$/.test(name));
    return Promise.all(names.map(async name => {
      const file = await inside(this.recipes, path.join(dir, name));
      const content = await fs.readFile(file, 'utf8');
      return { file, content, data: matter(content).data };
    }));
  }

  async catalog() {
    const jobs = await this.jobs();
    const entries = await fs.readdir(this.recipes, { withFileTypes: true });
    const photos = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !component.test(entry.name)) continue;
      const slug = entry.name;
      const files = await this.recipeFiles(slug);
      const recipe = files.find(f => f.file.endsWith('.nl.md')) || files[0];
      if (!recipe) continue;
      let images;
      try {
        const imageDir = await inside(this.recipes, path.join(this.recipes, slug, 'images'));
        images = (await fs.readdir(imageDir, { withFileTypes: true })).filter(f => f.isFile() && imageExtension.test(f.name)).map(f => f.name);
      } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      const originals = images.filter(name => !/-artistic\.|-enhanced-[0-9a-f-]+\./.test(name));
      for (const filename of originals) {
        const id = `${slug}/${filename}`;
        const stem = filename.replace(imageExtension, '');
        const appliedJobs = new Set(jobs.filter(j => j.photoId === id && j.status === 'completed').map(j => j.appliedFilename));
        const variants = images.filter(name => name.startsWith(`${stem}-artistic.`) || (name.startsWith(`${stem}-enhanced-`) && !appliedJobs.has(name))).map(name => ({
          id: `${slug}/${name}`, filename: name, kind: 'existing', label: name.startsWith(`${stem}-artistic.`) ? 'Eerdere AI-bewerking' : 'Bewaarde bewerking', imageUrl: `/api/image?id=${encodeURIComponent(`${slug}/${name}`)}`,
        }));
        for (const job of jobs.filter(j => j.photoId === id && j.status === 'completed')) {
          variants.push({
            id: `job:${job.id}`, filename: job.output, label: job.mode === 'local' ? 'Fotocorrectie' : 'Codex AI', kind: job.mode,
            createdAt: job.createdAt, instructions: job.instructions, preserve: job.preserve, prompt: job.prompt,
            baseId: job.baseId, settings: job.settings,
            imageUrl: `/api/image?id=${encodeURIComponent(`job:${job.id}`)}`,
            appliedFilename: job.appliedFilename,
          });
        }
        photos.push({ id, slug, filename, title: String(recipe.data.title || slug), imageUrl: `/api/image?id=${encodeURIComponent(id)}`,
          active: recipe.data.images?.[0] || null, variants });
      }
    }
    return { photos: photos.sort((a, b) => a.title.localeCompare(b.title, 'nl')), jobs };
  }

  async image(id) {
    if (typeof id !== 'string') throw new Error('Foto ontbreekt.');
    if (id.startsWith('job:')) {
      const job = (await this.jobs()).find(j => `job:${j.id}` === id);
      if (!job || job.status !== 'completed' || !component.test(job.output)) throw new Error('Variant niet gevonden.');
      return { file: await inside(this.jobsRoot, path.join(this.jobDir(job.id), job.output)), photoId: job.photoId, job };
    }
    const parts = id.split('/');
    if (parts.length !== 2 || !parts.every(p => component.test(p)) || !imageExtension.test(parts[1])) throw new Error('Ongeldige foto.');
    const [slug, name] = parts;
    return { file: await inside(this.recipes, path.join(this.recipes, slug, 'images', name)), slug, name };
  }

  async photo(id) {
    const photo = (await this.catalog()).photos.find(p => p.id === id);
    if (!photo) throw new Error('Originele foto niet gevonden.');
    return photo;
  }

  async apply(photoId, imageId) {
    const photo = await this.photo(photoId);
    const allowed = [photo.id, ...photo.variants.map(v => v.id)];
    if (!allowed.includes(imageId)) throw new Error('Deze variant hoort niet bij deze foto.');
    const image = await this.image(imageId);
    const files = await this.recipeFiles(photo.slug);
    let filename = image.name;
    if (image.job) {
      filename = `${path.parse(photo.filename).name}-enhanced-${image.job.id}${path.extname(image.file)}`;
    }
    const updates = files.map(file => {
      const images = Array.isArray(file.data.images) ? [...file.data.images] : [];
      images[0] = filename;
      const match = file.content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
      if (!match) throw new Error('Receptmetadata ontbreekt.');
      const block = `images: [${images.map(i => JSON.stringify(i)).join(', ')}]`;
      const header = /^images:[^\n]*(?:\r?\n[ \t]+[^\n]*)*/m.test(match[2])
        ? match[2].replace(/^images:[^\n]*(?:\r?\n[ \t]+[^\n]*)*/m, block)
        : `${match[2]}\n${block}`;
      return { ...file, next: match[1] + header + match[3] + file.content.slice(match[0].length) };
    });
    if (image.job) {
      const destination = path.join(path.dirname((await this.image(photoId)).file), filename);
      try { await fs.copyFile(image.file, destination, fs.constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    const written = [];
    try {
      for (const update of updates) {
        await fs.writeFile(update.file, update.next);
        written.push(update);
      }
    } catch (error) {
      for (const update of written) await fs.writeFile(update.file, update.content);
      throw error;
    }
    if (image.job) {
      image.job.appliedFilename = filename;
      await this.saveJob(image.job);
    }
    return { filename, locales: files.length };
  }
}
