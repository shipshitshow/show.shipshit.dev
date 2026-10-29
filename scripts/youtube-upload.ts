#!/usr/bin/env bun
/**
 * Upload a video to YouTube through the Data API (videos.insert), private by
 * default.
 *
 * Usage:
 *   bun scripts/youtube-upload.ts --file <video.mp4> --meta <meta.json> [options]
 *
 * Options:
 *   --channel main|clips   Channel to upload to (default: main)
 *   --privacy private|unlisted|public   Default: private
 *   --confirm-public       Required together with --privacy public, or publishAt
 *   --thumbnail <png|jpg>  Custom thumbnail (overrides meta.thumbnail)
 *   --dry-run              Validate inputs and auth, print the request, upload nothing
 *
 * meta.json:
 *   {
 *     "title": "…",                         // required, max 100 chars
 *     "description": "…",
 *     "chapters": [{ "time": "0:00", "title": "Intro" }],  // appended to description
 *     "tags": ["ai", "founders"],
 *     "categoryId": "28",                   // default: 28 (Science & Technology)
 *     "thumbnail": "thumb.png",             // relative to meta.json
 *     "publishAt": "2026-10-30T16:00:00Z",  // schedule; needs --confirm-public
 *     "madeForKids": false
 *   }
 *
 * Auth: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET, plus a refresh token from
 * YOUTUBE_REFRESH_TOKEN_MAIN / _CLIPS or, when unset, the app's KV store
 * (`youtube:refresh_token:<channel>`, via KV_REST_API_URL / KV_REST_API_TOKEN).
 * The app's existing youtube.force-ssl scope covers videos.insert and
 * thumbnails.set. Run `vercel env pull` in apps/app to get the values locally.
 *
 * Google locks videos uploaded from an unaudited API project to private,
 * whatever privacyStatus is sent, and each upload costs 1,600 of the default
 * 10,000 daily quota units.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

type Channel = 'main' | 'clips';
type Privacy = 'private' | 'unlisted' | 'public';

interface Chapter {
  time: string;
  title: string;
}

interface Meta {
  categoryId?: string;
  chapters?: Chapter[];
  description?: string;
  madeForKids?: boolean;
  publishAt?: string;
  tags?: string[];
  thumbnail?: string;
  title: string;
}

interface CliArgs {
  channel: Channel;
  confirmPublic: boolean;
  dryRun: boolean;
  file?: string;
  help: boolean;
  meta?: string;
  privacy: Privacy;
  thumbnail?: string;
}

// Resumable chunks must be multiples of 256 KiB.
const CHUNK_SIZE = 256 * 1024 * 128; // 32 MiB
const MAX_RETRIES = 5;

function usage(): never {
  const header = readFileSync(import.meta.path, 'utf8').split('*/')[0];
  console.log(header.replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    channel: 'main',
    confirmPublic: false,
    dryRun: false,
    help: false,
    privacy: 'private',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value) fail(`${arg} needs a value`);
      return value;
    };

    switch (arg) {
      case '--file':
        args.file = next();
        break;
      case '--meta':
        args.meta = next();
        break;
      case '--thumbnail':
        args.thumbnail = next();
        break;
      case '--channel': {
        const value = next();
        if (value !== 'main' && value !== 'clips') {
          fail('--channel must be main or clips');
        }
        args.channel = value;
        break;
      }
      case '--privacy': {
        const value = next();
        if (!['private', 'unlisted', 'public'].includes(value)) {
          fail('--privacy must be private, unlisted or public');
        }
        args.privacy = value as Privacy;
        break;
      }
      case '--confirm-public':
        args.confirmPublic = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function parseTimestamp(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some(Number.isNaN)) {
    fail(`Bad chapter time "${time}" (use m:ss or h:mm:ss)`);
  }
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Append chapters in the format YouTube recognises: first at 0:00, 3+ entries, ≥10s apart. */
function buildDescription(meta: Meta): string {
  const description = (meta.description ?? '').trim();
  if (!meta.chapters?.length) return description;

  const seconds = meta.chapters.map((chapter) => parseTimestamp(chapter.time));
  if (seconds[0] !== 0) fail('The first chapter must start at 0:00');
  if (meta.chapters.length < 3) fail('YouTube needs at least 3 chapters');
  for (let i = 1; i < seconds.length; i++) {
    if (seconds[i] - seconds[i - 1] < 10) {
      fail(
        `Chapters "${meta.chapters[i - 1].title}" and "${meta.chapters[i].title}" are under 10s apart`,
      );
    }
  }

  const lines = meta.chapters.map(
    (chapter) => `${chapter.time} ${chapter.title}`,
  );
  return [description, lines.join('\n')].filter(Boolean).join('\n\n');
}

function loadMeta(path: string): { meta: Meta; baseDir: string } {
  if (!existsSync(path)) fail(`Metadata file not found: ${path}`);
  const meta = JSON.parse(readFileSync(path, 'utf8')) as Meta;
  if (!meta.title?.trim()) fail('meta.title is required');
  if (meta.title.length > 100) fail('meta.title is over 100 characters');
  if (/[<>]/.test(meta.title)) fail('meta.title cannot contain < or >');
  return { baseDir: dirname(resolve(path)), meta };
}

async function readKvRefreshToken(channel: Channel): Promise<string | null> {
  const url = process.env.KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/youtube:refresh_token:${channel}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const { result } = (await res.json()) as { result: string | null };
  if (!result) return null;
  try {
    const parsed = JSON.parse(result);
    return typeof parsed === 'string' ? parsed : result;
  } catch {
    return result;
  }
}

async function getAccessToken(channel: Channel): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    fail(
      'Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET (vercel env pull in apps/app)',
    );
  }

  const envToken =
    channel === 'main'
      ? process.env.YOUTUBE_REFRESH_TOKEN_MAIN
      : process.env.YOUTUBE_REFRESH_TOKEN_CLIPS;
  const refreshToken = envToken || (await readKvRefreshToken(channel));
  if (!refreshToken) {
    fail(
      `No refresh token for "${channel}" in KV or YOUTUBE_REFRESH_TOKEN_${channel.toUpperCase()}`,
    );
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.text();
    if (body.includes('invalid_grant')) {
      fail(
        `Refresh token for "${channel}" is revoked or expired; reconnect YouTube in the app`,
      );
    }
    fail(`Token refresh failed: ${res.status} ${body}`);
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Make sure the token belongs to the channel we mean to upload to. */
async function verifyChannel(accessToken: string, channel: Channel) {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) fail(`channels.list failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    items?: Array<{ id: string; snippet: { title: string } }>;
  };
  const mine = data.items?.[0];
  if (!mine) fail('The token is not linked to a YouTube channel');

  const expected =
    channel === 'main'
      ? process.env.YOUTUBE_CHANNEL_ID_MAIN
      : process.env.YOUTUBE_CHANNEL_ID_CLIPS;
  if (expected && expected !== mine.id) {
    fail(
      `Token is for "${mine.snippet.title}" (${mine.id}), expected ${expected}`,
    );
  }
  console.log(`🔐 Authenticated as "${mine.snippet.title}" (${mine.id})`);
}

async function startUpload(
  accessToken: string,
  body: object,
  size: number,
  contentType: string,
): Promise<string> {
  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(size),
        'X-Upload-Content-Type': contentType,
      },
      method: 'POST',
    },
  );
  const location = res.headers.get('location');
  if (!res.ok || !location) {
    fail(`Upload init failed: ${res.status} ${await res.text()}`);
  }
  return location;
}

/** Ask the upload session how many bytes it already has. */
async function queryOffset(
  sessionUrl: string,
  accessToken: string,
  size: number,
): Promise<number | { id: string }> {
  const res = await fetch(sessionUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Range': `bytes */${size}`,
    },
    method: 'PUT',
  });
  if (res.ok) return (await res.json()) as { id: string };
  if (res.status !== 308) fail(`Upload status check failed: ${res.status}`);
  const range = res.headers.get('range');
  return range ? Number(range.split('-')[1]) + 1 : 0;
}

async function uploadFile(
  sessionUrl: string,
  accessToken: string,
  path: string,
  size: number,
  contentType: string,
): Promise<string> {
  const file = Bun.file(path);
  let offset = 0;
  let retries = 0;

  while (offset < size) {
    const end = Math.min(offset + CHUNK_SIZE, size);
    try {
      const res = await fetch(sessionUrl, {
        body: file.slice(offset, end),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Length': String(end - offset),
          'Content-Range': `bytes ${offset}-${end - 1}/${size}`,
          'Content-Type': contentType,
        },
        method: 'PUT',
      });

      if (res.ok) {
        process.stdout.write('\r⬆️  100%   \n');
        return ((await res.json()) as { id: string }).id;
      }
      if (res.status === 308) {
        const range = res.headers.get('range');
        offset = range ? Number(range.split('-')[1]) + 1 : 0;
        retries = 0;
        process.stdout.write(`\r⬆️  ${Math.floor((offset / size) * 100)}%   `);
        continue;
      }
      if (res.status < 500)
        fail(`Upload failed: ${res.status} ${await res.text()}`);
      throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      if (++retries > MAX_RETRIES) throw error;
      const wait = 2 ** retries * 1000;
      console.warn(
        `\n⚠️  ${(error as Error).message}; resuming in ${wait / 1000}s`,
      );
      await Bun.sleep(wait);
      const status = await queryOffset(sessionUrl, accessToken, size);
      if (typeof status !== 'number') return status.id;
      offset = status;
    }
  }

  fail('Upload ended without a video id');
}

async function setThumbnail(
  accessToken: string,
  videoId: string,
  path: string,
) {
  const ext = extname(path).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      body: Bun.file(path),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      method: 'POST',
    },
  );
  if (!res.ok) {
    // Custom thumbnails need a phone-verified channel; keep the upload either way.
    console.warn(`⚠️  Thumbnail not set: ${res.status} ${await res.text()}`);
    return;
  }
  console.log('🖼️  Thumbnail set');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage();
  if (!args.file || !args.meta)
    fail('--file and --meta are required (see --help)');

  const filePath = resolve(args.file);
  if (!existsSync(filePath)) fail(`Video not found: ${filePath}`);
  const size = statSync(filePath).size;
  const contentType = Bun.file(filePath).type || 'video/mp4';

  const { meta, baseDir } = loadMeta(args.meta);
  const thumbnail = args.thumbnail
    ? resolve(args.thumbnail)
    : meta.thumbnail
      ? resolve(baseDir, meta.thumbnail)
      : undefined;
  if (thumbnail && !existsSync(thumbnail))
    fail(`Thumbnail not found: ${thumbnail}`);

  // Going public, now or on a schedule, needs an explicit second flag.
  const goesPublic = args.privacy === 'public' || Boolean(meta.publishAt);
  if (goesPublic && !args.confirmPublic) {
    fail('Public or scheduled uploads need --confirm-public');
  }
  if (meta.publishAt && Number.isNaN(Date.parse(meta.publishAt))) {
    fail('meta.publishAt must be an ISO 8601 date');
  }

  const body = {
    snippet: {
      categoryId: meta.categoryId ?? '28',
      description: buildDescription(meta),
      tags: meta.tags,
      title: meta.title.trim(),
    },
    status: {
      // A scheduled video must be private until publishAt.
      privacyStatus: meta.publishAt ? 'private' : args.privacy,
      publishAt: meta.publishAt,
      selfDeclaredMadeForKids: meta.madeForKids ?? false,
    },
  };

  console.log(
    `📼 ${filePath} (${(size / 1024 ** 2).toFixed(1)} MiB, ${contentType})`,
  );
  console.log(
    `📺 Channel: ${args.channel}  🔒 Privacy: ${body.status.privacyStatus}${meta.publishAt ? ` → public at ${meta.publishAt}` : ''}`,
  );

  const accessToken = await getAccessToken(args.channel);
  await verifyChannel(accessToken, args.channel);

  if (args.dryRun) {
    console.log(JSON.stringify({ ...body, thumbnail }, null, 2));
    console.log('\n🧪 Dry run: nothing uploaded');
    return;
  }

  const sessionUrl = await startUpload(accessToken, body, size, contentType);
  const videoId = await uploadFile(
    sessionUrl,
    accessToken,
    filePath,
    size,
    contentType,
  );
  console.log(`✅ Uploaded: https://youtu.be/${videoId}`);
  console.log(`   Studio:   https://studio.youtube.com/video/${videoId}/edit`);

  if (thumbnail) await setThumbnail(accessToken, videoId, thumbnail);
}

await main();
