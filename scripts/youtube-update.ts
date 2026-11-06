#!/usr/bin/env bun
/**
 * Update the thumbnail and metadata of videos that are already on YouTube.
 * Nothing is written without --apply. Without it, the script reads each video
 * and prints what would change. Only the fields you name are touched.
 *
 * Before the first write, run `bun run youtube:sync` to snapshot the channel.
 * Every --apply also saves the old values of what it changes to
 * backups/<timestamp>.json in the snapshot folder, as a batch file that puts
 * them back: `bun run youtube:update --batch <that file> --apply`.
 *
 * One video:
 *   bun run youtube:update <videoId> --title "New title" --thumbnail thumb.jpg
 *   bun run youtube:update <videoId> --title "New title" --apply
 *
 * Several videos, from a JSON array of changes:
 *   bun run youtube:update --batch updates.json --apply
 *
 * Thumbnails approved in the Thumbnail Lab that YouTube doesn't have yet:
 *   bun run youtube:update --from-lab --apply
 *   bun run youtube:update --from-lab --with-titles --apply   (titles too)
 *
 * Changes:
 *   --title <text>                     Up to 100 characters
 *   --description <text>               Up to 5,000 bytes
 *   --description-file <path>          Read the description from a file
 *   --tags <a,b,c>                     Replace the tags; "" clears them
 *   --category-id <id>                 For example 28, Science & Technology
 *   --default-language <code>
 *   --default-audio-language <code>
 *   --thumbnail <path>                 JPEG or PNG, up to 2 MB
 *   --privacy <private|unlisted|public>  Replaces any schedule
 *   --publish-at <ISO date>            Schedule; forces privacy to private
 *   --made-for-kids <true|false>
 *   --embeddable <true|false>
 *   --license <youtube|creativeCommon>
 *   --public-stats <true|false>
 *   --synthetic-media <true|false>
 *
 * Options:
 *   --apply            Write the changes. The default is a dry run
 *   --offline          Check the input and print the plan, with no API calls
 *   --confirm-public   Allow a change that makes a video public or schedules it
 *   --channel <name>   main (default) or clips
 *   --id <a,b>         With --from-lab: only these videos
 *   --with-titles      With --from-lab: also send the lab titles. Without it
 *                      the lab never changes a live title
 *   --include-shorts   With --from-lab: include Shorts, skipped by default
 *   --force            With --from-lab: send items the ledger says are synced
 *   --help             Show this help
 *
 * Batch file: an array of objects with id plus any of title, description,
 * tags, categoryId, defaultLanguage, defaultAudioLanguage, thumbnail, privacy,
 * publishAt, madeForKids, embeddable, license, publicStats, syntheticMedia.
 * A thumbnail path is relative to the batch file.
 *
 * --from-lab reads apps/app/data/thumbnail-lab (or THUMBNAIL_LAB_DIR), sends
 * only the current thumbnail of approved items (and their title with
 * --with-titles), and records what it sent in youtube-sync.json there, so a
 * second run sends nothing new.
 *
 * Auth is the same as youtube-upload.ts: YOUTUBE_CLIENT_ID,
 * YOUTUBE_CLIENT_SECRET, and a refresh token from YOUTUBE_REFRESH_TOKEN_MAIN /
 * _CLIPS or the app's KV store.
 *
 * Quota: reading a video costs 1 unit, videos.update 50 and thumbnails.set
 * about 50, from a default of 10,000 a day. videos.update replaces the whole
 * snippet and status, so the script reads each video first and sends the
 * merged result. A failed video doesn't stop the run; running out of quota
 * does, and the script prints what was left.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import {
  currentThumbnail,
  isThumbnailItem,
  isThumbnailKind,
  isVideoId,
  kindOf,
  type ThumbnailItem,
} from '../apps/app/src/lib/thumbnail-lab.ts';
import { snapshotDirectory } from './youtube-sync.ts';
import {
  type Channel,
  fail,
  getAccessToken,
  type Privacy,
  verifyChannel,
} from './youtube-upload.ts';

const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3';
const DAILY_QUOTA = 10_000;
const MAX_DESCRIPTION_BYTES = 5000;
const MAX_TAG_CHARACTERS = 500;
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const MAX_TITLE_LENGTH = 100;
const PRIVACIES: readonly Privacy[] = ['private', 'unlisted', 'public'];
const LICENSES = ['creativeCommon', 'youtube'] as const;
const THUMBNAIL_EXTENSIONS = ['.jpeg', '.jpg', '.png'];

type License = (typeof LICENSES)[number];

export type VideoChange = {
  categoryId?: string;
  defaultAudioLanguage?: string;
  defaultLanguage?: string;
  description?: string;
  embeddable?: boolean;
  id: string;
  license?: License;
  madeForKids?: boolean;
  privacy?: Privacy;
  publicStats?: boolean;
  publishAt?: string;
  syntheticMedia?: boolean;
  tags?: string[];
  thumbnail?: string;
  title?: string;
};

export type YouTubeSnippet = {
  categoryId: string;
  defaultAudioLanguage?: string;
  defaultLanguage?: string;
  description?: string;
  tags?: string[];
  title: string;
};

export type YouTubeStatus = {
  containsSyntheticMedia?: boolean;
  embeddable?: boolean;
  license?: string;
  privacyStatus: Privacy;
  publicStatsViewable?: boolean;
  publishAt?: string;
  selfDeclaredMadeForKids?: boolean;
};

export type YouTubeVideo = { snippet: YouTubeSnippet; status: YouTubeStatus };

export type Plan = {
  diffs: string[];
  parts: Array<'snippet' | 'status'>;
  snippet: YouTubeSnippet;
  status: YouTubeStatus;
};

export type SyncRecord = { assetHash?: string; at: string; title?: string };
export type SyncLedger = Record<string, SyncRecord>;
export type QueuedChange = {
  change: VideoChange;
  sync?: Omit<SyncRecord, 'at'>;
};

export type Options = {
  apply: boolean;
  batch?: string;
  change?: VideoChange;
  channel: Channel;
  confirmPublic: boolean;
  force: boolean;
  fromLab: boolean;
  ids?: string[];
  includeShorts: boolean;
  offline: boolean;
  withTitles: boolean;
};

export class YouTubeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string,
  ) {
    super(message);
  }
}

function defined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined),
  ) as T;
}

/** Carry every writable field, because videos.update drops what isn't sent. */
export function mergeSnippet(
  current: YouTubeSnippet,
  change: VideoChange,
): YouTubeSnippet {
  const tags = change.tags ?? current.tags;
  return defined({
    categoryId: change.categoryId ?? current.categoryId,
    defaultAudioLanguage:
      change.defaultAudioLanguage ?? current.defaultAudioLanguage,
    defaultLanguage: change.defaultLanguage ?? current.defaultLanguage,
    description: change.description ?? current.description ?? '',
    tags: tags?.length ? tags : undefined,
    title: change.title ?? current.title,
  });
}

/** A new privacy replaces the schedule; a new schedule forces private. */
export function mergeStatus(
  current: YouTubeStatus,
  change: VideoChange,
): YouTubeStatus {
  const keepsSchedule =
    change.privacy === undefined && current.privacyStatus === 'private';
  return defined({
    containsSyntheticMedia:
      change.syntheticMedia ?? current.containsSyntheticMedia,
    embeddable: change.embeddable ?? current.embeddable,
    license: change.license ?? current.license,
    privacyStatus: change.publishAt
      ? 'private'
      : (change.privacy ?? current.privacyStatus),
    publicStatsViewable: change.publicStats ?? current.publicStatsViewable,
    publishAt:
      change.publishAt ?? (keepsSchedule ? current.publishAt : undefined),
    selfDeclaredMadeForKids:
      change.madeForKids ?? current.selfDeclaredMadeForKids,
  });
}

function sameTime(left?: string, right?: string) {
  if (!left || !right) return left === right;
  return Date.parse(left) === Date.parse(right);
}

function fieldDiffs(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
  fields: string[],
) {
  return fields.flatMap((field) => {
    const before = JSON.stringify(current[field]);
    const after = JSON.stringify(next[field]);
    if (before === after) return [];
    if (field === 'publishAt') {
      const unchanged = sameTime(
        current[field] as string | undefined,
        next[field] as string | undefined,
      );
      if (unchanged) return [];
    }
    return [`${field}: ${before ?? '(none)'} → ${after ?? '(none)'}`];
  });
}

export function planChange(video: YouTubeVideo, change: VideoChange): Plan {
  const snippet = mergeSnippet(video.snippet, change);
  const status = mergeStatus(video.status, change);
  const before = {
    ...video.snippet,
    description: video.snippet.description ?? '',
    tags: video.snippet.tags?.length ? video.snippet.tags : undefined,
  };
  const snippetDiffs = fieldDiffs(before, snippet, [
    'title',
    'description',
    'tags',
    'categoryId',
    'defaultLanguage',
    'defaultAudioLanguage',
  ]);
  const statusDiffs = fieldDiffs(video.status, status, [
    'privacyStatus',
    'publishAt',
    'embeddable',
    'license',
    'publicStatsViewable',
    'selfDeclaredMadeForKids',
    'containsSyntheticMedia',
  ]);
  return {
    diffs: [...snippetDiffs, ...statusDiffs],
    parts: [
      ...(snippetDiffs.length ? (['snippet'] as const) : []),
      ...(statusDiffs.length ? (['status'] as const) : []),
    ],
    snippet,
    status,
  };
}

export function needsPublicConfirmation(
  current: YouTubeStatus,
  next: YouTubeStatus,
) {
  if (next.privacyStatus === 'public' && current.privacyStatus !== 'public')
    return true;
  return Boolean(
    next.publishAt && !sameTime(next.publishAt, current.publishAt),
  );
}

/**
 * The old values of what a plan changes, as a batch entry that puts them back.
 * A thumbnail can't be restored this way; the sync snapshot keeps its URL.
 */
export function restoreEntry(
  video: YouTubeVideo,
  id: string,
  plan: Plan,
  now = new Date(),
): VideoChange {
  const { snippet, status } = video;
  const entry: VideoChange = { id };
  if (plan.parts.includes('snippet')) {
    Object.assign(
      entry,
      defined({
        categoryId: snippet.categoryId,
        defaultAudioLanguage: snippet.defaultAudioLanguage,
        defaultLanguage: snippet.defaultLanguage,
        description: snippet.description,
        tags: snippet.tags ?? [],
        title: snippet.title,
      }),
    );
  }
  if (plan.parts.includes('status')) {
    const scheduled =
      status.publishAt && Date.parse(status.publishAt) > now.getTime();
    Object.assign(
      entry,
      defined({
        embeddable: status.embeddable,
        license: status.license as License | undefined,
        madeForKids: status.selfDeclaredMadeForKids,
        privacy: scheduled ? undefined : status.privacyStatus,
        publicStats: status.publicStatsViewable,
        publishAt: scheduled ? status.publishAt : undefined,
        syntheticMedia: status.containsSyntheticMedia,
      }),
    );
  }
  return entry;
}

function tagCharacters(tags: string[]) {
  const quoted = tags.map((tag) => tag.length + (tag.includes(' ') ? 2 : 0));
  return (
    quoted.reduce((total, length) => total + length, 0) +
    Math.max(tags.length - 1, 0)
  );
}

export function validateChange(change: VideoChange, now = new Date()) {
  const errors: string[] = [];
  const { description, publishAt, tags, thumbnail, title } = change;
  if (!isVideoId(change.id)) errors.push('The video id is invalid.');
  if (title !== undefined) {
    if (!title.trim()) errors.push('The title is empty.');
    if (title.length > MAX_TITLE_LENGTH)
      errors.push(`The title is over ${MAX_TITLE_LENGTH} characters.`);
    if (/[<>]/.test(title)) errors.push('The title cannot contain < or >.');
  }
  if (description !== undefined) {
    if (!description.trim())
      errors.push('The description is empty; this would erase it.');
    if (Buffer.byteLength(description) > MAX_DESCRIPTION_BYTES)
      errors.push(`The description is over ${MAX_DESCRIPTION_BYTES} bytes.`);
    if (/[<>]/.test(description))
      errors.push('The description cannot contain < or >.');
  }
  if (tags && tagCharacters(tags) > MAX_TAG_CHARACTERS)
    errors.push(`The tags are over ${MAX_TAG_CHARACTERS} characters.`);
  if (publishAt !== undefined) {
    const time = Date.parse(publishAt);
    if (Number.isNaN(time)) errors.push('publishAt is not a valid date.');
    else if (time <= now.getTime()) errors.push('publishAt is in the past.');
    if (change.privacy && change.privacy !== 'private')
      errors.push('publishAt needs private, or no privacy at all.');
  }
  if (thumbnail !== undefined) {
    if (!THUMBNAIL_EXTENSIONS.includes(extname(thumbnail).toLowerCase()))
      errors.push('The thumbnail must be a JPEG or PNG.');
    if (!existsSync(thumbnail)) errors.push(`${thumbnail} doesn't exist.`);
    else if (statSync(thumbnail).size > MAX_THUMBNAIL_BYTES)
      errors.push('The thumbnail is over 2 MB.');
  }
  return errors;
}

/** The most a change can cost, since which parts differ isn't known yet. */
export function quotaFor(change: VideoChange) {
  const hasMetadata = Object.keys(change).some(
    (key) => key !== 'id' && key !== 'thumbnail',
  );
  return 1 + (hasMetadata ? 50 : 0) + (change.thumbnail ? 50 : 0);
}

function parseBoolean(flag: string, value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${flag} must be true or false`);
}

function parseEnum<T extends string>(
  flag: string,
  value: string,
  allowed: readonly T[],
): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`${flag} must be one of ${allowed.join(', ')}`);
}

function parseList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseArgs(argv: string[]): Options {
  const options: Options = {
    apply: false,
    channel: 'main',
    confirmPublic: false,
    force: false,
    fromLab: false,
    includeShorts: false,
    offline: false,
    withTitles: false,
  };
  const change: Partial<VideoChange> = {};
  let id: string | undefined;
  let descriptionFile: string | undefined;

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    const value = () => {
      const next = argv[++index];
      if (next === undefined || next.startsWith('--'))
        throw new Error(`${argument} needs a value`);
      return next;
    };
    switch (argument) {
      case '--apply':
        options.apply = true;
        break;
      case '--batch':
        options.batch = value();
        break;
      case '--category-id':
        change.categoryId = value();
        break;
      case '--channel':
        options.channel = parseEnum(argument, value(), ['main', 'clips']);
        break;
      case '--confirm-public':
        options.confirmPublic = true;
        break;
      case '--default-audio-language':
        change.defaultAudioLanguage = value();
        break;
      case '--default-language':
        change.defaultLanguage = value();
        break;
      case '--description':
        change.description = value();
        break;
      case '--description-file':
        descriptionFile = value();
        break;
      case '--embeddable':
        change.embeddable = parseBoolean(argument, value());
        break;
      case '--force':
        options.force = true;
        break;
      case '--from-lab':
        options.fromLab = true;
        break;
      case '--id':
        options.ids = parseList(value());
        break;
      case '--include-shorts':
        options.includeShorts = true;
        break;
      case '--license':
        change.license = parseEnum(argument, value(), LICENSES);
        break;
      case '--made-for-kids':
        change.madeForKids = parseBoolean(argument, value());
        break;
      case '--offline':
        options.offline = true;
        break;
      case '--privacy':
        change.privacy = parseEnum(argument, value(), PRIVACIES);
        break;
      case '--public-stats':
        change.publicStats = parseBoolean(argument, value());
        break;
      case '--publish-at':
        change.publishAt = value();
        break;
      case '--synthetic-media':
        change.syntheticMedia = parseBoolean(argument, value());
        break;
      case '--with-titles':
        options.withTitles = true;
        break;
      case '--tags':
        change.tags = parseList(value());
        break;
      case '--thumbnail':
        change.thumbnail = value();
        break;
      case '--title':
        change.title = value();
        break;
      default:
        if (argument.startsWith('--'))
          throw new Error(`Unknown flag: ${argument}`);
        if (id) throw new Error(`Unexpected argument: ${argument}`);
        id = argument;
    }
  }

  if (descriptionFile !== undefined) {
    if (change.description !== undefined)
      throw new Error('Pass --description or --description-file, not both');
    change.description = readFileSync(descriptionFile, 'utf8');
  }

  const modes = [id, options.batch, options.fromLab || undefined].filter(
    (mode) => mode !== undefined,
  );
  if (modes.length !== 1)
    throw new Error('Pass one of <videoId>, --batch or --from-lab');
  if (options.apply && options.offline)
    throw new Error('--apply and --offline contradict each other');
  if (
    !options.fromLab &&
    (options.ids ||
      options.includeShorts ||
      options.force ||
      options.withTitles)
  )
    throw new Error(
      '--id, --include-shorts, --force and --with-titles need --from-lab',
    );

  const hasChange = Object.keys(change).length > 0;
  if (!id && hasChange)
    throw new Error('Put the changes in the batch file or the lab, not flags');
  if (id) {
    if (!hasChange) throw new Error('Nothing to change');
    options.change = { ...change, id };
  }
  return options;
}

const BATCH_FIELDS: Record<keyof VideoChange, (value: unknown) => boolean> = {
  categoryId: (value) => typeof value === 'string',
  defaultAudioLanguage: (value) => typeof value === 'string',
  defaultLanguage: (value) => typeof value === 'string',
  description: (value) => typeof value === 'string',
  embeddable: (value) => typeof value === 'boolean',
  id: (value) => typeof value === 'string',
  license: (value) => LICENSES.includes(value as License),
  madeForKids: (value) => typeof value === 'boolean',
  privacy: (value) => PRIVACIES.includes(value as Privacy),
  publicStats: (value) => typeof value === 'boolean',
  publishAt: (value) => typeof value === 'string',
  syntheticMedia: (value) => typeof value === 'boolean',
  tags: (value) =>
    Array.isArray(value) && value.every((tag) => typeof tag === 'string'),
  thumbnail: (value) => typeof value === 'string',
  title: (value) => typeof value === 'string',
};

export function parseBatch(text: string, directory: string): VideoChange[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('A batch must be a JSON array');
  const seen = new Set<string>();
  return parsed.map((entry: unknown, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new Error(`Batch entry ${index} is not an object`);
    const fields = entry as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) {
      const check = BATCH_FIELDS[key as keyof VideoChange];
      if (!check) throw new Error(`Batch entry ${index}: unknown field ${key}`);
      if (!check(value))
        throw new Error(`Batch entry ${index}: invalid ${key}`);
    }
    const change = fields as VideoChange;
    if (typeof fields.id !== 'string')
      throw new Error(`Batch entry ${index} has no id`);
    if (seen.has(change.id))
      throw new Error(`Batch entry ${index} repeats ${change.id}`);
    seen.add(change.id);
    return change.thumbnail
      ? { ...change, thumbnail: resolve(directory, change.thumbnail) }
      : change;
  });
}

export function selectLabChanges(
  items: ThumbnailItem[],
  ledger: SyncLedger,
  {
    assetPath,
    exists,
    force = false,
    ids,
    includeShorts = false,
    withTitles = false,
  }: {
    assetPath: (id: string, hash: string) => string;
    exists: (path: string) => boolean;
    force?: boolean;
    ids?: string[];
    includeShorts?: boolean;
    withTitles?: boolean;
  },
) {
  const queued: QueuedChange[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const known = new Set(items.map((item) => item.id));
  for (const id of ids ?? []) {
    if (!known.has(id)) skipped.push({ id, reason: 'not in the lab' });
  }
  for (const item of items) {
    if (ids && !ids.includes(item.id)) continue;
    const skip = (reason: string) => skipped.push({ id: item.id, reason });
    if (!isThumbnailKind(item)) {
      skip(kindOf(item));
      continue;
    }
    if (item.format === 'short' && !includeShorts) {
      skip('short');
      continue;
    }
    const version = currentThumbnail(item);
    if (version.review.status !== 'approved') {
      skip(`review is ${version.review.status}`);
      continue;
    }
    const path = assetPath(item.id, version.assetHash);
    if (!exists(path)) {
      skip('no local file');
      continue;
    }
    const synced = ledger[item.id];
    const sendTitle = withTitles && (force || synced?.title !== item.title);
    const sendThumbnail = force || synced?.assetHash !== version.assetHash;
    if (!sendTitle && !sendThumbnail) {
      skip('already synced');
      continue;
    }
    queued.push({
      change: {
        id: item.id,
        ...(sendTitle ? { title: item.title } : {}),
        ...(sendThumbnail ? { thumbnail: path } : {}),
      },
      sync: {
        ...(sendThumbnail ? { assetHash: version.assetHash } : {}),
        ...(sendTitle ? { title: item.title } : {}),
      },
    });
  }
  return { queued, skipped };
}

async function youtubeError(response: Response, label: string) {
  const body = await response.text();
  let reason: string | undefined;
  let detail = '';
  try {
    const error = JSON.parse(body).error;
    const first = error?.errors?.[0];
    reason = first?.reason;
    // Keep the API's own explanation; it carries no credentials.
    const parts = [
      error?.message,
      first?.domain && `domain: ${first.domain}`,
      first?.location && `location: ${first.location}`,
    ].filter((part): part is string => typeof part === 'string' && !!part);
    detail = parts.length ? ` (${parts.join('; ')})` : '';
  } catch {
    reason = undefined;
  }
  return new YouTubeError(
    `${label} failed: ${response.status} ${reason ?? body.slice(0, 500)}${detail}`,
    response.status,
    reason,
  );
}

async function fetchVideo(token: string, id: string) {
  const response = await fetch(
    `${API}/videos?part=snippet,status&id=${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw await youtubeError(response, 'videos.list');
  const data = (await response.json()) as { items?: YouTubeVideo[] };
  return data.items?.[0];
}

async function updateVideo(token: string, id: string, plan: Plan) {
  const body: Partial<YouTubeVideo> & { id: string } = { id };
  if (plan.parts.includes('snippet')) body.snippet = plan.snippet;
  if (plan.parts.includes('status')) body.status = plan.status;
  const response = await fetch(`${API}/videos?part=${plan.parts.join(',')}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  });
  if (!response.ok) throw await youtubeError(response, 'videos.update');
}

async function setThumbnail(token: string, id: string, path: string) {
  const response = await fetch(
    `${UPLOAD_API}/thumbnails/set?videoId=${encodeURIComponent(id)}`,
    {
      body: Bun.file(path),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':
          extname(path).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg',
      },
      method: 'POST',
    },
  );
  if (!response.ok) throw await youtubeError(response, 'thumbnails.set');
}

function isOutOfQuota(error: unknown) {
  return (
    error instanceof YouTubeError &&
    (error.reason === 'quotaExceeded' ||
      error.reason === 'uploadRateLimitExceeded')
  );
}

export async function runUpdates(
  queue: QueuedChange[],
  {
    apply,
    confirmPublic,
    log,
    onBackup,
    onSynced,
    token,
  }: {
    apply: boolean;
    confirmPublic: boolean;
    log: (line: string) => void;
    onBackup?: (restore: VideoChange) => void;
    onSynced?: (id: string, sync: Omit<SyncRecord, 'at'>) => void;
    token: string;
  },
) {
  const failed: Array<{ id: string; message: string }> = [];
  const planned: string[] = [];
  const unchanged: string[] = [];
  const updated: string[] = [];
  let unprocessed: string[] = [];

  for (const [index, { change, sync }] of queue.entries()) {
    const { id, thumbnail } = change;
    try {
      const video = await fetchVideo(token, id);
      if (!video) throw new Error('Not found on this channel');
      const plan = planChange(video, change);
      if (
        plan.parts.includes('status') &&
        needsPublicConfirmation(video.status, plan.status) &&
        !confirmPublic
      )
        throw new Error(
          'Making this public or scheduling needs --confirm-public',
        );

      if (!plan.parts.length && !thumbnail) {
        log(`· ${id}: nothing to change`);
        unchanged.push(id);
        if (apply && sync) onSynced?.(id, sync);
        continue;
      }
      log(`${apply ? '✏️ ' : '🔎'} ${id}: ${video.snippet.title}`);
      for (const diff of plan.diffs) log(`    ${diff}`);
      if (thumbnail) log(`    thumbnail → ${thumbnail}`);
      if (!apply) {
        planned.push(id);
        continue;
      }
      // The old values are saved first; if that fails, nothing is written.
      if (plan.parts.length) onBackup?.(restoreEntry(video, id, plan));
      if (plan.parts.length) await updateVideo(token, id, plan);
      if (thumbnail) await setThumbnail(token, id, thumbnail);
      if (sync) onSynced?.(id, sync);
      updated.push(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ id, message });
      log(`❌ ${id}: ${message}`);
      if (isOutOfQuota(error)) {
        unprocessed = queue.slice(index + 1).map((entry) => entry.change.id);
        break;
      }
    }
  }
  return { failed, planned, unchanged, unprocessed, updated };
}

function labDirectory() {
  return (
    process.env.THUMBNAIL_LAB_DIR ||
    resolve(import.meta.dir, '../apps/app/data/thumbnail-lab')
  );
}

function readLabItems(directory: string): ThumbnailItem[] {
  const parsed: unknown = JSON.parse(
    readFileSync(resolve(directory, 'items.json'), 'utf8'),
  );
  if (!Array.isArray(parsed) || !parsed.every(isThumbnailItem))
    throw new Error('items.json is not a valid lab catalogue');
  return parsed;
}

function backupWriter(directory: string, now = new Date()) {
  const path = resolve(
    directory,
    'backups',
    `${now.toISOString().replace(/[:.]/g, '-')}.json`,
  );
  const entries: VideoChange[] = [];
  return {
    get count() {
      return entries.length;
    },
    path,
    save(entry: VideoChange) {
      mkdirSync(dirname(path), { recursive: true });
      entries.push(entry);
      writeLedger(path, entries);
    },
  };
}

function readLedger(path: string): SyncLedger {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as SyncLedger;
}

function writeLedger(path: string, ledger: SyncLedger | VideoChange[]) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`);
  renameSync(temporary, path);
}

function usage(): never {
  const header = readFileSync(import.meta.path, 'utf8').split('*/')[0];
  console.log(header.replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

function loadQueue(options: Options, ledger: SyncLedger) {
  if (options.change)
    return { queued: [{ change: options.change }], skipped: [] };
  if (options.batch) {
    const path = resolve(options.batch);
    const changes = parseBatch(readFileSync(path, 'utf8'), dirname(path));
    return { queued: changes.map((change) => ({ change })), skipped: [] };
  }
  const directory = labDirectory();
  return selectLabChanges(readLabItems(directory), ledger, {
    assetPath: (id, hash) => resolve(directory, 'assets', id, `${hash}.jpg`),
    exists: existsSync,
    force: options.force,
    ids: options.ids,
    includeShorts: options.includeShorts,
    withTitles: options.withTitles,
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) usage();

  const ledgerPath = resolve(labDirectory(), 'youtube-sync.json');
  let queued: QueuedChange[];
  let ledger: SyncLedger = {};
  let options: Options;
  try {
    options = parseArgs(argv);
    if (options.fromLab) ledger = readLedger(ledgerPath);
    const queue = loadQueue(options, ledger);
    queued = queue.queued;
    for (const { id, reason } of queue.skipped) {
      console.log(`· ${id}: skipped, ${reason}`);
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  const errors = queued.flatMap(({ change }) =>
    validateChange(change).map((message) => `${change.id}: ${message}`),
  );
  if (errors.length) fail(errors.join('\n   '));
  if (!queued.length) {
    console.log('Nothing to send.');
    return;
  }

  const quota = queued.reduce(
    (total, { change }) => total + quotaFor(change),
    0,
  );
  console.log(
    `${queued.length} video(s), up to ${quota} of ${DAILY_QUOTA} daily quota units`,
  );
  if (options.offline) {
    for (const { change } of queued) console.log(JSON.stringify(change));
    return;
  }

  const token = await getAccessToken(options.channel);
  await verifyChannel(token, options.channel);
  if (!options.apply)
    console.log('Dry run: add --apply to write these changes.');

  const backup = backupWriter(snapshotDirectory());
  const result = await runUpdates(queued, {
    apply: options.apply,
    confirmPublic: options.confirmPublic,
    log: console.log,
    onBackup: (entry) => backup.save(entry),
    onSynced: (id, sync) => {
      ledger[id] = { ...ledger[id], ...sync, at: new Date().toISOString() };
      writeLedger(ledgerPath, ledger);
    },
    token,
  });

  console.log(
    `${result.updated.length} updated, ${result.planned.length} planned, ${result.unchanged.length} unchanged, ${result.failed.length} failed`,
  );
  if (backup.count) {
    console.log(
      `Old values saved to ${backup.path}\nTo undo: bun run youtube:update --batch ${backup.path} --apply`,
    );
  }
  if (result.unprocessed.length) {
    console.log(
      `Out of quota. Not attempted: ${result.unprocessed.join(', ')}`,
    );
  }
  if (result.failed.length) process.exit(1);
}

if (import.meta.main) await main();
