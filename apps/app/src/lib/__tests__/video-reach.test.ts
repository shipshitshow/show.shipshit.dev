import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  aggregateReach,
  emptyReachSnapshot,
  isVideoReachSnapshot,
  mergeReachRows,
  REACH_RETENTION_DAYS,
} from '@/lib/video-reach';
import {
  getVideoReach,
  readVideoReach,
  writeVideoReach,
} from '@/lib/video-reach-store';
import { videoIdsKey } from '@/lib/youtube/client';
import { type FakeRedisHarness, installFakeRedis } from './fake-redis';

const row = (
  videoId: string,
  day: string,
  impressions: number,
  ctr: number,
) => ({
  ctr,
  day,
  impressions,
  videoId,
});

describe('merging daily reach rows', () => {
  test('a later report replaces the same video and day, not the others', () => {
    const first = mergeReachRows(
      emptyReachSnapshot(),
      [row('a', '2026-11-01', 100, 5), row('a', '2026-11-02', 200, 4)],
      '2026-11-10',
    );
    const second = mergeReachRows(
      first,
      [row('a', '2026-11-01', 150, 6)],
      '2026-11-10',
    );
    expect(second.days.a).toEqual({
      '2026-11-01': [150, 6],
      '2026-11-02': [200, 4],
    });
    // The input is not mutated.
    expect(first.days.a['2026-11-01']).toEqual([100, 5]);
  });

  test('days past the retention window are dropped', () => {
    const merged = mergeReachRows(
      emptyReachSnapshot(),
      [row('old', '2025-01-01', 10, 1), row('new', '2026-11-09', 10, 1)],
      '2026-11-10',
    );
    expect(Object.keys(merged.days)).toEqual(['new']);
    expect(REACH_RETENTION_DAYS).toBe(400);
  });
});

describe('aggregating a window', () => {
  const snapshot = mergeReachRows(
    emptyReachSnapshot(),
    [
      row('a', '2026-11-01', 100, 10),
      row('a', '2026-11-02', 300, 2),
      row('a', '2026-11-09', 999, 50),
      row('b', '2026-11-01', 0, 0),
    ],
    '2026-11-10',
  );

  test('CTR is weighted by impressions, not averaged', () => {
    const reach = aggregateReach(snapshot, ['a'], '2026-11-01', '2026-11-02');
    expect(reach.get('a')?.impressions).toBe(400);
    // (100 * 10% + 300 * 2%) / 400 = 4%, a plain mean would say 6%.
    expect(reach.get('a')?.ctr).toBeCloseTo(4, 10);
  });

  test('the window is inclusive and excludes other days', () => {
    const reach = aggregateReach(snapshot, ['a'], '2026-11-02', '2026-11-09');
    expect(reach.get('a')?.impressions).toBe(1299);
  });

  test('a video with no rows in the window is absent, not zero', () => {
    const reach = aggregateReach(
      snapshot,
      ['a', 'missing'],
      '2026-10-01',
      '2026-10-31',
    );
    expect(reach.size).toBe(0);
  });

  test('zero impressions give a zero CTR without dividing by zero', () => {
    const reach = aggregateReach(snapshot, ['b'], '2026-11-01', '2026-11-01');
    expect(reach.get('b')).toEqual({ ctr: 0, impressions: 0 });
  });
});

describe('the stored snapshot', () => {
  let harness: FakeRedisHarness;
  beforeEach(() => {
    harness = installFakeRedis();
  });
  afterEach(() => harness.restore());

  test('nothing stored reads as an empty snapshot', async () => {
    expect(await readVideoReach()).toEqual(emptyReachSnapshot());
    expect((await getVideoReach(['a'], '2026-11-01', '2026-11-30')).size).toBe(
      0,
    );
  });

  test('a round trip serves reach for the requested videos', async () => {
    await writeVideoReach({
      ...mergeReachRows(
        emptyReachSnapshot(),
        [row('a', '2026-11-05', 50, 8)],
        '2026-11-10',
      ),
      cursors: { main: '2026-11-06T01:00:00Z' },
      fetchedAt: '2026-11-06T05:00:00Z',
    });
    const reach = await getVideoReach(['a', 'b'], '2026-11-01', '2026-11-30');
    expect(reach.get('a')).toEqual({ ctr: 8, impressions: 50 });
    expect(reach.has('b')).toBe(false);
  });

  test('a Redis outage on a strict read throws instead of looking empty', async () => {
    harness.redis.failNext('get');
    await expect(readVideoReach({ strict: true })).rejects.toThrow();
  });

  test('garbage in the key reads as empty', () => {
    expect(isVideoReachSnapshot({ days: 'x' })).toBe(false);
    expect(isVideoReachSnapshot(null)).toBe(false);
  });
});

describe('cache keys for video id sets', () => {
  test('order and duplicates do not matter', () => {
    expect(videoIdsKey(['b', 'a', 'a'])).toBe(videoIdsKey(['a', 'b']));
  });

  test('sets that share their first five ids no longer collide', () => {
    const base = ['v1', 'v2', 'v3', 'v4', 'v5'];
    expect(videoIdsKey([...base, 'v6'])).not.toBe(videoIdsKey([...base, 'v7']));
    expect(videoIdsKey(base)).not.toBe(videoIdsKey([...base, 'v6']));
  });
});
