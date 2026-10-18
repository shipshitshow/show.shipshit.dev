import { kv } from '@vercel/kv';
import { logError } from '@/lib/logger';
import { StorageWriteError } from '@/lib/producer-storage';

/**
 * Thin JSON helpers over the Upstash Redis attached to the project. Tokens and
 * `yt-cache:*` keep using `kv` directly; everything here lives under the
 * versioned `sss:{env}:v1:` prefix so an export can enumerate it.
 *
 * Non-strict reads log and return null/empty, so a public page never fails on a
 * Redis outage. Strict reads and every write throw `StorageWriteError`, so a
 * read-modify-write can never overwrite stored data with defaults.
 */

/** A queued set of commands sent in one request (`exec`). */
export interface RedisChainLike {
  exec(): Promise<unknown[]>;
  hgetall(key: string): RedisChainLike;
  hset(key: string, fields: Record<string, unknown>): RedisChainLike;
  mget(...keys: string[]): RedisChainLike;
  sadd(key: string, ...members: string[]): RedisChainLike;
}

export interface RedisLike {
  get<T>(key: string): Promise<T | null>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hgetall<T>(key: string): Promise<Record<string, T> | null>;
  hset(key: string, fields: Record<string, unknown>): Promise<unknown>;
  mget<T extends unknown[]>(...keys: string[]): Promise<T>;
  /** MULTI/EXEC: every queued command applies, or none does. */
  multi(): RedisChainLike;
  /** One request, not atomic. */
  pipeline(): RedisChainLike;
  sadd(key: string, ...members: string[]): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
}

export interface ReadOptions {
  strict?: boolean;
}

const KEY_PART_PATTERN = /^[\w.-]+$/;

let clientOverride: RedisLike | null = null;

/** Tests inject an in-memory client; pass null to restore `kv`. */
export function setRedisClientForTests(client: RedisLike | null): void {
  clientOverride = client;
}

function getClient(): RedisLike {
  return clientOverride ?? (kv as unknown as RedisLike);
}

export function redisKeyPrefix(
  namespace: string = process.env.VERCEL_ENV ?? 'local',
): string {
  if (!KEY_PART_PATTERN.test(namespace)) {
    throw new Error(`Invalid Redis namespace: ${namespace}`);
  }
  return `sss:${namespace}:v1:`;
}

export function redisKey(...parts: string[]): string {
  for (const part of parts) {
    if (!KEY_PART_PATTERN.test(part)) {
      throw new Error(`Invalid Redis key part: ${part}`);
    }
  }
  return `${redisKeyPrefix()}${parts.join(':')}`;
}

function failRead(key: string, error: unknown, strict: boolean): void {
  if (strict) {
    throw new StorageWriteError(`Redis read failed for ${key}`, {
      cause: error,
    });
  }
  logError('storage.redis_read_failed', error, { key });
}

async function write(key: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    throw new StorageWriteError(`Redis write failed for ${key}`, {
      cause: error,
    });
  }
}

export async function readRedisJson<T>(
  key: string,
  { strict = false }: ReadOptions = {},
): Promise<T | null> {
  try {
    return (await getClient().get<T>(key)) ?? null;
  } catch (error) {
    failRead(key, error, strict);
    return null;
  }
}

/** One MGET for many keys; the result lines up with `keys`. */
export async function readRedisJsonMany<T>(
  keys: string[],
  { strict = false }: ReadOptions = {},
): Promise<Array<T | null>> {
  if (keys.length === 0) return [];

  try {
    const values = await getClient().mget<Array<T | null>>(...keys);
    return keys.map((_key, index) => values[index] ?? null);
  } catch (error) {
    failRead(keys.join(','), error, strict);
    return keys.map(() => null);
  }
}

export async function writeRedisJson(
  key: string,
  value: unknown,
): Promise<void> {
  await write(key, () => getClient().set(key, value));
}

export async function readRedisHash<T>(
  key: string,
  { strict = false }: ReadOptions = {},
): Promise<Record<string, T>> {
  try {
    return (await getClient().hgetall<T>(key)) ?? {};
  } catch (error) {
    failRead(key, error, strict);
    return {};
  }
}

export async function readRedisHashField<T>(
  key: string,
  field: string,
  { strict = false }: ReadOptions = {},
): Promise<T | null> {
  try {
    return (await getClient().hget<T>(key, field)) ?? null;
  } catch (error) {
    failRead(key, error, strict);
    return null;
  }
}

export async function writeRedisHashField(
  key: string,
  field: string,
  value: unknown,
): Promise<void> {
  await write(key, () => getClient().hset(key, { [field]: value }));
}

/**
 * HSET one field and SADD one set member in a single MULTI/EXEC transaction, so
 * the field is never stored without its index entry (or the reverse). Two
 * writers touching different fields of the same hash never overwrite each other.
 */
export async function writeRedisHashFieldAndIndex(
  hashKey: string,
  field: string,
  value: unknown,
  setKey: string,
  member: string,
): Promise<void> {
  await write(hashKey, () =>
    getClient()
      .multi()
      .hset(hashKey, { [field]: value })
      .sadd(setKey, member)
      .exec(),
  );
}

export interface RedisBatchRead<J, H> {
  hashes: Array<Record<string, H>>;
  json: Array<J | null>;
}

/**
 * One pipelined request: an MGET over `jsonKeys` plus an HGETALL per hash key.
 * Results line up with the inputs.
 */
export async function readRedisJsonAndHashes<J, H>(
  jsonKeys: string[],
  hashKeys: string[],
  { strict = false }: ReadOptions = {},
): Promise<RedisBatchRead<J, H>> {
  const empty = (): RedisBatchRead<J, H> => ({
    hashes: hashKeys.map(() => ({})),
    json: jsonKeys.map(() => null),
  });
  if (jsonKeys.length === 0 && hashKeys.length === 0) return empty();

  try {
    let chain = getClient().pipeline();
    if (jsonKeys.length > 0) chain = chain.mget(...jsonKeys);
    for (const key of hashKeys) chain = chain.hgetall(key);
    const results = await chain.exec();

    const offset = jsonKeys.length > 0 ? 1 : 0;
    const values = (offset ? (results[0] as Array<J | null>) : []) ?? [];
    return {
      hashes: hashKeys.map(
        (_key, index) => (results[offset + index] as Record<string, H>) ?? {},
      ),
      json: jsonKeys.map((_key, index) => values[index] ?? null),
    };
  } catch (error) {
    failRead([...jsonKeys, ...hashKeys].join(','), error, strict);
    return empty();
  }
}

export async function readRedisSetMembers(
  key: string,
  { strict = false }: ReadOptions = {},
): Promise<string[]> {
  try {
    return ((await getClient().smembers(key)) ?? []).map(String);
  } catch (error) {
    failRead(key, error, strict);
    return [];
  }
}
