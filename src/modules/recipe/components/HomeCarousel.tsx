'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LocalImageEditorLink } from './LocalImageEditorLink';
import type { HomeSlide } from '@/lib/home-highlights';

export function HomeCarousel({ slides, locale, initialIndex = 0 }: { slides: HomeSlide[]; locale: string; initialIndex?: number }) {
  const t = useTranslations('home');
  const [selected, setSelected] = useState(initialIndex);
  if (!slides.length) return null;
  const index = selected % slides.length;
  const slide = slides[index];
  const change = (direction: number) => setSelected((index + direction + slides.length) % slides.length);

  return (
    <section
      className="relative mb-10 overflow-hidden rounded-2xl bg-[#17130f] text-white sm:mb-12"
      aria-label={t('featuredRecipes')}
      aria-roledescription={t('carousel')}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          change(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div className="relative isolate flex min-h-[480px] flex-col justify-end sm:min-h-[500px] lg:min-h-[520px]">
        <Image key={slide.filename + slide.slug} src={`/content/recipes/${slide.slug}/images/${slide.filename}`}
          alt={slide.title} fill
          className={slide.desktopPosition
            ? `${slide.portrait ? 'object-contain object-top' : 'object-cover object-center'} md:object-cover md:[object-position:var(--hero-position)] md:[transform:scale(var(--hero-zoom))] md:[transform-origin:var(--hero-position)]`
            : slide.portrait ? 'object-contain object-top md:object-right' : 'object-cover object-center'}
          style={slide.desktopPosition ? { '--hero-position': `${slide.desktopPosition.x}% ${slide.desktopPosition.y}%`, '--hero-zoom': slide.desktopPosition.zoom ?? 1 } as CSSProperties : undefined}
          sizes="(max-width: 1280px) 100vw, 1216px" preload={index === initialIndex} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent md:bg-gradient-to-r md:from-black/85 md:via-black/30 md:to-transparent" />
        <div className="relative max-w-2xl px-6 pb-24 pt-48 sm:px-10 sm:pb-24 md:py-28 lg:px-12" aria-live="polite" aria-atomic="true">
          <p className="mb-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
            <span className="h-px w-7 bg-primary" aria-hidden="true" />{t('featuredRecipes')}
          </p>
          <h1 className="mb-6 text-[1.75rem] leading-[1.14] font-medium tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">{slide.title}</h1>
          <Link className="inline-flex min-h-11 items-center gap-3 border-b border-white/60 pb-1 text-sm font-medium text-white transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            href={`/${locale}/recipe/${slide.slug}`}>{t('viewRecipe')}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
      <LocalImageEditorLink slug={slide.slug} image={slide.filename} view="full" className="right-4 top-4" />
      {slides.length > 1 && (
        <div className="absolute inset-x-6 bottom-5 flex items-center justify-between gap-4 sm:inset-x-10 lg:inset-x-12">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/15 text-white backdrop-blur-sm hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white" aria-label={t('previousHighlight')} onClick={() => change(-1)}><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-1">
            {slides.map((item, i) => (
              <button key={item.slug + '/' + item.filename} type="button" aria-label={t('showHighlight', { number: i + 1, title: item.title })}
                aria-current={i === index ? 'true' : undefined} className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white" onClick={() => setSelected(i)}>
                <span className={`h-2 rounded-full transition-all motion-reduce:transition-none ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
              </button>
            ))}
          </div>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/15 text-white backdrop-blur-sm hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white" aria-label={t('nextHighlight')} onClick={() => change(1)}><ChevronRight className="h-5 w-5" /></button>
        </div>
      )}
    </section>
  );
}
