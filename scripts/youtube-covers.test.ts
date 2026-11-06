import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  coverIdFromFilename,
  formatCoverTable,
  prepareCovers,
  saveLiveThumbnail,
  thumbnailCandidates,
} from './youtube-covers.ts';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'youtube-covers-'));
});
afterEach(() => {
  rmSync(directory, { force: true, recursive: true });
});

// A 1x1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function png(file: string) {
  await Bun.write(path.join(directory, file), PNG);
}

test('the video id is the 11 characters after the date, dashes included', () => {
  expect(coverIdFromFilename('2026-07-08-abcdefghijk-some-slug.png')).toBe(
    'abcdefghijk',
  );
  expect(coverIdFromFilename('2026-07-08--abc-_defgh-slug.png')).toBe(
    '-abc-_defgh',
  );
  expect(coverIdFromFilename('/x/y/2026-07-08-abcdefghijk-s.png')).toBe(
    'abcdefghijk',
  );
  expect(coverIdFromFilename('notes.png')).toBeUndefined();
  expect(coverIdFromFilename('2026-07-08-short-slug.png')).toBeUndefined();
});

test('covers are converted to <id>.jpg and unmatched files are named, not guessed', async () => {
  await png('2026-07-08-abcdefghijk-first.png');
  await png('2026-07-09-lmnopqrstuv-second.png');
  await png('2026-07-09-lmnopqrstuv-second-again.png');
  await png('INDEX.png');
  const out = path.join(directory, 'jpeg');
  const { covers, skipped } = await prepareCovers(directory, out);
  expect(covers.map((cover) => cover.id)).toEqual(['abcdefghijk']);
  expect(covers[0].jpeg).toBe(path.join(out, 'abcdefghijk.jpg'));
  expect(skipped.map((entry) => entry.reason)).toEqual([
    'no video id in the filename',
    expect.stringContaining('2 covers for lmnopqrstuv'),
  ]);
  const header = readFileSync(covers[0].jpeg).subarray(0, 3);
  expect([...header]).toEqual([0xff, 0xd8, 0xff]);
  expect(formatCoverTable(covers, skipped)).toContain('abcdefghijk');
});

test('--id keeps only the named covers and reports a missing one', async () => {
  await png('2026-07-08-abcdefghijk-first.png');
  await png('2026-07-09-lmnopqrstuv-second.png');
  const { covers, skipped } = await prepareCovers(
    directory,
    path.join(directory, 'jpeg'),
    ['lmnopqrstuv', 'zzzzzzzzzzz'],
  );
  expect(covers.map((cover) => cover.id)).toEqual(['lmnopqrstuv']);
  expect(skipped).toEqual([{ file: 'zzzzzzzzzzz', reason: 'no cover file' }]);
});

test('the largest live thumbnail comes first', () => {
  expect(
    thumbnailCandidates({
      default: { url: 'd' },
      maxres: { url: 'm' },
      medium: {},
    }).map((candidate) => candidate.size),
  ).toEqual(['maxres', 'default']);
});

const sizes = {
  high: { url: 'https://img.test/high.jpg' },
  maxres: { url: 'https://img.test/maxres.jpg' },
};
const image = (body = 'jpegbytes', type = 'image/jpeg', status = 200) =>
  new Response(body, { headers: { 'content-type': type }, status });

test('the best available thumbnail is saved', async () => {
  const asked: string[] = [];
  const saved = await saveLiveThumbnail(
    'abcdefghijk',
    sizes,
    path.join(directory, 'backups'),
    (async (url: string) => {
      asked.push(url);
      return image();
    }) as unknown as typeof fetch,
  );
  expect(saved.size).toBe('maxres');
  expect(asked).toEqual(['https://img.test/maxres.jpg']);
  expect(readFileSync(saved.path, 'utf8')).toBe('jpegbytes');
  expect(saved.path).toBe(path.join(directory, 'backups', 'abcdefghijk.jpg'));
});

test('a missing maxres falls back to the next size', async () => {
  const saved = await saveLiveThumbnail(
    'abcdefghijk',
    sizes,
    path.join(directory, 'backups'),
    (async (url: string) =>
      url.includes('maxres')
        ? image('', 'text/html', 404)
        : image('highbytes')) as unknown as typeof fetch,
  );
  expect(saved.size).toBe('high');
  expect(readFileSync(saved.path, 'utf8')).toBe('highbytes');
});

test('no usable thumbnail is an error, and nothing is written', async () => {
  const backups = path.join(directory, 'backups');
  mkdirSync(directory, { recursive: true });
  await expect(
    saveLiveThumbnail('abcdefghijk', undefined, backups),
  ).rejects.toThrow('No live thumbnail URL');
  await expect(
    saveLiveThumbnail('abcdefghijk', sizes, backups, (async () =>
      image('<html>', 'text/html')) as unknown as typeof fetch),
  ).rejects.toThrow('Live thumbnail backup failed');
  await expect(
    saveLiveThumbnail('abcdefghijk', sizes, backups, (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch),
  ).rejects.toThrow('offline');
  expect(await Bun.file(path.join(backups, 'abcdefghijk.jpg')).exists()).toBe(
    false,
  );
});
