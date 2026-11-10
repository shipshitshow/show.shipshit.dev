#!/usr/bin/env bun
/**
 * One-off migration from title-keyed to id-keyed transcript files (see
 * scripts/lib/transcripts.ts for the layout). Safe to re-run: files that are
 * already id-keyed are left alone.
 *
 *   bun scripts/migrate-transcripts.ts            # dry run, prints the plan
 *   bun scripts/migrate-transcripts.ts --write    # rename, decode, write index
 *
 * What it does:
 *  - renames `<id>-<title>.en.vtt` to `<id>.en.vtt` (raw VTT stays untouched:
 *    VTT escapes `>` and `&` as entities by design);
 *  - renames each clean file to `<date>-<type>-<id>.txt` and decodes the HTML
 *    entities the older imports left in it (`&gt;&gt;`, `&nbsp;`, `&amp;`);
 *  - collapses duplicate copies of one video (a retitle left two files) when
 *    their text is identical, and stops when it is not;
 *  - writes transcripts/index.json and points channel-inventory.json at the
 *    new paths.
 *
 * Clean files with no matching video id (competitor reference transcripts)
 * keep their names.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  CLEAN_DIR,
  cleanFileName,
  decodeCleanText,
  INDEX_PATH,
  type IndexEntry,
  REPO_ROOT,
  rawDir,
  rawFileName,
  readIndex,
  SHORTS_DIR,
  TRANSCRIPTS_DIR,
  type TranscriptType,
  VIDEO_ID,
  vttToClean,
  writeIndex,
} from './lib/transcripts.ts';

const INVENTORY_PATH = path.join(
  REPO_ROOT,
  'apps/app/data/youtube/channel-inventory.json',
);

/**
 * Videos from 19 Aug to 21 Oct 2026 whose saved text is YouTube's machine
 * translation, found by the 10 Nov quality audit (cause inferred from the
 * text, not yet checked against YouTube). The Studio re-import confirms it.
 */
export const TRANSLATED_IDS = [
  '-qsSddwzjpY',
  'zyQEwa5IYvk',
  'mz5xo-QX1VM',
  '1ZbR2qie8rk',
  'LbCRcGRLYaU',
  'KPAyE6KSrQU',
  'r6o5wFD4P-w',
  'uSuqoiEaB1k',
  'WOTzkAWvb0w',
  'zjXzkB8z5xg',
  'M1EEEl4M6-4',
  'mYkxfB4ib7E',
  'MTbYJ4o2EQg',
  'XCyY0VDiRps',
];

/** The same key the app joins titles on (normalizeHistoryKey). */
function titleKey(value: string): string {
  return value
    .replace(/^\[[^\]]+\]\s*/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Undo the swaps yt-dlp makes in file names. */
function unsafeTitle(name: string): string {
  return name.replace(/⧸/g, '/').replace(/：/g, ':').replace(/？/g, '?');
}

interface RawFile {
  dir: string;
  id: string;
  name: string;
  title: string;
  type: TranscriptType;
}

interface InventoryItem {
  actualStartTime: string | null;
  cleanTranscriptPath: string | null;
  id: string;
  publishedAt: string;
  rawTranscriptPath: string | null;
  title: string;
  type: string;
}

function listRaw(): RawFile[] {
  const files: RawFile[] = [];
  for (const [dir, shorts] of [
    [TRANSCRIPTS_DIR, false],
    [SHORTS_DIR, true],
  ] as const) {
    for (const name of fs.readdirSync(dir)) {
      const match = name.match(/^([\w-]{11})-(.+)\.en\.vtt$/);
      if (!match) continue;
      const live = /^\[LIVE\]\s*/i.test(match[2]);
      files.push({
        dir,
        id: match[1],
        name,
        title: unsafeTitle(match[2].replace(/^\[LIVE\]\s*/i, '')),
        type: shorts ? 'short' : live ? 'livestream' : 'video',
      });
    }
  }
  return files;
}

function main() {
  const write = process.argv.includes('--write');
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as {
    items: InventoryItem[];
  };
  const inventoryById = new Map(inventory.items.map((i) => [i.id, i]));
  const index = readIndex();
  const problems: string[] = [];
  const notes: string[] = [];
  const noDate: string[] = [];

  // 1. Raw files, one per video id.
  const rawById = new Map<string, RawFile[]>();
  for (const file of listRaw())
    rawById.set(file.id, [...(rawById.get(file.id) ?? []), file]);

  const keepRaw = new Map<string, RawFile>();
  const dropRaw: RawFile[] = [];
  for (const [id, files] of rawById) {
    const sorted = [...files].sort(
      (a, b) =>
        Number(b.type === 'livestream') - Number(a.type === 'livestream'),
    );
    const [keep, ...rest] = sorted;
    for (const other of rest) {
      const same =
        fs.readFileSync(path.join(keep.dir, keep.name), 'utf8') ===
        fs.readFileSync(path.join(other.dir, other.name), 'utf8');
      if (same) dropRaw.push(other);
      else problems.push(`${id}: two different caption files, check by hand`);
    }
    keepRaw.set(id, keep);
  }

  // 2. Clean files, joined to a video id by title (type first, then title).
  const idByTypeKey = new Map<string, string>();
  const idsByKey = new Map<string, Set<string>>();
  for (const file of keepRaw.values()) {
    const key = titleKey(file.title);
    idByTypeKey.set(`${file.type}:${key}`, file.id);
    idsByKey.set(key, (idsByKey.get(key) ?? new Set()).add(file.id));
  }
  // A retitled video: the old title still names its clean file.
  for (const file of dropRaw) {
    const key = titleKey(file.title);
    idByTypeKey.set(`${file.type}:${key}`, file.id);
    idsByKey.set(key, (idsByKey.get(key) ?? new Set()).add(file.id));
  }

  // A retitled video: the current title, from the inventory, names its clean
  // file when the raw file still carries the old one.
  for (const item of inventory.items) {
    if (!keepRaw.has(item.id)) continue;
    const key = titleKey(item.title);
    const ids = idsByKey.get(key) ?? new Set<string>();
    ids.add(item.id);
    idsByKey.set(key, ids);
    for (const type of ['livestream', 'short', 'video'])
      if (!idByTypeKey.has(`${type}:${key}`))
        idByTypeKey.set(`${type}:${key}`, item.id);
  }

  const cleanById = new Map<
    string,
    { date: string; name: string; text: string }[]
  >();
  const untouched: string[] = [];
  for (const name of fs.readdirSync(CLEAN_DIR)) {
    const match = name.match(
      /^(\d{4}-\d{2}-\d{2})-(livestream|short|video)-(.+)\.txt$/,
    );
    if (!match) {
      untouched.push(name);
      continue;
    }
    const [, date, type, slug] = match;
    if (VIDEO_ID.test(slug) && index.videos[slug]) continue; // migrated
    const key = titleKey(slug);
    const unique = idsByKey.get(key);
    const id =
      idByTypeKey.get(`${type}:${key}`) ??
      (unique?.size === 1 ? [...unique][0] : undefined);
    if (!id) {
      untouched.push(name);
      continue;
    }
    cleanById.set(id, [
      ...(cleanById.get(id) ?? []),
      {
        date,
        name,
        text: decodeCleanText(
          fs.readFileSync(path.join(CLEAN_DIR, name), 'utf8'),
        ),
      },
    ]);
  }

  // 3. One index entry per raw video; one clean file per id.
  const cleanPlan: { from: string; to: string; text: string }[] = [];
  const cleanDrop: string[] = [];
  const entries: Record<string, IndexEntry> = { ...index.videos };
  for (const [id, raw] of keepRaw) {
    const item = inventoryById.get(id);
    const cleans = [...(cleanById.get(id) ?? [])].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    // A re-download leaves an older clean copy beside the current one: keep
    // the copy that matches the saved captions, else the earliest.
    const rawText = vttToClean(
      fs.readFileSync(path.join(raw.dir, raw.name), 'utf8'),
    );
    const first = cleans.find((c) => c.text === rawText) ?? cleans[0];
    for (const other of cleans) {
      if (other === first) continue;
      if (other.text === first.text || first.text === rawText) {
        cleanDrop.push(other.name);
        if (other.text !== first.text)
          notes.push(
            `${id}: dropped ${other.name}, older text than the saved captions`,
          );
      } else
        problems.push(
          `${id}: ${other.name} differs from ${first.name}, keep both?`,
        );
    }
    const date =
      first?.date ??
      (item?.actualStartTime ?? item?.publishedAt ?? '').slice(0, 10);
    if (!date) {
      // Clips-channel Shorts saved without a clean file: the date comes from
      // YouTube, so `transcripts:import --write` fills the index later.
      noDate.push(id);
      continue;
    }
    // The inventory knows what a video is. Without it the old clean file name
    // does; a raw file name can lose its [LIVE] tag when a stream is retitled.
    const cleanType = first?.name.match(
      /^\d{4}-\d{2}-\d{2}-(livestream|short|video)-/,
    )?.[1];
    const type: TranscriptType =
      item?.type === 'livestream' || item?.type === 'short'
        ? item.type
        : item
          ? 'video'
          : ((cleanType as TranscriptType | undefined) ?? raw.type);
    entries[id] = {
      date,
      lang: 'en',
      title: item?.title ?? raw.title,
      type,
      ...(TRANSLATED_IDS.includes(id) ? { translated: true } : {}),
    };
    if (first)
      cleanPlan.push({
        from: first.name,
        text: first.text,
        to: cleanFileName(date, type, id),
      });
    else {
      const vtt = fs.readFileSync(path.join(raw.dir, raw.name), 'utf8');
      cleanPlan.push({
        from: '',
        text: vttToClean(vtt),
        to: cleanFileName(date, type, id),
      });
      notes.push(`${id}: no clean file, built from the raw captions`);
    }
  }

  console.log(`Raw files to rename: ${keepRaw.size}`);
  console.log(`Duplicate raw files to remove: ${dropRaw.length}`);
  for (const file of dropRaw) console.log(`  - ${file.name}`);
  console.log(`Clean files to rename and decode: ${cleanPlan.length}`);
  console.log(`Duplicate clean files to remove: ${cleanDrop.length}`);
  for (const name of cleanDrop) console.log(`  - ${name}`);
  console.log(
    `Renamed but not indexed yet (no date, import fills it): ${noDate.length}`,
  );
  console.log(`Left as they are (no video id): ${untouched.length}`);
  for (const name of untouched) console.log(`  = ${name}`);
  for (const note of notes) console.log(`note: ${note}`);
  if (problems.length) {
    console.log(`\nProblems (${problems.length}), nothing written:`);
    for (const line of problems) console.log(`  ${line}`);
    process.exit(1);
  }
  if (!write) {
    console.log('\nDry run. Re-run with --write to apply.');
    return;
  }

  for (const file of dropRaw) fs.rmSync(path.join(file.dir, file.name));
  for (const [id, file] of keepRaw) {
    const entry = entries[id];
    fs.renameSync(
      path.join(file.dir, file.name),
      path.join(
        rawDir(entry?.type ?? file.type),
        rawFileName(id, entry?.lang ?? 'en'),
      ),
    );
  }
  for (const name of cleanDrop) fs.rmSync(path.join(CLEAN_DIR, name));
  for (const step of cleanPlan) {
    if (step.from) fs.rmSync(path.join(CLEAN_DIR, step.from));
    fs.writeFileSync(path.join(CLEAN_DIR, step.to), step.text);
  }
  writeIndex({ version: 1, videos: entries });

  for (const item of inventory.items) {
    const entry = entries[item.id];
    if (!entry) continue;
    const rel = path.relative(
      REPO_ROOT,
      path.join(rawDir(entry.type), rawFileName(item.id, entry.lang)),
    );
    item.rawTranscriptPath = rel;
    item.cleanTranscriptPath = item.cleanTranscriptPath
      ? `apps/app/data/transcripts/clean/${cleanFileName(entry.date, entry.type, item.id)}`
      : null;
  }
  fs.writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`\nWrote ${INDEX_PATH} and updated the inventory paths.`);
}

if (import.meta.main) main();
