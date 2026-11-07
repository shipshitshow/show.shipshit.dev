import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
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

// Central cover folder naming: <id>.jpg, <id> <label>.jpg and <id> <label>.png.
test('the central folder names carry the video id up front', () => {
  expect(coverIdFromFilename('abcdefghijk.jpg')).toBe('abcdefghijk');
  expect(coverIdFromFilename('abcdefghijk.JPEG')).toBe('abcdefghijk');
  expect(coverIdFromFilename('abcdefghijk sam-altman-v2-desk.jpg')).toBe(
    'abcdefghijk',
  );
  expect(coverIdFromFilename('abcdefghijk sam altman.png')).toBe('abcdefghijk');
  expect(coverIdFromFilename('/x/_review/-abc-_defgh theo.png')).toBe(
    '-abc-_defgh',
  );
  expect(coverIdFromFilename('2026-07-08-abcdefghijk-some-slug.png')).toBe(
    'abcdefghijk',
  );
});

test('names that only look close to the central pattern are not covers', () => {
  expect(coverIdFromFilename('INDEX.md')).toBeUndefined();
  expect(coverIdFromFilename('abcdefghij.jpg')).toBeUndefined();
  expect(coverIdFromFilename('abcdefghijkl.jpg')).toBeUndefined();
  expect(coverIdFromFilename('abcdefghijk-theo.jpg')).toBeUndefined();
  expect(coverIdFromFilename('abcdefghijk theo.gif')).toBeUndefined();
});

// A JPEG header is all the as-is check reads; the body is filler.
function jpegBytes(size: number) {
  const bytes = Buffer.alloc(size, 7);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
}

async function jpg(file: string, size = 2048) {
  await Bun.write(path.join(directory, file), jpegBytes(size));
}

test('a JPEG within 2 MB is used as it is, with no copy or conversion', async () => {
  await jpg('abcdefghijk.jpg');
  const out = path.join(directory, 'jpeg');
  const { covers, skipped } = await prepareCovers(directory, out);
  expect(skipped).toEqual([]);
  expect(covers).toHaveLength(1);
  expect(covers[0].id).toBe('abcdefghijk');
  expect(covers[0].jpeg).toBe(path.join(directory, 'abcdefghijk.jpg'));
  expect(covers[0].quality).toBeUndefined();
  expect(covers[0].bytes).toBe(2048);
  expect(existsSync(out)).toBe(false);
  expect(formatCoverTable(covers, skipped)).toContain('as is');
});

test('a candidate .jpg and .png of the same name count as one cover, the JPEG wins', async () => {
  await jpg('abcdefghijk sam-altman-v2-desk.jpg');
  await png('abcdefghijk sam-altman-v2-desk.png');
  const { covers, skipped } = await prepareCovers(
    directory,
    path.join(directory, 'jpeg'),
  );
  expect(skipped).toEqual([]);
  expect(covers.map((cover) => path.basename(cover.file))).toEqual([
    'abcdefghijk sam-altman-v2-desk.jpg',
  ]);
  expect(covers[0].quality).toBeUndefined();
});

test('a candidate PNG still goes through the converter', async () => {
  await png('abcdefghijk theo-v2-desk.png');
  const out = path.join(directory, 'jpeg');
  const { covers } = await prepareCovers(directory, out);
  expect(covers).toHaveLength(1);
  expect(covers[0].jpeg).toBe(path.join(out, 'abcdefghijk.jpg'));
  expect(covers[0].quality).toBe(92);
  expect([...readFileSync(covers[0].jpeg).subarray(0, 3)]).toEqual([
    0xff, 0xd8, 0xff,
  ]);
});

test('a JPEG over 2 MB is converted, not used as it is', async () => {
  await jpg('abcdefghijk.jpg', 2 * 1024 * 1024 + 1);
  const { covers, skipped } = await prepareCovers(
    directory,
    path.join(directory, 'jpeg'),
  );
  // The filler is not a decodable image, so the converter rejects it: the point
  // is that the oversized file never reaches the upload as it is.
  expect(covers).toEqual([]);
  expect(skipped).toHaveLength(1);
  expect(skipped[0].file).toBe('abcdefghijk.jpg');
});

test('a .jpg that is not a JPEG goes through the converter', async () => {
  await Bun.write(path.join(directory, 'abcdefghijk.jpg'), PNG);
  const out = path.join(directory, 'jpeg');
  const { covers } = await prepareCovers(directory, out);
  expect(covers).toHaveLength(1);
  expect(covers[0].jpeg).toBe(path.join(out, 'abcdefghijk.jpg'));
  expect(covers[0].quality).toBe(92);
});

test('subfolders are skipped, even ones named like an image', async () => {
  await jpg('abcdefghijk.jpg');
  mkdirSync(path.join(directory, '_archive'));
  await Bun.write(
    path.join(directory, '_archive', 'lmnopqrstuv old.jpg'),
    jpegBytes(64),
  );
  mkdirSync(path.join(directory, 'lmnopqrstuv.jpg'));
  const { covers, skipped } = await prepareCovers(
    directory,
    path.join(directory, 'jpeg'),
  );
  expect(covers.map((cover) => cover.id)).toEqual(['abcdefghijk']);
  expect(skipped).toEqual([]);
});

test('different names for one id stay ambiguous in the central folder', async () => {
  await jpg('abcdefghijk first.jpg');
  await jpg('abcdefghijk second.jpg');
  const { covers, skipped } = await prepareCovers(
    directory,
    path.join(directory, 'jpeg'),
  );
  expect(covers).toEqual([]);
  expect(skipped.map((entry) => entry.reason)).toEqual([
    expect.stringContaining('2 covers for abcdefghijk'),
  ]);
});

test('--id picks one cover out of a central folder', async () => {
  await jpg('abcdefghijk.jpg');
  await jpg('lmnopqrstuv label.jpg');
  const { covers, skipped } = await prepareCovers(
    directory,
    path.join(directory, 'jpeg'),
    ['lmnopqrstuv'],
  );
  expect(covers.map((cover) => cover.id)).toEqual(['lmnopqrstuv']);
  expect(skipped).toEqual([]);
});
