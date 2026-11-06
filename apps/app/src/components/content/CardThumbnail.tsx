'use client';

import { cn } from '@shipshitshow/ui';
import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import type { CardVariants } from '@/lib/content-library';

/** A card link: the app's own page, or YouTube in a new tab. */
export function CardLink({
  children,
  className,
  external,
  hidden,
  href,
}: {
  children: ReactNode;
  className?: string;
  external: boolean;
  /** For a second link to the same page: mouse only, skipped by keyboard and screen readers. */
  hidden?: boolean;
  href: string;
}) {
  const props = hidden
    ? { 'aria-hidden': true, className, tabIndex: -1 }
    : { className };
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  ) : (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

const DOT: Record<CardVariants['shown'][number]['status'], string> = {
  approved: 'bg-green-400',
  pending: 'bg-yellow-400',
  revise: 'bg-yellow-400',
};

/**
 * The card's thumbnail, with the Library's versions in a strip below it.
 * Hovering or focusing a version shows it in the frame; clicking one opens
 * it in Library > Thumbnails.
 */
export function CardThumbnail({
  children,
  external,
  href,
  short,
  thumbnailUrl,
  variants,
}: {
  /** Badges laid over the image. */
  children: ReactNode;
  external: boolean;
  href: string;
  short: boolean;
  thumbnailUrl: string;
  variants?: CardVariants;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const hasThumbnail = thumbnailUrl !== '/icon.svg';

  return (
    <>
      <CardLink
        hidden
        external={external}
        href={href}
        className={cn(
          'relative block overflow-hidden bg-surface-elevated',
          short ? 'aspect-[9/16]' : 'aspect-video',
        )}
      >
        {hasThumbnail ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes={
              short
                ? '(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw'
                : '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw'
            }
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Image src="/icon.svg" alt="" width={48} height={48} />
          </div>
        )}
        {preview ? (
          <img
            src={preview}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        {children}
      </CardLink>
      {variants ? (
        <div
          className="flex items-center gap-1.5 px-4 pt-3"
          onMouseLeave={() => setPreview(null)}
        >
          {variants.shown.map((variant) => (
            <Link
              key={variant.id}
              href={variant.href}
              title={variant.label}
              aria-label={`${variant.label}, open in Library`}
              onMouseEnter={() => setPreview(variant.url)}
              onFocus={() => setPreview(variant.url)}
              onBlur={() => setPreview(null)}
              className={cn(
                'relative min-w-0 overflow-hidden rounded-md bg-surface-elevated outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-accent-red/40',
                short ? 'aspect-[9/16] w-1/6' : 'aspect-video w-1/5',
                variant.current
                  ? 'ring-1 ring-white/40'
                  : 'opacity-70 outline outline-1 -outline-offset-1 outline-white/10',
              )}
            >
              <img
                src={variant.url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bottom-0.5 right-0.5 size-1.5 rounded-full ring-1 ring-black/60',
                  DOT[variant.status],
                )}
              />
            </Link>
          ))}
          {variants.more ? (
            <Link
              href={variants.href}
              title="All versions in Library"
              className="rounded-md px-1.5 text-[10px] tabular-nums text-text-muted transition-colors hover:text-text-primary"
            >
              +{variants.more}
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
