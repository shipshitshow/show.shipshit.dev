import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import {
  diffSnapshots,
  fetchRecords,
  formatTable,
  listUploadIds,
  parseArgs,
  pushSnapshot,
  type Snapshot,
  snapshotRedisKey,
  toRecord,
  type VideoRecord,
} from './youtube-sync.ts';

const apiVideo = {
  contentDetails: { duration: 'PT1H2M' },
  id: 'abcdefghijk',
  snippet: {
    categoryId: '28',
    description: 'Hello',
    tags: ['ai'],
    thumbnails: {
      default: { url: 'https://i.ytimg.com/small.jpg', width: 120 },
      maxres: { url: 'https://i.ytimg.com/big.jpg', width: 1280 },
    },
    title: 'A title',
  },
  statistics: { viewCount: '12' },
  status: { privacyStatus: 'private', publishAt: '2026-11-08T16:00:00Z' },
};

const record = (overrides: Partial<VideoRecord> = {}): VideoRecord => ({
  categoryId: '28',
  description: 'Hello',
  id: 'abcdefghijk',
  privacyStatus: 'public',
  tags: [],
  title: 'A title',
  ...overrides,
});

const snapshot = (...videos: VideoRecord[]): Snapshot => ({
  channel: 'main',
  channelTitle: 'Show',
  fetchedAt: '2026-11-06T10:00:00Z',
  videos,
});

test('a record keeps the editable fields and the biggest thumbnail', () => {
  expect(toRecord(apiVideo)).toEqual({
    categoryId: '28',
    description: 'Hello',
    duration: 'PT1H2M',
    id: 'abcdefghijk',
    privacyStatus: 'private',
    publishAt: '2026-11-08T16:00:00Z',
    tags: ['ai'],
    thumbnail: 'https://i.ytimg.com/big.jpg',
    title: 'A title',
    viewCount: 12,
  });
});

test('a diff names edits made outside the repo and ignores view counts', () => {
  const before = snapshot(record(), record({ id: 'gonevideo11' }));
  const after = snapshot(
    record({ title: 'Edited in Studio', viewCount: 99 }),
    record({ id: 'newvideo111' }),
  );
  expect(diffSnapshots(before, after)).toEqual({
    added: ['newvideo111'],
    changed: [
      { fields: ['title'], id: 'abcdefghijk', title: 'Edited in Studio' },
    ],
    removed: ['gonevideo11'],
  });
  expect(diffSnapshots(snapshot(record()), snapshot(record()))).toEqual({
    added: [],
    changed: [],
    removed: [],
  });
  expect(diffSnapshots(undefined, after).added).toEqual([]);
});

test('the table shows privacy and title length', () => {
  expect(formatTable([record({ title: 'Hi' })])).toBe(
    'abcdefghijk  public     2  Hi',
  );
});

test('the arguments pick channels and refuse anything else', () => {
  expect(parseArgs([]).channels).toEqual(['main']);
  expect(parseArgs(['--channel', 'all']).channels).toEqual(['main', 'clips']);
  expect(parseArgs(['--diff-only']).diffOnly).toBe(true);
  expect(() => parseArgs(['--channel', 'x'])).toThrow('must be');
  expect(() => parseArgs(['--write'])).toThrow('Unknown argument');
});

const realFetch = globalThis.fetch;
let calls: Array<{ method: string; url: string }>;

beforeEach(() => {
  calls = [];
  globalThis.fetch = mock(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ method: init?.method ?? 'GET', url });
      const body = url.includes('/channels?')
        ? {
            items: [
              {
                contentDetails: { relatedPlaylists: { uploads: 'UU1' } },
                snippet: { title: 'Show' },
              },
            ],
          }
        : url.includes('/playlistItems?')
          ? url.includes('pageToken=p2')
            ? { items: [{ contentDetails: { videoId: 'bbbbbbbbbbb' } }] }
            : {
                items: [{ contentDetails: { videoId: 'aaaaaaaaaaa' } }],
                nextPageToken: 'p2',
              }
          : { items: [apiVideo] };
      return new Response(JSON.stringify(body));
    },
  ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the sync follows pages and only ever sends GET requests', async () => {
  const { channelTitle, ids } = await listUploadIds('token');
  expect(channelTitle).toBe('Show');
  expect(ids).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  const records = await fetchRecords('token', ids);
  expect(records).toHaveLength(1);
  expect(calls.every((call) => call.method === 'GET')).toBe(true);
  expect(calls.at(-1)?.url).toContain('id=aaaaaaaaaaa,bbbbbbbbbbb');
});

test('pushing to Redis needs a namespace and only goes with --push-redis', () => {
  expect(parseArgs([]).push).toBeUndefined();
  expect(parseArgs(['--push-redis', '--namespace', 'production']).push).toEqual(
    {
      apply: false,
      namespace: 'production',
    },
  );
  expect(
    parseArgs(['--push-redis', '--namespace', 'preview', '--apply']).push,
  ).toEqual({ apply: true, namespace: 'preview' });
  expect(() => parseArgs(['--push-redis'])).toThrow('--namespace');
  expect(() => parseArgs(['--apply'])).toThrow('only go with');
  expect(() => parseArgs(['--namespace', 'production'])).toThrow(
    'only go with',
  );
  expect(() => parseArgs(['--push-redis', '--namespace', 'a b'])).toThrow(
    'needs a name',
  );
  expect(() =>
    parseArgs([
      '--push-redis',
      '--namespace',
      'production',
      '--channel',
      'clips',
    ]),
  ).toThrow('main channel');
  expect(() =>
    parseArgs(['--push-redis', '--namespace', 'production', '--diff-only']),
  ).toThrow('contradict');
});

test('the push is a dry run by default and writes one slim key with --apply', async () => {
  process.env.KV_REST_API_URL = 'https://redis.test';
  process.env.KV_REST_API_TOKEN = 'token';
  const sent: string[][] = [];
  globalThis.fetch = mock(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      sent.push(command);
      return new Response(JSON.stringify({ result: null }));
    },
  ) as unknown as typeof fetch;
  const full = {
    channel: 'main',
    channelTitle: 'Show',
    fetchedAt: '2026-11-06T11:03:27.554Z',
    videos: [record({ description: 'long description' })],
  } as Snapshot;
  const lines: string[] = [];

  expect(
    await pushSnapshot(
      full,
      { apply: false, namespace: 'production' },
      (line) => lines.push(line),
    ),
  ).toBe(false);
  expect(sent.map((command) => command[0])).toEqual(['GET']);
  expect(lines.at(-1)).toContain('Dry run');

  expect(
    await pushSnapshot(
      full,
      { apply: true, namespace: 'production' },
      () => {},
    ),
  ).toBe(true);
  expect(sent.map((command) => command[0])).toEqual(['GET', 'GET', 'SET']);
  const [, key, value] = sent[2];
  expect(key).toBe(snapshotRedisKey('production'));
  expect(key).toBe('sss:production:v1:title-lab-snapshot');
  expect(value).not.toContain('long description');
  expect(JSON.parse(value).videos[0].title).toBe('A title');
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});
