/**
 * Shared helpers for the transcript files under apps/app/data/transcripts.
 *
 * Files are keyed on the YouTube video id, never on the title, because titles
 * change after upload and a title in the file name then creates a second copy
 * of the same video:
 *
 *   transcripts/<id>.<lang>.vtt            raw captions (livestreams, videos)
 *   transcripts/shorts/<id>.<lang>.vtt     raw captions (Shorts)
 *   transcripts/clean/<date>-<type>-<id>.txt  readable text
 *   transcripts/index.json                 id -> date, type, title, language
 *
 * The title lives only in index.json, so a retitle is a one-line edit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { decodeTranscriptEntities } from '../../apps/app/src/lib/transcript-normalize.ts';

export const REPO_ROOT = path.resolve(import.meta.dir, '../..');
export const TRANSCRIPTS_DIR = path.join(
  REPO_ROOT,
  'apps/app/data/transcripts',
);
export const SHORTS_DIR = path.join(TRANSCRIPTS_DIR, 'shorts');
export const CLEAN_DIR = path.join(TRANSCRIPTS_DIR, 'clean');
export const INDEX_PATH = path.join(TRANSCRIPTS_DIR, 'index.json');

export type TranscriptType = 'livestream' | 'short' | 'video';

export interface IndexEntry {
  /** YYYY-MM-DD: when the stream started, else the upload day. */
  date: string;
  /** Language of the caption text, e.g. `en`. */
  lang: string;
  title: string;
  type: TranscriptType;
  /**
   * True while the saved text is YouTube's machine translation of another
   * language's captions. `transcripts:import --retranslated` replaces it with
   * the original-language track and clears the flag.
   */
  translated?: boolean;
}

export interface TranscriptIndex {
  videos: Record<string, IndexEntry>;
  version: 1;
}

/** A YouTube video id: 11 characters of letters, digits, `-` and `_`. */
export const VIDEO_ID = /^[\w-]{11}$/;

export function rawFileName(id: string, lang: string): string {
  return `${id}.${lang}.vtt`;
}

export function cleanFileName(
  date: string,
  type: TranscriptType,
  id: string,
): string {
  return `${date}-${type}-${id}.txt`;
}

export function rawDir(type: TranscriptType): string {
  return type === 'short' ? SHORTS_DIR : TRANSCRIPTS_DIR;
}

/** `<id>.<lang>.vtt` → its id and language; legacy title names return null. */
export function parseRawFileName(
  name: string,
): { id: string; lang: string } | null {
  const match = name.match(/^([\w-]{11})\.([A-Za-z]{2,3}(?:-[\w]+)?)\.vtt$/);
  return match ? { id: match[1], lang: match[2] } : null;
}

/** `<date>-<type>-<id>.txt` → its parts; other names return null. */
export function parseCleanFileName(
  name: string,
): { date: string; id: string; type: TranscriptType } | null {
  const match = name.match(
    /^(\d{4}-\d{2}-\d{2})-(livestream|short|video)-([\w-]{11})\.txt$/,
  );
  return match
    ? { date: match[1], id: match[3], type: match[2] as TranscriptType }
    : null;
}

export function readIndex(): TranscriptIndex {
  if (!fs.existsSync(INDEX_PATH)) return { version: 1, videos: {} };
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) as TranscriptIndex;
}

/** Newest first, then by id, so a re-run never reorders unrelated rows. */
export function writeIndex(index: TranscriptIndex): void {
  const videos = Object.fromEntries(
    Object.entries(index.videos).sort(
      ([idA, a], [idB, b]) =>
        b.date.localeCompare(a.date) || idA.localeCompare(idB),
    ),
  );
  fs.writeFileSync(
    INDEX_PATH,
    `${JSON.stringify({ version: 1, videos }, null, 2)}\n`,
  );
}

/** Drop trailing hashtags such as #shorts; they are not part of the title. */
export function displayTitle(title: string): string {
  return title.replace(/(\s+#[\p{L}\p{N}_]+)+\s*$/u, '').trim() || title.trim();
}

/**
 * Strip inline timing tags, decode HTML entities and drop the rolling caption
 * window's repeats. Raw VTT escapes `>`, `&` and non-breaking spaces as
 * entities; the readable text must not carry them.
 */
export function vttToClean(vtt: string): string {
  const lines: string[] = [];
  let last = '';
  for (const row of vtt.split(/\r?\n/)) {
    if (
      !row ||
      row.startsWith('WEBVTT') ||
      row.startsWith('Kind:') ||
      row.startsWith('Language:') ||
      row.includes('-->')
    )
      continue;
    const text = decodeTranscriptEntities(row.replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (text && text !== last) {
      lines.push(text);
      last = text;
    }
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

/** Decode entities in an already-saved clean file, keeping its line layout. */
export function decodeCleanText(text: string): string {
  return decodeTranscriptEntities(text)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n');
}

/** Video ids that already have a caption file, whatever the file is called. */
export function savedIds(): Set<string> {
  const ids = new Set<string>();
  for (const dir of [TRANSCRIPTS_DIR, SHORTS_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const parsed = parseRawFileName(name);
      const legacy = name.match(/^([\w-]{11})-.+\.vtt$/);
      const id = parsed?.id ?? legacy?.[1];
      if (id) ids.add(id);
    }
  }
  for (const id of Object.keys(readIndex().videos)) ids.add(id);
  return ids;
}
