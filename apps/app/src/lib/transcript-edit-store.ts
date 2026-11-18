import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
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
  writeRedisJson,
} from './redis-storage';
import {
  type EditCuts,
  type EditSession,
  type EditSummary,
  type EditWordTuple,
  isEditCuts,
  isEditId,
  parseEditSession,
  summarise,
  toTuple,
} from './transcript-edit';

/**
 * Where the transcript editor keeps its data. On Vercel (`redis`) a session is
 * one hash: `meta` plus the words in chunks, so no single request carries the
 * whole transcript. Locally (`filesystem`) it is a folder per session under
 * `apps/app/data/edits`, which git ignores: recordings are private working
 * data.
 */
const WORDS_PER_CHUNK = 1000;
const INDEX_KEY = 'edit-index';

const editsDirectory = () =>
  process.env.EDITS_DIR || path.join(process.cwd(), 'data', 'edits');

interface SessionMeta {
  chunks: number;
  id: string;
  sections: EditSession['sections'];
  speakers: string[];
  title: string;
}

function assertId(id: string): void {
  if (!isEditId(id)) throw new Error('That is not a valid edit id.');
}

function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function writeJsonFile(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx' });
  await rename(temporary, file);
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

function sessionFile(id: string) {
  return path.join(editsDirectory(), id, 'session.json');
}
function cutsFile(id: string) {
  return path.join(editsDirectory(), id, 'cuts.json');
}

/** Rebuilds a session from its stored pieces; null when it is not there. */
function assemble(
  meta: SessionMeta | undefined,
  chunks: Record<string, unknown>,
): EditSession | null {
  if (!meta || typeof meta.chunks !== 'number') return null;
  const tuples: EditWordTuple[] = [];
  for (let at = 0; at < meta.chunks; at += 1) {
    const chunk = chunks[`w${at}`];
    if (!Array.isArray(chunk))
      throw new Error(`The stored transcript is missing part ${at}.`);
    tuples.push(...(chunk as EditWordTuple[]));
  }
  return parseEditSession(
    {
      sections: meta.sections,
      speakers: meta.speakers,
      title: meta.title,
      words: tuples,
    },
    meta.id,
  );
}

export async function listEditSummaries(): Promise<EditSummary[]> {
  const backend = getProducerStorageBackend();
  let summaries: EditSummary[] = [];
  if (backend === 'redis') {
    const hash = await readRedisHash<EditSummary>(redisKey(INDEX_KEY), {
      strict: true,
    });
    summaries = Object.values(hash);
  } else if (backend === 'filesystem') {
    const names = await readdir(editsDirectory()).catch((error) => {
      if (missing(error)) return [] as string[];
      throw error;
    });
    for (const name of names) {
      if (!isEditId(name)) continue;
      const file = await readJsonFile<{
        session: EditSession;
        updatedAt: string;
      }>(sessionFile(name));
      if (file) summaries.push(summarise(file.session, file.updatedAt));
    }
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readEditSession(id: string): Promise<EditSession | null> {
  assertId(id);
  const backend = getProducerStorageBackend();
  if (backend === 'redis') {
    const hash = await readRedisHash<unknown>(redisKey('edit-session', id), {
      strict: true,
    });
    return assemble(hash.meta as SessionMeta | undefined, hash);
  }
  if (backend === 'read-only') return null;
  const file = await readJsonFile<{ session: unknown }>(sessionFile(id));
  if (!file) return null;
  const session = file.session as EditSession;
  return parseEditSession(
    {
      sections: session.sections,
      speakers: session.speakers,
      title: session.title,
      words: session.words.map(toTuple),
    },
    id,
  );
}

/** Stores a pushed transcript. The cuts saved for the same id are kept. */
export async function saveEditSession(
  id: string,
  body: unknown,
): Promise<EditSummary> {
  assertId(id);
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') throw createWritableStorageError('edit');
  const session = parseEditSession(body, id);
  const updatedAt = new Date().toISOString();
  const summary = summarise(session, updatedAt);

  if (backend === 'redis') {
    const key = redisKey('edit-session', id);
    const tuples = session.words.map(toTuple);
    const chunks = Math.ceil(tuples.length / WORDS_PER_CHUNK);
    for (let at = 0; at < chunks; at += 1)
      await writeRedisHashField(
        key,
        `w${at}`,
        tuples.slice(at * WORDS_PER_CHUNK, (at + 1) * WORDS_PER_CHUNK),
      );
    // Meta last: a reader only sees the new transcript once every part is in.
    const meta: SessionMeta = {
      chunks,
      id,
      sections: session.sections,
      speakers: session.speakers,
      title: session.title,
    };
    await writeRedisHashField(key, 'meta', meta);
    await writeRedisHashField(redisKey(INDEX_KEY), id, summary);
    return summary;
  }

  await writeJsonFile(sessionFile(id), { session, updatedAt });
  return summary;
}

export async function readEditCuts(id: string): Promise<EditCuts | null> {
  assertId(id);
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') return null;
  const stored =
    backend === 'redis'
      ? await readRedisJson<unknown>(redisKey('edit-cuts', id), {
          strict: true,
        })
      : await readJsonFile<unknown>(cutsFile(id));
  if (stored === null) return null;
  if (!isEditCuts(stored)) throw new Error('The stored cuts are invalid.');
  return stored;
}

export async function saveEditCuts(
  id: string,
  body: unknown,
): Promise<EditCuts> {
  assertId(id);
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') throw createWritableStorageError('edit');
  if (!isEditCuts(body)) throw new Error('Send the cuts as saved by the page.');
  const cuts: EditCuts = { ...body, edited: true, version: 1 };
  if (backend === 'redis')
    await writeRedisJson(redisKey('edit-cuts', id), cuts);
  else await writeJsonFile(cutsFile(id), cuts);
  return cuts;
}
