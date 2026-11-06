'use client';

import { cn } from '@shipshitshow/ui';
import { Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  filterGallery,
  type GalleryKind,
  type ReviewFilter,
  reviewStatus,
  thumbnailDownloadUrl,
} from '@/lib/library';
import {
  currentThumbnail,
  paginate,
  type ThumbnailItem,
  thumbnailAssetUrl,
} from '@/lib/thumbnail-lab';

const REVIEW_LABELS: Record<ReviewFilter, string> = {
  all: 'All',
  approved: 'Approved',
  pending: 'To review',
  rejected: 'Rejected',
  revise: 'Revision queued',
};
const FORMAT_LABELS: Record<ThumbnailItem['format'], string> = {
  live: 'Livestream',
  short: 'Short',
  video: 'Video',
};
// Three views are enough: the rest (revise, rejected) live in the Thumbnail Lab.
type View = 'all' | 'approved' | 'todo';
const VIEWS: { id: View; label: string }[] = [
  { id: 'approved', label: 'Approved' },
  { id: 'todo', label: 'To review' },
  { id: 'all', label: 'All' },
];
const inView = (item: ThumbnailItem, view: View) =>
  view === 'all' ||
  (view === 'approved'
    ? reviewStatus(item) === 'approved'
    : reviewStatus(item) === 'pending' || reviewStatus(item) === 'revise');
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
  const [view, setView] = useState<View>('approved');
  const [format, setFormat] = useState<'' | 'video' | 'live'>('');
  const [page, setPage] = useState(1);
  const portrait = kind === 'covers';
  const counts = useMemo(
    () => ({
      all: items.length,
      approved: items.filter((i) => inView(i, 'approved')).length,
      todo: items.filter((i) => inView(i, 'todo')).length,
    }),
    [items],
  );
  const filtered = useMemo(
    () => filterGallery(items, { format }).filter((i) => inView(i, view)),
    [format, items, view],
  );
  const paged = paginate(filtered, page);
  const visible = paged.items;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(({ id, label }) => (
          <button
            aria-pressed={view === id}
            className={chip(view === id)}
            key={id}
            onClick={() => {
              setView(id);
              setPage(1);
            }}
            type="button"
          >
            {label}
            <span className="ml-1.5 text-text-muted">{counts[id]}</span>
          </button>
        ))}
        {portrait ? null : (
          <select
            aria-label="Format"
            className="rounded-full border border-surface-border bg-transparent px-3 py-1 text-xs text-text-muted"
            onChange={(e) => {
              setFormat(e.target.value as '' | 'video' | 'live');
              setPage(1);
            }}
            value={format}
          >
            <option value="">Any format</option>
            <option value="video">Video</option>
            <option value="live">Livestream</option>
          </select>
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
      {paged.pageCount > 1 && (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-center gap-3 text-xs"
        >
          <button
            className={chip(false)}
            disabled={paged.page <= 1}
            onClick={() => setPage(paged.page - 1)}
            type="button"
          >
            Previous
          </button>
          <span className="tabular-nums text-text-muted">
            Page {paged.page} of {paged.pageCount}
          </span>
          <button
            className={chip(false)}
            disabled={paged.page >= paged.pageCount}
            onClick={() => setPage(paged.page + 1)}
            type="button"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
