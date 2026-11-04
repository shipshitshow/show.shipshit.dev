import { randomUUID } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { kv } from '@vercel/kv';
import {
  createWritableStorageError,
  getProducerStorageBackend,
  StorageWriteError,
} from './producer-storage';
import { readRedisHash, readRedisHashField, redisKey } from './redis-storage';
import {
  isThumbnailItem,
  ThumbnailConflict,
  type ThumbnailItem,
} from './thumbnail-lab';

const directory = () =>
  process.env.THUMBNAIL_LAB_DIR ||
  path.join(process.cwd(), 'data/thumbnail-lab');
const file = () => path.join(directory(), 'items.json');
const key = () => redisKey('thumbnail-lab-items');
function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
function parse(value: unknown): ThumbnailItem {
  if (!isThumbnailItem(value))
    throw new StorageWriteError('Stored thumbnail data is invalid.');
  return value;
}
async function readFileItems(): Promise<ThumbnailItem[]> {
  try {
    const data: unknown = JSON.parse(await readFile(file(), 'utf8'));
    if (!Array.isArray(data))
      throw new StorageWriteError('Stored thumbnail catalogue is invalid.');
    return data.map(parse);
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
}
export async function listThumbnailItems(): Promise<ThumbnailItem[]> {
  if (getProducerStorageBackend() === 'filesystem') return readFileItems();
  return Object.values(
    await readRedisHash<unknown>(key(), { strict: true }),
  ).map(parse);
}
export async function getThumbnailItem(
  id: string,
): Promise<ThumbnailItem | null> {
  if (getProducerStorageBackend() === 'filesystem')
    return (await readFileItems()).find((item) => item.id === id) ?? null;
  const item = await readRedisHashField<unknown>(key(), id, { strict: true });
  return item === null ? null : parse(item);
}
const compareAndSet = `
local updates = cjson.decode(ARGV[1])
for _, update in ipairs(updates) do
  local current = redis.call('HGET', KEYS[1], update.id)
  local revision = -1
  if current then revision = cjson.decode(current).revision end
  if revision ~= update.expectedRevision then return 0 end
end
for _, update in ipairs(updates) do
  redis.call('HSET', KEYS[1], update.id, update.raw)
end
return 1
`;
export async function saveThumbnailItems(
  updates: Array<{ item: ThumbnailItem; expectedRevision: number }>,
): Promise<void> {
  if (!updates.length) return;
  if (new Set(updates.map((u) => u.item.id)).size !== updates.length)
    throw new Error('Duplicate thumbnail update.');
  const backend = getProducerStorageBackend();
  if (backend === 'read-only')
    throw createWritableStorageError('thumbnail lab');
  if (backend === 'redis') {
    try {
      const saved = await kv.eval(
        compareAndSet,
        [key()],
        [
          JSON.stringify(
            updates.map(({ item, expectedRevision }) => ({
              expectedRevision,
              id: item.id,
              raw: JSON.stringify(item),
            })),
          ),
        ],
      );
      if (saved !== 1)
        throw new ThumbnailConflict(
          'The review changed. Refresh before saving.',
        );
      return;
    } catch (error) {
      if (error instanceof ThumbnailConflict) throw error;
      throw new StorageWriteError('Could not save the thumbnail decision.', {
        cause: error,
      });
    }
  }
  await mkdir(directory(), { recursive: true });
  let lock: Awaited<ReturnType<typeof open>>;
  try {
    lock = await open(file() + '.lock', 'wx');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST')
      throw new ThumbnailConflict('Another review is saving. Try again.');
    throw error;
  }
  const temp = file() + '.' + randomUUID() + '.tmp';
  try {
    const current = new Map(
      (await readFileItems()).map((item) => [item.id, item]),
    );
    for (const update of updates)
      if (
        (current.get(update.item.id)?.revision ?? -1) !==
        update.expectedRevision
      )
        throw new ThumbnailConflict(
          'The review changed. Refresh before saving.',
        );
    for (const update of updates) current.set(update.item.id, update.item);
    await writeFile(temp, JSON.stringify([...current.values()]), {
      flag: 'wx',
    });
    await rename(temp, file());
  } finally {
    await lock.close();
    await unlink(file() + '.lock');
    await unlink(temp).catch((error) => {
      if (!missing(error)) throw error;
    });
  }
}
export async function saveThumbnailItem(
  item: ThumbnailItem,
  expectedRevision: number,
) {
  await saveThumbnailItems([{ expectedRevision, item }]);
}
