/**
 * Helpers for applying cover images to videos that are already on YouTube:
 * finding the video id in a cover's filename, converting covers to
 * upload-sized JPEGs, and saving the live thumbnail before it is replaced.
 * Used by youtube-update.ts; nothing here writes to YouTube.
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { convertCoverToJpeg } from '../apps/app/src/lib/cover-jpeg.ts';

export type ThumbnailSizes = Record<string, { url?: string } | undefined>;

export type PreparedCover = {
  bytes: number;
  file: string;
  id: string;
  jpeg: string;
  quality: number;
};

export type SkippedCover = { file: string; reason: string };

const COVER_EXTENSIONS = ['.jpeg', '.jpg', '.png'];
// 2026-07-08-<11-character video id>-<slug>.png. Ids can contain "-", so the
// id is exactly 11 characters after the date, followed by "-".
const COVER_NAME = /^\d{4}-\d{2}-\d{2}-([A-Za-z0-9_-]{11})-/;
const SIZES_BEST_FIRST = ['maxres', 'standard', 'high', 'medium', 'default'];

export function coverIdFromFilename(name: string) {
  return COVER_NAME.exec(basename(name))?.[1];
}

/**
 * Convert every cover in `directory` that matches `ids` (all when omitted)
 * into `outputDirectory/<id>.jpg`. Files without an id in their name and
 * repeated ids are skipped with a reason, never guessed.
 */
export async function prepareCovers(
  directory: string,
  outputDirectory: string,
  ids?: string[],
) {
  const covers: PreparedCover[] = [];
  const skipped: SkippedCover[] = [];
  const files = readdirSync(directory)
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
  for (const [id, matches] of byId) {
    if (ids && !ids.includes(id)) continue;
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
      `${cover.id}  ${basename(cover.file)}  → ${Math.round(cover.bytes / 1024)} KB JPEG (q${cover.quality})`,
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
