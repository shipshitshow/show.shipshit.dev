#!/usr/bin/env bun
/**
 * Save the transcript of every public upload that has none in the repo yet,
 * on the main channel (videos, livestreams, Shorts) and the clips channel.
 *
 * Public data only: yt-dlp reads the channel tabs and each video's original
 * English captions (`en-orig`). No API key, no OAuth, nothing is written to
 * YouTube. Private and scheduled uploads are not listed, so never imported.
 *
 *   bun run transcripts:import                # dry run: list what is missing
 *   bun run transcripts:import --write        # download and save
 *   bun run transcripts:import --write --cache <dir>   # reuse earlier downloads
 *
 * Files written (the app's /library/transcripts reads them):
 *   apps/app/data/transcripts/<id>-[LIVE] <title>.en.vtt   livestream captions
 *   apps/app/data/transcripts/<id>-<title>.en.vtt          video captions
 *   apps/app/data/transcripts/shorts/<id>-<title>.en.vtt   Short captions
 *   apps/app/data/transcripts/clean/<date>-<type>-<slug>.txt  readable text
 *
 * yt-dlp must be on PATH, or set YT_DLP to its path. YouTube rate-limits
 * caption downloads (HTTP 429), so requests are spaced out; a rerun with the
 * same --cache picks up where the last one stopped.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');
const TRANSCRIPTS_DIR = path.join(REPO_ROOT, 'apps/app/data/transcripts');
const SHORTS_DIR = path.join(TRANSCRIPTS_DIR, 'shorts');
const CLEAN_DIR = path.join(TRANSCRIPTS_DIR, 'clean');
const YT_DLP = process.env.YT_DLP || 'yt-dlp';

export type TranscriptType = 'livestream' | 'short' | 'video';

/** Channel tabs, in the order a video's type is decided. */
export const SOURCES: { tab: string; type: TranscriptType; url: string }[] = [
  {
    tab: 'streams',
    type: 'livestream',
    url: 'https://www.youtube.com/@ShipShitShow/streams',
  },
  {
    tab: 'videos',
    type: 'video',
    url: 'https://www.youtube.com/@ShipShitShow/videos',
  },
  {
    tab: 'shorts',
    type: 'short',
    url: 'https://www.youtube.com/@ShipShitShow/shorts',
  },
  {
    tab: 'clips shorts',
    type: 'short',
    url: 'https://www.youtube.com/@ShipShitShowClips/shorts',
  },
];

/** Drop trailing hashtags such as #shorts; they are not part of the title. */
export function displayTitle(title: string): string {
  return title.replace(/(\s+#[\p{L}\p{N}_]+)+\s*$/u, '').trim() || title.trim();
}

export interface ListedVideo {
  id: string;
  title: string;
  type: TranscriptType;
}

export interface VideoMeta {
  /** YYYY-MM-DD: when the stream started, else the upload day. */
  date: string;
  id: string;
  title: string;
}

/** The same slug the app matches clean files on (normalizeHistoryKey). */
export function slugify(title: string): string {
  return title
    .replace(/^\[[^\]]+\]\s*/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Characters a file name cannot hold, swapped the way yt-dlp does. */
export function safeFileTitle(title: string): string {
  return title
    .replace(/\//g, '⧸')
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/[\\*"<>|]/g, '_')
    .trim();
}

export function rawFileName(video: ListedVideo): string {
  const prefix = video.type === 'livestream' ? '[LIVE] ' : '';
  return `${video.id}-${prefix}${safeFileTitle(video.title)}.en.vtt`;
}

export function cleanFileName(meta: VideoMeta, type: TranscriptType): string {
  return `${meta.date}-${type}-${slugify(meta.title)}.txt`;
}

/** yt-dlp prints NA for a missing field; dates come as YYYYMMDD. */
export function parseMetaLine(line: string): VideoMeta | null {
  const [id, uploadDate, releaseDate, ...titleParts] = line.split('|');
  const day = [releaseDate, uploadDate].find((d) => /^\d{8}$/.test(d ?? ''));
  if (!id || !day) return null;
  return {
    date: `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`,
    id,
    title: displayTitle(titleParts.join('|')),
  };
}

/** Strip inline timing tags and drop the rolling caption window's repeats. */
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
    const text = row.replace(/<[^>]+>/g, '').trim();
    if (text && text !== last) {
      lines.push(text);
      last = text;
    }
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

/** Video ids that already have a caption file in the repo. */
export function savedIds(): Set<string> {
  const ids = new Set<string>();
  for (const dir of [TRANSCRIPTS_DIR, SHORTS_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const match = name.match(/^([\w-]{11})-.+\.vtt$/);
      if (match) ids.add(match[1]);
    }
  }
  return ids;
}

function ytDlp(args: string[]): string {
  return execFileSync(YT_DLP, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** Every public upload, typed by the first tab it appears on. */
function listChannel(): ListedVideo[] {
  const byId = new Map<string, ListedVideo>();
  for (const source of SOURCES) {
    let output = '';
    try {
      output = ytDlp([
        '--flat-playlist',
        '--print',
        '%(id)s|%(title)s',
        source.url,
      ]);
    } catch {
      console.warn(`  could not list ${source.tab}, skipped`);
      continue;
    }
    for (const line of output.split('\n')) {
      const [id, ...title] = line.trim().split('|');
      if (id && !byId.has(id))
        byId.set(id, {
          id,
          title: displayTitle(title.join('|')),
          type: source.type,
        });
    }
  }
  return [...byId.values()];
}

function readCachedMeta(cache: string): Map<string, VideoMeta> {
  const metas = new Map<string, VideoMeta>();
  const file = path.join(cache, 'meta.txt');
  if (!fs.existsSync(file)) return metas;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const meta = parseMetaLine(line.trim());
    if (meta) metas.set(meta.id, meta);
  }
  return metas;
}

function download(videos: ListedVideo[], cache: string) {
  const metas = readCachedMeta(cache);
  const todo = videos.filter(
    (video) =>
      !metas.has(video.id) ||
      !fs.existsSync(path.join(cache, 'subs', `${video.id}.en-orig.vtt`)),
  );
  if (todo.length === 0) return;
  const urls = path.join(cache, 'urls.txt');
  fs.writeFileSync(
    urls,
    todo.map((v) => `https://www.youtube.com/watch?v=${v.id}`).join('\n'),
  );
  console.log(`Downloading captions for ${todo.length} videos…`);
  try {
    execFileSync(
      YT_DLP,
      [
        '--skip-download',
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs',
        'en-orig',
        '--sub-format',
        'vtt',
        '--sleep-requests',
        '1',
        '--sleep-subtitles',
        '3',
        '--ignore-errors',
        '--no-overwrites',
        '--print-to-file',
        '%(id)s|%(upload_date)s|%(release_date)s|%(title)s',
        path.join(cache, 'meta.txt'),
        '-o',
        path.join(cache, 'subs/%(id)s.%(ext)s'),
        '-a',
        urls,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  } catch {
    // --ignore-errors still exits non-zero when one video failed; the
    // per-video checks below report which ones.
  }
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const cacheIndex = args.indexOf('--cache');
  const cache =
    cacheIndex !== -1
      ? path.resolve(args[cacheIndex + 1])
      : fs.mkdtempSync(path.join(os.tmpdir(), 'sss-transcripts-'));

  const saved = savedIds();
  const missing = listChannel().filter((video) => !saved.has(video.id));
  const counts = { livestream: 0, short: 0, video: 0 };
  for (const video of missing) counts[video.type] += 1;
  console.log(
    `Missing transcripts: ${missing.length} (${counts.video} videos, ${counts.livestream} livestreams, ${counts.short} Shorts)`,
  );
  for (const video of missing)
    console.log(`  ${video.type.padEnd(10)} ${video.id}  ${video.title}`);
  if (!write) {
    console.log('\nDry run. Re-run with --write to download and save.');
    return;
  }
  if (missing.length === 0) return;

  download(missing, cache);
  const metas = readCachedMeta(cache);
  const cleanNames = new Set(
    fs.existsSync(CLEAN_DIR) ? fs.readdirSync(CLEAN_DIR) : [],
  );
  let added = 0;
  const failed: string[] = [];
  for (const video of missing) {
    const vttPath = path.join(cache, 'subs', `${video.id}.en-orig.vtt`);
    const meta = metas.get(video.id);
    if (!meta || !fs.existsSync(vttPath)) {
      failed.push(`${video.id} (no captions downloaded)`);
      continue;
    }
    const vtt = fs.readFileSync(vttPath, 'utf8');
    const clean = vttToClean(vtt);
    if (!clean) {
      failed.push(`${video.id} (captions are empty)`);
      continue;
    }
    const cleanName = cleanFileName(meta, video.type);
    if (cleanNames.has(cleanName)) {
      failed.push(`${video.id} (${cleanName} already exists, check by hand)`);
      continue;
    }
    const rawDir = video.type === 'short' ? SHORTS_DIR : TRANSCRIPTS_DIR;
    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(CLEAN_DIR, { recursive: true });
    fs.writeFileSync(path.join(rawDir, rawFileName(video)), vtt);
    fs.writeFileSync(path.join(CLEAN_DIR, cleanName), clean);
    cleanNames.add(cleanName);
    added += 1;
  }
  console.log(`\nSaved ${added} transcripts.`);
  if (failed.length) {
    console.log(`Not saved (${failed.length}):`);
    for (const line of failed) console.log(`  ${line}`);
  }
}

if (import.meta.main) main();
