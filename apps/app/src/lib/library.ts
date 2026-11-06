import { currentThumbnail, type ThumbnailItem } from './thumbnail-lab';

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
