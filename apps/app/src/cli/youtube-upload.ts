import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAccessToken, getChannelConfigs } from '../lib/youtube/token';
import type { ChannelConfig } from '../lib/youtube/types';

const USAGE = `Upload videos and Shorts from an upload plan (JSON) to YouTube.

Usage:
  bun run youtube:upload --plan <upload-plan.json> --dry-run [--only <id>]
  bun run youtube:upload --plan <upload-plan.json> --check-auth
  bun run youtube:upload --plan <upload-plan.json> [--only <id>]
  bun run youtube:upload --plan <upload-plan.json> --update-links [--only <id>]

--dry-run       Validate files, sizes, durations and metadata. No API calls.
--check-auth    One read-only channels.list (part=id, mine=true) with the
                plan's channel token. Prints the status, never a token.
--only <id>     Limit the run to one plan item.
--update-links  For items already uploaded with {{FULL_EPISODE_URL}} still
                in their plan description, set the description once the
                link source has a video id (videos.update, 50 units each).

Each upload is a resumable videos.insert (private, optional publishAt,
selfDeclaredMadeForKids false), then a wait for processingStatus
"succeeded", then thumbnails.set and captions.insert. Progress (video id,
thumbnail, caption id) is written back into the plan after every step, so a
rerun resumes where the last one stopped. Items with a description that
contains {{FULL_EPISODE_URL}} wait for the plan's linkSource item, which is
uploaded first.

Auth reuses the app's refresh-token flow (lib/youtube/token): the channel
label comes from the plan ("main" by default), so YOUTUBE_CHANNEL_ID_MAIN,
YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET plus a stored refresh token
(KV, token file or YOUTUBE_REFRESH_TOKEN_MAIN) must be in the environment.`;

const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3';
const LINK_PLACEHOLDER = '{{FULL_EPISODE_URL}}';
// Must be a multiple of 256 KiB (resumable upload protocol).
const CHUNK_BYTES = 256 * 1024 * 64;
const PROCESSING_POLL_MS = 15_000;
const PROCESSING_TIMEOUT_MS = 60 * 60 * 1000;

// Limits from developers.google.com/youtube/v3/docs/videos and the
// videos.insert / thumbnails.set / captions.insert reference pages.
const TITLE_MAX_CHARS = 100;
const DESCRIPTION_MAX_BYTES = 5000;
const TAGS_MAX_CHARS = 500;
const THUMBNAIL_MAX_BYTES = 50 * 1024 * 1024;
const CAPTION_MAX_BYTES = 100 * 1024 * 1024;

type PlanItem = {
  captions?: string;
  captionsLanguage?: string;
  captionsName?: string;
  captionId?: string;
  categoryId: string;
  description: string;
  file: string;
  id: string;
  kind?: 'short' | 'video';
  privacyStatus: 'private';
  publishAt?: string;
  selfDeclaredMadeForKids: boolean;
  tags: string[];
  thumbnail?: string;
  thumbnailSet?: boolean;
  title: string;
  uploadUrl?: string;
  videoId?: string;
  [key: string]: unknown;
};

type Plan = {
  channelLabel?: string;
  defaultLanguage?: string;
  items: PlanItem[];
  linkSource?: string;
  [key: string]: unknown;
};

type Args = {
  checkAuth: boolean;
  dryRun: boolean;
  only?: string;
  plan: string;
  updateLinks: boolean;
};

function parseArgs(argv: string[]): Args {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
  }
  const value = (name: string) => {
    const index = argv.indexOf(name);
    const next = index === -1 ? undefined : argv[index + 1];
    return next && !next.startsWith('--') ? next : undefined;
  };
  const plan = value('--plan');
  if (!plan) throw new Error(`Missing --plan.\n\n${USAGE}`);
  return {
    checkAuth: argv.includes('--check-auth'),
    dryRun: argv.includes('--dry-run'),
    only: value('--only'),
    plan: path.resolve(plan),
    updateLinks: argv.includes('--update-links'),
  };
}

async function readPlan(file: string): Promise<Plan> {
  const plan = JSON.parse(await readFile(file, 'utf8')) as Plan;
  if (!Array.isArray(plan.items)) throw new Error('Plan has no items array');
  return plan;
}

async function writePlan(file: string, plan: Plan) {
  await writeFile(file, `${JSON.stringify(plan, null, 2)}\n`);
}

function resolveFrom(planFile: string, file: string) {
  return path.isAbsolute(file) ? file : path.join(path.dirname(planFile), file);
}

function linkSourceOf(plan: Plan) {
  const id = plan.linkSource ?? 'main';
  return plan.items.find((item) => item.id === id);
}

function fullEpisodeUrl(plan: Plan) {
  const source = linkSourceOf(plan);
  return source?.videoId ? `https://youtu.be/${source.videoId}` : undefined;
}

function resolvedDescription(plan: Plan, item: PlanItem) {
  if (!item.description.includes(LINK_PLACEHOLDER)) return item.description;
  const url = fullEpisodeUrl(plan);
  return url ? item.description.replaceAll(LINK_PLACEHOLDER, url) : undefined;
}

// Tags with spaces count as if quoted, and commas between tags count.
function tagsLength(tags: string[]) {
  const quoted = tags.map((tag) =>
    tag.includes(' ') ? tag.length + 2 : tag.length,
  );
  return quoted.reduce((sum, n) => sum + n, 0) + Math.max(0, tags.length - 1);
}

type Probe = { duration: number; height: number; width: number };

function probe(file: string): Probe {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height:format=duration',
      '-of',
      'json',
      file,
    ],
    { encoding: 'utf8' },
  );
  const data = JSON.parse(out) as {
    format?: { duration?: string };
    streams?: Array<{ height?: number; width?: number }>;
  };
  return {
    duration: Number(data.format?.duration ?? 0),
    height: data.streams?.[0]?.height ?? 0,
    width: data.streams?.[0]?.width ?? 0,
  };
}

function srtLastEnd(text: string): number {
  let last = 0;
  for (const match of text.matchAll(
    /-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/g,
  )) {
    const [, h, m, s, ms] = match.map(Number);
    last = Math.max(last, h * 3600 + m * 60 + s + ms / 1000);
  }
  return last;
}

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function validate(planFile: string, plan: Plan, item: PlanItem) {
  const errors: string[] = [];
  const notes: string[] = [];
  const tbd = (field: string, value: unknown) => {
    if (typeof value === 'string' && /\bTBD\b/.test(value)) {
      errors.push(`${field} is still TBD`);
    }
  };

  const file = resolveFrom(planFile, item.file);
  if (!existsSync(file)) {
    errors.push(`video file missing: ${file}`);
  } else {
    const size = statSync(file).size;
    const info = probe(file);
    notes.push(
      `video ${mb(size)}, ${info.duration.toFixed(2)} s, ${info.width}x${info.height}`,
    );
    if (info.duration <= 0) errors.push('video duration unreadable');
    if (item.kind === 'short' && info.width >= info.height) {
      errors.push('Short is not vertical');
    }
    if (item.captions && existsSync(resolveFrom(planFile, item.captions))) {
      const srt = await readFile(resolveFrom(planFile, item.captions), 'utf8');
      const end = srtLastEnd(srt);
      const cues = srt.match(/-->/g)?.length ?? 0;
      notes.push(`captions ${cues} cues, last ends ${end.toFixed(2)} s`);
      if (end === 0) errors.push('captions have no cues');
      if (end > info.duration + 0.5) {
        errors.push(
          `captions end at ${end.toFixed(2)} s, after the video ends`,
        );
      }
    }
  }

  tbd('title', item.title);
  if (!item.title.trim()) errors.push('title empty');
  if ([...item.title].length > TITLE_MAX_CHARS) {
    errors.push(`title over ${TITLE_MAX_CHARS} characters`);
  }
  if (/[<>]/.test(item.title)) errors.push('title contains < or >');

  tbd('description', item.description);
  const description = resolvedDescription(plan, item);
  const descriptionForSize =
    description ??
    item.description.replaceAll(
      LINK_PLACEHOLDER,
      'https://youtu.be/XXXXXXXXXXX',
    );
  if (Buffer.byteLength(descriptionForSize) > DESCRIPTION_MAX_BYTES) {
    errors.push(`description over ${DESCRIPTION_MAX_BYTES} bytes`);
  }
  if (/[<>]/.test(item.description)) errors.push('description contains < or >');
  if (/\[link/i.test(item.description)) {
    errors.push(`description has a [link] note; use ${LINK_PLACEHOLDER}`);
  }
  if (description === undefined) {
    notes.push(
      `full-episode link fills in once "${plan.linkSource ?? 'main'}" has a video id`,
    );
  }
  notes.push(
    `description ${Buffer.byteLength(descriptionForSize)} bytes, ${item.tags.length} tags (${tagsLength(item.tags)} chars)`,
  );

  if (!Array.isArray(item.tags) || item.tags.length === 0) {
    errors.push('no tags');
  } else {
    item.tags.forEach((tag, i) => {
      tbd(`tags[${i}]`, tag);
    });
    if (tagsLength(item.tags) > TAGS_MAX_CHARS) {
      errors.push(`tags over ${TAGS_MAX_CHARS} characters`);
    }
  }

  if (!/^\d+$/.test(String(item.categoryId))) {
    errors.push(`categoryId "${item.categoryId}" is not numeric`);
  }
  if (item.privacyStatus !== 'private')
    errors.push('privacyStatus must be private');
  if (item.selfDeclaredMadeForKids !== false) {
    errors.push('selfDeclaredMadeForKids must be false');
  }
  if (item.publishAt) {
    const at = Date.parse(item.publishAt);
    if (Number.isNaN(at)) errors.push(`publishAt "${item.publishAt}" invalid`);
    else if (at <= Date.now())
      errors.push(`publishAt ${item.publishAt} is not in the future`);
    else notes.push(`publishAt ${new Date(at).toISOString()}`);
  } else {
    notes.push('no publishAt: stays private');
  }

  if (!item.thumbnail) {
    notes.push('no thumbnail');
  } else {
    tbd('thumbnail', item.thumbnail);
    const thumb = resolveFrom(planFile, item.thumbnail);
    if (!/\bTBD\b/.test(item.thumbnail)) {
      if (!existsSync(thumb)) errors.push(`thumbnail missing: ${thumb}`);
      else {
        const size = statSync(thumb).size;
        if (!/\.(png|jpe?g)$/i.test(thumb))
          errors.push('thumbnail must be png or jpeg');
        if (size > THUMBNAIL_MAX_BYTES) errors.push('thumbnail over 50 MB');
        notes.push(`thumbnail ${mb(size)}`);
      }
    }
  }

  if (!item.captions) {
    notes.push('no captions');
  } else {
    const captions = resolveFrom(planFile, item.captions);
    if (!existsSync(captions)) errors.push(`captions missing: ${captions}`);
    else if (statSync(captions).size > CAPTION_MAX_BYTES) {
      errors.push('captions over 100 MB');
    }
  }

  if (item.videoId) notes.push(`already uploaded: ${item.videoId}`);
  return { errors, notes };
}

async function api(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

async function expectJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${what} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function channelFor(plan: Plan): Promise<ChannelConfig> {
  const label = plan.channelLabel ?? 'main';
  const channel = (await getChannelConfigs()).find((c) => c.label === label);
  if (!channel) {
    throw new Error(
      `No "${label}" channel with a refresh token (check YOUTUBE_CHANNEL_ID_${label.toUpperCase()} and the stored token)`,
    );
  }
  return channel;
}

async function checkAuth(channel: ChannelConfig, token: string) {
  const res = await api(token, `${API}/channels?part=id&mine=true`);
  const data = await expectJson<{ items?: Array<{ id: string }> }>(
    res,
    'channels.list',
  );
  const ids = (data.items ?? []).map((item) => item.id);
  if (!ids.includes(channel.id)) {
    throw new Error(
      `Token belongs to ${ids.join(', ') || 'no channel'}, not the "${channel.label}" channel ${channel.id}`,
    );
  }
  return channel.id;
}

async function resumableUpload(
  token: string,
  plan: Plan,
  planFile: string,
  item: PlanItem,
  description: string,
): Promise<string> {
  const file = resolveFrom(planFile, item.file);
  const blob = Bun.file(file);
  const total = blob.size;

  let uploadUrl = item.uploadUrl;
  let offset = 0;
  if (uploadUrl) {
    const res = await api(token, uploadUrl, {
      headers: { 'Content-Range': `bytes */${total}` },
      method: 'PUT',
    });
    if (res.status === 200 || res.status === 201) {
      return ((await res.json()) as { id: string }).id;
    }
    if (res.status === 308) {
      const range = res.headers.get('Range');
      offset = range ? Number(range.split('-')[1]) + 1 : 0;
      console.log(`  resuming at ${mb(offset)} of ${mb(total)}`);
    } else {
      console.log(
        `  stored upload session expired (${res.status}); starting over`,
      );
      uploadUrl = undefined;
    }
  }

  if (!uploadUrl) {
    const body = {
      snippet: {
        categoryId: String(item.categoryId),
        defaultAudioLanguage: plan.defaultLanguage ?? 'en',
        defaultLanguage: plan.defaultLanguage ?? 'en',
        description,
        tags: item.tags,
        title: item.title,
      },
      status: {
        privacyStatus: 'private',
        ...(item.publishAt ? { publishAt: item.publishAt } : {}),
        selfDeclaredMadeForKids: false,
      },
    };
    const res = await api(
      token,
      `${UPLOAD_API}/videos?uploadType=resumable&part=snippet,status`,
      {
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(total),
          'X-Upload-Content-Type': 'video/mp4',
        },
        method: 'POST',
      },
    );
    if (!res.ok) {
      throw new Error(
        `videos.insert init failed: ${res.status} ${await res.text()}`,
      );
    }
    uploadUrl = res.headers.get('Location') ?? undefined;
    if (!uploadUrl) throw new Error('videos.insert returned no upload URL');
    item.uploadUrl = uploadUrl;
    await writePlan(planFile, plan);
  }

  while (offset < total) {
    const end = Math.min(offset + CHUNK_BYTES, total) - 1;
    const res = await api(token, uploadUrl, {
      body: blob.slice(offset, end + 1),
      headers: { 'Content-Range': `bytes ${offset}-${end}/${total}` },
      method: 'PUT',
    });
    if (res.status === 200 || res.status === 201) {
      process.stdout.write(`\r  uploaded ${mb(total)} of ${mb(total)}\n`);
      return ((await res.json()) as { id: string }).id;
    }
    if (res.status !== 308) {
      throw new Error(
        `upload chunk failed: ${res.status} ${await res.text()} (rerun to resume)`,
      );
    }
    const range = res.headers.get('Range');
    offset = range ? Number(range.split('-')[1]) + 1 : offset;
    process.stdout.write(`\r  uploaded ${mb(offset)} of ${mb(total)}`);
  }
  throw new Error('upload ended without a video id (rerun to resume)');
}

async function waitForProcessing(token: string, videoId: string) {
  const started = Date.now();
  while (Date.now() - started < PROCESSING_TIMEOUT_MS) {
    const res = await api(
      token,
      `${API}/videos?part=processingDetails,status&id=${videoId}`,
    );
    const data = await expectJson<{
      items?: Array<{
        processingDetails?: { processingStatus?: string };
        status?: {
          failureReason?: string;
          rejectionReason?: string;
          uploadStatus?: string;
        };
      }>;
    }>(res, 'videos.list');
    const video = data.items?.[0];
    const state = video?.processingDetails?.processingStatus;
    if (state === 'succeeded') return;
    if (state === 'failed' || state === 'terminated') {
      throw new Error(
        `processing ${state}: ${video?.status?.failureReason ?? video?.status?.rejectionReason ?? 'no reason given'}`,
      );
    }
    console.log(
      `  processing: ${state ?? 'pending'} (upload ${video?.status?.uploadStatus ?? '?'})`,
    );
    await Bun.sleep(PROCESSING_POLL_MS);
  }
  throw new Error('processing did not finish in time (rerun to continue)');
}

async function setThumbnail(token: string, videoId: string, file: string) {
  const type = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
  const res = await api(
    token,
    `${UPLOAD_API}/thumbnails/set?videoId=${videoId}&uploadType=media`,
    { body: Bun.file(file), headers: { 'Content-Type': type }, method: 'POST' },
  );
  await expectJson(res, 'thumbnails.set');
}

async function insertCaptions(
  token: string,
  videoId: string,
  file: string,
  language: string,
  name: string,
): Promise<string> {
  const boundary = `sss-${crypto.randomUUID()}`;
  const meta = JSON.stringify({
    snippet: { isDraft: false, language, name, videoId },
  });
  const srt = await readFile(file);
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    ),
    srt,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await api(
    token,
    `${UPLOAD_API}/captions?part=snippet&uploadType=multipart`,
    {
      body,
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      method: 'POST',
    },
  );
  return (await expectJson<{ id: string }>(res, 'captions.insert')).id;
}

async function updateDescription(
  token: string,
  item: PlanItem,
  description: string,
) {
  const res = await api(token, `${API}/videos?part=snippet`, {
    body: JSON.stringify({
      id: item.videoId,
      snippet: {
        categoryId: String(item.categoryId),
        description,
        tags: item.tags,
        title: item.title,
      },
    }),
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    method: 'PUT',
  });
  await expectJson(res, 'videos.update');
}

async function uploadItem(
  token: string,
  plan: Plan,
  planFile: string,
  item: PlanItem,
) {
  console.log(`\n${item.id}: ${item.title}`);
  const description = resolvedDescription(plan, item);
  if (description === undefined) {
    throw new Error(
      `${item.id} needs the full-episode link; upload "${plan.linkSource ?? 'main'}" first`,
    );
  }

  if (!item.videoId) {
    item.videoId = await resumableUpload(
      token,
      plan,
      planFile,
      item,
      description,
    );
    item.uploadUrl = undefined;
    item.description = description;
    item.uploadedAt = new Date().toISOString();
    await writePlan(planFile, plan);
    console.log(`  video id ${item.videoId}`);
  }

  await waitForProcessing(token, item.videoId);

  if (item.thumbnail && !item.thumbnailSet) {
    await setThumbnail(
      token,
      item.videoId,
      resolveFrom(planFile, item.thumbnail),
    );
    item.thumbnailSet = true;
    await writePlan(planFile, plan);
    console.log('  thumbnail set');
  }

  if (item.captions && !item.captionId) {
    item.captionId = await insertCaptions(
      token,
      item.videoId,
      resolveFrom(planFile, item.captions),
      item.captionsLanguage ?? plan.defaultLanguage ?? 'en',
      item.captionsName ?? 'English',
    );
    await writePlan(planFile, plan);
    console.log(`  captions ${item.captionId}`);
  }
}

function selectItems(plan: Plan, only?: string) {
  if (only) {
    const item = plan.items.find((i) => i.id === only);
    if (!item) throw new Error(`No item "${only}" in the plan`);
    return [item];
  }
  // The link source goes first so the others can carry its URL.
  const source = linkSourceOf(plan);
  return source
    ? [source, ...plan.items.filter((i) => i !== source)]
    : [...plan.items];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = await readPlan(args.plan);
  const items = selectItems(plan, args.only);

  if (args.dryRun) {
    let failed = 0;
    for (const item of items) {
      const { errors, notes } = await validate(args.plan, plan, item);
      console.log(
        `\n${errors.length ? 'FAIL' : 'ok  '} ${item.id}: ${item.title}`,
      );
      for (const note of notes) console.log(`     ${note}`);
      for (const error of errors) console.log(`  !  ${error}`);
      if (errors.length) failed += 1;
    }
    console.log(
      `\nDry run: ${items.length - failed} ready, ${failed} blocked. No API calls made.`,
    );
    process.exit(failed ? 1 : 0);
  }

  const channel = await channelFor(plan);
  const token = await getAccessToken(channel);
  const channelId = await checkAuth(channel, token);
  console.log(
    `auth ok: token matches the "${channel.label}" channel ${channelId}`,
  );
  if (args.checkAuth) return;

  if (args.updateLinks) {
    for (const item of items) {
      if (!item.videoId || !item.description.includes(LINK_PLACEHOLDER))
        continue;
      const description = resolvedDescription(plan, item);
      if (!description) throw new Error('link source has no video id yet');
      await updateDescription(token, item, description);
      item.description = description;
      await writePlan(args.plan, plan);
      console.log(`${item.id}: link filled`);
    }
    return;
  }

  for (const item of items) {
    const { errors } = await validate(args.plan, plan, item);
    if (errors.length && !item.videoId) {
      throw new Error(`${item.id} is not ready:\n  ${errors.join('\n  ')}`);
    }
  }
  for (const item of items) {
    await uploadItem(token, plan, args.plan, item);
  }
  console.log(
    '\nDone. Everything is private; publishAt items go live on schedule.',
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
