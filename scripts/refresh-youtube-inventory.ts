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
import path from 'node:path';
import { getAccessToken, verifyChannel } from './youtube-upload.ts';

const REPO_ROOT = path.resolve(import.meta.dir, '..');
const INVENTORY_PATH = path.join(
  REPO_ROOT,
  'apps/app/data/youtube/channel-inventory.json',
);
const TRANSCRIPTS_DIR = path.join(REPO_ROOT, 'apps/app/data/transcripts');
const CLEAN_DIR = path.join(TRANSCRIPTS_DIR, 'clean');
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
  thumbnail: string;
  title: string;
  transcriptStatus: 'clean' | 'raw' | 'missing';
  type: 'livestream' | 'video';
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

/** Match the existing clean/ slug convention: date-type-slug. */
function cleanSlug(item: InventoryItem): string {
  const date = item.publishedAt.slice(0, 10);
  const title = item.title
    .replace(/^\[[^\]]+\]\s*/, '') // strip a leading [LIVE]-style tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${date}-${item.type}-${title}`;
}

interface PlaylistResponse {
  items: Array<{ contentDetails: { videoId: string } }>;
  nextPageToken?: string;
}

interface VideoResponse {
  items: Array<{
    id: string;
    snippet: {
      channelId: string;
      channelTitle: string;
      description: string;
      publishedAt: string;
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
      const isLive = Boolean(v.liveStreamingDetails);
      items.push({
        actualEndTime: v.liveStreamingDetails?.actualEndTime ?? null,
        actualStartTime: v.liveStreamingDetails?.actualStartTime ?? null,
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
        thumbnail: `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
        title: v.snippet.title,
        transcriptStatus: 'missing',
        type: isLive ? 'livestream' : 'video',
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

/** Strip inline <timestamp><c> tags and de-duplicate the rolling caption window. */
function vttToClean(vtt: string): string {
  const lines: string[] = [];
  let last = '';
  for (const block of vtt.split(/\r?\n\r?\n/)) {
    const rows = block.split(/\r?\n/);
    for (const row of rows) {
      if (
        !row ||
        row.startsWith('WEBVTT') ||
        row.startsWith('Kind:') ||
        row.startsWith('Language:') ||
        row.includes('-->')
      ) {
        continue;
      }
      const text = row.replace(/<[^>]+>/g, '').trim();
      if (text && text !== last) {
        lines.push(text);
        last = text;
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Download the video's original-language auto captions. The translated "en"
 * track is rate-limited (HTTP 429) far more aggressively than "en-orig", so
 * ask for the original first and only fall back to "en" when it is absent.
 * The result is normalised to the repo's <id>-<title>.en.vtt naming.
 */
function downloadCaptions(item: InventoryItem): void {
  let lastError: unknown;
  for (const lang of ['en-orig', 'en']) {
    try {
      execFileSync(
        'yt-dlp',
        [
          '--skip-download',
          '--write-auto-subs',
          '--sub-lang',
          lang,
          '--sub-format',
          'vtt',
          '--convert-subs',
          'vtt',
          '--sleep-subtitles',
          '3',
          '-o',
          path.join(TRANSCRIPTS_DIR, '%(id)s-%(title)s.%(ext)s'),
          item.url,
        ],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      );
    } catch (error) {
      lastError = error;
      continue;
    }
    const orig = fs
      .readdirSync(TRANSCRIPTS_DIR)
      .find((f) => f.startsWith(`${item.id}-`) && f.endsWith('.en-orig.vtt'));
    if (orig) {
      fs.renameSync(
        path.join(TRANSCRIPTS_DIR, orig),
        path.join(TRANSCRIPTS_DIR, orig.replace(/\.en-orig\.vtt$/, '.en.vtt')),
      );
      return;
    }
    if (lang === 'en') return;
  }
  throw lastError ?? new Error('no captions');
}

function backfillTranscripts(items: InventoryItem[]): number {
  let updated = 0;
  const targets = items.filter((it) => it.transcriptStatus === 'missing');
  for (const item of targets) {
    try {
      downloadCaptions(item);
    } catch {
      console.warn(`  yt-dlp failed for ${item.id} — leaving as missing`);
      continue;
    }

    const vtt = fs
      .readdirSync(TRANSCRIPTS_DIR)
      .find((f) => f.startsWith(`${item.id}-`) && f.endsWith('.en.vtt'));
    if (!vtt) {
      console.warn(`  no captions produced for ${item.id}`);
      continue;
    }

    const rawRel = path.relative(REPO_ROOT, path.join(TRANSCRIPTS_DIR, vtt));
    const cleanRel = path.join(
      'apps/app/data/transcripts/clean',
      `${cleanSlug(item)}.txt`,
    );
    fs.mkdirSync(CLEAN_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(REPO_ROOT, cleanRel),
      vttToClean(fs.readFileSync(path.join(TRANSCRIPTS_DIR, vtt), 'utf8')),
      'utf8',
    );
    item.rawTranscriptPath = rawRel;
    item.cleanTranscriptPath = cleanRel;
    item.transcriptStatus = 'clean';
    updated += 1;
    console.log(`  transcript backfilled: ${item.id}`);
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
      `Summary: total=${next.summary.total} livestreams=${next.summary.livestreams} videos=${next.summary.videos} cleanTranscripts=${next.summary.cleanTranscripts} missing=${next.summary.missingTranscripts.length}`,
    );
  } else {
    console.log(
      '\nDry run — re-run with --write to persist (add --transcripts to backfill).',
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
