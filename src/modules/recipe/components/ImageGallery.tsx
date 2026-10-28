'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2, Pause, Play, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LocalImageEditorLink } from './LocalImageEditorLink';
import { config } from '@/lib/config';

interface ImageGalleryProps {
  images: string[];
  slug: string;
  title: string;
  autoRotate?: boolean;
  crop?: import('@/lib/card-image-crops').CardImageCrop;
}

function isExternalUrl(image: string) {
  return /^https?:\/\//.test(image);
}

function getImageSrc(image: string, slug: string) {
  return isExternalUrl(image) ? image : `/content/recipes/${slug}/images/${image}`;
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  query?.addEventListener('change', callback);
  return () => query?.removeEventListener('change', callback);
}
const getReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const getServerMotion = () => false;

/** Reset the gallery when the recipe or ordered image list changes. */
export function ImageGallery(props: ImageGalleryProps) {
  return <RecipeGallery key={JSON.stringify([props.slug, props.images])} {...props} />;
}

function RecipeGallery({ images, slug, title, autoRotate = false, crop }: ImageGalleryProps) {
  const t = useTranslations('recipe');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(!autoRotate);
  const [interacting, setInteracting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerMotion);
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (paused || interacting || expanded || reducedMotion || images.length < 2) return;
    const timer = setInterval(() => setCurrentIndex(index => (index + 1) % images.length), config.imageRotationInterval);
    return () => clearInterval(timer);
  }, [paused, interacting, expanded, reducedMotion, images.length]);

  useEffect(() => {
    const strip = thumbnails.current;
    const selected = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!strip || !selected) return;
    const bounds = strip.getBoundingClientRect();
    const thumbnail = selected.getBoundingClientRect();
    if (thumbnail.left < bounds.left) strip.scrollLeft += thumbnail.left - bounds.left;
    else if (thumbnail.right > bounds.right) strip.scrollLeft += thumbnail.right - bounds.right;
  }, [currentIndex]);

  function select(index: number) {
    setPaused(true);
    setCurrentIndex((index + images.length) % images.length);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (images.length < 2) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  }

  if (!images.length) {
    return <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-muted/50 text-muted-foreground sm:aspect-video"><ImageIcon className="h-10 w-10 opacity-40" aria-hidden="true" /><span className="text-sm">{t('noImage')}</span></div>;
  }

  const currentImage = images[currentIndex];
  const currentCrop = currentIndex === 0 ? crop : undefined;
  const imageLabel = `${title} — ${t('photoNumber', { number: currentIndex + 1 })}`;
  const arrowClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

  return (
    <section aria-label={`${t('gallery')}: ${title}`} onKeyDown={onKeyDown}
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
      <div
        className={currentCrop ? 'relative overflow-hidden bg-muted/50' : 'relative aspect-[4/3] bg-muted/50 sm:aspect-[16/10] lg:aspect-video'}
        style={currentCrop ? { aspectRatio: currentCrop.ratio.replace(':', ' / ') } : undefined}
      >
        <Image src={getImageSrc(currentImage, slug)} alt={imageLabel} fill className={currentCrop ? 'object-cover' : 'object-contain'} style={currentCrop ? { objectPosition: `${currentCrop.x}% ${currentCrop.y}%`, transform: `scale(${currentCrop.zoom ?? 1})`, transformOrigin: `${currentCrop.x}% ${currentCrop.y}%` } : undefined} sizes="(max-width: 1024px) 100vw, 1024px" preload={currentIndex === 0} unoptimized={isExternalUrl(currentImage)} />
        <LocalImageEditorLink slug={slug} image={currentImage} view="hero" className="right-3 top-3" />
        <button ref={trigger} type="button" aria-label={t('viewFullImage')} onClick={() => { dialog.current?.showModal(); setExpanded(true); }} className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Maximize2 className="h-4 w-4" /></button>
      </div>

      {images.length > 1 && (
        <div className="border-t border-border/60 bg-card px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="text-xs font-medium text-muted-foreground">{t('gallery')}</span><span className="text-xs tabular-nums text-muted-foreground" aria-live={paused ? 'polite' : 'off'}>{currentIndex + 1} / {images.length}</span></div>
            <div className="flex items-center gap-2">
              {!reducedMotion && <button type="button" className="mr-1 rounded-full p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" aria-label={paused ? t('playGallery') : t('pauseGallery')} onClick={() => setPaused(value => !value)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>}
              <button type="button" className={arrowClass} aria-label={t('previousImage')} onClick={() => select(currentIndex - 1)}><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" className={arrowClass} aria-label={t('nextImage')} onClick={() => select(currentIndex + 1)}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={thumbnails} className="flex gap-2 overflow-x-auto py-1" aria-label={t('photosCount', { count: images.length })}>
            {images.map((image, index) => <button key={`${image}-${index}`} type="button" aria-label={t('viewImage', { number: index + 1 })} aria-current={index === currentIndex ? 'true' : undefined} onClick={() => select(index)} className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-muted/50 p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-20 sm:w-24 ${index === currentIndex ? 'border-primary' : 'border-transparent hover:border-border'}`}><Image src={getImageSrc(image, slug)} alt="" fill className="object-contain p-1" sizes="96px" unoptimized={isExternalUrl(image)} /></button>)}
          </div>
        </div>
      )}

      <dialog ref={dialog} aria-label={t('viewFullImage')} onClose={() => { setExpanded(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="fixed inset-0 m-auto h-[95dvh] max-h-[95dvh] w-[96vw] max-w-[1600px] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/80">
        {expanded && <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3"><p className="min-w-0 truncate text-sm">{title}</p><button type="button" autoFocus className={arrowClass} aria-label={t('closeImage')} onClick={() => dialog.current?.close()}><X className="h-4 w-4" /></button></div>
          <div className="relative min-h-0 flex-1 bg-muted/50"><Image src={getImageSrc(currentImage, slug)} alt={imageLabel} fill className="object-contain p-3" sizes="96vw" unoptimized={isExternalUrl(currentImage)} /></div>
          {images.length > 1 && <div className="flex shrink-0 items-center justify-center gap-5 border-t border-border p-3"><button type="button" className={arrowClass} aria-label={t('previousImage')} onClick={() => select(currentIndex - 1)}><ChevronLeft className="h-4 w-4" /></button><span className="text-xs tabular-nums" aria-live="polite">{currentIndex + 1} / {images.length}</span><button type="button" className={arrowClass} aria-label={t('nextImage')} onClick={() => select(currentIndex + 1)}><ChevronRight className="h-4 w-4" /></button></div>}
        </div>}
      </dialog>
    </section>
  );
}

/** Keep the complete photo by default; apply an optional crop only to cards. */
export function RecipeThumbnail({ images, slug, title, dimensions, crop }: { images: string[]; slug: string; title: string; dimensions?: { width: number; height: number }; crop?: import('@/lib/card-image-crops').CardImageCrop }) {
  return <div className="relative w-full overflow-hidden bg-muted/50" style={crop ? { aspectRatio: crop.ratio.replace(':', ' / ') } : undefined}>
    {images.length ? <Image src={getImageSrc(images[0], slug)} alt={title} width={crop ? undefined : dimensions?.width ?? 1200} height={crop ? undefined : dimensions?.height ?? 900} fill={Boolean(crop)} className={crop ? 'object-cover' : 'block h-auto w-full'} style={crop ? { objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom ?? 1})`, transformOrigin: `${crop.x}% ${crop.y}%` } : undefined} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 420px" unoptimized={isExternalUrl(images[0])} /> : <div className="flex aspect-[4/3] items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" /></div>}
  </div>;
}
