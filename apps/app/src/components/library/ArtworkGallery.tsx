'use client';

import { cn } from '@shipshitshow/ui';
import { Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  filterGallery,
  type GalleryKind,
  type ReviewFilter,
  reviewCounts,
  reviewStatus,
  thumbnailDownloadUrl,
} from '@/lib/library';
import {
  currentThumbnail,
  type ThumbnailItem,
  thumbnailAssetUrl,
} from '@/lib/thumbnail-lab';

const REVIEW_LABELS: Record<ReviewFilter, string> = {
  all: 'All',
  approved: 'Approved',
  pending: 'To review',
  revise: 'Revision queued',
};
const FORMAT_LABELS: Record<ThumbnailItem['format'], string> = {
  live: 'Livestream',
  short: 'Short',
  video: 'Video',
};
const chip = (active: boolean) =>
  cn(
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'border-accent-red bg-accent-red/10 text-text-primary'
      : 'border-surface-border text-text-muted hover:border-accent-red/50',
  );

export function ArtworkGallery({
  items,
  kind,
}: {
  items: ThumbnailItem[];
  kind: GalleryKind;
}) {
  const [review, setReview] = useState<ReviewFilter>('all');
  const [format, setFormat] = useState<'' | 'video' | 'live'>('');
  const portrait = kind === 'covers';
  const counts = useMemo(() => reviewCounts(items), [items]);
  const visible = useMemo(
    () => filterGallery(items, { format, review }),
    [format, items, review],
  );
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(REVIEW_LABELS) as ReviewFilter[]).map((value) => (
          <button
            aria-pressed={review === value}
            className={chip(review === value)}
            key={value}
            onClick={() => setReview(value)}
            type="button"
          >
            {REVIEW_LABELS[value]}
            <span className="ml-1.5 text-text-muted">{counts[value]}</span>
          </button>
        ))}
        {portrait ? null : (
          <>
            <span
              aria-hidden="true"
              className="mx-1 h-4 w-px bg-surface-border"
            />
            {(['', 'video', 'live'] as const).map((value) => (
              <button
                aria-pressed={format === value}
                className={chip(format === value)}
                key={value || 'all'}
                onClick={() => setFormat(value)}
                type="button"
              >
                {value ? FORMAT_LABELS[value] : 'Any format'}
              </button>
            ))}
          </>
        )}
        <Link
          className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          href="/labs/thumbnails"
        >
          Review in Thumbnail Lab
          <ExternalLink size={11} />
        </Link>
      </div>
      {visible.length ? (
        <ul
          className={cn(
            'mt-6 grid gap-x-5 gap-y-8',
            portrait
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
          )}
        >
          {visible.map((item) => (
            <li className="min-w-0" key={item.id}>
              <img
                alt={item.title}
                className={cn(
                  'w-full rounded-xl bg-surface-elevated object-cover outline outline-1 -outline-offset-1 outline-white/10',
                  portrait ? 'aspect-[9/16]' : 'aspect-video',
                )}
                loading="lazy"
                src={thumbnailAssetUrl(item, currentThumbnail(item))}
              />
              <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-5">
                {item.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-text-muted">
                <span>{REVIEW_LABELS[reviewStatus(item)]}</span>
                {portrait ? null : <span>{FORMAT_LABELS[item.format]}</span>}
                <code>{item.id}</code>
                <a
                  aria-label={'Download ' + item.title}
                  className="ml-auto hover:text-text-primary"
                  href={thumbnailDownloadUrl(item)}
                >
                  <Download size={12} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-20 text-center text-sm text-text-muted">
          {items.length
            ? 'Nothing matches these filters.'
            : portrait
              ? 'No Short covers imported yet.'
              : 'No thumbnails imported yet.'}
        </p>
      )}
    </div>
  );
}
