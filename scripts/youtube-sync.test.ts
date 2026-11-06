import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import {
  diffSnapshots,
  fetchRecords,
  formatTable,
  listUploadIds,
  parseArgs,
  type Snapshot,
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
  expect(() => parseArgs(['--apply'])).toThrow('Unknown argument');
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
