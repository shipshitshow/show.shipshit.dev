/**
 * Save the transcript of every public upload that has none in the repo yet,
 * on the main channel (videos, livestreams, Shorts) and the clips channel.
 *
 * Public data only: yt-dlp reads the channel tabs and each video's captions in
 * the language they were spoken in (the `<lang>-orig` track). YouTube's
 * machine translation of another language is never saved as the transcript:
 * it reads like a translation and loses the speaker markers. No API key, no
 * OAuth, nothing is written to YouTube. Private and scheduled uploads are not
 * listed, so never imported.
 *
 *   bun run transcripts:import                # dry run: list what is missing
 *   bun run transcripts:import --write        # download and save
 *   bun run transcripts:import --write --cache <dir>   # reuse earlier downloads
 *   bun run transcripts:import --retranslated [--write] [--ids a,b]
 *       # replace transcripts flagged `translated` in index.json (or the
 *       # given ids) with the original-language captions
 *
 * Files are keyed on the video id, never the title (see lib/transcripts.ts):
 *   apps/app/data/transcripts/<id>.<lang>.vtt          livestream/video captions
 *   apps/app/data/transcripts/shorts/<id>.<lang>.vtt   Short captions
 *   apps/app/data/transcripts/clean/<date>-<type>-<id>.txt  readable text
 *   apps/app/data/transcripts/index.json               id -> date, type, title, language
 * A retitled video keeps its files; only its index title changes, and every
 * run syncs those titles from the channel listing.
 *
 * yt-dlp must be on PATH, or set YT_DLP to its path. YouTube rate-limits
 * caption downloads (HTTP 429), so requests are spaced out; a rerun with the
 * same --cache picks up where the last one stopped.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CLEAN_DIR,
  cleanFileName,
  displayTitle,
  type IndexEntry,
  parseCleanFileName,
  parseRawFileName,
  rawDir,
  rawFileName,
  readIndex,
  SHORTS_DIR,
  savedIds,
  TRANSCRIPTS_DIR,
  type TranscriptType,
  vttToClean,
  writeIndex,
} from './lib/transcripts.ts';

export type { TranscriptType };
export { displayTitle, vttToClean };

const YT_DLP = process.env.YT_DLP || 'yt-dlp';

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

/**
 * The caption track for a video in the language it was spoken in. yt-dlp
 * names auto-caption originals `<id>.<lang>-orig.vtt`; a track without the
 * `-orig` suffix is YouTube's translation (or a creator upload) and is never
 * picked. English wins when a video somehow has several originals.
 */
export function pickCaptionFile(
  names: string[],
  id: string,
): { lang: string; name: string } | null {
  const found: { lang: string; name: string; original: boolean }[] = [];
  for (const name of names) {
    const match = name.match(/^([\w-]{11})\.([\w-]+?)(-orig)?\.vtt$/);
    if (!match || match[1] !== id) continue;
    found.push({ lang: match[2], name, original: Boolean(match[3]) });
  }
  const originals = found.filter((file) => file.original);
  const picked =
    originals.find((file) => file.lang === 'en') ?? originals[0] ?? null;
  return picked ? { lang: picked.lang, name: picked.name } : null;
}

/** Video ids that have no raw caption file yet, or are not in the index. */
export function planImport(
  listed: ListedVideo[],
  saved: Set<string>,
  indexed: Set<string>,
): { missing: ListedVideo[]; unindexed: ListedVideo[] } {
  return {
    missing: listed.filter((video) => !saved.has(video.id)),
    unindexed: listed.filter(
      (video) => saved.has(video.id) && !indexed.has(video.id),
    ),
  };
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

function cachedCaption(cache: string, id: string) {
  const dir = path.join(cache, 'subs');
  return fs.existsSync(dir) ? pickCaptionFile(fs.readdirSync(dir), id) : null;
}

/** Download metadata for every video, and the original captions when asked. */
function download(videos: ListedVideo[], cache: string, captions: boolean) {
  const metas = readCachedMeta(cache);
  const todo = videos.filter(
    (video) =>
      !metas.has(video.id) || (captions && !cachedCaption(cache, video.id)),
  );
  if (todo.length === 0) return;
  fs.mkdirSync(cache, { recursive: true });
  const urls = path.join(cache, 'urls.txt');
  fs.writeFileSync(
    urls,
    todo.map((v) => `https://www.youtube.com/watch?v=${v.id}`).join('\n'),
  );
  console.log(
    `Downloading ${captions ? 'captions' : 'details'} for ${todo.length} videos…`,
  );
  try {
    execFileSync(
      YT_DLP,
      [
        '--skip-download',
        ...(captions
          ? [
              '--write-subs',
              '--write-auto-subs',
              // Every `<lang>-orig` track: the language that was spoken.
              '--sub-langs',
              '.*-orig',
              '--sub-format',
              'vtt',
              '--sleep-subtitles',
              '3',
            ]
          : []),
        '--sleep-requests',
        '1',
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

/** Remove the files an earlier import saved for this id, whatever they were called. */
function removeSaved(id: string, keep: string[]) {
  for (const dir of [TRANSCRIPTS_DIR, SHORTS_DIR])
    for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      const file = path.join(dir, name);
      if (
        !keep.includes(file) &&
        (parseRawFileName(name)?.id === id || name.startsWith(`${id}-`)) &&
        name.endsWith('.vtt')
      )
        fs.rmSync(file);
    }
  for (const name of fs.readdirSync(CLEAN_DIR)) {
    const file = path.join(CLEAN_DIR, name);
    if (!keep.includes(file) && parseCleanFileName(name)?.id === id)
      fs.rmSync(file);
  }
}

function saveVideo(
  video: ListedVideo,
  meta: VideoMeta,
  vtt: string,
  lang: string,
  existing?: IndexEntry,
): IndexEntry | string {
  const clean = vttToClean(vtt);
  if (!clean) return 'captions are empty';
  const entry: IndexEntry = {
    date: existing?.date ?? meta.date,
    lang,
    title: meta.title || video.title,
    type: existing?.type ?? video.type,
  };
  const raw = path.join(rawDir(entry.type), rawFileName(video.id, lang));
  const cleanPath = path.join(
    CLEAN_DIR,
    cleanFileName(entry.date, entry.type, video.id),
  );
  fs.mkdirSync(rawDir(entry.type), { recursive: true });
  fs.mkdirSync(CLEAN_DIR, { recursive: true });
  fs.writeFileSync(raw, vtt);
  fs.writeFileSync(cleanPath, clean);
  removeSaved(video.id, [raw, cleanPath]);
  return entry;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const retranslated = args.includes('--retranslated');
  const idsIndex = args.indexOf('--ids');
  const onlyIds =
    idsIndex !== -1 ? new Set(args[idsIndex + 1].split(',')) : null;
  const cacheIndex = args.indexOf('--cache');
  const cache =
    cacheIndex !== -1
      ? path.resolve(args[cacheIndex + 1])
      : fs.mkdtempSync(path.join(os.tmpdir(), 'sss-transcripts-'));

  const index = readIndex();
  const listed = listChannel();
  const byId = new Map(listed.map((video) => [video.id, video]));

  // A retitle on YouTube is a one-line index change, never a new file.
  const retitled = listed.filter(
    (video) =>
      index.videos[video.id] && index.videos[video.id].title !== video.title,
  );
  for (const video of retitled)
    console.log(
      `  retitled  ${video.id}  "${index.videos[video.id].title}" → "${video.title}"`,
    );

  let targets: ListedVideo[];
  let unindexed: ListedVideo[] = [];
  if (retranslated) {
    const ids =
      onlyIds ??
      new Set(
        Object.entries(index.videos)
          .filter(([, entry]) => entry.translated)
          .map(([id]) => id),
      );
    targets = [...ids].flatMap((id) => {
      const video = byId.get(id);
      if (!video)
        console.warn(`  ${id} is not on the channel listing, skipped`);
      return video ? [video] : [];
    });
    console.log(`Translated transcripts to replace: ${targets.length}`);
  } else {
    const plan = planImport(
      listed,
      savedIds(),
      new Set(Object.keys(index.videos)),
    );
    targets = plan.missing;
    unindexed = plan.unindexed;
    const counts = { livestream: 0, short: 0, video: 0 };
    for (const video of targets) counts[video.type] += 1;
    console.log(
      `Missing transcripts: ${targets.length} (${counts.video} videos, ${counts.livestream} livestreams, ${counts.short} Shorts)`,
    );
    console.log(`Saved but not indexed yet: ${unindexed.length}`);
  }
  for (const video of targets)
    console.log(`  ${video.type.padEnd(10)} ${video.id}  ${video.title}`);
  for (const video of unindexed)
    console.log(`  index only ${video.id}  ${video.title}`);
  if (!write) {
    console.log('\nDry run. Re-run with --write to download and save.');
    return;
  }

  let added = 0;
  const failed: string[] = [];

  // Captions already in the repo only need their date and title indexed.
  if (unindexed.length) {
    download(unindexed, cache, false);
    const metas = readCachedMeta(cache);
    for (const video of unindexed) {
      const meta = metas.get(video.id);
      const type = video.type;
      const name = fs
        .readdirSync(rawDir(type))
        .find((file) => parseRawFileName(file)?.id === video.id);
      if (!meta || !name) {
        failed.push(`${video.id} (no details or no caption file to index)`);
        continue;
      }
      const lang = parseRawFileName(name)?.lang ?? 'en';
      const vtt = fs.readFileSync(path.join(rawDir(type), name), 'utf8');
      const entry = saveVideo(video, meta, vtt, lang);
      if (typeof entry === 'string') failed.push(`${video.id} (${entry})`);
      else {
        index.videos[video.id] = entry;
        added += 1;
      }
    }
  }

  if (targets.length) {
    download(targets, cache, true);
    const metas = readCachedMeta(cache);
    for (const video of targets) {
      const caption = cachedCaption(cache, video.id);
      const meta = metas.get(video.id);
      if (!meta || !caption) {
        failed.push(
          `${video.id} (no original-language captions downloaded${retranslated ? ', kept the saved text' : ''})`,
        );
        continue;
      }
      const vtt = fs.readFileSync(
        path.join(cache, 'subs', caption.name),
        'utf8',
      );
      const entry = saveVideo(
        video,
        meta,
        vtt,
        caption.lang,
        index.videos[video.id],
      );
      if (typeof entry === 'string') {
        failed.push(`${video.id} (${entry})`);
        continue;
      }
      index.videos[video.id] = entry; // `translated` is dropped: this is the original
      console.log(`  saved ${video.id} in ${caption.lang}`);
      added += 1;
    }
  }

  for (const video of retitled) {
    const entry = index.videos[video.id];
    if (entry) entry.title = video.title;
  }
  writeIndex(index);
  console.log(`\nSaved ${added} transcripts, retitled ${retitled.length}.`);
  if (failed.length) {
    console.log(`Not saved (${failed.length}):`);
    for (const line of failed) console.log(`  ${line}`);
  }
}

if (import.meta.main) main();
