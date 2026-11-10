import fs from 'node:fs';
import path from 'node:path';
import type {
  ContentField,
  Topic,
  TopicDrawingResponse,
  TopicFrontmatter,
  TopicGeneratedContent,
  TopicStatus,
  TopicUpdate,
} from '@shipshitshow/types';
import { CONTENT_FIELDS } from '@shipshitshow/types';
import {
  findTopicFile,
  getTopicDrawingFile,
  isTopicMarkdownFile,
} from './livestreams-files';
import { getVisibleTopics } from './livestreams-visibility';
import {
  extractLivestreamYouTubeUrl,
  extractVideoId,
} from './livestreams-youtube';
import { logError } from './logger';
import {
  createWritableStorageError,
  getProducerStorageBackend,
} from './producer-storage';
import {
  readRedisHash,
  readRedisHashField,
  readRedisJson,
  readRedisJsonAndHashes,
  readRedisSetMembers,
  redisKey,
  writeRedisHashFieldAndIndex,
  writeRedisJson,
} from './redis-storage';

const DATA_DIR =
  process.env.DATA_DIR || path.join(process.cwd(), 'data', 'livestream');
const TRANSCRIPTS_DIR = path.join(process.cwd(), 'data', 'transcripts');
const CLEAN_TRANSCRIPTS_DIR = path.join(TRANSCRIPTS_DIR, 'clean');
const SHORT_TRANSCRIPTS_DIR = path.join(TRANSCRIPTS_DIR, 'shorts');
const OVERLAY_SNAPSHOT_TTL_MS = 2000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY_GENERATED: TopicGeneratedContent = {
  linkedin_post: null,
  livestream_tweet: null,
  recap_tweet: null,
  thumbnail_v1: null,
  thumbnail_v2: null,
  thumbnail_v3: null,
  youtube_description: null,
  youtube_title: null,
};

interface StoredTopicOverride {
  generated?: Partial<TopicGeneratedContent>;
  status?: TopicStatus;
  thumbnail_prompt?: string | null;
}

/**
 * What producers added or changed for one date. Stored as a Redis hash with a
 * `topic:{slug}` and an `override:{slug}` field each, so a write touches only
 * its own field. The legacy whole-date JSON string has the same shape and is
 * still read, but never written.
 */
interface OverlayLayer {
  overrides: Record<string, StoredTopicOverride>;
  topics: Record<string, Topic>;
}

interface TopicOverlay {
  hash: OverlayLayer;
  legacy: OverlayLayer;
}

interface StoredDrawing {
  scene: Record<string, unknown>;
  updatedAt: string;
}

export interface LivestreamHistoryItem {
  date: string;
  title: string;
  transcriptPath: string;
  videoId: string | null;
  youtubeUrl: string | null;
}

export type PublishedVideoType = 'livestream' | 'short' | 'video';

export interface PublishedVideoItem {
  date: string;
  routeSlug: string;
  title: string;
  transcriptPath: string;
  /** Caption language, from transcripts/index.json (id-keyed files only). */
  language?: string;
  type: PublishedVideoType;
  videoId: string | null;
  wordCount: number;
  youtubeUrl: string | null;
}

export interface LivestreamArchiveItem {
  date: string;
  hasTranscript: boolean;
  title: string;
  topicDate: string;
  topicCount: number;
  topics: Topic[];
  transcriptPath: string | null;
  transcriptTitle: string | null;
  videoId: string | null;
  youtubeUrl: string | null;
}

function overlayDatesKey(): string {
  return redisKey('topic-overlay-dates');
}

function legacyOverlayKey(date: string): string {
  return redisKey('topic-overlay', date);
}

function overlayFieldsKey(date: string): string {
  return redisKey('topic-overlay-fields', date);
}

const TOPIC_FIELD_PREFIX = 'topic:';
const OVERRIDE_FIELD_PREFIX = 'override:';

function drawingKey(date: string, slug: string): string {
  return redisKey('drawing', date, slug);
}

function updateFrontmatterField(
  raw: string,
  key: string,
  value: string | null,
): string {
  const valStr = value === null ? 'null' : `"${value}"`;
  const regex = new RegExp(`^(${key}:).*$`, 'm');
  if (regex.test(raw)) {
    return raw.replace(regex, `$1 ${valStr}`);
  }
  return raw.replace(/\n---\n/, `\n${key}: ${valStr}\n---\n`);
}

function updateGeneratedField(
  raw: string,
  field: ContentField,
  value: string,
): string {
  const marker = '## Generated Content';
  const tag = `<!-- ${field} -->`;
  const endTag = `<!-- /${field} -->`;

  if (!raw.includes(marker)) {
    raw = `${raw.trimEnd()}\n\n${marker}\n\n`;
  }

  const tagIdx = raw.indexOf(tag);
  const endTagIdx = raw.indexOf(endTag);
  if (tagIdx !== -1 && endTagIdx !== -1) {
    return `${raw.slice(0, tagIdx + tag.length)}\n${value}\n${raw.slice(endTagIdx)}`;
  }

  return `${raw.trimEnd()}\n${tag}\n${value}\n${endTag}\n`;
}

function parseGeneratedContent(raw: string): TopicGeneratedContent {
  const marker = '## Generated Content';
  const idx = raw.indexOf(marker);
  if (idx === -1) return { ...EMPTY_GENERATED };

  const section = raw.slice(idx + marker.length);
  const result: TopicGeneratedContent = { ...EMPTY_GENERATED };

  for (const field of CONTENT_FIELDS) {
    const tag = `<!-- ${field} -->`;
    const endTag = `<!-- /${field} -->`;
    const start = section.indexOf(tag);
    const end = section.indexOf(endTag);
    if (start !== -1 && end !== -1) {
      result[field] = section.slice(start + tag.length, end).trim() || null;
    }
  }

  return result;
}

function normalizeHistoryKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTranscriptWordCount(transcriptPath: string): number {
  const transcript = fs.readFileSync(transcriptPath, 'utf-8');
  return transcript.split(/\s+/).filter(Boolean).length;
}

function getPublishedVideoRouteSlug(
  date: string,
  type: PublishedVideoType,
  rawTitleSlug: string,
  videoId: string | null,
): string {
  return videoId ?? `${date}-${type}-${rawTitleSlug}`;
}

function getYoutubeUrl(videoId: string | null): string | null {
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

/**
 * Older raw caption files name the video: `<id>-<title>.en.vtt` (new ones are
 * `<id>.<lang>.vtt` and are described by the index). A `[LIVE]` title
 * prefix marks a livestream and the `shorts/` folder holds Shorts. Clean files
 * carry only date, type and title slug, so they are matched by title: first
 * with the type, then by title alone when only one raw file has that title
 * (livestream titles lost their [LIVE] tag on 2026-11-06).
 */
function getRawTranscriptVideoMap(): Map<
  string,
  { title: string; videoId: string }
> {
  const videoMap = new Map<string, { title: string; videoId: string }>();
  const titleCounts = new Map<string, number>();

  const add = (fileName: string, shortsFolder: boolean) => {
    const match = fileName.match(/^([\w-]{11})-(.+)\.en\.vtt$/);
    if (!match) return;

    const [, videoId, rawTitle] = match;
    const isLive = /^\[LIVE\]\s*/i.test(rawTitle);
    const type: PublishedVideoType = shortsFolder
      ? 'short'
      : isLive
        ? 'livestream'
        : 'video';
    const title = rawTitle.replace(/^\[LIVE\]\s*/i, '');
    const key = normalizeHistoryKey(title);
    videoMap.set(`${type}:${key}`, { title, videoId });
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
    videoMap.set(`any:${key}`, { title, videoId });
  };

  if (fs.existsSync(TRANSCRIPTS_DIR))
    for (const fileName of fs.readdirSync(TRANSCRIPTS_DIR))
      add(fileName, false);
  if (fs.existsSync(SHORT_TRANSCRIPTS_DIR))
    for (const fileName of fs.readdirSync(SHORT_TRANSCRIPTS_DIR))
      add(fileName, true);

  for (const [key, count] of titleCounts)
    if (count > 1) videoMap.delete(`any:${key}`);

  return videoMap;
}

interface TranscriptIndexEntry {
  date: string;
  lang: string;
  title: string;
  type: PublishedVideoType;
}

/**
 * transcripts/index.json maps a video id to its date, type, title and caption
 * language. Files are named by id (`<date>-<type>-<id>.txt`), so a retitle on
 * YouTube changes one line here and never the file name.
 */
function readTranscriptIndex(): Record<string, TranscriptIndexEntry> {
  const indexPath = path.join(TRANSCRIPTS_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) return {};
  const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as {
    videos?: Record<string, TranscriptIndexEntry>;
  };
  return parsed.videos ?? {};
}

function listFilesystemPublishedVideos(): PublishedVideoItem[] {
  if (!fs.existsSync(CLEAN_TRANSCRIPTS_DIR)) return [];

  const videoMap = getRawTranscriptVideoMap();
  const index = readTranscriptIndex();

  const items: PublishedVideoItem[] = [];
  for (const fileName of fs.readdirSync(CLEAN_TRANSCRIPTS_DIR)) {
    const match = fileName.match(
      /^(\d{4}-\d{2}-\d{2})-(livestream|short|video)-(.+)\.txt$/,
    );
    if (!match) continue;

    const [, date, type, rawTitleSlug] = match;
    const typed = type as PublishedVideoType;
    const transcriptPath = path.join(CLEAN_TRANSCRIPTS_DIR, fileName);

    const indexed = index[rawTitleSlug];
    if (indexed) {
      items.push({
        date,
        language: indexed.lang,
        routeSlug: getPublishedVideoRouteSlug(
          date,
          typed,
          rawTitleSlug,
          rawTitleSlug,
        ),
        title: indexed.title,
        transcriptPath,
        type: typed,
        videoId: rawTitleSlug,
        wordCount: getTranscriptWordCount(transcriptPath),
        youtubeUrl: getYoutubeUrl(rawTitleSlug),
      } satisfies PublishedVideoItem);
      continue;
    }
    const key = normalizeHistoryKey(rawTitleSlug);
    const mapped =
      videoMap.get(`${typed}:${key}`) ?? videoMap.get(`any:${key}`);
    const title = mapped?.title ?? titleFromSlug(rawTitleSlug);
    const videoId = mapped?.videoId ?? null;

    items.push({
      date,
      routeSlug: getPublishedVideoRouteSlug(date, typed, rawTitleSlug, videoId),
      title,
      transcriptPath,
      type: typed,
      videoId,
      wordCount: getTranscriptWordCount(transcriptPath),
      youtubeUrl: getYoutubeUrl(videoId),
    } satisfies PublishedVideoItem);
  }

  return items.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.type.localeCompare(b.type) ||
      a.title.localeCompare(b.title),
  );
}

export function isTopicStatus(value: string | null): value is TopicStatus {
  return (
    value === 'draft' ||
    value === 'backlog' ||
    value === 'in_progress' ||
    value === 'done'
  );
}

function parseFrontmatter(raw: string): {
  frontmatter: TopicFrontmatter;
  content: string;
  generated: TopicGeneratedContent;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Invalid frontmatter');

  const fm: Record<string, string | null> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: string | null = line.slice(idx + 1).trim();
    if (val === 'null') val = null;
    if (typeof val === 'string') val = val.replace(/^["']|["']$/g, '');
    fm[key] = val;
  }

  const body = match[2].trim();
  const genMarker = '## Generated Content';
  const genIdx = body.indexOf(genMarker);
  const content = genIdx !== -1 ? body.slice(0, genIdx).trim() : body;
  const generated = parseGeneratedContent(raw);
  const title = fm.title;
  const slug = fm.slug;
  const source = fm.source;
  const status = fm.status;
  const date = fm.date;

  if (
    typeof title !== 'string' ||
    typeof slug !== 'string' ||
    typeof source !== 'string' ||
    !isTopicStatus(status) ||
    typeof date !== 'string'
  ) {
    throw new Error('Invalid topic frontmatter');
  }

  return {
    content,
    frontmatter: {
      announcement_tweet: fm.announcement_tweet ?? null,
      date,
      slug,
      source,
      status,
      thumbnail_prompt: fm.thumbnail_prompt,
      title,
    },
    generated,
  };
}

function topicToMarkdown(topic: Topic): string {
  const announcementTweet = topic.announcement_tweet ?? null;
  let markdown = `---
title: "${topic.title}"
slug: "${topic.slug}"
source: "${topic.source}"
status: "${topic.status}"
date: "${topic.date}"
announcement_tweet: ${announcementTweet === null ? 'null' : `"${announcementTweet}"`}
thumbnail_prompt: ${topic.thumbnail_prompt === null ? 'null' : `"${topic.thumbnail_prompt}"`}
---

${topic.content}

## Generated Content
`;

  for (const field of CONTENT_FIELDS) {
    const value = topic.generated[field];
    if (!value) continue;
    markdown = `${markdown}\n<!-- ${field} -->\n${value}\n<!-- /${field} -->\n`;
  }

  return markdown.trimEnd();
}

function getFilesystemTopicsForDate(dateStr: string): Topic[] {
  const dir = path.join(DATA_DIR, dateStr);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter(isTopicMarkdownFile)
    .sort()
    .map((fileName) => {
      const raw = fs.readFileSync(path.join(dir, fileName), 'utf-8');
      const { frontmatter, content, generated } = parseFrontmatter(raw);
      return { ...frontmatter, content, fileName, generated };
    });
}

function listFilesystemDates(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];

  return fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
}

function listFilesystemLivestreamHistory(): LivestreamHistoryItem[] {
  return listFilesystemPublishedVideos().reduce<LivestreamHistoryItem[]>(
    (acc, item) => {
      if (item.type === 'livestream') {
        acc.push({
          date: item.date,
          title: item.title,
          transcriptPath: item.transcriptPath,
          videoId: item.videoId,
          youtubeUrl: item.youtubeUrl,
        });
      }
      return acc;
    },
    [],
  );
}

function applyTopicUpdate(topic: Topic, updates: TopicUpdate): Topic {
  const nextTopic: Topic = {
    ...topic,
    generated: { ...topic.generated },
  };

  if (updates.status) {
    nextTopic.status = updates.status;
  }

  if (updates.thumbnail_prompt !== undefined) {
    nextTopic.thumbnail_prompt = updates.thumbnail_prompt;
  }

  if (updates.generated) {
    for (const field of CONTENT_FIELDS) {
      const value = updates.generated[field];
      if (value !== undefined && value !== null) {
        nextTopic.generated[field] = value;
      }
    }
  }

  return nextTopic;
}

function toOverlay(
  legacy: Partial<OverlayLayer> | null,
  fields: Record<string, unknown>,
): TopicOverlay {
  const hash: OverlayLayer = { overrides: {}, topics: {} };
  for (const [field, value] of Object.entries(fields)) {
    if (field.startsWith(TOPIC_FIELD_PREFIX)) {
      hash.topics[field.slice(TOPIC_FIELD_PREFIX.length)] = value as Topic;
    } else if (field.startsWith(OVERRIDE_FIELD_PREFIX)) {
      hash.overrides[field.slice(OVERRIDE_FIELD_PREFIX.length)] =
        value as StoredTopicOverride;
    }
  }
  return {
    hash,
    legacy: {
      overrides: legacy?.overrides ?? {},
      topics: legacy?.topics ?? {},
    },
  };
}

let overlaySnapshot: {
  expiresAt: number;
  promise: Promise<Map<string, TopicOverlay>>;
} | null = null;

/** Writes call this so the next read sees them instead of a 2-second-old snapshot. */
export function clearTopicOverlayCache(): void {
  overlaySnapshot = null;
}

/** One SMEMBERS, then one pipelined request (MGET of legacy keys + HGETALL per date). */
async function loadOverlaySnapshotStrict(): Promise<Map<string, TopicOverlay>> {
  const dates = (
    await readRedisSetMembers(overlayDatesKey(), { strict: true })
  ).filter((date) => DATE_PATTERN.test(date));
  const { hashes, json } = await readRedisJsonAndHashes<
    Partial<OverlayLayer>,
    unknown
  >(dates.map(legacyOverlayKey), dates.map(overlayFieldsKey), {
    strict: true,
  });

  return new Map(
    dates.map((date, index) => [date, toOverlay(json[index], hashes[index])]),
  );
}

/**
 * Non-strict snapshot for public and read paths, memoized briefly so one page
 * render that asks for many dates costs two Redis requests. A failed load is
 * logged, never cached, and reads as "no overlay".
 */
async function loadOverlaySnapshot(): Promise<Map<string, TopicOverlay>> {
  const now = Date.now();
  let entry = overlaySnapshot;
  if (!entry || entry.expiresAt <= now) {
    entry = {
      expiresAt: now + OVERLAY_SNAPSHOT_TTL_MS,
      promise: loadOverlaySnapshotStrict(),
    };
    overlaySnapshot = entry;
  }

  try {
    return await entry.promise;
  } catch (error) {
    if (overlaySnapshot === entry) overlaySnapshot = null;
    logError('storage.redis_read_failed', error, { key: 'topic-overlay' });
    return new Map();
  }
}

/** Strict read of one date's overlay, for read-modify-write paths. */
async function readOverlayStrict(date: string): Promise<TopicOverlay> {
  if (!DATE_PATTERN.test(date)) return toOverlay(null, {});

  const [fields, legacy] = await Promise.all([
    readRedisHash<unknown>(overlayFieldsKey(date), { strict: true }),
    readRedisJson<Partial<OverlayLayer>>(legacyOverlayKey(date), {
      strict: true,
    }),
  ]);
  return toOverlay(legacy, fields);
}

function mergeTopics(date: string, overlay: TopicOverlay | undefined): Topic[] {
  const merged = new Map<string, Topic>();

  for (const topic of getFilesystemTopicsForDate(date)) {
    merged.set(topic.slug, topic);
  }

  if (overlay) {
    const layers = [overlay.legacy, overlay.hash];
    for (const layer of layers) {
      for (const topic of Object.values(layer.topics)) {
        merged.set(topic.slug, topic);
      }
    }
    for (const layer of layers) {
      for (const [slug, updates] of Object.entries(layer.overrides)) {
        const topic = merged.get(slug);
        if (!topic) continue;
        merged.set(slug, applyTopicUpdate(topic, updates));
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.fileName.localeCompare(b.fileName),
  );
}

export async function listAvailableLivestreamDates(): Promise<string[]> {
  const dates = new Set<string>(listFilesystemDates());

  if (getProducerStorageBackend() === 'redis') {
    for (const date of (await loadOverlaySnapshot()).keys()) {
      dates.add(date);
    }
  }

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

export async function resolveLivestreamDate(
  requestedDate: string,
): Promise<string> {
  const availableDates = await listAvailableLivestreamDates();
  if (availableDates.includes(requestedDate)) return requestedDate;
  return availableDates[0] || requestedDate;
}

/**
 * Dates with at least one publicly visible topic. Dates holding only drafts or
 * backlog are unpublished planning and stay out of the public catalog.
 */
async function listPublicLivestreamDates(): Promise<string[]> {
  const dates = await listAvailableLivestreamDates();
  const hasVisibleTopics = await Promise.all(
    dates.map(
      async (date) =>
        getVisibleTopics(await getTopicsForDate(date), date).length > 0,
    ),
  );
  return dates.filter((_, index) => hasVisibleTopics[index]);
}

export async function resolvePublicLivestreamDate(
  requestedDate: string | null,
): Promise<{ availableDates: string[]; resolvedDate: string | null }> {
  const availableDates = await listPublicLivestreamDates();
  const resolvedDate =
    requestedDate && availableDates.includes(requestedDate)
      ? requestedDate
      : (availableDates[0] ?? null);
  return { availableDates, resolvedDate };
}

export async function listLivestreamHistory(): Promise<
  LivestreamHistoryItem[]
> {
  return listFilesystemLivestreamHistory();
}

export async function listPublishedVideos(): Promise<PublishedVideoItem[]> {
  return listFilesystemPublishedVideos();
}

export async function getPublishedVideoBySlug(
  slug: string,
): Promise<(PublishedVideoItem & { transcript: string }) | null> {
  const item =
    listFilesystemPublishedVideos().find(
      (video) => video.routeSlug === slug || video.videoId === slug,
    ) ?? null;
  if (!item) return null;

  return {
    ...item,
    transcript: fs.readFileSync(item.transcriptPath, 'utf-8'),
  };
}

function buildArchiveTitle(
  date: string,
  topics: Topic[],
  historyItem: LivestreamHistoryItem | null,
): string {
  if (historyItem && topics.length === 0) return historyItem.title;
  if (topics.length === 1) return topics[0].title;
  return `${date} Livestream Rundown`;
}

function mergeArchiveTopics(...topicGroups: Topic[][]): Topic[] {
  const merged = new Map<string, Topic>();

  for (const topics of topicGroups) {
    for (const topic of topics) {
      merged.set(`${topic.date}:${topic.slug}`, topic);
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.fileName.localeCompare(b.fileName),
  );
}

function mergeLivestreamArchiveItems(
  a: LivestreamArchiveItem,
  b: LivestreamArchiveItem,
): LivestreamArchiveItem {
  const transcriptItem = a.hasTranscript ? a : b.hasTranscript ? b : null;
  const canonicalItem = transcriptItem ?? (a.date >= b.date ? a : b);
  const topicSource = a.topics.length >= b.topics.length ? a : b;
  const topics = mergeArchiveTopics(a.topics, b.topics);

  return {
    date: canonicalItem.date,
    hasTranscript: a.hasTranscript || b.hasTranscript,
    title:
      transcriptItem?.title ??
      (topics.length === 1 ? topics[0].title : canonicalItem.title),
    topicCount: topics.length || Math.max(a.topicCount, b.topicCount),
    topicDate: topics.length > 0 ? topicSource.topicDate : canonicalItem.date,
    topics,
    transcriptPath: transcriptItem?.transcriptPath ?? null,
    transcriptTitle: transcriptItem?.transcriptTitle ?? null,
    videoId: canonicalItem.videoId ?? a.videoId ?? b.videoId,
    youtubeUrl:
      transcriptItem?.youtubeUrl ??
      canonicalItem.youtubeUrl ??
      a.youtubeUrl ??
      b.youtubeUrl,
  };
}

function dedupeLivestreamArchiveItems(
  items: LivestreamArchiveItem[],
): LivestreamArchiveItem[] {
  const byVideoId = new Map<string, LivestreamArchiveItem>();
  const withoutVideoId: LivestreamArchiveItem[] = [];

  for (const item of items) {
    if (!item.videoId) {
      withoutVideoId.push(item);
      continue;
    }

    const existing = byVideoId.get(item.videoId);
    byVideoId.set(
      item.videoId,
      existing ? mergeLivestreamArchiveItems(existing, item) : item,
    );
  }

  return [...withoutVideoId, ...byVideoId.values()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export async function listLivestreamArchive(): Promise<
  LivestreamArchiveItem[]
> {
  const historyByDate = new Map(
    listFilesystemLivestreamHistory().map((item) => [item.date, item]),
  );
  const dates = new Set<string>([
    ...Array.from(historyByDate.keys()),
    ...(await listAvailableLivestreamDates()),
  ]);

  const items = await Promise.all(
    Array.from(dates).map(async (date) => {
      const topics = await getTopicsForDate(date);
      const historyItem = historyByDate.get(date) ?? null;
      const topicVideoUrl = topics
        .map((topic) => extractLivestreamYouTubeUrl(topic.content))
        .find((url): url is string => Boolean(url));
      const topicVideoId = topicVideoUrl ? extractVideoId(topicVideoUrl) : null;
      const youtubeUrl = historyItem?.youtubeUrl ?? topicVideoUrl ?? null;
      const videoId = historyItem?.videoId ?? topicVideoId;

      return {
        date,
        hasTranscript: Boolean(historyItem),
        title: buildArchiveTitle(date, topics, historyItem),
        topicCount: topics.length,
        topicDate: date,
        topics,
        transcriptPath: historyItem?.transcriptPath ?? null,
        transcriptTitle: historyItem?.title ?? null,
        videoId,
        youtubeUrl,
      } satisfies LivestreamArchiveItem;
    }),
  );

  return dedupeLivestreamArchiveItems(items);
}

export async function getLivestreamArchiveByDate(
  date: string,
): Promise<(LivestreamArchiveItem & { transcript: string | null }) | null> {
  const item =
    (await listLivestreamArchive()).find(
      (archive) =>
        archive.date === date ||
        archive.topicDate === date ||
        archive.topics.some((topic) => topic.date === date),
    ) ?? null;
  if (!item) return null;

  return {
    ...item,
    transcript: item.transcriptPath
      ? fs.readFileSync(item.transcriptPath, 'utf-8')
      : null,
  };
}

export async function getLivestreamArchiveByVideoId(
  videoId: string,
): Promise<(LivestreamArchiveItem & { transcript: string | null }) | null> {
  const item =
    (await listLivestreamArchive()).find(
      (archive) => archive.videoId === videoId,
    ) ?? null;
  if (!item) return null;

  return {
    ...item,
    transcript: item.transcriptPath
      ? fs.readFileSync(item.transcriptPath, 'utf-8')
      : null,
  };
}

export async function getTopicsForArchive(
  archive: Pick<LivestreamArchiveItem, 'topicDate' | 'topics'> | null,
  fallbackDate: string,
): Promise<Topic[]> {
  if (archive?.topics.length) return archive.topics;
  return getTopicsForDate(archive?.topicDate ?? fallbackDate);
}

/**
 * Repo seed, then the Redis overlay topic for that slug, then its override.
 * `strict` reads the overlay fresh and throws if Redis cannot be read, so a
 * caller about to write never builds on an empty fallback.
 */
export async function getTopicsForDate(
  date: string,
  strict = false,
): Promise<Topic[]> {
  if (getProducerStorageBackend() !== 'redis') {
    return mergeTopics(date, undefined);
  }

  const overlay = strict
    ? await readOverlayStrict(date)
    : (await loadOverlaySnapshot()).get(date);
  return mergeTopics(date, overlay);
}

export async function getTopicBySlug(
  date: string,
  slug: string,
): Promise<Topic | null> {
  const topics = await getTopicsForDate(date);
  return topics.find((topic) => topic.slug === slug) ?? null;
}

export async function readTopicRaw(
  date: string,
  slug: string,
): Promise<string | null> {
  if (getProducerStorageBackend() !== 'redis') {
    const filePath = findTopicFile(slug, date);
    if (!filePath) return null;
    return fs.readFileSync(filePath, 'utf-8');
  }

  const topic = await getTopicBySlug(date, slug);
  return topic ? topicToMarkdown(topic) : null;
}

/** One atomic HSET + SADD, so a failed write leaves neither the field nor the date index. */
async function writeOverlayField(date: string, field: string, value: unknown) {
  try {
    await writeRedisHashFieldAndIndex(
      overlayFieldsKey(date),
      field,
      value,
      overlayDatesKey(),
      date,
    );
  } finally {
    clearTopicOverlayCache();
  }
}

export async function saveTopicUpdate(
  date: string,
  slug: string,
  updates: TopicUpdate,
): Promise<boolean> {
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') {
    throw createWritableStorageError('livestream');
  }

  if (backend === 'filesystem') {
    const filePath = findTopicFile(slug, date);
    if (!filePath) return false;

    let raw = fs.readFileSync(filePath, 'utf-8');

    if (updates.status) {
      raw = updateFrontmatterField(raw, 'status', updates.status);
    }
    if (updates.thumbnail_prompt !== undefined) {
      raw = updateFrontmatterField(
        raw,
        'thumbnail_prompt',
        updates.thumbnail_prompt,
      );
    }

    if (updates.generated) {
      for (const field of CONTENT_FIELDS) {
        const value = updates.generated[field];
        if (value !== undefined && value !== null) {
          raw = updateGeneratedField(raw, field, value);
        }
      }
    }

    fs.writeFileSync(filePath, raw, 'utf-8');
    return true;
  }

  if (!DATE_PATTERN.test(date)) return false;

  const overlay = await readOverlayStrict(date);
  const topic = mergeTopics(date, overlay).find(
    (candidate) => candidate.slug === slug,
  );
  if (!topic) return false;

  // Only this slug's field is read and written; the legacy override (if any)
  // keeps applying underneath it, so it never needs copying forward.
  const current =
    (await readRedisHashField<StoredTopicOverride>(
      overlayFieldsKey(date),
      `${OVERRIDE_FIELD_PREFIX}${slug}`,
      { strict: true },
    )) ?? {};
  await writeOverlayField(date, `${OVERRIDE_FIELD_PREFIX}${slug}`, {
    ...current,
    ...updates,
    generated: {
      ...(current.generated ?? {}),
      ...(updates.generated ?? {}),
    },
  } satisfies StoredTopicOverride);

  return true;
}

export async function createTopic(input: {
  content: string;
  date: string;
  slug: string;
  source: string;
  title: string;
}): Promise<{ fileName: string; slug: string; status: TopicStatus }> {
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') {
    throw createWritableStorageError('livestream');
  }

  if (backend === 'filesystem') {
    const topics = await getTopicsForDate(input.date);
    const fileName = buildTopicFileName(topics.length + 1, input.slug);
    const dir = path.join(DATA_DIR, input.date);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const markdown = `---
title: "${input.title}"
slug: "${input.slug}"
source: "${input.source}"
status: "backlog"
date: "${input.date}"
announcement_tweet: null
thumbnail_prompt: null
---

${input.content}

## Generated Content
`;

    fs.writeFileSync(path.join(dir, fileName), markdown, 'utf-8');
    return { fileName, slug: input.slug, status: 'backlog' };
  }

  if (!DATE_PATTERN.test(input.date)) {
    throw new Error('Topic date must be YYYY-MM-DD');
  }

  const overlay = await readOverlayStrict(input.date);
  const fileName = buildTopicFileName(
    mergeTopics(input.date, overlay).length + 1,
    input.slug,
  );
  const topic: Topic = {
    announcement_tweet: null,
    content: input.content,
    date: input.date,
    fileName,
    generated: { ...EMPTY_GENERATED },
    slug: input.slug,
    source: input.source,
    status: 'backlog',
    thumbnail_prompt: null,
    title: input.title,
  };

  await writeOverlayField(
    input.date,
    `${TOPIC_FIELD_PREFIX}${input.slug}`,
    topic,
  );
  return { fileName, slug: input.slug, status: 'backlog' };
}

function buildTopicFileName(position: number, slug: string): string {
  return `topic-${String(position).padStart(2, '0')}-${slug}.md`;
}

export async function readTopicDrawing(
  date: string,
  slug: string,
): Promise<TopicDrawingResponse> {
  if (getProducerStorageBackend() === 'redis') {
    const stored = await readRedisJson<StoredDrawing>(drawingKey(date, slug));
    if (stored) {
      return { scene: stored.scene, updatedAt: stored.updatedAt };
    }
  }

  const drawingFile = getTopicDrawingFile(slug, date);
  if (!drawingFile || !fs.existsSync(drawingFile)) {
    return { scene: null, updatedAt: null };
  }

  const raw = fs.readFileSync(drawingFile, 'utf-8');
  const stat = fs.statSync(drawingFile);

  return {
    scene: JSON.parse(raw) as Record<string, unknown>,
    updatedAt: stat.mtime.toISOString(),
  };
}

export async function saveTopicDrawing(
  date: string,
  slug: string,
  content: string,
): Promise<string> {
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') {
    throw createWritableStorageError('livestream');
  }

  if (backend === 'filesystem') {
    const drawingFile = getTopicDrawingFile(slug, date);
    if (!drawingFile) {
      throw new Error('Topic not found');
    }

    fs.mkdirSync(path.dirname(drawingFile), { recursive: true });
    fs.writeFileSync(drawingFile, content, 'utf-8');
    return new Date().toISOString();
  }

  const updatedAt = new Date().toISOString();
  await writeRedisJson(drawingKey(date, slug), {
    scene: JSON.parse(content),
    updatedAt,
  } satisfies StoredDrawing);
  return updatedAt;
}
