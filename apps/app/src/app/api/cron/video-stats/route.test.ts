import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import {
  type FakeRedisHarness,
  installFakeRedis,
} from '@/lib/__tests__/fake-redis';
import { classifyPath } from '@/lib/producer-access';
import { GET } from './route';

const ENV = [
  'CRON_SECRET',
  'YOUTUBE_CHANNEL_ID_MAIN',
  'YOUTUBE_CHANNEL_ID_CLIPS',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN_MAIN',
] as const;
let previous: Array<readonly [string, string | undefined]>;
let harness: FakeRedisHarness;
const realFetch = globalThis.fetch;

beforeEach(() => {
  previous = ENV.map((key) => [key, process.env[key]] as const);
  for (const key of ENV) delete process.env[key];
  harness = installFakeRedis();
});
afterEach(() => {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = realFetch;
  harness.restore();
});

const call = (authorization?: string) =>
  GET(
    new Request('https://show.shipshit.dev/api/cron/video-stats', {
      headers: authorization ? { authorization } : {},
    }),
  );

test('the cron path is public to Clerk and guarded by its own secret', () => {
  expect(classifyPath('/api/cron/video-stats')).toBe('public');
});

test('it refuses every call while CRON_SECRET is unset', async () => {
  expect((await call('Bearer anything')).status).toBe(503);
  expect((await call()).status).toBe(503);
});

test('a missing or wrong secret is a 401 and touches nothing', async () => {
  process.env.CRON_SECRET = 'right';
  const fetchMock = mock(async () => new Response('{}'));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  expect((await call()).status).toBe(401);
  expect((await call('Bearer wrong')).status).toBe(401);
  expect((await call('Bearer righ')).status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(harness.redis.strings.size).toBe(0);
});

test('with the secret and no YouTube channel it reports a failed run and writes nothing', async () => {
  process.env.CRON_SECRET = 'right';
  const response = await call('Bearer right');
  expect(response.status).toBe(502);
  expect(harness.redis.strings.has('sss:test:v1:video-stats')).toBe(false);
});

test('with the secret it fetches each channel and stores the numbers', async () => {
  process.env.CRON_SECRET = 'right';
  process.env.YOUTUBE_CHANNEL_ID_MAIN = 'UCmain';
  process.env.YOUTUBE_CLIENT_ID = 'id';
  process.env.YOUTUBE_CLIENT_SECRET = 'secret';
  process.env.YOUTUBE_REFRESH_TOKEN_MAIN = 'refresh';
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('oauth2.googleapis.com'))
      return Response.json({ access_token: 'tok', expires_in: 3600 });
    if (url.includes('/channels?'))
      return Response.json({
        items: [
          { contentDetails: { relatedPlaylists: { uploads: 'UUmain' } } },
        ],
      });
    if (url.includes('/playlistItems?'))
      return Response.json({
        items: [{ contentDetails: { videoId: 'vid1' } }],
      });
    return Response.json({
      items: [
        {
          contentDetails: { duration: 'PT54M11S' },
          id: 'vid1',
          snippet: { publishedAt: '2026-11-03T15:00:00Z' },
          statistics: { likeCount: '65', viewCount: '1520' },
        },
      ],
    });
  }) as unknown as typeof fetch;

  const response = await call('Bearer right');
  expect(response.status).toBe(200);
  expect((await response.json()).synced).toEqual([
    { channel: 'main', videos: 1 },
  ]);
  expect(
    (
      harness.redis.strings.get('sss:test:v1:video-stats') as {
        videos: Record<string, unknown>;
      }
    ).videos.vid1,
  ).toEqual({
    durationSeconds: 3251,
    likes: 65,
    publishedAt: '2026-11-03T15:00:00Z',
    views: 1520,
  });
});
