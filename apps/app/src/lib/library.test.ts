import { describe, expect, test } from 'bun:test';
import {
  filterGallery,
  itemsForGallery,
  reviewCounts,
  thumbnailDownloadUrl,
} from './library';
import type { ThumbnailItem, ThumbnailReview } from './thumbnail-lab';

function item(
  id: string,
  format: ThumbnailItem['format'],
  review: ThumbnailReview,
  position = 0,
): ThumbnailItem {
  const hash = id.charCodeAt(0).toString(16).padStart(2, '0').repeat(32);
  return {
    currentVersionId: hash,
    format,
    id: id.padEnd(11, 'x'),
    pairIds: [],
    position,
    revision: 0,
    title: id,
    updatedAt: '2026-11-06T00:00:00Z',
    versions: [
      {
        assetHash: hash,
        createdAt: '2026-11-06T00:00:00Z',
        id: hash,
        legacyRevision: null,
        prompt: '',
        review,
        source: 'import',
      },
    ],
    visibility: 'public',
  };
}
const approved: ThumbnailReview = { at: 'now', by: 'v', status: 'approved' };
const items = [
  item('b-live', 'live', { status: 'pending' }, 2),
  item('a-video', 'video', approved, 1),
  item('c-short', 'short', { status: 'pending' }, 3),
  item('d-short', 'short', approved, 0),
];

describe('library galleries', () => {
  test('covers are the Shorts and thumbnails are everything else, in order', () => {
    expect(itemsForGallery(items, 'covers').map((i) => i.title)).toEqual([
      'd-short',
      'c-short',
    ]);
    expect(itemsForGallery(items, 'thumbnails').map((i) => i.title)).toEqual([
      'a-video',
      'b-live',
    ]);
  });
  test('every catalogue item lands in exactly one gallery', () => {
    expect(
      itemsForGallery(items, 'covers').length +
        itemsForGallery(items, 'thumbnails').length,
    ).toBe(items.length);
  });
  test('counts and filters follow the current version review', () => {
    const covers = itemsForGallery(items, 'covers');
    expect(reviewCounts(covers)).toEqual({
      all: 2,
      approved: 1,
      pending: 1,
      rejected: 0,
      revise: 0,
    });
    expect(
      filterGallery(items, { review: 'approved' }).map((i) => i.title),
    ).toEqual(['a-video', 'd-short']);
    expect(filterGallery(items, { format: 'live' }).length).toBe(1);
    expect(filterGallery(items, { format: '', review: 'all' }).length).toBe(4);
  });
  test('download links point at the current version', () => {
    expect(thumbnailDownloadUrl(items[1])).toMatch(
      /^\/api\/labs\/thumbnails\/a-videoxxxx\/assets\/(61){32}\?download=1$/,
    );
  });
});
