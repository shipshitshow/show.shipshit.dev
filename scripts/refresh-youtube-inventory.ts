#!/usr/bin/env bun
/**
 * Refresh apps/app/data/youtube/channel-inventory.json from the live channel.
 *
 * The inventory feeds the metadata / prep skills and drifts
 * silently — there was previously no in-repo refetcher. This script pulls the
 * full uploads list via the YouTube Data API (public data, API key only),
 * merges ADDITIVELY (existing items and their transcript links are preserved;
 * only mutable stats are refreshed and genuinely-new videos appended), and can
 * backfill missing transcripts with yt-dlp.
 *
 * Usage:
 *   bun scripts/refresh-youtube-inventory.ts            # dry run, prints diff
 *   bun scripts/refresh-youtube-inventory.ts --write    # persist inventory
 *   bun scripts/refresh-youtube-inventory.ts --write --transcripts  # + yt-dlp backfill
 *   bun scripts/refresh-youtube-inventory.ts --oauth    # read with the channel's OAuth token
 *   bun scripts/refresh-youtube-inventory.ts --include=ID1,ID2  # also add these older uploads
 *
 * --oauth is for machines whose IP the API key refuses (the key is
 * IP-restricted): it reads with the same OAuth token as `youtube:sync` instead
 * of YOUTUBE_API_KEY. The token also sees private and scheduled videos, so
 * private ones are dropped here: this file is committed to a public repo.
 * Both modes only read from YouTube.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickCaptionFile } from './import-transcripts.ts';
import { classifyUpload, type InventoryType } from './lib/inventory-type.ts';
import {
  CLEAN_DIR,
  cleanFileName,
  rawDir,
  rawFileName,
  readIndex,
  vttToClean,
  writeIndex,
} from './lib/transcripts.ts';
import { getAccessToken, verifyChannel } from './youtube-upload.ts';

const REPO_ROOT = path.resolve(import.meta.dir, '..');
const INVENTORY_PATH = path.join(
  REPO_ROOT,
  'apps/app/data/youtube/channel-inventory.json',
);
const API = 'https://www.googleapis.com/youtube/v3';

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const DO_TRANSCRIPTS = args.has('--transcripts');
const USE_OAUTH = args.has('--oauth');
/** --include=id1,id2: also add these older uploads, which the additive merge would skip. */
const INCLUDE_IDS = new Set(
  (process.argv.find((a) => a.startsWith('--include='))?.slice(10) ?? '')
    .split(',')
    .filter(Boolean),
);

/** An API key (public data) or an OAuth access token (the channel owner). */
type Auth = { key: string } | { token: string };

interface InventoryItem {
  actualEndTime: string | null;
  actualStartTime: string | null;
  categoryId?: string;
  channelId: string;
  channelTitle: string;
  cleanTranscriptPath: string | null;
  commentCount: number;
  description: string;
  duration: string;
  duration_seconds_flat: number;
  duration_string_flat: string;
  id: string;
  likeCount: number;
  privacyStatus: string;
  publishedAt: string;
  rawTranscriptPath: string | null;
  tags: string[];
  thumbnail: string;
  title: string;
  transcriptStatus: 'clean' | 'raw' | 'missing';
  type: InventoryType;
  url: string;
  viewCount: number;
}

interface Inventory {
  channel: string;
  fetchedAt: string;
  items: InventoryItem[];
  source: string;
  summary: {
    cleanTranscripts: number;
    livestreams: number;
    missingTranscripts: Array<{ id: string; title: string; url: string }>;
    premieres: number;
    shorts: number;
    total: number;
    videos: number;
  };
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<
    string,
    string
  >;
  const envPath = path.join(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !env[match[1]]) {
        env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

async function api<T>(
  endpoint: string,
  params: Record<string, string>,
  auth: Auth,
): Promise<T> {
  const query = new URLSearchParams(
    'key' in auth ? { ...params, key: auth.key } : params,
  );
  const res = await fetch(
    `${API}/${endpoint}?${query}`,
    'token' in auth
      ? { headers: { Authorization: `Bearer ${auth.token}` }, method: 'GET' }
      : undefined,
  );
  if (!res.ok) {
    throw new Error(
      `YouTube API ${endpoint} ${res.status}: ${await res.text()}`,
    );
  }
  return (await res.json()) as T;
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0)
  );
}

function formatDurationString(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

interface PlaylistResponse {
  items: Array<{ contentDetails: { videoId: string } }>;
  nextPageToken?: string;
}

interface VideoResponse {
  items: Array<{
    id: string;
    snippet: {
      categoryId?: string;
      channelId: string;
      channelTitle: string;
      description: string;
      publishedAt: string;
      tags?: string[];
      title: string;
    };
    contentDetails: { duration: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    status?: { privacyStatus?: string };
    liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string };
  }>;
}

async function fetchAllVideos(
  channelId: string,
  auth: Auth,
): Promise<InventoryItem[]> {
  const channels = await api<{
    items: Array<{
      contentDetails: { relatedPlaylists: { uploads: string } };
    }>;
  }>('channels', { id: channelId, part: 'contentDetails' }, auth);
  const uploads =
    channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('Could not resolve uploads playlist');

  const videoIds: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await api<PlaylistResponse>(
      'playlistItems',
      {
        maxResults: '50',
        part: 'contentDetails',
        playlistId: uploads,
        ...(pageToken ? { pageToken } : {}),
      },
      auth,
    );
    videoIds.push(...page.items.map((i) => i.contentDetails.videoId));
    pageToken = page.nextPageToken;
  } while (pageToken);

  const items: InventoryItem[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const res = await api<VideoResponse>(
      'videos',
      {
        id: batch.join(','),
        part: 'snippet,contentDetails,statistics,status,liveStreamingDetails',
      },
      auth,
    );
    for (const v of res.items) {
      const seconds = parseIsoDuration(v.contentDetails.duration);
      items.push({
        actualEndTime: v.liveStreamingDetails?.actualEndTime ?? null,
        actualStartTime: v.liveStreamingDetails?.actualStartTime ?? null,
        ...(v.snippet.categoryId ? { categoryId: v.snippet.categoryId } : {}),
        channelId: v.snippet.channelId,
        channelTitle: v.snippet.channelTitle,
        cleanTranscriptPath: null,
        commentCount: Number(v.statistics?.commentCount ?? 0),
        description: v.snippet.description,
        duration: v.contentDetails.duration,
        duration_seconds_flat: seconds,
        duration_string_flat: formatDurationString(seconds),
        id: v.id,
        likeCount: Number(v.statistics?.likeCount ?? 0),
        privacyStatus: v.status?.privacyStatus ?? 'public',
        publishedAt: v.snippet.publishedAt,
        rawTranscriptPath: null,
        tags: v.snippet.tags ?? [],
        thumbnail: `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
        title: v.snippet.title,
        transcriptStatus: 'missing',
        type: classifyUpload({
          actualStartTime: v.liveStreamingDetails?.actualStartTime ?? null,
          durationSeconds: seconds,
          hasLiveDetails: Boolean(v.liveStreamingDetails),
          publishedAt: v.snippet.publishedAt,
        }),
        url: `https://www.youtube.com/watch?v=${v.id}`,
        viewCount: Number(v.statistics?.viewCount ?? 0),
      });
    }
  }
  return items;
}

/**
 * Preserve existing transcript links; refresh mutable stats on known videos;
 * append only genuinely-new content (published after the newest existing item)
 * so we catch drift without resurrecting older uploads that were deliberately
 * excluded from the curated inventory.
 */
function mergeItems(
  existing: InventoryItem[],
  fetched: InventoryItem[],
): { merged: InventoryItem[]; added: InventoryItem[] } {
  const newestExisting = existing.reduce(
    (max, it) => (it.publishedAt > max ? it.publishedAt : max),
    '',
  );
  const byId = new Map(existing.map((it) => [it.id, it]));
  const added: InventoryItem[] = [];
  for (const item of fetched) {
    const prior = byId.get(item.id);
    if (prior) {
      byId.set(item.id, {
        ...item,
        cleanTranscriptPath: prior.cleanTranscriptPath,
        rawTranscriptPath: prior.rawTranscriptPath,
        transcriptStatus: prior.transcriptStatus,
      });
    } else if (item.publishedAt > newestExisting || INCLUDE_IDS.has(item.id)) {
      byId.set(item.id, item);
      added.push(item);
    }
  }
  const merged = Array.from(byId.values()).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1,
  );
  return { added, merged };
}

/**
 * Download the video's original-language captions (the `<lang>-orig` track)
 * and save them id-keyed, like `transcripts:import`. The translated track is
 * never used as a fallback: it reads like a translation and has no speaker
 * markers. Returns the saved language, or null when no original exists.
 */
function downloadCaptions(item: InventoryItem): string | null {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sss-captions-'));
  try {
    execFileSync(
      'yt-dlp',
      [
        '--skip-download',
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs',
        '.*-orig',
        '--sub-format',
        'vtt',
        '--sleep-subtitles',
        '3',
        '-o',
        path.join(dir, '%(id)s.%(ext)s'),
        item.url,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    const caption = pickCaptionFile(fs.readdirSync(dir), item.id);
    if (!caption) return null;
    const vtt = fs.readFileSync(path.join(dir, caption.name), 'utf8');
    const type =
      item.type === 'livestream'
        ? 'livestream'
        : item.type === 'short'
          ? 'short'
          : 'video';
    const date = (item.actualStartTime ?? item.publishedAt).slice(0, 10);
    const clean = vttToClean(vtt);
    if (!clean) return null;
    fs.mkdirSync(rawDir(type), { recursive: true });
    fs.mkdirSync(CLEAN_DIR, { recursive: true });
    const raw = path.join(rawDir(type), rawFileName(item.id, caption.lang));
    fs.writeFileSync(raw, vtt);
    fs.writeFileSync(
      path.join(CLEAN_DIR, cleanFileName(date, type, item.id)),
      clean,
    );
    const index = readIndex();
    index.videos[item.id] = {
      date,
      lang: caption.lang,
      title: item.title,
      type,
    };
    writeIndex(index);
    item.rawTranscriptPath = path.relative(REPO_ROOT, raw);
    item.cleanTranscriptPath = path.relative(
      REPO_ROOT,
      path.join(CLEAN_DIR, cleanFileName(date, type, item.id)),
    );
    return caption.lang;
  } finally {
    fs.rmSync(dir, { force: true, recursive: true });
  }
}

function backfillTranscripts(items: InventoryItem[]): number {
  let updated = 0;
  const targets = items.filter((it) => it.transcriptStatus === 'missing');
  for (const item of targets) {
    let lang: string | null;
    try {
      lang = downloadCaptions(item);
    } catch {
      console.warn(`  yt-dlp failed for ${item.id} — leaving as missing`);
      continue;
    }
    if (!lang) {
      console.warn(`  no original-language captions for ${item.id}`);
      continue;
    }
    item.transcriptStatus = 'clean';
    updated += 1;
    console.log(`  transcript backfilled: ${item.id} (${lang})`);
  }
  return updated;
}

function buildSummary(items: InventoryItem[]): Inventory['summary'] {
  return {
    cleanTranscripts: items.filter((i) => i.transcriptStatus === 'clean')
      .length,
    livestreams: items.filter((i) => i.type === 'livestream').length,
    missingTranscripts: items
      .filter((i) => i.transcriptStatus === 'missing')
      .map((i) => ({ id: i.id, title: i.title, url: i.url })),
    premieres: items.filter((i) => i.type === 'premiere').length,
    shorts: items.filter((i) => i.type === 'short').length,
    total: items.length,
    videos: items.filter((i) => i.type === 'video').length,
  };
}

async function main() {
  const env = loadEnv();
  let auth: Auth;
  if (USE_OAUTH) {
    const token = await getAccessToken('main');
    await verifyChannel(token, 'main');
    auth = { token };
  } else {
    const key = env.YOUTUBE_API_KEY;
    if (!key) throw new Error('YOUTUBE_API_KEY is required (set it in .env)');
    auth = { key };
  }

  const inventory = JSON.parse(
    fs.readFileSync(INVENTORY_PATH, 'utf8'),
  ) as Inventory;
  const channelId = inventory.items[0]?.channelId;
  if (!channelId) throw new Error('Cannot determine channelId from inventory');

  console.log(`Fetching uploads for ${inventory.channel} (${channelId})…`);
  let fetched = await fetchAllVideos(channelId, auth);
  if (USE_OAUTH) {
    // Private (including scheduled) videos must not reach the public repo.
    const publicOnly = fetched.filter(
      (item) => item.privacyStatus !== 'private',
    );
    console.log(
      `Skipped ${fetched.length - publicOnly.length} private video(s)`,
    );
    fetched = publicOnly;
  }
  const { merged, added } = mergeItems(inventory.items, fetched);

  console.log(
    `Live videos: ${fetched.length}, existing: ${inventory.items.length}`,
  );
  console.log(`New videos: ${added.length}`);
  for (const item of added) {
    console.log(
      `  + ${item.publishedAt.slice(0, 10)} ${item.id} ${item.title}`,
    );
  }

  if (DO_TRANSCRIPTS) {
    console.log('Backfilling transcripts via yt-dlp…');
    const n = backfillTranscripts(merged);
    console.log(`Transcripts backfilled: ${n}`);
  }

  const next: Inventory = {
    ...inventory,
    fetchedAt: new Date().toISOString().slice(0, 10),
    items: merged,
    summary: buildSummary(merged),
  };

  if (WRITE) {
    fs.writeFileSync(
      INVENTORY_PATH,
      `${JSON.stringify(next, null, 2)}\n`,
      'utf8',
    );
    console.log(`Wrote ${INVENTORY_PATH}`);
    console.log(
      `Summary: total=${next.summary.total} livestreams=${next.summary.livestreams} premieres=${next.summary.premieres} shorts=${next.summary.shorts} videos=${next.summary.videos} cleanTranscripts=${next.summary.cleanTranscripts} missing=${next.summary.missingTranscripts.length}`,
    );
  } else {
    console.log(
      '\nDry run — re-run with --write to persist (add --transcripts to backfill).',
    );
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
