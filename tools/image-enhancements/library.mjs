import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';

const imageExtension = /\.(?:jpe?g|png|webp|avif)$/i;
const validCardCrop = crop => validPosition(crop) && validRatio(crop.ratio) && (crop.free === undefined || typeof crop.free === 'boolean');
const validRatio = value => typeof value === 'string' && value.length <= 64 && /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(value) && value.split(':').every(n => Number(n) > 0 && Number.isFinite(Number(n))) && Number.isFinite(Number(value.split(':')[0]) / Number(value.split(':')[1]));
const validPosition = value => value && ['x', 'y'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 100) && (value.zoom === undefined || (typeof value.zoom === 'number' && Number.isFinite(value.zoom) && value.zoom >= 1 && value.zoom <= 4));
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
    const cardCrops = await this.readCardCrops();
    const recipeCrops = await this.readImageCrops('recipe');
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
        const gallery = (Array.isArray(recipe.data.images) ? recipe.data.images : []).map(name => ({
          filename: name,
          imageUrl: /^https?:\/\//.test(name) ? name : `/api/image?id=${encodeURIComponent(`${slug}/${name}`)}`,
        }));
        photos.push({ id, slug, filename, title: String(recipe.data.title || slug), imageUrl: `/api/image?id=${encodeURIComponent(id)}`,
          crops: { card: cardCrops.filter(c => c.slug === slug), recipe: recipeCrops.filter(c => c.slug === slug) }, recipeCrop: recipeCrops.find(c => c.slug === slug && c.filename === recipe.data.images?.[0]) || null, cardCrop: cardCrops.find(c => c.slug === slug && c.filename === recipe.data.images?.[0]) || null, status: recipe.data.status || 'published', active: recipe.data.images?.[0] || null, gallery, variants });
      }
    }
    return { photos: photos.sort((a, b) => a.title.localeCompare(b.title, 'nl')), jobs, highlights: (await this.readHighlights()).map(slide => ({ ...slide, title: photos.find(p => p.slug === slide.slug)?.title || slide.slug, imageUrl: `/api/image?id=${encodeURIComponent(slide.slug + '/' + slide.filename)}` })) };
  }

  async deleteVariant({ photoId, imageId }) {
    const catalog = await this.catalog();
    const photo = catalog.photos.find(p => p.id === photoId);
    if (!photo || imageId === photoId) throw new Error('Originele foto’s kunnen niet worden verwijderd.');
    const choice = photo.variants.find(v => v.id === imageId);
    if (!choice) throw new Error('Gegenereerde variant niet gevonden.');
    const stem = path.parse(photo.filename).name;
    const exportedName = job => `${stem}-enhanced-${job.id}${path.extname(job.output || '')}`;
    const job = catalog.jobs.find(j => j.photoId === photoId && j.status === 'completed' && (
      `job:${j.id}` === imageId || j.appliedFilename === choice.filename || exportedName(j) === choice.filename
    ));
    const filenames = new Set();
    if (choice.kind === 'existing') filenames.add(choice.filename);
    if (job) {
      if (job.appliedFilename) filenames.add(job.appliedFilename);
      filenames.add(exportedName(job));
    }
    if ([...filenames].some(name => !component.test(name) || !imageExtension.test(name) || name === photo.filename)) throw new Error('Ongeldige variantbestanden.');
    const aliases = new Set([imageId, ...(job ? [`job:${job.id}`] : []), ...[...filenames].map(name => `${photo.slug}/${name}`)]);
    if (catalog.jobs.some(j => ['queued', 'running'].includes(j.status) && aliases.has(j.baseId))) throw new Error('Deze variant wordt nog gebruikt voor een lopende bewerking. Wacht tot die klaar is.');
    const entries = await fs.readdir(this.recipes, { withFileTypes: true });
    const urls = new Set([...filenames].map(name => `/content/recipes/${photo.slug}/images/${name}`));
    for (const entry of entries.filter(e => e.isDirectory() && component.test(e.name))) {
      for (const recipe of await this.recipeFiles(entry.name)) {
        if ((recipe.data.images || []).some(name => {
          if (typeof name !== 'string') return false;
          if (entry.name === photo.slug && filenames.has(name)) return true;
          try { return urls.has(decodeURIComponent(new URL(name, 'http://local').pathname)); } catch { return false; }
        })) throw new Error('Deze variant staat nog in een receptgalerij. Vervang of verwijder hem daar eerst, in alle talen.');
      }
    }
    if (catalog.highlights.some(item => item.slug === photo.slug && filenames.has(item.filename))) throw new Error('Deze variant staat nog in de homepagecarousel. Verwijder hem daar eerst.');
    const moves = [];
    for (const filename of filenames) {
      const source = path.join(this.recipes, photo.slug, 'images', filename);
      let stat;
      try { stat = await fs.lstat(source); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Alleen gewone variantbestanden kunnen worden verwijderd.');
      await inside(this.recipes, source);
      moves.push({ source, backup: path.join('images', filename) });
    }
    if (job) {
      const source = this.jobDir(job.id);
      const stat = await fs.lstat(source);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Ongeldige variantmap.');
      await inside(this.jobsRoot, source);
      moves.push({ source, backup: 'job' });
    }
    if (!moves.length) throw new Error('Variantbestanden niet gevonden.');
    const trashId = randomUUID();
    const archive = path.join(this.dataRoot, 'trash', trashId);
    await fs.mkdir(archive, { recursive: true });
    await inside(this.dataRoot, archive);
    await atomicJson(path.join(archive, 'manifest.json'), {
      photoId, imageId, deletedAt: new Date().toISOString(),
      files: moves.map(move => ({ source: path.relative(this.root, move.source), backup: move.backup })),
    });
    const moved = [];
    try {
      for (const move of moves) {
        const destination = path.join(archive, move.backup);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.rename(move.source, destination);
        moved.push(move);
      }
    } catch (error) {
      for (const move of moved.reverse()) await fs.rename(path.join(archive, move.backup), move.source);
      throw error;
    }
    return { deleted: true, trashId };
  }

  async readCardCrops() { return this.readImageCrops('card'); }

  async readImageCrops(kind) {
    try {
      const value = JSON.parse(await fs.readFile(path.join(this.root, 'content', `${kind}-image-crops.json`), 'utf8'));
      if (!Array.isArray(value.crops) || value.crops.some(c => !c || !component.test(c.slug) || !component.test(c.filename) || !validCardCrop(c))) throw new Error('Ongeldige uitsnede.');
      return value.crops.map(({ slug, filename, ratio, x, y, zoom, free }) => ({ slug, filename, ratio, x, y, ...(zoom !== undefined ? { zoom } : {}), ...(free !== undefined ? { free } : {}) }));
    } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }

  async cardCrop(body) { return this.imageCrop(body, 'card'); }
  async recipeCrop(body) { return this.imageCrop(body, 'recipe'); }

  async imageCrop({ photoId, imageId, filename, crop }, kind) {
    if (crop !== null && !validCardCrop(crop)) throw new Error('Ongeldige uitsnede.');
    const photo = await this.photo(photoId);
    let prepared;
    if (imageId !== undefined) {
      prepared = await this.prepareImage(photoId, imageId);
      filename = prepared.filename;
    } else if (filename !== photo.active) throw new Error('De hoofdfoto is gewijzigd. Ververs de editor.');
    await this.image(`${photo.slug}/${filename}`);
    const crops = (await this.readImageCrops(kind)).filter(c => c.slug !== photo.slug || c.filename !== filename);
    if (crop) crops.push({ slug: photo.slug, filename, ratio: crop.ratio, x: crop.x, y: crop.y, ...(crop.zoom !== undefined ? { zoom: crop.zoom } : {}), ...(crop.free !== undefined ? { free: crop.free } : {}) });
    await atomicJson(path.join(this.root, 'content', `${kind}-image-crops.json`), { crops });
    if (prepared) await this.markApplied(prepared.image, filename);
    return { crops, filename, active: filename === photo.active };
  }

  async readHighlights() {
    try {
      const value = JSON.parse(await fs.readFile(path.join(this.root, 'content/home-highlights.json'), 'utf8'));
      if (!Array.isArray(value.slides) || value.slides.some(s => !s || !component.test(s.slug) || !component.test(s.filename) || !imageExtension.test(s.filename))) throw new Error('Ongeldige homepage-selectie.');
      return value.slides.slice(0, 5).map(({ slug, filename, desktopPosition }) => {
        if (desktopPosition !== undefined && !validPosition(desktopPosition)) throw new Error('Ongeldige desktopuitsnede.');
        return { slug, filename, ...(desktopPosition ? { desktopPosition: { x: desktopPosition.x, y: desktopPosition.y, ...(desktopPosition.zoom !== undefined ? { zoom: desktopPosition.zoom } : {}) } } : {}) };
      });
    } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }

  async highlights({ action, photoId, imageId, slug, filename, direction, desktopPosition }) {
    const slides = await this.readHighlights();
    let prepared;
    if (action === 'add') {
      const photo = await this.photo(photoId);
      if (photo.status !== 'published') throw new Error('Publiceer eerst het recept.');
      if (slides.length >= 5) throw new Error('Kies maximaal vijf uitgelichte foto’s.');
      prepared = await this.prepareImage(photoId, imageId);
      slug = photo.slug; filename = prepared.filename;
      if (!slides.some(s => s.slug === slug && s.filename === filename)) slides.push({ slug, filename });
    } else {
      const index = slides.findIndex(s => s.slug === slug && s.filename === filename);
      if (index < 0) throw new Error('Foto staat niet in de homepagecarousel.');
      if (action === 'position') {
        if (desktopPosition === null) delete slides[index].desktopPosition;
        else {
          if (!validPosition(desktopPosition)) throw new Error('Ongeldige desktopuitsnede.');
          slides[index].desktopPosition = { x: desktopPosition.x, y: desktopPosition.y, ...(desktopPosition.zoom !== undefined ? { zoom: desktopPosition.zoom } : {}) };
        }
      } else if (action === 'remove') slides.splice(index, 1);
      else if (action === 'move' && [-1, 1].includes(direction)) {
        const target = index + direction;
        if (target < 0 || target >= slides.length) throw new Error('Foto kan niet verder worden verplaatst.');
        [slides[index], slides[target]] = [slides[target], slides[index]];
      } else throw new Error('Ongeldige carouselactie.');
    }
    await atomicJson(path.join(this.root, 'content/home-highlights.json'), { slides });
    if (prepared) await this.markApplied(prepared.image, filename);
    return { slides };
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

  async prepareImage(photoId, imageId) {
    const photo = await this.photo(photoId);
    const allowed = [photo.id, ...photo.variants.map(v => v.id)];
    if (!allowed.includes(imageId)) throw new Error('Deze variant hoort niet bij deze foto.');
    const image = await this.image(imageId);
    let filename = image.name;
    if (image.job) {
      filename = `${path.parse(photo.filename).name}-enhanced-${image.job.id}${path.extname(image.file)}`;
    }
    if (image.job) {
      const destination = path.join(path.dirname((await this.image(photoId)).file), filename);
      try { await fs.copyFile(image.file, destination, fs.constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    return { photo, image, filename };
  }

  async writeImages(slug, update) {
    const files = await this.recipeFiles(slug);
    const updates = files.map(file => {
      const images = update(Array.isArray(file.data.images) ? [...file.data.images] : []);
      const match = file.content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
      if (!match) throw new Error('Receptmetadata ontbreekt.');
      const block = `images: [${images.map(i => JSON.stringify(i)).join(', ')}]`;
      const header = /^images:[^\n]*(?:\r?\n[ \t]+[^\n]*)*/m.test(match[2])
        ? match[2].replace(/^images:[^\n]*(?:\r?\n[ \t]+[^\n]*)*/m, block)
        : `${match[2]}\n${block}`;
      return { ...file, next: match[1] + header + match[3] + file.content.slice(match[0].length) };
    });
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
    return files.length;
  }

  async markApplied(image, filename) {
    if (image.job) {
      image.job.appliedFilename = filename;
      await this.saveJob(image.job);
    }
  }

  async apply(photoId, imageId) {
    const { photo, image, filename } = await this.prepareImage(photoId, imageId);
    const locales = await this.writeImages(photo.slug, images => [filename, ...images.slice(1).filter(name => name !== filename)]);
    await this.markApplied(image, filename);
    return { filename, locales };
  }

  async gallery({ photoId, action, imageId, filename, direction }) {
    if (!['add', 'hero', 'remove', 'move'].includes(action)) throw new Error('Onbekende galerijactie.');
    const photo = await this.photo(photoId);
    let image;
    if (action === 'add') {
      const prepared = await this.prepareImage(photoId, imageId);
      filename = prepared.filename; image = prepared.image;
    } else {
      if (!photo.gallery.some(item => item.filename === filename)) throw new Error('Foto staat niet in deze galerij.');
      if (action === 'move' && ![-1, 1].includes(direction)) throw new Error('Ongeldige volgorde.');
    }
    const names = photo.gallery.map(item => item.filename);
    if (action === 'add' && !names.includes(filename)) names.push(filename);
    if (action === 'hero') { names.splice(names.indexOf(filename), 1); names.unshift(filename); }
    if (action === 'remove') {
      if (names.length <= 1) throw new Error('Behoud minstens één foto in de galerij.');
      names.splice(names.indexOf(filename), 1);
    }
    if (action === 'move') {
      const index = names.indexOf(filename);
      const target = index + direction;
      if (target < 0 || target >= names.length) throw new Error('Foto kan niet verder worden verplaatst.');
      [names[index], names[target]] = [names[target], names[index]];
    }
    const locales = await this.writeImages(photo.slug, () => names);
    if (image) await this.markApplied(image, filename);
    return { filename, locales, images: names };
  }
}
