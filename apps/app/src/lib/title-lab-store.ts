import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createWritableStorageError,
  getProducerStorageBackend,
} from './producer-storage';
import {
  readRedisHash,
  readRedisJson,
  redisKey,
  writeRedisHashField,
} from './redis-storage';
import {
  draftProblems,
  isDrafts,
  isSnapshot,
  TITLE_DRAFTS_KEY,
  TITLE_SNAPSHOT_KEY,
  type TitleDrafts,
  type TitleSnapshot,
} from './title-lab';

/**
 * Where the lab keeps its data. Locally (`filesystem`) it reads the folder
 * `bun run youtube:sync` writes to. On Vercel (`redis`) it reads the slim
 * snapshot that `youtube:sync --push-redis --apply` stored, and keeps drafts
 * in a hash with one field per video. Neither backend ever calls YouTube.
 */
export const snapshotDirectory = () =>
  process.env.YOUTUBE_SNAPSHOT_DIR ||
  path.join(process.cwd(), '../../.youtube-snapshots');
const draftsFile = () => path.join(snapshotDirectory(), 'title-drafts.json');

function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function readTitleSnapshot(): Promise<TitleSnapshot | null> {
  const backend = getProducerStorageBackend();
  if (backend === 'redis') {
    const data = await readRedisJson<unknown>(redisKey(TITLE_SNAPSHOT_KEY), {
      strict: true,
    });
    if (data === null) return null;
    if (!isSnapshot(data)) throw new Error('The stored snapshot is invalid.');
    return data;
  }
  if (backend === 'read-only') return null;
  try {
    const data: unknown = JSON.parse(
      await readFile(
        path.join(snapshotDirectory(), 'main-latest.json'),
        'utf8',
      ),
    );
    if (!isSnapshot(data)) throw new Error('The snapshot file is invalid.');
    return data;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

export async function readTitleDrafts(): Promise<TitleDrafts> {
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') return {};
  if (backend === 'redis') {
    const hash = await readRedisHash<unknown>(redisKey(TITLE_DRAFTS_KEY), {
      strict: true,
    });
    // A cleared draft is stored as null, so a field is never deleted.
    const drafts = Object.fromEntries(
      Object.entries(hash).filter(([, value]) => value !== null),
    );
    if (!isDrafts(drafts)) throw new Error('The stored drafts are invalid.');
    return drafts;
  }
  try {
    const data: unknown = JSON.parse(await readFile(draftsFile(), 'utf8'));
    if (!isDrafts(data)) throw new Error('The drafts file is invalid.');
    return data;
  } catch (error) {
    if (missing(error)) return {};
    throw error;
  }
}

/** Save one draft; an empty text removes it. Never touches YouTube. */
export async function saveTitleDraft(id: string, text: string) {
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') throw createWritableStorageError('title lab');
  const trimmed = text.trim();
  if (trimmed) {
    const problems = draftProblems(trimmed);
    if (problems.length) throw new Error(problems[0]);
  }
  const snapshot = await readTitleSnapshot();
  if (!snapshot?.videos.some((video) => video.id === id))
    throw new Error('That video is not in the latest snapshot.');
  const entry = trimmed
    ? { text: trimmed, updatedAt: new Date().toISOString() }
    : null;

  if (backend === 'redis') {
    await writeRedisHashField(redisKey(TITLE_DRAFTS_KEY), id, entry);
    return readTitleDrafts();
  }

  const drafts = await readTitleDrafts();
  if (entry) drafts[id] = entry;
  else delete drafts[id];
  await mkdir(snapshotDirectory(), { recursive: true });
  const temporary = `${draftsFile()}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(drafts, null, 2)}\n`, {
    flag: 'wx',
  });
  await rename(temporary, draftsFile());
  return drafts;
}
