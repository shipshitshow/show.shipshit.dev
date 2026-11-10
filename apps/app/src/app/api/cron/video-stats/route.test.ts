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
    if (url.includes('youtubereporting.googleapis.com'))
      return url.includes('/reports?')
        ? Response.json({})
        : Response.json({ id: 'job1', reportTypeId: 'channel_reach_basic_a1' });
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
          liveStreamingDetails: { actualStartTime: '2026-11-03T15:00:00Z' },
          snippet: {
            publishedAt: '2026-11-03T15:00:00Z',
            thumbnails: {
              default: { url: 'https://i.ytimg.com/vi/vid1/default.jpg' },
              high: { url: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg' },
            },
            title: 'Black October',
          },
          statistics: { likeCount: '65', viewCount: '1520' },
          status: { privacyStatus: 'public' },
        },
      ],
    });
  }) as unknown as typeof fetch;

  const response = await call('Bearer right');
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.synced).toEqual([{ channel: 'main', videos: 1 }]);
  // The new reporting job has produced no report yet; that is shown, not hidden.
  expect(body.reach.channels).toEqual([
    {
      channel: 'main',
      jobCreated: true,
      reports: 0,
      rows: 0,
      status: 'pending',
    },
  ]);
  expect(
    (
      harness.redis.strings.get('sss:test:v1:video-stats') as {
        videos: Record<string, unknown>;
      }
    ).videos.vid1,
  ).toEqual({
    channel: 'main',
    durationSeconds: 3251,
    likes: 65,
    live: true,
    privacy: 'public',
    publishedAt: '2026-11-03T15:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
    title: 'Black October',
    views: 1520,
  });
});

test('a reach failure is reported and fails the run when every channel failed, but the stats stay written', async () => {
  process.env.CRON_SECRET = 'right';
  process.env.YOUTUBE_CHANNEL_ID_MAIN = 'UCmain';
  process.env.YOUTUBE_CLIENT_ID = 'id';
  process.env.YOUTUBE_CLIENT_SECRET = 'secret';
  process.env.YOUTUBE_REFRESH_TOKEN_MAIN = 'refresh';
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('oauth2.googleapis.com'))
      return Response.json({ access_token: 'tok', expires_in: 3600 });
    if (url.includes('youtubereporting.googleapis.com'))
      return new Response(
        '{"error":{"message":"disabled","errors":[{"reason":"accessNotConfigured"}]}}',
        {
          status: 403,
        },
      );
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
        { id: 'vid1', snippet: { title: 'T' }, statistics: { viewCount: '1' } },
      ],
    });
  }) as unknown as typeof fetch;

  const response = await call('Bearer right');
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.synced).toEqual([{ channel: 'main', videos: 1 }]);
  expect(body.reach.channels[0].status).toBe('failed');
  expect(harness.redis.strings.has('sss:test:v1:video-stats')).toBe(true);
});
