import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ThumbnailItem } from '../apps/app/src/lib/thumbnail-lab.ts';
import {
  mergeSnippet,
  mergeStatus,
  needsPublicConfirmation,
  parseArgs,
  parseBatch,
  planChange,
  quotaFor,
  restoreEntry,
  runUpdates,
  selectLabChanges,
  validateChange,
  type YouTubeVideo,
} from './youtube-update.ts';

const ID = 'abcdefghijk';
const NOW = new Date('2026-11-06T10:00:00Z');
const FUTURE = '2026-11-08T16:00:00Z';

const video: YouTubeVideo = {
  snippet: {
    categoryId: '28',
    defaultAudioLanguage: 'en',
    defaultLanguage: 'en',
    description: 'Old description',
    tags: ['ai', 'founders'],
    title: 'Old title',
  },
  status: {
    embeddable: true,
    license: 'youtube',
    privacyStatus: 'public',
    publicStatsViewable: true,
    selfDeclaredMadeForKids: false,
  },
};

function item(overrides: Partial<ThumbnailItem> = {}): ThumbnailItem {
  return {
    currentVersionId: 'v1',
    format: 'video',
    id: ID,
    pairIds: [],
    position: 0,
    revision: 1,
    title: 'Lab title',
    updatedAt: NOW.toISOString(),
    versions: [
      {
        assetHash: 'a'.repeat(64),
        createdAt: NOW.toISOString(),
        id: 'v1',
        prompt: '',
        review: { status: 'approved' },
        source: 'upload',
      },
    ],
    visibility: 'public',
    ...overrides,
  } as ThumbnailItem;
}

const lab = {
  assetPath: (id: string, hash: string) => `/lab/${id}/${hash}.jpg`,
  exists: () => true,
  withTitles: true,
};

test('a title change keeps every other writable snippet field', () => {
  expect(mergeSnippet(video.snippet, { id: ID, title: 'New' })).toEqual({
    ...video.snippet,
    title: 'New',
  });
});

test('an empty tag list clears the tags', () => {
  const snippet = mergeSnippet(video.snippet, { id: ID, tags: [] });
  expect('tags' in snippet).toBe(false);
  expect(planChange(video, { id: ID, tags: [] }).parts).toEqual(['snippet']);
});

test('a video with no tags or description has no diff from the same values', () => {
  const bare: YouTubeVideo = {
    ...video,
    snippet: { categoryId: '28', title: 'Old title' },
  };
  expect(planChange(bare, { id: ID, tags: [] }).parts).toEqual([]);
  expect(planChange(bare, { description: '', id: ID }).parts).toEqual([]);
});

test('a schedule forces private and keeps the writable status fields', () => {
  expect(mergeStatus(video.status, { id: ID, publishAt: FUTURE })).toEqual({
    ...video.status,
    privacyStatus: 'private',
    publishAt: FUTURE,
  });
});

test('an unrelated status change keeps the schedule of a private video', () => {
  const status = {
    ...video.status,
    privacyStatus: 'private' as const,
    publishAt: FUTURE,
  };
  expect(mergeStatus(status, { embeddable: false, id: ID }).publishAt).toBe(
    FUTURE,
  );
});

test('a new privacy drops the schedule, even when it stays private', () => {
  const status = {
    ...video.status,
    privacyStatus: 'private' as const,
    publishAt: FUTURE,
  };
  expect(
    'publishAt' in mergeStatus(status, { id: ID, privacy: 'unlisted' }),
  ).toBe(false);
  expect(
    'publishAt' in mergeStatus(status, { id: ID, privacy: 'private' }),
  ).toBe(false);
});

test('a public video never sends a stale publishAt', () => {
  const status = { ...video.status, publishAt: FUTURE };
  expect('publishAt' in mergeStatus(status, { id: ID, title: 'New' })).toBe(
    false,
  );
});

test('the plan only names the parts that differ', () => {
  expect(planChange(video, { id: ID, title: 'Old title' }).parts).toEqual([]);
  expect(planChange(video, { id: ID, title: 'New' }).parts).toEqual([
    'snippet',
  ]);
  expect(planChange(video, { embeddable: false, id: ID }).parts).toEqual([
    'status',
  ]);
  expect(
    planChange(video, { embeddable: false, id: ID, title: 'New' }).parts,
  ).toEqual(['snippet', 'status']);
});

test('the same schedule in another format is not a change', () => {
  const scheduled: YouTubeVideo = {
    ...video,
    status: { ...video.status, privacyStatus: 'private', publishAt: FUTURE },
  };
  const change = { id: ID, publishAt: '2026-11-08T16:00:00.000Z' };
  expect(planChange(scheduled, change).parts).toEqual([]);
});

test('going public or scheduling needs confirmation', () => {
  const hidden = { ...video.status, privacyStatus: 'private' as const };
  expect(needsPublicConfirmation(hidden, video.status)).toBe(true);
  expect(needsPublicConfirmation(video.status, video.status)).toBe(false);
  expect(
    needsPublicConfirmation(hidden, { ...hidden, publishAt: FUTURE }),
  ).toBe(true);
  expect(
    needsPublicConfirmation(
      { ...hidden, publishAt: FUTURE },
      { ...hidden, publishAt: FUTURE },
    ),
  ).toBe(false);
  expect(needsPublicConfirmation(video.status, hidden)).toBe(false);
});

test('validation catches what YouTube would refuse', () => {
  const errors = (change: Partial<Parameters<typeof validateChange>[0]>) =>
    validateChange({ id: ID, ...change }, NOW);
  expect(errors({})).toEqual([]);
  expect(errors({ id: 'short' })).toHaveLength(1);
  expect(errors({ title: ' ' })).toHaveLength(1);
  expect(errors({ title: 'x'.repeat(100) })).toEqual([]);
  expect(errors({ title: 'x'.repeat(101) })).toHaveLength(1);
  expect(errors({ title: 'a <b>' })).toHaveLength(1);
  expect(errors({ description: 'é'.repeat(2501) })).toHaveLength(1);
  expect(errors({ description: '  ' })).toHaveLength(1);
  expect(errors({ tags: ['x'.repeat(250), 'y'.repeat(249)] })).toEqual([]);
  expect(errors({ tags: ['x'.repeat(250), 'y'.repeat(250)] })).toHaveLength(1);
  expect(errors({ tags: ['x x'] })).toEqual([]);
  expect(errors({ publishAt: 'soon' })).toHaveLength(1);
  expect(errors({ publishAt: '2026-11-01T00:00:00Z' })).toHaveLength(1);
  expect(errors({ privacy: 'public', publishAt: FUTURE })).toHaveLength(1);
  expect(errors({ thumbnail: '/nope/thumb.gif' })).toHaveLength(2);
});

test('validation refuses a thumbnail over 2 MB', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'youtube-update-'));
  const large = path.join(directory, 'large.jpg');
  const fits = path.join(directory, 'fits.jpg');
  writeFileSync(large, Buffer.alloc(2 * 1024 * 1024 + 1));
  writeFileSync(fits, Buffer.alloc(2 * 1024 * 1024));
  expect(validateChange({ id: ID, thumbnail: large }, NOW)).toHaveLength(1);
  expect(validateChange({ id: ID, thumbnail: fits }, NOW)).toEqual([]);
  rmSync(directory, { recursive: true });
});

test('the arguments build one change', () => {
  const options = parseArgs([
    ID,
    '--title',
    'New',
    '--tags',
    'a, b,',
    '--embeddable',
    'false',
    '--apply',
  ]);
  expect(options.apply).toBe(true);
  expect(options.change).toEqual({
    embeddable: false,
    id: ID,
    tags: ['a', 'b'],
    title: 'New',
  });
});

test('a dry run is the default', () => {
  expect(parseArgs([ID, '--title', 'New']).apply).toBe(false);
});

test('bad arguments are refused', () => {
  expect(() => parseArgs([ID])).toThrow('Nothing to change');
  expect(() => parseArgs([])).toThrow('Pass one of');
  expect(() => parseArgs([ID, '--from-lab'])).toThrow('Pass one of');
  expect(() => parseArgs(['--from-lab', '--batch', 'x.json'])).toThrow(
    'Pass one of',
  );
  expect(() => parseArgs([ID, '--title', 'New', '--nope'])).toThrow(
    'Unknown flag',
  );
  expect(() => parseArgs([ID, '--title', '--apply'])).toThrow('needs a value');
  expect(() => parseArgs([ID, '--privacy', 'open'])).toThrow('must be one of');
  expect(() => parseArgs([ID, '--embeddable', 'yes'])).toThrow('true or false');
  expect(() => parseArgs(['--from-lab', '--title', 'New'])).toThrow(
    'not flags',
  );
  expect(() => parseArgs(['--from-lab', '--apply', '--offline'])).toThrow(
    'contradict',
  );
  expect(() => parseArgs([ID, '--title', 'New', '--force'])).toThrow(
    'need --from-lab',
  );
  expect(() => parseArgs([ID, '--title', 'New', '--with-titles'])).toThrow(
    'need --from-lab',
  );
  expect(() => parseArgs([ID, '--a', 'b', 'c'])).toThrow('Unknown flag');
});

test('a batch resolves thumbnails next to the file and refuses unknown fields', () => {
  expect(parseBatch(`[{"id":"${ID}","thumbnail":"t.jpg"}]`, '/batch')).toEqual([
    { id: ID, thumbnail: '/batch/t.jpg' },
  ]);
  expect(() => parseBatch('{}', '/batch')).toThrow('array');
  expect(() => parseBatch(`[{"id":"${ID}","titel":"x"}]`, '/batch')).toThrow(
    'unknown field',
  );
  expect(() => parseBatch(`[{"id":"${ID}","tags":"x"}]`, '/batch')).toThrow(
    'invalid tags',
  );
  expect(() => parseBatch('[{"title":"x"}]', '/batch')).toThrow('no id');
  expect(() => parseBatch(`[{"id":"${ID}"},{"id":"${ID}"}]`, '/batch')).toThrow(
    'repeats',
  );
});

test('the quota estimate counts the read, the update and the thumbnail', () => {
  expect(quotaFor({ id: ID, title: 'New' })).toBe(51);
  expect(quotaFor({ id: ID, thumbnail: 't.jpg' })).toBe(51);
  expect(quotaFor({ id: ID, thumbnail: 't.jpg', title: 'New' })).toBe(101);
});

test('the lab only sends approved video items with a local file', () => {
  const pending = item({ id: 'pendingvid1' });
  pending.versions = [
    {
      ...pending.versions[0],
      review: { status: 'pending' },
    } as ThumbnailItem['versions'][number],
  ];
  const { queued, skipped } = selectLabChanges(
    [item(), item({ format: 'short', id: 'shortvideo1' }), pending],
    {},
    lab,
  );
  expect(queued).toEqual([
    {
      change: {
        id: ID,
        thumbnail: `/lab/${ID}/${'a'.repeat(64)}.jpg`,
        title: 'Lab title',
      },
      sync: { assetHash: 'a'.repeat(64), title: 'Lab title' },
    },
  ]);
  expect(skipped).toEqual([
    { id: 'shortvideo1', reason: 'short' },
    { id: 'pendingvid1', reason: 'review is pending' },
  ]);
});

test('the lab skips what the ledger already has and sends only what moved', () => {
  const synced = {
    assetHash: 'a'.repeat(64),
    at: NOW.toISOString(),
    title: 'Lab title',
  };
  expect(selectLabChanges([item()], { [ID]: synced }, lab)).toEqual({
    queued: [],
    skipped: [{ id: ID, reason: 'already synced' }],
  });
  const renamed = selectLabChanges(
    [item({ title: 'Renamed' })],
    { [ID]: synced },
    lab,
  );
  expect(renamed.queued[0].change).toEqual({ id: ID, title: 'Renamed' });
  const forced = selectLabChanges(
    [item()],
    { [ID]: synced },
    { ...lab, force: true },
  );
  expect(forced.queued[0].change.title).toBe('Lab title');
  expect(forced.queued[0].change.thumbnail).toBeDefined();
});

test('the lab respects --id, shorts opt-in and missing files', () => {
  const short = item({ format: 'short', id: 'shortvideo1' });
  expect(
    selectLabChanges(
      [item(), short],
      {},
      { ...lab, ids: ['shortvideo1', 'unknownvid1'], includeShorts: true },
    ),
  ).toMatchObject({
    queued: [{ change: { id: 'shortvideo1' } }],
    skipped: [{ id: 'unknownvid1', reason: 'not in the lab' }],
  });
  expect(
    selectLabChanges([item()], {}, { ...lab, exists: () => false }).skipped,
  ).toEqual([{ id: ID, reason: 'no local file' }]);
});

const realFetch = globalThis.fetch;
let calls: Array<{ body?: unknown; method: string; url: string }>;
let responses: Record<string, Response | (() => Response)>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
function fails(reason: string, status = 403) {
  return json({ error: { errors: [{ reason }] } }, status);
}

beforeEach(() => {
  calls = [];
  responses = {};
  globalThis.fetch = mock(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({
        body:
          typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        method,
        url,
      });
      const key = url.includes('thumbnails/set') ? 'thumbnail' : method;
      const response = responses[key];
      if (typeof response === 'function') return response();
      return response ?? json({ items: [video] });
    },
  ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const run = (
  queue: Parameters<typeof runUpdates>[0],
  overrides: Partial<Parameters<typeof runUpdates>[1]> = {},
) =>
  runUpdates(queue, {
    apply: true,
    confirmPublic: false,
    log: () => {},
    token: 'token',
    ...overrides,
  });

const writes = () => calls.filter((call) => call.method !== 'GET');

test('an update sends the merged snippet, so YouTube keeps the category', async () => {
  const result = await run([{ change: { id: ID, title: 'New' } }]);
  expect(result.updated).toEqual([ID]);
  expect(writes()).toHaveLength(1);
  expect(writes()[0].url).toContain('part=snippet');
  expect(writes()[0].url).not.toContain('status');
  expect(writes()[0].method).toBe('PUT');
  expect(writes()[0].body).toEqual({
    id: ID,
    snippet: { ...video.snippet, title: 'New' },
  });
});

test('nothing is written when nothing differs', async () => {
  const result = await run([{ change: { id: ID, title: 'Old title' } }]);
  expect(result.unchanged).toEqual([ID]);
  expect(writes()).toEqual([]);
});

test('a dry run reads but never writes', async () => {
  const result = await run(
    [{ change: { id: ID, thumbnail: '/lab/t.jpg', title: 'New' } }],
    { apply: false },
  );
  expect(result.planned).toEqual([ID]);
  expect(writes()).toEqual([]);
});

test('a dry run does not mark an unchanged item as synced', async () => {
  const onSynced = mock(() => {});
  await run(
    [
      {
        change: { id: ID, title: 'Old title' },
        sync: { assetHash: 'a', title: 'x' },
      },
    ],
    { apply: false, onSynced },
  );
  expect(onSynced).not.toHaveBeenCalled();
});

test('a thumbnail alone skips videos.update', async () => {
  responses.thumbnail = () => json({});
  const onSynced = mock(() => {});
  const sync = { assetHash: 'a', title: 'x' };
  await run([{ change: { id: ID, thumbnail: '/lab/t.jpg' }, sync }], {
    onSynced,
  });
  expect(writes()).toHaveLength(1);
  expect(writes()[0].url).toContain(`thumbnails/set?videoId=${ID}`);
  expect(onSynced).toHaveBeenCalledWith(ID, sync);
});

test('a failed thumbnail is a failure and leaves the ledger alone', async () => {
  responses.PUT = () => json({});
  responses.thumbnail = () => fails('invalidImage', 400);
  const onSynced = mock(() => {});
  const result = await run(
    [
      {
        change: { id: ID, thumbnail: '/lab/t.jpg', title: 'New' },
        sync: { assetHash: 'a', title: 'New' },
      },
    ],
    { onSynced },
  );
  expect(result.failed).toEqual([
    { id: ID, message: 'thumbnails.set failed: 400 invalidImage' },
  ]);
  expect(result.updated).toEqual([]);
  expect(onSynced).not.toHaveBeenCalled();
});

test('a failed thumbnail reports the full error body', async () => {
  responses.PUT = () => json({});
  responses.thumbnail = () =>
    json(
      {
        error: {
          code: 400,
          errors: [
            {
              domain: 'youtube.thumbnail',
              message: 'The image is too large.',
              reason: 'imageTooLarge',
            },
          ],
          message: 'The image is too large.',
        },
      },
      400,
    );
  const result = await run([
    { change: { id: ID, thumbnail: '/lab/t.jpg' }, sync: { assetHash: 'a' } },
  ]);
  expect(result.failed).toEqual([
    {
      id: ID,
      message:
        'thumbnails.set failed: 400 imageTooLarge (The image is too large.; domain: youtube.thumbnail)',
    },
  ]);
});

test('one failed video does not stop the others', async () => {
  let reads = 0;
  responses.GET = () =>
    reads++ === 0 ? json({ items: [] }) : json({ items: [video] });
  const result = await run([
    { change: { id: 'missingvid1', title: 'New' } },
    { change: { id: ID, title: 'New' } },
  ]);
  expect(result.failed).toEqual([
    { id: 'missingvid1', message: 'Not found on this channel' },
  ]);
  expect(result.updated).toEqual([ID]);
});

test('running out of quota stops the run and names what was left', async () => {
  responses.PUT = () => fails('quotaExceeded');
  const result = await run([
    { change: { id: ID, title: 'New' } },
    { change: { id: 'secondvideo', title: 'New' } },
    { change: { id: 'thirdvideo1', title: 'New' } },
  ]);
  expect(result.failed).toHaveLength(1);
  expect(result.unprocessed).toEqual(['secondvideo', 'thirdvideo1']);
  expect(writes()).toHaveLength(1);
});

test('the thumbnail rate limit stops the run too', async () => {
  responses.thumbnail = () => fails('uploadRateLimitExceeded', 429);
  const result = await run([
    { change: { id: ID, thumbnail: '/lab/t.jpg' } },
    { change: { id: 'secondvideo', thumbnail: '/lab/t.jpg' } },
  ]);
  expect(result.unprocessed).toEqual(['secondvideo']);
});

test('going public without --confirm-public writes nothing', async () => {
  const hidden: YouTubeVideo = {
    ...video,
    status: { ...video.status, privacyStatus: 'private' },
  };
  responses.GET = () => json({ items: [hidden] });
  const change = { id: ID, privacy: 'public' as const };
  const refused = await run([{ change }]);
  expect(refused.failed[0].message).toContain('--confirm-public');
  expect(writes()).toEqual([]);

  responses.GET = () => json({ items: [hidden] });
  const allowed = await run([{ change }], { confirmPublic: true });
  expect(allowed.updated).toEqual([ID]);
});

test('a title change on a scheduled video does not need --confirm-public', async () => {
  const scheduled: YouTubeVideo = {
    ...video,
    status: { ...video.status, privacyStatus: 'private', publishAt: FUTURE },
  };
  responses.GET = () => json({ items: [scheduled] });
  const result = await run([{ change: { id: ID, title: 'New' } }]);
  expect(result.updated).toEqual([ID]);
  expect(writes()[0].url).not.toContain('status');
});

test('the lab never sends titles unless asked', () => {
  const renamed = item({ title: 'Renamed' });
  const { exists, assetPath } = lab;
  const quiet = selectLabChanges([renamed], {}, { assetPath, exists });
  expect(quiet.queued).toEqual([
    {
      change: { id: ID, thumbnail: `/lab/${ID}/${'a'.repeat(64)}.jpg` },
      sync: { assetHash: 'a'.repeat(64) },
    },
  ]);
  const synced = { assetHash: 'a'.repeat(64), at: NOW.toISOString() };
  expect(
    selectLabChanges([renamed], { [ID]: synced }, { assetPath, exists }),
  ).toEqual({ queued: [], skipped: [{ id: ID, reason: 'already synced' }] });
});

test('the old values of a plan are saved as a batch that puts them back', () => {
  const plan = planChange(video, { id: ID, title: 'New' });
  expect(restoreEntry(video, ID, plan)).toEqual({
    categoryId: '28',
    defaultAudioLanguage: 'en',
    defaultLanguage: 'en',
    description: 'Old description',
    id: ID,
    tags: ['ai', 'founders'],
    title: 'Old title',
  });
  const hide = planChange(video, { id: ID, privacy: 'private' });
  expect(restoreEntry(video, ID, hide)).toEqual({
    embeddable: true,
    id: ID,
    license: 'youtube',
    madeForKids: false,
    privacy: 'public',
    publicStats: true,
  });
  const scheduled: YouTubeVideo = {
    ...video,
    status: { ...video.status, privacyStatus: 'private', publishAt: FUTURE },
  };
  const reschedule = planChange(scheduled, {
    id: ID,
    publishAt: '2026-11-09T16:00:00Z',
  });
  expect(restoreEntry(scheduled, ID, reschedule, NOW)).toMatchObject({
    publishAt: FUTURE,
  });
  expect(restoreEntry(scheduled, ID, reschedule, NOW).privacy).toBeUndefined();
});

test('the backup is saved before the write, and a failed backup blocks it', async () => {
  const order: string[] = [];
  responses.PUT = () => {
    order.push('write');
    return json({});
  };
  await run([{ change: { id: ID, title: 'New' } }], {
    onBackup: (entry) => order.push(`backup ${entry.title}`),
  });
  expect(order).toEqual(['backup Old title', 'write']);

  const blocked = await run([{ change: { id: ID, title: 'New' } }], {
    onBackup: () => {
      throw new Error('disk full');
    },
  });
  expect(blocked.failed[0].message).toBe('disk full');
  expect(order).toEqual(['backup Old title', 'write']);
});

test('a dry run saves no backup', async () => {
  const onBackup = mock(() => {});
  await run([{ change: { id: ID, title: 'New' } }], { apply: false, onBackup });
  expect(onBackup).not.toHaveBeenCalled();
});
