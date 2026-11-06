#!/usr/bin/env bun
/**
 * Read-only snapshot of what is on YouTube right now: title, description,
 * tags, category, privacy, schedule and thumbnail URL of every upload, private
 * and scheduled ones included. This script cannot write to YouTube: it only
 * sends GET requests.
 *
 * Usage:
 *   bun run youtube:sync                 Main channel
 *   bun run youtube:sync --channel clips
 *   bun run youtube:sync --channel all
 *   bun run youtube:sync --diff-only     Show what changed since the last
 *                                        snapshot, and save nothing
 *
 * Files go to .youtube-snapshots/ (git-ignored, because private and scheduled
 * videos are in there), or to YOUTUBE_SNAPSHOT_DIR:
 *   <channel>-latest.json              The newest snapshot
 *   <channel>-<timestamp>.json         Every snapshot, kept
 *   backups/<timestamp>.json           Written by youtube:update --apply
 *
 * It prints the diff against the previous snapshot, so a title edited in
 * YouTube Studio shows up here before anything overwrites it.
 *
 * Titles Lab on Vercel: the deployed lab cannot read these files, so it reads
 * a slim copy (id, title, privacy, schedule; no descriptions) from the
 * producer Redis. Pushing it is a dry run unless --apply is passed:
 *   bun run youtube:sync --push-redis --namespace production          Plan only
 *   bun run youtube:sync --push-redis --namespace production --apply  Write
 * It needs KV_REST_API_URL and KV_REST_API_TOKEN for the write, changes only
 * the key sss:<namespace>:v1:title-lab-snapshot, and uses the main channel.
 *
 * Auth is the same as youtube-upload.ts. Quota: about 1 unit per 50 videos.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  slimSnapshot,
  TITLE_SNAPSHOT_KEY,
} from '../apps/app/src/lib/title-lab.ts';
import {
  type Channel,
  fail,
  getAccessToken,
  verifyChannel,
} from './youtube-upload.ts';

const API = 'https://www.googleapis.com/youtube/v3';
const PAGE_SIZE = 50;

export type VideoRecord = {
  categoryId: string;
  commentCount?: number;
  containsSyntheticMedia?: boolean;
  defaultAudioLanguage?: string;
  defaultLanguage?: string;
  description: string;
  duration?: string;
  embeddable?: boolean;
  id: string;
  license?: string;
  likeCount?: number;
  privacyStatus: string;
  publicStatsViewable?: boolean;
  publishAt?: string;
  publishedAt?: string;
  selfDeclaredMadeForKids?: boolean;
  tags: string[];
  thumbnail?: string;
  title: string;
  viewCount?: number;
};

export type Snapshot = {
  channel: Channel;
  channelTitle: string;
  fetchedAt: string;
  videos: VideoRecord[];
};

type ApiVideo = {
  contentDetails?: { duration?: string };
  id: string;
  snippet: {
    categoryId: string;
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
    description?: string;
    publishedAt?: string;
    tags?: string[];
    thumbnails?: Record<string, { url: string; width?: number }>;
    title: string;
  };
  statistics?: {
    commentCount?: string;
    likeCount?: string;
    viewCount?: string;
  };
  status: {
    containsSyntheticMedia?: boolean;
    embeddable?: boolean;
    license?: string;
    privacyStatus: string;
    publicStatsViewable?: boolean;
    publishAt?: string;
    selfDeclaredMadeForKids?: boolean;
  };
};

export function snapshotDirectory() {
  return (
    process.env.YOUTUBE_SNAPSHOT_DIR ||
    resolve(import.meta.dir, '../.youtube-snapshots')
  );
}

function count(value?: string) {
  return value === undefined ? undefined : Number(value);
}

function largestThumbnail(
  thumbnails: ApiVideo['snippet']['thumbnails'] = {},
): string | undefined {
  const sorted = Object.values(thumbnails).sort(
    (left, right) => (right.width ?? 0) - (left.width ?? 0),
  );
  return sorted[0]?.url;
}

export function toRecord(video: ApiVideo): VideoRecord {
  const { snippet, status, statistics } = video;
  const record: VideoRecord = {
    categoryId: snippet.categoryId,
    commentCount: count(statistics?.commentCount),
    containsSyntheticMedia: status.containsSyntheticMedia,
    defaultAudioLanguage: snippet.defaultAudioLanguage,
    defaultLanguage: snippet.defaultLanguage,
    description: snippet.description ?? '',
    duration: video.contentDetails?.duration,
    embeddable: status.embeddable,
    id: video.id,
    license: status.license,
    likeCount: count(statistics?.likeCount),
    privacyStatus: status.privacyStatus,
    publicStatsViewable: status.publicStatsViewable,
    publishAt: status.publishAt,
    publishedAt: snippet.publishedAt,
    selfDeclaredMadeForKids: status.selfDeclaredMadeForKids,
    tags: snippet.tags ?? [],
    thumbnail: largestThumbnail(snippet.thumbnails),
    title: snippet.title,
    viewCount: count(statistics?.viewCount),
  };
  return Object.fromEntries(
    Object.entries(record).filter((entry) => entry[1] !== undefined),
  ) as VideoRecord;
}

const WATCHED: Array<keyof VideoRecord> = [
  'title',
  'description',
  'tags',
  'categoryId',
  'privacyStatus',
  'publishAt',
  'defaultLanguage',
  'defaultAudioLanguage',
  'thumbnail',
];

export type SnapshotDiff = {
  added: string[];
  changed: Array<{ fields: string[]; id: string; title: string }>;
  removed: string[];
};

/** What differs between two snapshots, ignoring view and like counts. */
export function diffSnapshots(
  previous: Snapshot | undefined,
  next: Snapshot,
): SnapshotDiff {
  const before = new Map(previous?.videos.map((video) => [video.id, video]));
  const after = new Map(next.videos.map((video) => [video.id, video]));
  const changed: SnapshotDiff['changed'] = [];
  for (const [id, video] of after) {
    const old = before.get(id);
    if (!old) continue;
    const fields = WATCHED.filter(
      (field) => JSON.stringify(old[field]) !== JSON.stringify(video[field]),
    );
    if (fields.length) changed.push({ fields, id, title: video.title });
  }
  return {
    added: previous ? [...after.keys()].filter((id) => !before.has(id)) : [],
    changed,
    removed: [...before.keys()].filter((id) => !after.has(id)),
  };
}

export function formatTable(videos: VideoRecord[]) {
  return videos
    .map(
      (video) =>
        `${video.id}  ${video.privacyStatus.padEnd(8)} ${String(video.title.length).padStart(3)}  ${video.title}`,
    )
    .join('\n');
}

async function get<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${API}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: 'GET',
  });
  if (!response.ok) {
    fail(
      `GET ${path.split('?')[0]} failed: ${response.status} ${(await response.text()).slice(0, 200)}`,
    );
  }
  return (await response.json()) as T;
}

export async function listUploadIds(token: string) {
  const channels = await get<{
    items?: Array<{
      contentDetails: { relatedPlaylists: { uploads: string } };
      snippet: { title: string };
    }>;
  }>(token, 'channels?part=contentDetails,snippet&mine=true');
  const channel = channels.items?.[0];
  if (!channel) fail('The token is not linked to a YouTube channel');
  const playlist = channel.contentDetails.relatedPlaylists.uploads;
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await get<{
      items?: Array<{ contentDetails: { videoId: string } }>;
      nextPageToken?: string;
    }>(
      token,
      `playlistItems?part=contentDetails&maxResults=${PAGE_SIZE}&playlistId=${encodeURIComponent(playlist)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
    );
    ids.push(...(page.items ?? []).map((item) => item.contentDetails.videoId));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { channelTitle: channel.snippet.title, ids };
}

export async function fetchRecords(token: string, ids: string[]) {
  const records: VideoRecord[] = [];
  for (let start = 0; start < ids.length; start += PAGE_SIZE) {
    const chunk = ids.slice(start, start + PAGE_SIZE);
    const data = await get<{ items?: ApiVideo[] }>(
      token,
      `videos?part=snippet,status,contentDetails,statistics&maxResults=${PAGE_SIZE}&id=${chunk.join(',')}`,
    );
    records.push(...(data.items ?? []).map(toRecord));
  }
  return records;
}

function readSnapshot(path: string): Snapshot | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
  } catch {
    return undefined;
  }
}

function writeJson(path: string, value: unknown) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

export type PushOptions = { apply: boolean; namespace: string };

export function parseArgs(argv: string[]) {
  let channels: Channel[] = ['main'];
  let diffOnly = false;
  let apply = false;
  let pushRedis = false;
  let namespace: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--diff-only') diffOnly = true;
    else if (argument === '--push-redis') pushRedis = true;
    else if (argument === '--apply') apply = true;
    else if (argument === '--namespace') {
      namespace = argv[++index];
      if (!namespace || !/^[\w.-]+$/.test(namespace))
        throw new Error('--namespace needs a name such as production');
    } else if (argument === '--channel') {
      const value = argv[++index];
      if (value === 'all') channels = ['main', 'clips'];
      else if (value === 'main' || value === 'clips') channels = [value];
      else throw new Error('--channel must be main, clips or all');
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (pushRedis && !namespace)
    throw new Error('--push-redis needs --namespace production|preview|local');
  if ((apply || namespace) && !pushRedis)
    throw new Error('--apply and --namespace only go with --push-redis');
  if (pushRedis && diffOnly)
    throw new Error('--push-redis and --diff-only contradict each other');
  if (pushRedis && !channels.includes('main'))
    throw new Error('--push-redis sends the main channel; use --channel main');
  const push: PushOptions | undefined =
    pushRedis && namespace ? { apply, namespace } : undefined;
  return { channels, diffOnly, push };
}

/** Same key as redisKey(TITLE_SNAPSHOT_KEY) in the app: sss:{env}:v1:name. */
export function snapshotRedisKey(namespace: string) {
  return `sss:${namespace}:v1:${TITLE_SNAPSHOT_KEY}`;
}

async function redisCommand(command: string[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token)
    throw new Error('Set KV_REST_API_URL and KV_REST_API_TOKEN');
  const response = await fetch(url, {
    body: JSON.stringify(command),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  if (!response.ok)
    throw new Error(`Redis ${command[0]} failed: ${response.status}`);
  return ((await response.json()) as { result: unknown }).result;
}

/** Plan, and with --apply write, the slim snapshot for the deployed Titles Lab. */
export async function pushSnapshot(
  snapshot: Snapshot,
  { apply, namespace }: PushOptions,
  log: (line: string) => void = console.log,
) {
  const key = snapshotRedisKey(namespace);
  const value = JSON.stringify(slimSnapshot(snapshot));
  log(`Redis ${key}: ${snapshot.videos.length} videos, ${value.length} bytes`);
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const stored = await redisCommand(['GET', key]);
    if (typeof stored === 'string') {
      const old = JSON.parse(stored) as {
        fetchedAt?: string;
        videos?: unknown[];
      };
      log(
        `  replaces the snapshot from ${old.fetchedAt} (${old.videos?.length} videos)`,
      );
    } else log('  nothing is stored there yet');
  } else log('  (no KV credentials set, so the stored copy was not read)');
  if (!apply) {
    log('Dry run: add --apply to write it.');
    return false;
  }
  await redisCommand(['SET', key, value]);
  log('Written.');
  return true;
}

async function syncChannel(
  channel: Channel,
  diffOnly: boolean,
  push?: PushOptions,
) {
  const token = await getAccessToken(channel);
  await verifyChannel(token, channel);
  const { channelTitle, ids } = await listUploadIds(token);
  const snapshot: Snapshot = {
    channel,
    channelTitle,
    fetchedAt: new Date().toISOString(),
    videos: await fetchRecords(token, ids),
  };

  const directory = snapshotDirectory();
  const latest = resolve(directory, `${channel}-latest.json`);
  const diff = diffSnapshots(readSnapshot(latest), snapshot);

  console.log(`\n${channelTitle}: ${snapshot.videos.length} videos`);
  console.log(formatTable(snapshot.videos));
  if (diff.added.length || diff.changed.length || diff.removed.length) {
    console.log('\nSince the last snapshot:');
    for (const id of diff.added) console.log(`  + ${id} is new`);
    for (const id of diff.removed) console.log(`  - ${id} is gone`);
    for (const { fields, id, title } of diff.changed)
      console.log(`  ~ ${id} ${fields.join(', ')} changed (${title})`);
  }
  if (diffOnly) return;

  mkdirSync(directory, { recursive: true });
  const stamp = snapshot.fetchedAt.replace(/[:.]/g, '-');
  writeJson(resolve(directory, `${channel}-${stamp}.json`), snapshot);
  writeJson(latest, snapshot);
  console.log(`\nSaved to ${directory}`);
  if (push && channel === 'main') await pushSnapshot(snapshot, push);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    const header = readFileSync(import.meta.path, 'utf8').split('*/')[0];
    console.log(header.replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
    return;
  }
  let options: ReturnType<typeof parseArgs>;
  try {
    options = parseArgs(argv);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  for (const channel of options.channels)
    await syncChannel(channel, options.diffOnly, options.push);
}

if (import.meta.main) await main();
