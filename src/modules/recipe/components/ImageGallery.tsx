'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { config } from '@/lib/config';

interface ImageGalleryProps {
  images: string[];
  slug: string;
  title: string;
  isDemo?: boolean;
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
function getImageSrc(image: string, slug: string, isDemo: boolean): string {
  if (isExternalUrl(image)) {
    return image;
  }
  const basePath = isDemo ? '/content/demo' : '/content/recipes';
  return `${basePath}/${slug}/images/${image}`;
}

/**
 * Recipe Image Gallery with optional auto-rotation
 */
export function ImageGallery({
  images,
  slug,
  title,
  isDemo = false,
  autoRotate = true,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate images
  useEffect(() => {
    if (!autoRotate || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, config.imageRotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const imageSrc = getImageSrc(currentImage, slug, isDemo);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
      <Image
        src={imageSrc}
        alt={`${title} - Image ${currentIndex + 1}`}
        fill
        className="object-cover transition-opacity duration-500"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={currentIndex === 0}
        unoptimized={isExternalUrl(currentImage)}
      />

      {/* Image indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`View image ${index + 1}`}
            />
          ))}
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
  isDemo = false,
}: {
  images: string[];
  slug: string;
  title: string;
  isDemo?: boolean;
}) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-muted">
        <span className="text-sm text-muted-foreground">No image</span>
      </div>
    );
  }

  const firstImage = images[0];
  const imageSrc = getImageSrc(firstImage, slug, isDemo);

  return (
    <div className="relative aspect-video w-full overflow-hidden">
      <Image
        src={imageSrc}
        alt={title}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized={isExternalUrl(firstImage)}
      />
      {images.length > 1 && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          +{images.length - 1}
        </div>
      )}
    </div>
  );
}
