'use client';

import { useSyncExternalStore } from 'react';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

type EditorStatus = { available: boolean; origin?: string; images?: Record<string, { photo: string; variant: string }> };
const unavailable: EditorStatus = { available: false };
let status = unavailable;
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | undefined;
let pending = false;

function isLocalDevelopment() {
  return process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}
async function refreshEditor() {
  if (pending) return;
  pending = true;
  try {
    const response = await fetch('/api/local-image-editor', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    status = response.ok ? await response.json() : unavailable;
  } catch {
    status = unavailable;
  } finally {
    pending = false;
    for (const listener of listeners) listener();
  }
}
function subscribe(listener: () => void) {
  if (!isLocalDevelopment()) return () => {};
  listeners.add(listener);
  if (!interval) {
    void refreshEditor();
    interval = setInterval(() => { void refreshEditor(); }, 10000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(interval); interval = undefined; }
  };
}

export function LocalImageEditorLink({ slug, image, view, className = '' }: { slug: string; image?: string; view: 'card' | 'hero' | 'full'; className?: string }) {
  const t = useTranslations('imageEditor');
  const editor = useSyncExternalStore(subscribe, () => status, () => unavailable);
  const selection = image && editor.images?.[`${slug}/${image}`];
  if (process.env.NODE_ENV !== 'development' || !editor.available || !editor.origin || !selection) return null;
  const params = new URLSearchParams({ ...selection, view });
  return <a href={`${editor.origin}/?${params}`} target="_blank" rel="noopener noreferrer"
    aria-label={t(view)} title={t(view)}
    className={`absolute z-10 inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/30 bg-black/70 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}>
    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{t('open')}
  </a>;
}
