import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  formatAge,
  formatCount,
  formatDuration,
  isVideoStatsSnapshot,
  mergeVideoStats,
  parseIsoDuration,
  parseSort,
  sortVideos,
  toVideoStat,
} from '@/lib/video-stats';
import { readVideoStats, writeVideoStats } from '@/lib/video-stats-store';
import { type FakeRedisHarness, installFakeRedis } from './fake-redis';

describe('formatting, as the channel page shows it', () => {
  test('durations', () => {
    expect(parseIsoDuration('PT54M11S')).toBe(3251);
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('PT10S')).toBe(10);
    expect(parseIsoDuration('P0D')).toBe(0);
    expect(parseIsoDuration(undefined)).toBe(0);
    expect(formatDuration(3251)).toBe('54:11');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(7)).toBe('0:07');
    expect(formatDuration(0)).toBe('');
  });

  test('counts', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(682)).toBe('682');
    expect(formatCount(1520)).toBe('1.5K');
    expect(formatCount(4000)).toBe('4K');
    expect(formatCount(12_400)).toBe('12K');
    expect(formatCount(999_700)).toBe('1M');
    expect(formatCount(1_250_000)).toBe('1.3M');
  });

  test('age', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(formatAge('2026-11-06T11:59:30Z', now)).toBe('just now');
    expect(formatAge('2026-11-06T11:00:00Z', now)).toBe('1 hour ago');
    expect(formatAge('2026-11-04T12:00:00Z', now)).toBe('2 days ago');
    expect(formatAge('2026-10-20T12:00:00Z', now)).toBe('2 weeks ago');
    expect(formatAge('2026-08-01T12:00:00Z', now)).toBe('3 months ago');
    expect(formatAge('2025-09-01T12:00:00Z', now)).toBe('1 year ago');
    expect(formatAge('not a date', now)).toBe('');
  });
});

test('numbers come from a YouTube item, and a hidden like count stays unknown', () => {
  expect(
    toVideoStat({
      contentDetails: { duration: 'PT10M34S' },
      id: 'a',
      snippet: { publishedAt: '2026-09-01T10:00:00Z' },
      statistics: { commentCount: '3', likeCount: '65', viewCount: '682' },
    }),
  ).toEqual({
    comments: 3,
    durationSeconds: 634,
    likes: 65,
    publishedAt: '2026-09-01T10:00:00Z',
    views: 682,
  });
  expect(toVideoStat({ id: 'b', statistics: { viewCount: '9' } })).toEqual({
    durationSeconds: 0,
    views: 9,
  });
});

test('a failed channel keeps its last numbers', () => {
  const previous = {
    fetchedAt: '2026-11-05T05:00:00Z',
    videos: {
      clip: { durationSeconds: 30, views: 5 },
      main: { durationSeconds: 100, views: 1 },
    },
  };
  expect(
    mergeVideoStats(
      previous,
      { main: { durationSeconds: 100, views: 2 } },
      '2026-11-06T05:00:00Z',
    ),
  ).toEqual({
    fetchedAt: '2026-11-06T05:00:00Z',
    videos: {
      clip: { durationSeconds: 30, views: 5 },
      main: { durationSeconds: 100, views: 2 },
    },
  });
  expect(mergeVideoStats(null, {}, 'x')).toEqual({
    fetchedAt: 'x',
    videos: {},
  });
});

test('sorting: latest, oldest and popular, unsynced videos last', () => {
  const videos = [
    { date: '2026-10-01', id: 'old', views: 500 },
    { date: '2026-11-01', id: 'new', views: 10 },
    { date: '2026-10-15', id: 'nostats' },
  ];
  const ids = (sort: 'latest' | 'popular' | 'oldest') =>
    sortVideos(videos, sort).map((video) => video.id);
  expect(ids('latest')).toEqual(['new', 'nostats', 'old']);
  expect(ids('oldest')).toEqual(['old', 'nostats', 'new']);
  expect(ids('popular')).toEqual(['old', 'new', 'nostats']);
  expect(videos[0].id).toBe('old');
  expect(parseSort('popular')).toBe('popular');
  expect(parseSort('bogus')).toBe('latest');
  expect(parseSort(undefined)).toBe('latest');
});

describe('the stored copy', () => {
  let harness: FakeRedisHarness;
  beforeEach(() => {
    harness = installFakeRedis();
  });
  afterEach(() => harness.restore());

  test('round-trips through Redis and ignores a malformed value', async () => {
    expect(await readVideoStats()).toBeNull();
    const snapshot = {
      fetchedAt: '2026-11-06T05:00:00Z',
      videos: { abc: { durationSeconds: 60, views: 3 } },
    };
    await writeVideoStats(snapshot);
    expect(harness.redis.strings.has('sss:test:v1:video-stats')).toBe(true);
    expect(await readVideoStats()).toEqual(snapshot);

    harness.redis.strings.set('sss:test:v1:video-stats', { videos: 3 });
    expect(await readVideoStats()).toBeNull();
    expect(isVideoStatsSnapshot({ fetchedAt: 'x', videos: [] })).toBe(false);
  });
});
