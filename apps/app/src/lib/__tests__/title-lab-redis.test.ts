import { afterEach, beforeEach, expect, test } from 'bun:test';
import { slimSnapshot, type TitleSnapshot } from '@/lib/title-lab';
import {
  readTitleDrafts,
  readTitleSnapshot,
  saveTitleDraft,
} from '@/lib/title-lab-store';
import { type FakeRedisHarness, installFakeRedis } from './fake-redis';

const snapshot: TitleSnapshot = {
  channelTitle: 'Show',
  fetchedAt: '2026-11-06T11:03:27.554Z',
  videos: [
    {
      id: 'aaaaaaaaaaa',
      privacyStatus: 'public',
      title: 'OpenAI Will Bo Bankrupt Before 2030',
    },
    {
      id: 'bbbbbbbbbbb',
      privacyStatus: 'private',
      publishAt: '2026-11-08T16:00:00Z',
      title: 'Scheduled',
    },
  ],
};
const SNAPSHOT_KEY = 'sss:test:v1:title-lab-snapshot';
const DRAFTS_KEY = 'sss:test:v1:title-lab-drafts';

let harness: FakeRedisHarness;
beforeEach(() => {
  harness = installFakeRedis();
});
afterEach(() => harness.restore());

test('slimming drops everything the lab does not show', () => {
  const full = {
    ...snapshot,
    videos: snapshot.videos.map((video) => ({
      ...video,
      description: 'long text',
      viewCount: 5,
    })),
  };
  expect(slimSnapshot(full).videos[0]).toEqual({
    id: 'aaaaaaaaaaa',
    privacyStatus: 'public',
    title: 'OpenAI Will Bo Bankrupt Before 2030',
  });
  expect(slimSnapshot(full).videos[1].publishAt).toBe('2026-11-08T16:00:00Z');
});

test('on Vercel the lab reads the snapshot and drafts from Redis', async () => {
  expect(await readTitleSnapshot()).toBeNull();
  harness.redis.strings.set(SNAPSHOT_KEY, snapshot);
  expect(await readTitleSnapshot()).toEqual(snapshot);

  const drafts = await saveTitleDraft(
    'aaaaaaaaaaa',
    ' OpenAI Will Be Bankrupt Before 2030 ',
  );
  expect(drafts.aaaaaaaaaaa.text).toBe('OpenAI Will Be Bankrupt Before 2030');
  expect(harness.redis.hashes.get(DRAFTS_KEY)?.has('aaaaaaaaaaa')).toBe(true);
});

test('clearing a draft stores null for that field and leaves the others', async () => {
  harness.redis.strings.set(SNAPSHOT_KEY, snapshot);
  await saveTitleDraft('aaaaaaaaaaa', 'One');
  await saveTitleDraft('bbbbbbbbbbb', 'Two');
  const cleared = await saveTitleDraft('aaaaaaaaaaa', '');
  expect(Object.keys(cleared)).toEqual(['bbbbbbbbbbb']);
  expect(Object.keys(await readTitleDrafts())).toEqual(['bbbbbbbbbbb']);
});

test('a draft for a video that is not in the stored snapshot is refused', async () => {
  harness.redis.strings.set(SNAPSHOT_KEY, snapshot);
  await expect(saveTitleDraft('zzzzzzzzzzz', 'Hello')).rejects.toThrow(
    'not in the latest snapshot',
  );
  expect(harness.redis.hashes.get(DRAFTS_KEY)).toBeUndefined();
});

test('without Redis on Vercel the lab is empty and refuses writes', async () => {
  harness.restore();
  process.env.VERCEL = '1';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  expect(await readTitleSnapshot()).toBeNull();
  expect(await readTitleDrafts()).toEqual({});
  await expect(saveTitleDraft('aaaaaaaaaaa', 'Hello')).rejects.toThrow('Redis');
  delete process.env.VERCEL;
});

test('a Redis failure is an error, not an empty lab', async () => {
  harness.redis.failNext('get');
  await expect(readTitleSnapshot()).rejects.toThrow('Redis read failed');
});
