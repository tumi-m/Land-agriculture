'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import FieldPlate from './FieldPlate';
import { cx } from '@/lib/format';
import type { ListingImage } from '@/lib/types';

function Frame({ image, seed }: { image: ListingImage; seed: string }) {
  if (image.src) {
    // eslint-disable-next-line @next/next/no-img-element -- feeds supply arbitrary hosts
    return <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />;
  }
  return <FieldPlate image={image} seed={seed} />;
}

export default function ImageCarousel({
  images,
  seed,
  label,
}: {
  images: ListingImage[];
  seed: string;
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const regionId = useId();
  const touchStart = useRef<number | null>(null);
  const closeTarget = useRef<HTMLButtonElement | null>(null);

  const count = images.length;
  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setIndex(count - 1);
      }
    },
    [count, go],
  );

  // The lightbox owns the arrow keys while it is open, wherever focus sits.
  useEffect(() => {
    if (!lightbox) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = previous;
    };
  }, [lightbox, go]);

  if (count === 0) return null;
  const current = images[index];

  return (
    <>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        id={regionId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}
        className="group relative overflow-hidden border border-rule bg-raised focus-visible:outline-offset-0"
      >
        <div className="relative aspect-[16/10] w-full">
          {images.map((image, i) => (
            <div
              key={i}
              aria-hidden={i !== index}
              className={cx(
                'absolute inset-0 transition-opacity duration-300 ease-out',
                i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <Frame image={image} seed={`${seed}-${i}`} />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="absolute inset-0 cursor-zoom-in"
            aria-label={`Enlarge: ${current.alt}`}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink/70 to-transparent p-3">
            <p className="max-w-[60ch] text-xs leading-snug text-paper drop-shadow">
              {current.caption}
            </p>
            <span className="num shrink-0 rounded-sm bg-ink/70 px-2 py-1 text-2xs text-paper">
              {index + 1} / {count}
            </span>
          </div>

          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 border border-rule bg-raised/90 px-2.5 py-3 text-ink opacity-0 transition-opacity duration-150 hover:bg-raised focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 border border-rule bg-raised/90 px-2.5 py-3 text-ink opacity-0 transition-opacity duration-150 hover:bg-raised focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            <Chevron dir="right" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-rule px-3 py-2">
          <div className="flex gap-1.5">
            {images.map((image, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}: ${image.caption}`}
                aria-current={i === index}
                className={cx(
                  'h-1.5 w-8 transition-colors duration-150',
                  i === index ? 'bg-clay' : 'bg-rule hover:bg-faint',
                )}
              />
            ))}
          </div>
          <p className="label hidden sm:block">
            <kbd className="font-mono">←</kbd> <kbd className="font-mono">→</kbd> to browse
          </p>
        </div>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label}, image ${index + 1} of ${count}`}
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4 backdrop-blur-sm animate-fade-up sm:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(false);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="font-mono font-mono text-2xs uppercase tracking-[0.14em] text-paper/70">
              {label} — {index + 1} / {count}
            </p>
            <button
              type="button"
              ref={closeTarget}
              autoFocus
              onClick={() => setLightbox(false)}
              className="border border-paper/30 px-3 py-2 font-mono text-2xs uppercase tracking-[0.12em] text-paper hover:bg-paper/10"
            >
              Close · Esc
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-0 z-10 border border-paper/30 px-3 py-4 text-paper hover:bg-paper/10"
            >
              <Chevron dir="left" />
            </button>
            <div className="max-h-full w-full max-w-5xl overflow-hidden border border-paper/20 bg-surface">
              <div className="aspect-[16/10] w-full">
                <Frame image={current} seed={`${seed}-${index}`} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-0 z-10 border border-paper/30 px-3 py-4 text-paper hover:bg-paper/10"
            >
              <Chevron dir="right" />
            </button>
          </div>

          <p className="mx-auto mt-3 max-w-prose text-center text-sm text-paper/80">
            {current.caption}
          </p>
        </div>
      )}
    </>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
    </svg>
  );
}
