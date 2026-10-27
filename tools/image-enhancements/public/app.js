import { buildPrompt } from '/prompts.mjs';

const $ = id => document.getElementById(id);
const state = { photos: [], highlights: [], jobs: [], photoId: null, selectedId: null, token: '', codex: {}, fingerprint: '', applying: false };
const storageKey = 'recipe-image-studio-drafts-v1';
let drafts = {};
try { drafts = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* Fresh browser storage. */ }
let toastTimer;
function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message; $('toast').className = error ? 'error' : ''; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 12000 : 6000);
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
async function api(url, body, retry = true) {
  const response = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Token': state.token }, body: JSON.stringify(body) });
  const result = await response.json();
  if (response.status === 403 && body !== undefined && retry && result.error?.startsWith('Ververs de pagina')) {
    const config = await api('/api/config'); state.token = config.token;
    return api(url, body, false);
  }
  if (!response.ok) throw new Error(result.error || 'De opdracht is mislukt.');
  return result;
}
function currentPhoto() { return state.photos.find(p => p.id === state.photoId); }
function choices(photo) { return [{ id: photo.id, imageUrl: photo.imageUrl, label: 'Origineel', filename: photo.filename, kind: 'original' }, ...photo.variants]; }
function choiceCrop(photo, choice, kind) {
  const filename = choice.appliedFilename || choice.filename;
  return photo.crops?.[kind]?.find(c => c.filename === filename) || (isActive(photo, choice) ? kind === 'card' ? photo.cardCrop : photo.recipeCrop : null);
}
function isActive(photo, choice) { return (choice.appliedFilename || choice.filename) === photo.active; }
function isInGallery(photo, choice) { return photo.gallery.some(item => item.filename === (choice.appliedFilename || choice.filename)); }
function activeChoice(photo) { return choices(photo).find(choice => isActive(photo, choice)) || choices(photo)[0]; }
function mode() { return document.querySelector('input[name=mode]:checked').value; }

function syncLocation(method = 'replace') {
  if (!currentPhoto()) return;
  const url = new URL(window.location.href);
  url.searchParams.set('photo', state.photoId);
  url.searchParams.set('variant', state.selectedId);
  if (['card', 'hero'].includes($('preview-mode').value)) url.searchParams.set('view', $('preview-mode').value);
  else url.searchParams.delete('view');
  url.searchParams.delete('hover');
  if (url.href !== window.location.href) window.history[method === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}

function restoreLocation() {
  const params = new URL(window.location.href).searchParams;
  const photo = state.photos.find(p => p.id === params.get('photo')) || state.photos[0];
  if (!photo) return;
  $('preview-mode').value = ['card', 'hero'].includes(params.get('view')) ? params.get('view') : 'full';
  selectPhoto(photo.id, { variantId: params.get('variant'), historyMode: 'replace' });
  renderPreviewMode();
}

function renderPreviewMode() {
  const view = $('preview-mode').value;
  $('card-crop').textContent = view === 'hero' ? 'Receptuitsnede — grote foto' : 'Kaartuitsnede';
  const framed = view !== 'full';
  const comparison = $('photo-comparison');
  comparison.classList.toggle('site-card-preview', framed);
  comparison.classList.toggle('site-hero-preview', view === 'hero');
  $('zoom').disabled = framed;
  if (framed) $('zoom').checked = false;
  comparison.classList.toggle('zoomed', !framed && $('zoom').checked);
  $('preview-explanation').textContent = framed
    ? view === 'hero'
      ? 'Voorbeeld van de grote foto op de receptpagina. Klik op Receptuitsnede — grote foto om deze weergave bij te snijden. Voor de homepagebanner gebruik je Carouseluitsnede (desktop).'
      : 'Het receptkaartje volgt de verhouding van je foto. Portretfoto’s zijn hoger en landschapsfoto’s breder, zonder uitsnede of opvulranden.'
    : 'De volledige foto, zonder uitsnede. Bekijk ook hoe de foto op een kaart of als hoofdfoto wordt weergegeven.';
  renderCardPreview();
  syncLocation();
}

function renderCardPreview() {
  const photo = currentPhoto();
  const selected = photo && choices(photo).find(c => c.id === state.selectedId);
  const view = $('preview-mode').value;
  const crop = selected ? view === 'card' ? choiceCrop(photo, selected, 'card') : view === 'hero' ? choiceCrop(photo, selected, 'recipe') : null : null;
  const image = $('preview-image'); const stage = image.parentElement;
  stage.classList.toggle('saved-card-crop', Boolean(crop));
  stage.style.aspectRatio = crop ? crop.ratio.replace(':', '/') : '';
  image.style.objectPosition = crop ? `${crop.x}% ${crop.y}%` : '';
  image.style.transform = crop ? `scale(${crop.zoom ?? 1})` : '';
  image.style.transformOrigin = crop ? `${crop.x}% ${crop.y}%` : '';
  if (!crop && $('preview-mode').value === 'card') $('preview-explanation').textContent = 'De volledige foto in de eigen verhouding. Gebruik Kaartuitsnede om de hoofdfoto op het kaartje bij te snijden.';
  if (crop) $('preview-explanation').textContent = view === 'hero' ? 'De opgeslagen uitsnede van de grote foto op de receptpagina. Het origineel links blijft volledig zichtbaar.' : 'De opgeslagen uitsnede op het receptkaartje. Het origineel links blijft volledig zichtbaar.';
}

function renderList() {
  const query = $('search').value.toLocaleLowerCase('nl');
  const list = $('photo-list'); list.replaceChildren();
  $('photo-count').textContent = state.photos.length;
  for (const photo of state.photos.filter(p => `${p.title} ${p.filename}`.toLocaleLowerCase('nl').includes(query))) {
    const button = node('button', 'photo-item'); button.type = 'button'; button.setAttribute('aria-current', String(photo.id === state.photoId));
    const image = node('img'); image.src = photo.imageUrl; image.alt = ''; image.loading = 'lazy';
    const description = node('span'); description.append(node('strong', '', photo.title), node('small', '', `${photo.variants.length} varianten`));
    button.append(image, description); button.addEventListener('click', () => selectPhoto(photo.id)); list.append(button);
  }
  if (!list.childElementCount) list.append(node('p', 'muted', "Geen foto's bij deze zoekopdracht."));
}

function saveDraft() {
  if (!state.photoId) return;
  drafts[state.photoId] = {
    baseId: $('base').value, mode: mode(), instructions: $('instructions').value, preserve: $('preserve').value,
    style: $('style').value, count: $('count').value,
    settings: Object.fromEntries(['brightness', 'contrast', 'saturation', 'sharpness'].map(key => [key, $(key).value])),
  };
  try { localStorage.setItem(storageKey, JSON.stringify(drafts)); } catch { /* Editing remains usable without storage. */ }
}
function renderBaseOptions(photo, value = photo.id) {
  $('base').replaceChildren();
  for (const [index, choice] of choices(photo).entries()) {
    $('base').append(new Option(index ? `${choice.label} · ${index}` : 'Origineel (aanbevolen)', choice.id));
  }
  $('base').value = choices(photo).some(c => c.id === value) ? value : photo.id;
}
function selectPhoto(id, { variantId, historyMode = 'push' } = {}) {
  const photo = state.photos.find(p => p.id === id);
  if (!photo) return;
  if (state.photoId) saveDraft();
  state.photoId = id;
  state.selectedId = choices(photo).find(c => c.id === variantId)?.id || activeChoice(photo).id;
  const draft = drafts[id] || {};
  renderBaseOptions(photo, draft.baseId || photo.id);
  document.querySelector(`input[name=mode][value=${draft.mode === 'codex' ? 'codex' : 'local'}]`).checked = true;
  $('instructions').value = draft.instructions || '';
  $('preserve').value = draft.preserve || '';
  $('style').value = draft.style || 'subtle'; $('count').value = draft.count || '1';
  for (const [key, fallback] of Object.entries({ brightness: 1.03, contrast: 1.03, saturation: 1.02, sharpness: 0.4 })) $(key).value = draft.settings?.[key] ?? fallback;
  $('photo-title').textContent = photo.title; $('photo-filename').textContent = photo.filename;
  $('original-image').src = photo.imageUrl; $('original-image').alt = `${photo.title} — origineel`;
  $('editor').hidden = false; $('empty').hidden = true;
  syncLocation(historyMode);
  renderList(); renderMode(); renderSelection(); renderVariants(); renderGallery(); renderHighlights(); renderJobs();
}

function renderMode() {
  const ai = mode() === 'codex';
  $('local-options').hidden = ai; $('ai-options').hidden = !ai;
  $('generate').disabled = ai && !state.codex.available;
  $('count-note').textContent = ai ? 'Elke variant is een aparte AI-bewerking en gebruikt je Codex-limiet.' : 'Bij meerdere varianten varieert de helderheid een klein beetje.';
  $('codex-note').textContent = state.codex.available
    ? 'Codex gebruikt je lokale aanmelding. De AI-verwerking gebeurt online en gebruikt je Codex-limiet.'
    : 'Codex CLI is niet gevonden. Installeer Codex en voer codex login uit. Fotocorrectie werkt zonder Codex.';
  for (const key of ['brightness', 'contrast', 'saturation', 'sharpness']) {
    const value = Number($(key).value);
    const percent = Math.round((value - 1) * 100);
    $(`${key}-value`).value = key === 'sharpness' ? value.toFixed(1) : `${percent >= 0 ? '+' : ''}${percent}%`;
  }
  $('prompt-preview').textContent = buildPrompt({ instructions: $('instructions').value, preserve: $('preserve').value, style: $('style').value, count: Number($('count').value) });
  $('generate').textContent = Number($('count').value) > 1 ? `✧ Maak ${$('count').value} varianten` : '✧ Maak een variant';
}

function renderSelection() {
  const photo = currentPhoto(); if (!photo) return;
  const selected = choices(photo).find(c => c.id === state.selectedId) || activeChoice(photo);
  state.selectedId = selected.id;
  $('preview-image').src = selected.imageUrl; $('preview-image').alt = `${photo.title} — ${selected.label}`;
  $('preview-label').textContent = selected.label; $('preview-tag').textContent = isActive(photo, selected) ? 'HOOFDFOTO' : isInGallery(photo, selected) ? 'IN GALERIJ' : 'CONCEPT';
  $('selection-note').textContent = isActive(photo, selected) ? 'Dit is de hoofdfoto op de site.' : isInGallery(photo, selected) ? 'Deze foto staat in de galerij op de site.' : 'Concept — nog niet op de site toegepast.';
  $('add-highlight').disabled = state.applying || photo.status !== 'published' || state.highlights.length >= 5 || state.highlights.some(s => s.slug === photo.slug && s.filename === (selected.appliedFilename || selected.filename));
  $('apply').disabled = isActive(photo, selected) || state.applying;
  $('add-gallery').disabled = isInGallery(photo, selected) || state.applying;
  $('restore').disabled = photo.active === photo.filename || state.applying;
  $('card-crop').disabled = state.applying || !selected;
  $('recipe-crop').disabled = $('card-crop').disabled;
  renderCardPreview();
}

function renderVariants() {
  const photo = currentPhoto(); if (!photo) return;
  $('variant-count').textContent = `${photo.variants.length} bewaard`;
  const list = $('variants'); list.replaceChildren();
  for (const [index, choice] of choices(photo).entries()) {
    const button = node('button', 'variant-card'); button.type = 'button'; button.setAttribute('aria-pressed', String(state.selectedId === choice.id));
    const image = node('img'); image.src = choice.imageUrl; image.alt = `${choice.label} van ${photo.title}`; image.loading = 'lazy';
    const info = node('span', 'variant-info'); info.append(node('strong', '', index ? `${choice.label} · ${index}` : 'Origineel'));
    info.append(node('small', '', choice.createdAt ? new Date(choice.createdAt).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) : index ? 'Bestaande bewerking' : 'Altijd bewaard'));
    button.append(image, info);
    if (isInGallery(photo, choice)) button.append(node('span', 'active-badge', isActive(photo, choice) ? 'Hoofdfoto' : 'In galerij'));
    button.addEventListener('click', () => { state.selectedId = choice.id; syncLocation('push'); renderSelection(); renderVariants(); });
    button.title = choice.instructions || choice.label;
    const item = node('div', 'variant-item');
    item.append(button);
    if (index) {
      const remove = node('button', 'variant-delete', 'Verwijderen'); remove.type = 'button';
      remove.setAttribute('aria-label', `Variant verwijderen: ${choice.label} · ${index}`);
      const filename = choice.appliedFilename || choice.filename;
      const inUse = isInGallery(photo, choice) || state.highlights.some(s => s.slug === photo.slug && s.filename === filename);
      const pending = state.jobs.some(j => ['running', 'queued'].includes(j.status) && [choice.id, `${photo.slug}/${filename}`].includes(j.baseId));
      remove.disabled = state.applying || inUse || pending;
      remove.title = inUse ? 'Deze variant staat nog op de site. Vervang of verwijder hem daar eerst.' : pending ? 'Deze variant wordt gebruikt voor een lopende bewerking.' : 'Naar de lokale prullenbak verplaatsen';
      remove.addEventListener('click', () => deleteVariant(photo.id, choice.id));
      item.append(remove);
    }
    list.append(item);
  }
  if (!photo.variants.length) list.append(node('div', 'no-variants', 'Hier komen je varianten. Begin met een subtiele fotocorrectie of geef Codex je eigen instructies.'));
}

async function deleteVariant(photoId, imageId) {
  if (state.applying) return;
  if (!await confirmChange('Deze gegenereerde variant verwijderen?', 'De variant en de bijbehorende lokale opdracht gaan naar de lokale prullenbak. Het origineel blijft bewaard. Een foto die nog op de site wordt gebruikt, kan niet worden verwijderd.', 'Variant verwijderen')) return;
  state.applying = true; renderSelection(); renderVariants();
  try {
    await api('/api/delete-variant', { photoId, imageId });
    await refresh();
    toast('Variant verwijderd. Het origineel is behouden; de variant staat in de lokale prullenbak.');
  } catch (error) { toast(error.message, true); }
  finally { state.applying = false; renderSelection(); renderVariants(); renderGallery(); renderHighlights(); syncLocation(); }
}

function renderGallery() {
  const photo = currentPhoto(); if (!photo) return;
  $('gallery-count').textContent = `${photo.gallery.length} foto's`;
  $('site-gallery').replaceChildren();
  for (const [index, item] of photo.gallery.entries()) {
    const card = node('div', 'gallery-item');
    const preview = node('button', 'gallery-image'); preview.type = 'button';
    preview.setAttribute('aria-label', `${index === 0 ? 'Hoofdfoto' : `Galerijfoto ${index + 1}`} bekijken`);
    const image = node('img'); image.src = item.imageUrl; image.alt = `${photo.title} — galerijfoto ${index + 1}`; image.loading = 'lazy';
    preview.append(image, node('span', 'gallery-position', index === 0 ? 'Hoofdfoto' : String(index + 1)));
    preview.addEventListener('click', () => {
      const owner = state.photos.find(p => p.slug === photo.slug && choices(p).some(c => (c.appliedFilename || c.filename) === item.filename));
      const choice = owner && choices(owner).find(c => (c.appliedFilename || c.filename) === item.filename);
      if (choice) selectPhoto(owner.id, { variantId: choice.id });
      else toast('Deze foto heeft geen bewerkbaar lokaal origineel.', true);
    });
    card.append(preview);
    const actions = node('div', 'gallery-actions');
    for (const action of [
      { text: '←', title: 'Naar voren', action: 'move', direction: -1, disabled: index === 0 },
      { text: '→', title: 'Naar achteren', action: 'move', direction: 1, disabled: index === photo.gallery.length - 1 },
      { text: 'Hoofdfoto', title: 'Maak hoofdfoto', action: 'hero', disabled: index === 0 },
      { text: '×', title: 'Uit galerij verwijderen', action: 'remove', disabled: photo.gallery.length <= 1 },
    ]) {
      const button = node('button', '', action.text); button.type = 'button'; button.title = action.title; button.setAttribute('aria-label', `${action.title}: foto ${index + 1}`);
      button.disabled = action.disabled || state.applying;
      button.addEventListener('click', () => updateGallery({ photoId: photo.id, action: action.action, filename: item.filename, direction: action.direction }));
      actions.append(button);
    }
    card.append(actions); $('site-gallery').append(card);
  }
}

function renderHighlights() {
  $('highlight-count').textContent = `${state.highlights.length} / 5 foto’s`;
  const list = $('highlights'); list.replaceChildren();
  for (const [index, item] of state.highlights.entries()) {
    const card = node('div', 'gallery-item');
    const preview = node('button', 'gallery-image'); preview.type = 'button'; preview.title = item.title;
    const image = node('img'); image.src = item.imageUrl; image.alt = item.title; image.loading = 'lazy';
    preview.append(image, node('span', 'gallery-position', String(index + 1)));
    preview.addEventListener('click', () => {
      const owner = state.photos.find(p => p.slug === item.slug && choices(p).some(c => (c.appliedFilename || c.filename) === item.filename));
      const choice = owner && choices(owner).find(c => (c.appliedFilename || c.filename) === item.filename);
      if (choice) selectPhoto(owner.id, { variantId: choice.id });
    });
    card.append(preview);
    const actions = node('div', 'gallery-actions');
    for (const action of [
      { text: '←', label: 'Naar voren', action: 'move', direction: -1, disabled: index === 0 },
      { text: '→', label: 'Naar achteren', action: 'move', direction: 1, disabled: index === state.highlights.length - 1 },
      { text: '×', label: 'Uit carousel verwijderen', action: 'remove' },
    ]) {
      const button = node('button', '', action.text); button.type = 'button';
      button.setAttribute('aria-label', `${action.label}: ${item.title}`); button.disabled = state.applying || action.disabled;
      button.addEventListener('click', () => updateHighlights({ action: action.action, direction: action.direction, slug: item.slug, filename: item.filename }));
      actions.append(button);
    }
    const crop = node('button', '', 'Carouseluitsnede'); crop.type = 'button'; crop.setAttribute('aria-label', `Carouseluitsnede aanpassen (desktop): ${item.title}`); crop.disabled = state.applying;
    crop.addEventListener('click', () => openCrop(item));
    actions.append(crop);
    card.append(actions); list.append(card);
  }
  if (!state.highlights.length) list.append(node('p', 'helper', 'Selecteer een foto en klik op “Uitlichten op homepage”.'));
}

async function updateHighlights(body) {
  if (state.applying) return;
  state.applying = true; renderSelection(); renderHighlights();
  try { await api('/api/highlights', body); await refresh(); toast('Homepagecarousel opgeslagen. Ververs de site om de wijziging te zien.'); return true; }
  catch (error) { toast(error.message, true); }
  finally { state.applying = false; renderSelection(); renderVariants(); renderHighlights(); }
}

let cropItem;
let cropTarget = 'highlight';
let cropZoom = 1;
let cropFreeRatio;
let cropLastAspect;
let cropDrag;
const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
function sourceAspect() {
  const image = $('crop-source-image');
  return image.naturalWidth / image.naturalHeight || 1;
}
function cropAspect() {
  if (cropTarget === 'highlight') return 1216 / 520;
  const value = $('crop-ratio').value;
  if (value === 'free') return cropFreeRatio || sourceAspect();
  if (value === 'original') return sourceAspect();
  const [width, height] = value.split(':').map(Number);
  return width / height;
}
function savedCardRatio() {
  return ['free', 'original'].includes($('crop-ratio').value) ? `${Number(cropAspect().toFixed(8))}:1` : $('crop-ratio').value;
}
function resizeFreeCrop(bounds, dx, dy, handle) {
  const width = clamp(bounds.width + (handle === 'crop-handle-bottom' ? 0 : dx), .03, 1 - bounds.left);
  const height = clamp(bounds.height + (handle === 'crop-handle-right' ? 0 : dy), .03, 1 - bounds.top);
  if (Math.max(width, height) < .25) return;
  cropFreeRatio = width / height * sourceAspect();
  cropZoom = 1 / Math.max(width, height);
  setCropPosition(bounds.left, bounds.top, width, height);
}
function cropBounds() {
  const image = $('crop-source-image');
  const sourceRatio = image.naturalWidth / image.naturalHeight || 1;
  const ratio = cropAspect();
  const baseWidth = Math.min(1, ratio / sourceRatio);
  const baseHeight = Math.min(1, sourceRatio / ratio);
  const width = baseWidth / cropZoom; const height = baseHeight / cropZoom;
  return { width, height, left: (1 - width) * Number($('crop-x').value) / 100, top: (1 - height) * Number($('crop-y').value) / 100, baseWidth, baseHeight };
}
function setCropPosition(left, top, width, height) {
  $('crop-x').value = width < 1 ? clamp(left / (1 - width) * 100, 0, 100) : 50;
  $('crop-y').value = height < 1 ? clamp(top / (1 - height) * 100, 0, 100) : 50;
}
function renderCrop() {
  const x = Number($('crop-x').value); const y = Number($('crop-y').value);
  $('crop-image').style.objectPosition = `${x}% ${y}%`;
  $('crop-image').style.transformOrigin = `${x}% ${y}%`;
  $('crop-image').style.transform = `scale(${cropZoom})`;
  $('crop-preview').style.aspectRatio = cropTarget !== 'highlight' ? String(cropAspect()) : '';
  const free = cropTarget !== 'highlight' && $('crop-ratio').value === 'free';
  $('crop-handle-right').hidden = !free; $('crop-handle-bottom').hidden = !free;
  cropLastAspect = cropAspect();
  const bounds = cropBounds();
  const image = $('crop-source-image');
  if (image.naturalHeight) $('crop-source').style.maxWidth = `${Math.min(580, window.innerHeight * .5 * image.naturalWidth / image.naturalHeight)}px`;
  for (const key of ['left', 'top', 'width', 'height']) $('crop-selection').style[key] = `${bounds[key] * 100}%`;
  $('crop-zoom-label').textContent = `${Math.round(cropZoom * 100)}%`;
  $('crop-zoom-out').disabled = cropZoom <= 1;
  $('crop-zoom-in').disabled = cropZoom >= 4;
}
function zoomCrop(factor) {
  cropZoom = clamp(cropZoom * factor, 1, 4); renderCrop();
}
$('crop-source-image').addEventListener('load', renderCrop);
$('crop-zoom-in').addEventListener('click', () => zoomCrop(1.15));
$('crop-zoom-out').addEventListener('click', () => zoomCrop(1 / 1.15));
$('crop-selection').addEventListener('keydown', event => {
  if (event.key === '+' || event.key === '-') { event.preventDefault(); zoomCrop(event.key === '+' ? 1.1 : 1 / 1.1); return; }
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const bounds = cropBounds(); const step = event.shiftKey ? .05 : .01;
  if (cropTarget !== 'highlight' && $('crop-ratio').value === 'free' && event.target.id.startsWith('crop-handle')) {
    resizeFreeCrop(bounds, event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0, event.target.id);
    renderCrop(); return;
  }
  setCropPosition(bounds.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), bounds.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), bounds.width, bounds.height);
  renderCrop();
});
$('crop-source').addEventListener('pointerdown', event => {
  if (event.button !== 0 || !$('crop-source-image').naturalWidth) return;
  event.preventDefault(); $('crop-selection').focus({ preventScroll: true });
  const frame = $('crop-source').getBoundingClientRect();
  if (event.target === $('crop-source') || event.target === $('crop-source-image')) {
    const bounds = cropBounds();
    setCropPosition((event.clientX - frame.left) / frame.width - bounds.width / 2, (event.clientY - frame.top) / frame.height - bounds.height / 2, bounds.width, bounds.height);
    renderCrop();
  }
  cropDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, frame, bounds: cropBounds(), resize: ['crop-handle', 'crop-handle-right', 'crop-handle-bottom'].includes(event.target.id) ? event.target.id : null };
  $('crop-source').setPointerCapture(event.pointerId);
});
$('crop-source').addEventListener('pointermove', event => {
  if (!cropDrag || event.pointerId !== cropDrag.pointerId) return;
  const { frame, bounds } = cropDrag;
  const dx = (event.clientX - cropDrag.x) / frame.width; const dy = (event.clientY - cropDrag.y) / frame.height;
  if (cropDrag.resize && cropTarget !== 'highlight' && $('crop-ratio').value === 'free') {
    resizeFreeCrop(bounds, dx, dy, cropDrag.resize);
  } else if (cropDrag.resize) {
    const ratio = bounds.baseWidth / bounds.baseHeight;
    const delta = Math.abs(dx / bounds.width) > Math.abs(dy / bounds.height) ? dx : dy * ratio;
    const maxWidth = Math.min(bounds.baseWidth, 1 - bounds.left, (1 - bounds.top) * ratio);
    const width = clamp(bounds.width + delta, bounds.baseWidth / 4, maxWidth);
    cropZoom = clamp(bounds.baseWidth / width, 1, 4);
    setCropPosition(bounds.left, bounds.top, bounds.baseWidth / cropZoom, bounds.baseHeight / cropZoom);
  } else setCropPosition(bounds.left + dx, bounds.top + dy, bounds.width, bounds.height);
  renderCrop();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('crop-source').addEventListener(event, () => { cropDrag = null; });
function openCrop(item, target = 'highlight') {
  cropTarget = target; $('crop-error').hidden = true;
  const selected = target !== 'highlight' ? choices(item).find(choice => choice.id === state.selectedId) || activeChoice(item) : null;
  cropItem = selected ? { photoId: item.id, imageId: selected.id } : { slug: item.slug, filename: item.filename };
  const card = target === 'card';
  const recipe = target === 'recipe';
  const imageCrop = card || recipe;
  $('crop-eyebrow').textContent = card ? 'UITSNEDE RECEPTKAARTJE' : recipe ? 'RECEPTUITSNEDE · GROTE FOTO OP RECEPTPAGINA' : 'CAROUSELUITSNEDE · ALLEEN DESKTOP';
  $('crop-description').textContent = recipe
    ? 'Je bewerkt de geselecteerde variant voor de grote foto op de receptpagina. Als deze variant nog niet op de site staat, kies je daarna Als receptfoto gebruiken. Het origineel blijft behouden.'
    : card
    ? 'Je bewerkt de geselecteerde variant voor het receptkaartje. Als deze variant nog niet op de site staat, kies je daarna Als receptfoto gebruiken. Het origineel blijft behouden.'
    : 'Verplaats de foto binnen de brede desktopbanner. De mobiele weergave blijft behouden. De exacte uitsnede hangt af van de schermbreedte.';
  $('crop-help').textContent = imageCrop ? 'Vrij: sleep de zijgrepen voor breedte en hoogte. Kies een preset om de verhouding vast te zetten. Herstellen toont weer de volledige foto.' : 'De selectie geldt alleen voor de desktopcarousel. Herstel oorspronkelijke weergave om terug te gaan.';
  $('crop-ratio-field').hidden = !imageCrop;
  $('crop-preview').classList.toggle('card-crop-preview', imageCrop);
  $('crop-image').src = selected ? selected.imageUrl : item.imageUrl;
  $('crop-image').alt = selected ? `${item.title} — ${selected.label}` : item.title; $('crop-caption').textContent = item.title;
  $('crop-source-image').src = $('crop-image').src;
  const position = selected ? choiceCrop(item, selected, target) : item.desktopPosition;
  cropZoom = position?.zoom ?? 1; cropDrag = null;
  cropFreeRatio = position?.ratio ? position.ratio.split(':').map(Number).reduce((a, b) => a / b) : undefined;
  const preset = !position?.free && [...$('crop-ratio').options].some(option => option.value === position?.ratio);
  $('crop-ratio').value = preset ? position.ratio : 'free';
  $('crop-x').value = position?.x ?? 50; $('crop-y').value = position?.y ?? 50;
  renderCrop(); $('crop-dialog').showModal();
}
async function saveCrop(position) {
  if (!cropItem || state.applying) return;
  state.applying = true;
  $('crop-error').hidden = true; $('crop-save').disabled = true; $('crop-reset').disabled = true;
  $('crop-save').textContent = 'Opslaan…';
  renderSelection(); renderHighlights();
  try {
    const card = cropTarget === 'card';
    const recipe = cropTarget === 'recipe';
    const result = await api(card ? '/api/card-crop' : recipe ? '/api/recipe-crop' : '/api/highlights', card || recipe
      ? { ...cropItem, crop: position ? { ...position, ratio: savedCardRatio(), free: $('crop-ratio').value === 'free' } : null }
      : { action: 'position', ...cropItem, desktopPosition: position });
    $('crop-dialog').close();
    toast((card || recipe) && !result.active ? 'Uitsnede voor de geselecteerde variant opgeslagen. Kies Als receptfoto gebruiken om deze variant op de site te tonen.' : card ? 'Kaartuitsnede opgeslagen. Ververs de site om de wijziging te zien.' : recipe ? 'Receptuitsnede opgeslagen. Ververs de receptpagina om de wijziging te zien.' : 'Carouseluitsnede opgeslagen. Ververs de site om de wijziging te zien.');
    await refresh();
  } catch (error) {
    if ($('crop-dialog').open) {
      $('crop-error').textContent = error.message; $('crop-error').hidden = false;
      $('crop-error').scrollIntoView({ block: 'nearest' });
    } else toast(error.message, true);
  } finally {
    state.applying = false; renderSelection(); renderVariants(); renderHighlights(); renderGallery();
    $('crop-save').disabled = false; $('crop-reset').disabled = false;
    $('crop-save').textContent = 'Uitsnede opslaan';
  }
}
$('recipe-crop').addEventListener('click', () => { if (currentPhoto()) openCrop(currentPhoto(), 'recipe'); });
$('card-crop').addEventListener('click', () => { if (currentPhoto()) openCrop(currentPhoto(), $('preview-mode').value === 'hero' ? 'recipe' : 'card'); });
$('crop-ratio').addEventListener('change', () => {
  if ($('crop-ratio').value === 'free') cropFreeRatio = cropLastAspect || sourceAspect();
  renderCrop();
});
$('crop-x').addEventListener('input', renderCrop);
$('crop-y').addEventListener('input', renderCrop);
$('crop-cancel').addEventListener('click', () => $('crop-dialog').close());
$('crop-reset').addEventListener('click', () => saveCrop(null));
$('crop-form').addEventListener('submit', event => { event.preventDefault(); saveCrop({ x: Number($('crop-x').value), y: Number($('crop-y').value), zoom: cropZoom }); });

function renderJobs() {
  const jobs = state.jobs.filter(j => j.photoId === state.photoId).slice(0, 20);
  $('jobs-section').hidden = !jobs.length; $('jobs').replaceChildren();
  const labels = { queued: 'In de wachtrij', running: 'Bezig…', completed: 'Klaar', failed: 'Mislukt', cancelled: 'Geannuleerd' };
  for (const job of jobs) {
    const card = node('div', `job ${job.status}`);
    const heading = node('div', 'job-heading'); heading.append(node('strong', '', `${job.mode === 'codex' ? 'Codex AI' : 'Fotocorrectie'} · ${labels[job.status]}`));
    if (job.status === 'queued' || job.status === 'running') {
      const cancel = node('button', '', 'Annuleren'); cancel.type = 'button';
      cancel.addEventListener('click', async () => {
        cancel.disabled = true;
        try { await api('/api/cancel', { id: job.id }); await refresh(); }
        catch (error) { toast(error.message, true); cancel.disabled = false; }
      });
      heading.append(cancel);
    }
    card.append(heading, node('p', '', job.error || job.progress));
    const details = node('details'); details.append(node('summary', '', 'Instructies en herkomst'));
    details.append(node('p', '', `Basis: ${job.baseId === job.photoId ? 'Origineel' : job.baseId}. ${new Date(job.createdAt).toLocaleString('nl-NL')}`));
    details.append(node('pre', '', job.mode === 'codex' ? job.prompt : JSON.stringify(job.settings, null, 2)));
    card.append(details); $('jobs').append(card);
  }
}

async function refresh() {
  const result = await api('/api/library');
  const fingerprint = JSON.stringify(result);
  if (fingerprint === state.fingerprint) return;
  const previous = new Set(state.jobs.filter(j => j.status === 'completed').map(j => j.id));
  const initial = !state.fingerprint;
  state.fingerprint = fingerprint; state.photos = result.photos; state.jobs = result.jobs; state.highlights = result.highlights || [];
  if (!state.photos.length) { $('empty').hidden = false; $('editor').hidden = true; return; }
  if (!currentPhoto()) { restoreLocation(); return; }
  const completed = state.jobs.find(j => j.photoId === state.photoId && j.status === 'completed' && !previous.has(j.id));
  if (completed && !initial) { state.selectedId = `job:${completed.id}`; toast('Je nieuwe variant is klaar om te vergelijken.'); }
  renderBaseOptions(currentPhoto(), $('base').value);
  renderList(); renderSelection(); renderVariants(); renderGallery(); renderHighlights(); renderJobs();
  syncLocation();
}

async function confirmApply(imageId) {
  const photo = currentPhoto(); if (!photo || state.applying) return;
  const photoId = photo.id;
  if (!await confirmChange('Deze foto als hoofdfoto gebruiken?', 'De hoofdfoto wordt aangepast voor alle talen van dit recept. Het origineel en je varianten blijven bewaard.')) return;
  state.applying = true; renderSelection();
  try {
    const selected = choices(photo).find(c => c.id === imageId);
    const result = selected && isInGallery(photo, selected)
      ? await api('/api/gallery', { photoId, action: 'hero', filename: selected.appliedFilename || selected.filename })
      : await api('/api/apply', { photoId, imageId });
    state.selectedId = imageId;
    await refresh();
    toast(`Foto toegepast in ${result.locales} talen. Het origineel is bewaard.`);
  } catch (error) { toast(error.message, true); }
  finally { state.applying = false; renderSelection(); renderVariants(); renderGallery(); syncLocation(); }
}

async function confirmChange(title, description, action = 'Bevestigen') {
  $('apply-dialog').querySelector('button[value=apply]').textContent = action;
  $('confirm-title').textContent = title; $('confirm-description').textContent = description;
  const dialog = $('apply-dialog'); dialog.returnValue = ''; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'apply'), { once: true }));
}

async function updateGallery(body) {
  if (state.applying) return;
  if (body.action === 'remove' && !await confirmChange('Deze foto uit de galerij halen?', 'Alleen de verwijzing op de site wordt verwijderd, in alle talen. Het afbeeldingsbestand blijft bewaard. De volgende foto wordt zo nodig de hoofdfoto.')) return;
  state.applying = true; renderSelection(); renderGallery();
  try {
    const result = await api('/api/gallery', body);
    await refresh();
    toast(`Galerij bijgewerkt in ${result.locales} talen.`);
  } catch (error) { toast(error.message, true); }
  finally { state.applying = false; renderSelection(); renderVariants(); renderGallery(); }
}

window.addEventListener('popstate', restoreLocation);
$('search').addEventListener('input', renderList);
$('zoom').addEventListener('change', renderPreviewMode);
$('preview-mode').addEventListener('change', renderPreviewMode);
$('add-highlight').addEventListener('click', () => updateHighlights({ photoId: state.photoId, imageId: state.selectedId, action: 'add' }));
$('add-gallery').addEventListener('click', () => updateGallery({ photoId: state.photoId, imageId: state.selectedId, action: 'add' }));
$('apply').addEventListener('click', () => confirmApply(state.selectedId));
$('restore').addEventListener('click', () => confirmApply(state.photoId));
$('generate-form').addEventListener('input', () => { saveDraft(); renderMode(); });
$('generate-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('generate').disabled = true;
  try {
    const body = { photoId: state.photoId, baseId: $('base').value, mode: mode(), instructions: $('instructions').value, preserve: $('preserve').value,
      style: $('style').value, count: Number($('count').value),
      settings: Object.fromEntries(['brightness', 'contrast', 'saturation', 'sharpness'].map(key => [key, Number($(key).value)])) };
    await api('/api/generate', body); saveDraft(); await refresh();
    toast("Opdracht toegevoegd. Je kunt ondertussen andere foto's bekijken.");
  } catch (error) { toast(error.message, true); }
  finally { renderMode(); }
});

async function start() {
  try {
    const config = await api('/api/config'); state.token = config.token; state.codex = config.codex;
    $('connection').textContent = state.codex.available ? 'Lokaal verbonden · Codex beschikbaar' : 'Lokaal verbonden · fotocorrectie beschikbaar';
    await refresh();
  } catch (error) { $('connection').textContent = 'Geen verbinding'; toast(error.message, true); }
}
await start();
setInterval(async () => {
  try {
    if (!state.token) return await start();
    await refresh();
    $('connection').textContent = state.codex.available ? 'Lokaal verbonden · Codex beschikbaar' : 'Lokaal verbonden · fotocorrectie beschikbaar';
  } catch { $('connection').textContent = 'Verbinding verbroken — start de tool opnieuw'; }
}, 2500);
