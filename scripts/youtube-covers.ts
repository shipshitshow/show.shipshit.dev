/**
 * Helpers for applying cover images to videos that are already on YouTube:
 * finding the video id in a cover's filename, converting covers to
 * upload-sized JPEGs, and saving the live thumbnail before it is replaced.
 * Used by youtube-update.ts; nothing here writes to YouTube.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import {
  convertCoverToJpeg,
  MAX_COVER_BYTES,
} from '../apps/app/src/lib/cover-jpeg.ts';

export type ThumbnailSizes = Record<string, { url?: string } | undefined>;

export type PreparedCover = {
  bytes: number;
  file: string;
  id: string;
  jpeg: string;
  /** Absent when the source JPEG was within the limit and is used as-is. */
  quality?: number;
};

export type SkippedCover = { file: string; reason: string };

const COVER_EXTENSIONS = ['.jpeg', '.jpg', '.png'];
// 2026-07-08-<11-character video id>-<slug>.png. Ids can contain "-", so the
// id is exactly 11 characters after the date, followed by "-".
const COVER_NAME = /^\d{4}-\d{2}-\d{2}-([A-Za-z0-9_-]{11})-/;
// Central cover folder: <id>.jpg (validated, upload-ready) or
// <id> <label>.jpg / .png (candidates). The id is followed by a space or the
// extension, so a longer name never matches by accident.
const CENTRAL_NAME = /^([A-Za-z0-9_-]{11})(?: .+)?\.(?:jpe?g|png)$/i;
const SIZES_BEST_FIRST = ['maxres', 'standard', 'high', 'medium', 'default'];

export function coverIdFromFilename(name: string) {
  const file = basename(name);
  return (COVER_NAME.exec(file) ?? CENTRAL_NAME.exec(file))?.[1];
}

const isJpeg = (file: string) =>
  ['.jpeg', '.jpg'].includes(extname(file).toLowerCase());

function hasJpegHeader(path: string) {
  const header = Buffer.alloc(3);
  const handle = openSync(path, 'r');
  try {
    readSync(handle, header, 0, 3, 0);
  } finally {
    closeSync(handle);
  }
  return header.equals(Buffer.from([0xff, 0xd8, 0xff]));
}

/**
 * Candidates ship as a .jpg and a .png of the same name; the JPEG wins so the
 * pair counts as one cover. Different names for one id stay ambiguous.
 */
function collapseSameName(files: string[]) {
  const byStem = new Map<string, string>();
  for (const file of files) {
    const stem = file
      .slice(0, file.length - extname(file).length)
      .toLowerCase();
    const kept = byStem.get(stem);
    if (!kept || (isJpeg(file) && !isJpeg(kept))) byStem.set(stem, file);
  }
  return [...byStem.values()];
}

/**
 * Prepare every cover in `directory` (not its subfolders) that matches `ids`
 * (all when omitted). A JPEG within the upload limit is used as it is; any
 * other cover is converted into `outputDirectory/<id>.jpg`. Files without an
 * id in their name and repeated ids are skipped with a reason, never guessed.
 */
export async function prepareCovers(
  directory: string,
  outputDirectory: string,
  ids?: string[],
) {
  const covers: PreparedCover[] = [];
  const skipped: SkippedCover[] = [];
  const files = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => COVER_EXTENSIONS.includes(extname(name).toLowerCase()))
    .sort();
  const byId = new Map<string, string[]>();
  for (const file of files) {
    const id = coverIdFromFilename(file);
    if (!id) {
      skipped.push({ file, reason: 'no video id in the filename' });
      continue;
    }
    byId.set(id, [...(byId.get(id) ?? []), file]);
  }
  for (const id of ids ?? []) {
    if (!byId.has(id)) skipped.push({ file: id, reason: 'no cover file' });
  }
  for (const [id, all] of byId) {
    if (ids && !ids.includes(id)) continue;
    const matches = collapseSameName(all);
    if (matches.length > 1) {
      skipped.push({
        file: matches.join(', '),
        reason: `${matches.length} covers for ${id}; keep one`,
      });
      continue;
    }
    const file = resolve(directory, matches[0]);
    const jpeg = resolve(outputDirectory, `${id}.jpg`);
    try {
      if (
        isJpeg(file) &&
        statSync(file).size <= MAX_COVER_BYTES &&
        hasJpegHeader(file)
      ) {
        covers.push({ bytes: statSync(file).size, file, id, jpeg: file });
        continue;
      }
      const { bytes, quality } = await convertCoverToJpeg(file, jpeg);
      covers.push({ bytes, file, id, jpeg, quality });
    } catch (error) {
      skipped.push({
        file: matches[0],
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { covers, skipped };
}

export function formatCoverTable(
  covers: PreparedCover[],
  skipped: SkippedCover[],
) {
  const rows = covers.map(
    (cover) =>
      `${cover.id}  ${basename(cover.file)}  → ${Math.round(cover.bytes / 1024)} KB JPEG (${cover.quality === undefined ? 'as is' : `q${cover.quality}`})`,
  );
  const rest = skipped.map(
    (entry) => `skipped  ${entry.file}: ${entry.reason}`,
  );
  return [...rows, ...rest].join('\n');
}

/** Live thumbnail URLs, the largest first. */
export function thumbnailCandidates(thumbnails?: ThumbnailSizes) {
  return SIZES_BEST_FIRST.flatMap((size) => {
    const url = thumbnails?.[size]?.url;
    return url ? [{ size, url }] : [];
  });
}

/**
 * Save the best available live thumbnail to `directory/<id>.jpg` and return
 * the size it came from. Throws when none can be downloaded, so the caller
 * can refuse to replace a thumbnail it has no copy of.
 */
export async function saveLiveThumbnail(
  id: string,
  thumbnails: ThumbnailSizes | undefined,
  directory: string,
  download: typeof fetch = fetch,
) {
  const candidates = thumbnailCandidates(thumbnails);
  if (!candidates.length) throw new Error('No live thumbnail URL to back up');
  const problems: string[] = [];
  for (const { size, url } of candidates) {
    try {
      const response = await download(url);
      if (!response.ok) {
        problems.push(`${size}: ${response.status}`);
        continue;
      }
      if (!response.headers.get('content-type')?.startsWith('image/')) {
        problems.push(`${size}: not an image`);
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) {
        problems.push(`${size}: empty`);
        continue;
      }
      mkdirSync(directory, { recursive: true });
      const path = resolve(directory, `${id}.jpg`);
      writeFileSync(path, bytes);
      if (!existsSync(path)) throw new Error('the backup was not written');
      return { path, size };
    } catch (error) {
      problems.push(
        `${size}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  throw new Error(`Live thumbnail backup failed (${problems.join('; ')})`);
}
