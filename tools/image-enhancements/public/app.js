import { buildPrompt } from '/prompts.mjs';

const $ = id => document.getElementById(id);
const state = { photos: [], jobs: [], photoId: null, selectedId: null, token: '', codex: {}, fingerprint: '', applying: false };
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
async function api(url, body) {
  const response = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Token': state.token }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'De opdracht is mislukt.');
  return result;
}
function currentPhoto() { return state.photos.find(p => p.id === state.photoId); }
function choices(photo) { return [{ id: photo.id, imageUrl: photo.imageUrl, label: 'Origineel', filename: photo.filename, kind: 'original' }, ...photo.variants]; }
function isActive(photo, choice) { return (choice.appliedFilename || choice.filename) === photo.active; }
function activeChoice(photo) { return choices(photo).find(choice => isActive(photo, choice)) || choices(photo)[0]; }
function mode() { return document.querySelector('input[name=mode]:checked').value; }

function syncLocation(method = 'replace') {
  if (!currentPhoto()) return;
  const url = new URL(window.location.href);
  url.searchParams.set('photo', state.photoId);
  url.searchParams.set('variant', state.selectedId);
  if ($('preview-mode').value === 'card') url.searchParams.set('view', 'card');
  else url.searchParams.delete('view');
  if ($('preview-mode').value === 'card' && $('card-hover').checked) url.searchParams.set('hover', '1');
  else url.searchParams.delete('hover');
  if (url.href !== window.location.href) window.history[method === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}

function restoreLocation() {
  const params = new URL(window.location.href).searchParams;
  const photo = state.photos.find(p => p.id === params.get('photo')) || state.photos[0];
  if (!photo) return;
  $('preview-mode').value = params.get('view') === 'card' ? 'card' : 'full';
  $('card-hover').checked = params.get('hover') === '1';
  selectPhoto(photo.id, { variantId: params.get('variant'), historyMode: 'replace' });
  renderPreviewMode();
}

function renderPreviewMode() {
  const card = $('preview-mode').value === 'card';
  const comparison = $('photo-comparison');
  comparison.classList.toggle('site-card-preview', card);
  comparison.classList.toggle('site-card-hover', card && $('card-hover').checked);
  $('card-hover-control').hidden = !card;
  $('zoom').disabled = card;
  if (card) $('zoom').checked = false;
  comparison.classList.toggle('zoomed', !card && $('zoom').checked);
  $('preview-explanation').textContent = card
    ? 'Beelduitsnede zoals op de huidige receptkaart: 4:3, vanuit het midden. Controleer vooral glazen, flessen en de rand van het bord. Dit voorbeeld verandert je foto niet.'
    : 'De volledige foto, zonder uitsnede. Wissel naar de site-uitsnede om te controleren of alles in beeld blijft.';
  syncLocation();
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
  renderList(); renderMode(); renderSelection(); renderVariants(); renderJobs();
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
  $('preview-label').textContent = selected.label; $('preview-tag').textContent = isActive(photo, selected) ? 'OP DE SITE' : 'CONCEPT';
  $('selection-note').textContent = isActive(photo, selected) ? 'Deze foto wordt nu op de site gebruikt.' : 'Concept — nog niet op de site toegepast.';
  $('apply').disabled = isActive(photo, selected) || state.applying;
  $('restore').disabled = photo.active === photo.filename || state.applying;
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
    if (isActive(photo, choice)) button.append(node('span', 'active-badge', 'Op de site'));
    button.addEventListener('click', () => { state.selectedId = choice.id; syncLocation('push'); renderSelection(); renderVariants(); });
    button.title = choice.instructions || choice.label;
    list.append(button);
  }
  if (!photo.variants.length) list.append(node('div', 'no-variants', 'Hier komen je varianten. Begin met een subtiele fotocorrectie of geef Codex je eigen instructies.'));
}

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
  state.fingerprint = fingerprint; state.photos = result.photos; state.jobs = result.jobs;
  if (!state.photos.length) { $('empty').hidden = false; $('editor').hidden = true; return; }
  if (!currentPhoto()) { restoreLocation(); return; }
  const completed = state.jobs.find(j => j.photoId === state.photoId && j.status === 'completed' && !previous.has(j.id));
  if (completed && !initial) { state.selectedId = `job:${completed.id}`; toast('Je nieuwe variant is klaar om te vergelijken.'); }
  renderBaseOptions(currentPhoto(), $('base').value);
  renderList(); renderSelection(); renderVariants(); renderJobs();
  syncLocation();
}

async function confirmApply(imageId) {
  const photo = currentPhoto(); if (!photo || state.applying) return;
  const photoId = photo.id;
  const dialog = $('apply-dialog'); dialog.returnValue = ''; dialog.showModal();
  const choice = await new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true }));
  if (choice !== 'apply') return;
  state.applying = true; renderSelection();
  try {
    const result = await api('/api/apply', { photoId, imageId });
    state.selectedId = imageId;
    await refresh();
    toast(`Foto toegepast in ${result.locales} talen. Het origineel is bewaard.`);
  } catch (error) { toast(error.message, true); }
  finally { state.applying = false; renderSelection(); renderVariants(); syncLocation(); }
}

window.addEventListener('popstate', restoreLocation);
$('search').addEventListener('input', renderList);
$('zoom').addEventListener('change', renderPreviewMode);
$('preview-mode').addEventListener('change', renderPreviewMode);
$('card-hover').addEventListener('change', renderPreviewMode);
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
