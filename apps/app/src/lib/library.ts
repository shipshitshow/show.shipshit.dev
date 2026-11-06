import { currentThumbnail, type ThumbnailItem } from './thumbnail-lab';

export const LIBRARY_SECTIONS = [
  {
    blurb:
      'Logos, people, products and branding that thumbnail renders draw on.',
    href: '/library/assets',
    id: 'assets',
    title: 'Assets',
  },
  {
    blurb: 'Timelines and tweet slideshows made to show during a livestream.',
    href: '/library/artifacts',
    id: 'artifacts',
    title: 'Artifacts',
  },
  {
    blurb: '16:9 artwork for edited videos and livestreams.',
    href: '/library/thumbnails',
    id: 'thumbnails',
    title: 'Thumbnails',
  },
  {
    blurb: '9:16 artwork for Shorts.',
    href: '/library/covers',
    id: 'covers',
    title: 'Covers',
  },
] as const;
export type GalleryKind = 'thumbnails' | 'covers';
export type ReviewFilter =
  | 'all'
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'revise';
export type ReviewCounts = Record<ReviewFilter, number>;

// Covers are the same catalogue as thumbnails, narrowed to Shorts: one store,
// one review flow, two specs (16:9 vs 9:16).
export function itemsForGallery(
  items: readonly ThumbnailItem[],
  kind: GalleryKind,
): ThumbnailItem[] {
  return items
    .filter((item) => (kind === 'covers') === (item.format === 'short'))
    .sort((a, b) => a.position - b.position);
}
export function reviewStatus(
  item: ThumbnailItem,
): Exclude<ReviewFilter, 'all'> {
  return currentThumbnail(item).review.status;
}
export function reviewCounts(items: readonly ThumbnailItem[]): ReviewCounts {
  const counts: ReviewCounts = {
    all: items.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    revise: 0,
  };
  for (const item of items) counts[reviewStatus(item)] += 1;
  return counts;
}
export function filterGallery(
  items: readonly ThumbnailItem[],
  filters: { format?: ThumbnailItem['format'] | ''; review?: ReviewFilter },
): ThumbnailItem[] {
  return items.filter(
    (item) =>
      (!filters.format || item.format === filters.format) &&
      (!filters.review ||
        filters.review === 'all' ||
        reviewStatus(item) === filters.review),
  );
}
export function thumbnailDownloadUrl(item: ThumbnailItem): string {
  return `/api/labs/thumbnails/${item.id}/assets/${currentThumbnail(item).assetHash}?download=1`;
}
