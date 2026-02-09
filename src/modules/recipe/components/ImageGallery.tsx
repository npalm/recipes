'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';

interface ImageGalleryProps {
  images: string[];
  slug: string;
  title: string;
  autoRotate?: boolean;
}

/**
 * Check if an image path is an external URL
 */
function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

/**
 * Get the full image source path
 */
function getImageSrc(image: string, slug: string): string {
  if (isExternalUrl(image)) {
    return image;
  }
  return `/content/recipes/${slug}/images/${image}`;
}

/**
 * Recipe Image Gallery with optional auto-rotation
 */
export function ImageGallery({
  images,
  slug,
  title,
  autoRotate = true,
}: ImageGalleryProps) {
  const t = useTranslations();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-rotate images (pause on hover)
  useEffect(() => {
    if (!autoRotate || images.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, config.imageRotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, images.length, isHovered]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <div className="text-center">
          <ImageIcon className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
          <span className="text-sm text-muted-foreground">{t('recipe.noImage')}</span>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const imageSrc = getImageSrc(currentImage, slug);

  return (
    <div
      className="group relative aspect-[16/9] w-full overflow-hidden bg-muted"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={imageSrc}
        alt={`${title} - Image ${currentIndex + 1}`}
        fill
        className="object-cover transition-transform duration-700"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        priority={currentIndex === 0}
        unoptimized={isExternalUrl(currentImage)}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 text-gray-800 opacity-0 shadow-lg transition-all hover:bg-white group-hover:opacity-100"
            aria-label={t('recipe.previousImage')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 text-gray-800 opacity-0 shadow-lg transition-all hover:bg-white group-hover:opacity-100"
            aria-label={t('recipe.nextImage')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Image indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-6 bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={t('recipe.viewImage', { number: index + 1 })}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

/**
 * Thumbnail image for recipe cards
 */
export function RecipeThumbnail({
  images,
  slug,
  title,
}: {
  images: string[];
  slug: string;
  title: string;
}) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  const firstImage = images[0];
  const imageSrc = getImageSrc(firstImage, slug);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
      <Image
        src={imageSrc}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
        unoptimized={isExternalUrl(firstImage)}
      />
      {images.length > 1 && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <ImageIcon className="h-3 w-3" />
          {images.length}
        </div>
      )}
    </div>
  );
}
