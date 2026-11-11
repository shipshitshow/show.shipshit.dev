import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import {
  expectedChannelId,
  getAccessToken,
  refreshTokenCandidates,
} from './youtube-upload.ts';

const ENV = [
  'KV_REST_API_URL',
  'KV_REST_API_READ_ONLY_TOKEN',
  'KV_REST_API_TOKEN',
  'YOUTUBE_CHANNEL_ID_CLIPS',
  'YOUTUBE_CHANNEL_ID_MAIN',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN_MAIN',
] as const;
let previous: Array<readonly [string, string | undefined]>;
const realFetch = globalThis.fetch;
const realExit = process.exit;
const realError = console.error;
const realWarn = console.warn;

beforeEach(() => {
  previous = ENV.map((key) => [key, process.env[key]] as const);
  for (const key of ENV) delete process.env[key];
  process.env.YOUTUBE_CLIENT_ID = 'id';
  process.env.YOUTUBE_CLIENT_SECRET = 'secret';
  process.exit = ((code?: number) => {
    throw new Error(`exit ${code}`);
  }) as typeof process.exit;
  console.error = () => {};
  console.warn = () => {};
});
afterEach(() => {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = realFetch;
  process.exit = realExit;
  console.error = realError;
  console.warn = realWarn;
});

test('the stored KV token comes before the env token', () => {
  expect(refreshTokenCandidates('kv-token', 'env-token')).toEqual([
    { source: 'kv', token: 'kv-token' },
    { source: 'env', token: 'env-token' },
  ]);
  expect(refreshTokenCandidates(null, 'env-token')).toEqual([
    { source: 'env', token: 'env-token' },
  ]);
  expect(refreshTokenCandidates('same', 'same')).toHaveLength(1);
  expect(refreshTokenCandidates(null, undefined)).toEqual([]);
});

function stubGoogle(valid: string[], kvToken: string | null) {
  const exchanged: string[] = [];
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'kv-secret';
  globalThis.fetch = mock(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('https://kv.test/get/'))
        return Response.json({ result: kvToken });
      const token =
        new URLSearchParams(String(init?.body)).get('refresh_token') ?? '';
      exchanged.push(token);
      return valid.includes(token)
        ? Response.json({ access_token: `access-for-${token}` })
        : new Response('{"error":"invalid_grant"}', { status: 400 });
    },
  ) as unknown as typeof fetch;
  return exchanged;
}

test('a stale env token does not hide a good stored token', async () => {
  process.env.YOUTUBE_REFRESH_TOKEN_MAIN = 'stale-env';
  const exchanged = stubGoogle(['good-kv'], 'good-kv');
  expect(await getAccessToken('main')).toBe('access-for-good-kv');
  expect(exchanged).toEqual(['good-kv']);
});

test('a revoked stored token falls back to the env token', async () => {
  process.env.YOUTUBE_REFRESH_TOKEN_MAIN = 'good-env';
  const exchanged = stubGoogle(['good-env'], 'dead-kv');
  expect(await getAccessToken('main')).toBe('access-for-good-env');
  expect(exchanged).toEqual(['dead-kv', 'good-env']);
});

test('every token revoked is a clear failure', async () => {
  process.env.YOUTUBE_REFRESH_TOKEN_MAIN = 'dead-env';
  stubGoogle([], 'dead-kv');
  await expect(getAccessToken('main')).rejects.toThrow('exit 1');
});

test('the channel check is never skipped', () => {
  // Main falls back to the id the public site already hard-codes.
  expect(expectedChannelId('main')).toStartWith('UC');
  process.env.YOUTUBE_CHANNEL_ID_MAIN = 'UCset';
  expect(expectedChannelId('main')).toBe('UCset');
  // Clips has no default, so unset is an error instead of a silent skip.
  expect(() => expectedChannelId('clips')).toThrow('exit 1');
  process.env.YOUTUBE_CHANNEL_ID_CLIPS = 'UCclips';
  expect(expectedChannelId('clips')).toBe('UCclips');
});
