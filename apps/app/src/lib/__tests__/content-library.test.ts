import { describe, expect, test } from 'bun:test';
import {
  buildContentItems,
  classifyUpload,
  contentHref,
  filterContent,
  isMissingTranscript,
  parseChannel,
  type RepoContent,
} from '@/lib/content-library';
import type { VideoStat } from '@/lib/video-stats';

const repo: RepoContent[] = [
  {
    date: '2026-11-03',
    href: '/livestreams/live1/talking-points',
    key: 'livestream:2026-11-03',
    title: 'Prep title',
    transcriptWords: 8500,
    type: 'livestream',
    videoId: 'live1',
  },
  {
    date: '2026-11-10',
    href: '/livestreams/2026-11-10/talking-points',
    key: 'livestream:2026-11-10',
    title: 'Next show',
    type: 'livestream',
    upcoming: true,
    videoId: null,
  },
  {
    date: '2026-10-20',
    href: '/library/transcripts/edit1',
    key: 'video:edit1',
    title: 'An edit',
    transcriptWords: 1600,
    type: 'video',
    videoId: 'edit1',
  },
];

const stats: Record<string, VideoStat> = {
  edit1: { channel: 'main', durationSeconds: 640, views: 190 },
  live1: {
    channel: 'main',
    durationSeconds: 3251,
    likes: 9,
    live: true,
    thumbnail: 'https://i.ytimg.com/vi/live1/maxresdefault.jpg',
    title: 'Black October: Is Your AI SaaS Next?',
    views: 65,
  },
  long1: {
    channel: 'main',
    durationSeconds: 900,
    publishedAt: '2026-09-01T10:00:00Z',
    title: 'Not in the repo',
    views: 12,
  },
  short1: {
    channel: 'clips',
    durationSeconds: 41,
    likes: 14,
    privacy: 'public',
    publishedAt: '2026-10-28T09:00:00Z',
    title: 'The tools are free. The harness is the IP.',
    views: 88,
  },
};

describe('one list for both channels', () => {
  const items = buildContentItems(repo, stats);
  const byKey = (key: string) => items.find((item) => item.key === key);

  test('joins the stats to repo items by video ID and prefers the YouTube title', () => {
    const live = byKey('livestream:2026-11-03');
    expect(live?.views).toBe(65);
    expect(live?.title).toBe('Black October: Is Your AI SaaS Next?');
    expect(live?.thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/live1/maxresdefault.jpg',
    );
    expect(live?.external).toBe(false);
    expect(byKey('video:edit1')?.thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/edit1/hqdefault.jpg',
    );
    expect(byKey('livestream:2026-11-10')?.thumbnailUrl).toBe('/icon.svg');
  });

  test('adds uploads the repo does not know, Shorts included, linking to YouTube', () => {
    expect(byKey('short1')).toMatchObject({
      channel: 'clips',
      date: '2026-10-28',
      external: true,
      href: 'https://www.youtube.com/shorts/short1',
      type: 'short',
    });
    expect(byKey('long1')).toMatchObject({
      href: 'https://www.youtube.com/watch?v=long1',
      type: 'video',
    });
    expect(items).toHaveLength(5);
  });

  test('classifies by length and live flag', () => {
    expect(classifyUpload({ durationSeconds: 180, views: 0 })).toBe('short');
    expect(classifyUpload({ durationSeconds: 181, views: 0 })).toBe('video');
    expect(classifyUpload({ durationSeconds: 0, views: 0 })).toBe('video');
    expect(classifyUpload({ durationSeconds: 60, live: true, views: 0 })).toBe(
      'livestream',
    );
  });

  test('filters by type, channel and missing transcript, then sorts', () => {
    const all = {
      channel: 'all' as const,
      missing: false,
      sort: 'latest' as const,
    };
    expect(
      filterContent(items, all, 'livestream').map((item) => item.key),
    ).toEqual(['livestream:2026-11-10', 'livestream:2026-11-03']);
    expect(
      filterContent(items, { ...all, channel: 'clips' }).map((i) => i.key),
    ).toEqual(['short1']);
    expect(
      filterContent(items, { ...all, missing: true }).map((i) => i.key),
    ).toEqual(['short1', 'long1']);
    expect(
      filterContent(items, { ...all, sort: 'popular' }).map((i) => i.key)[0],
    ).toBe('video:edit1');
    expect(isMissingTranscript(byKey('livestream:2026-11-10')!)).toBe(false);
  });
});

describe('filter links', () => {
  test('keep the other filters and leave defaults out', () => {
    const filters = {
      channel: 'clips' as const,
      missing: false,
      sort: 'latest' as const,
    };
    expect(contentHref('/content', filters)).toBe('/content?channel=clips');
    expect(contentHref('/content/shorts', filters, { sort: 'popular' })).toBe(
      '/content/shorts?channel=clips&sort=popular',
    );
    expect(
      contentHref('/content', filters, { channel: 'all', missing: true }),
    ).toBe('/content?transcript=missing');
    expect(parseChannel('main')).toBe('main');
    expect(parseChannel('nope')).toBe('all');
  });
});

describe('outliers', () => {
  const video = (id: string, views: number, privacy = 'public') => ({
    [id]: { channel: 'main', durationSeconds: 600, privacy, views },
  });
  const items = buildContentItems([], {
    ...video('a', 100),
    ...video('b', 120),
    ...video('c', 80),
    ...video('d', 500),
    ...video('hidden', 9000, 'private'),
    s1: { channel: 'clips', durationSeconds: 40, views: 50 },
  });
  const score = (key: string) =>
    items.find((item) => item.key === key)?.outlier;

  test('compares views with the median of the same channel and type', () => {
    // Median of 80, 100, 120 and 500 is 110.
    expect(score('d')).toBe(4.5);
    expect(score('a')).toBe(0.9);
  });

  test('skips private uploads and groups too small to judge', () => {
    expect(score('hidden')).toBeUndefined();
    expect(score('s1')).toBeUndefined();
  });

  test('sorts by the score', () => {
    const sorted = filterContent(items, {
      channel: 'all',
      missing: false,
      sort: 'outliers',
    });
    expect(sorted[0].key).toBe('d');
    expect(sorted.at(-1)?.outlier).toBeUndefined();
  });
});
