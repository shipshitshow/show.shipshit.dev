import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readVideoReach } from '@/lib/video-reach-store';
import { syncVideoReach } from '@/lib/youtube/reach-sync';
import {
  ensureReachJob,
  parseReachCsv,
  REACH_REPORT_TYPE,
  YouTubeReportingError,
} from '@/lib/youtube/reporting';
import { type FakeRedisHarness, installFakeRedis } from './fake-redis';

const CSV = [
  'date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr',
  '20261105,UCmain,vid1,1000,0.05',
  '20261105,UCmain,vid2,200,0.1',
].join('\n');

describe('parsing a reach report', () => {
  test('reads rows by column name and converts CTR to percent', () => {
    expect(parseReachCsv(CSV)).toEqual([
      { ctr: 5, day: '2026-11-05', impressions: 1000, videoId: 'vid1' },
      { ctr: 10, day: '2026-11-05', impressions: 200, videoId: 'vid2' },
    ]);
  });

  test('columns may be reordered and CRLF line ends are fine', () => {
    const csv =
      'video_id,video_thumbnail_impressions_ctr,date,video_thumbnail_impressions,channel_id\r\nvid1,0.02,20261105,500,UCmain\r\n';
    expect(parseReachCsv(csv)).toEqual([
      { ctr: 2, day: '2026-11-05', impressions: 500, videoId: 'vid1' },
    ]);
  });

  test('a day with no data is a header only', () => {
    expect(parseReachCsv(CSV.split('\n')[0])).toEqual([]);
    expect(parseReachCsv('')).toEqual([]);
  });

  test('a missing column is an error, not a column of zeros', () => {
    expect(() => parseReachCsv('date,video_id\n20261105,vid1')).toThrow(
      /video_thumbnail_impressions/,
    );
  });

  test('rows with unreadable numbers are skipped', () => {
    const csv = `${CSV.split('\n')[0]}\n20261105,UCmain,vid1,abc,0.1\n20261105,UCmain,vid2,5,0.2`;
    expect(parseReachCsv(csv)).toHaveLength(1);
  });
});

describe('the reporting job and the sync', () => {
  const ENV = [
    'YOUTUBE_CHANNEL_ID_MAIN',
    'YOUTUBE_CHANNEL_ID_CLIPS',
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
    'YOUTUBE_REFRESH_TOKEN_MAIN',
    'YOUTUBE_REFRESH_TOKEN_CLIPS',
  ] as const;
  let previous: Array<readonly [string, string | undefined]>;
  let harness: FakeRedisHarness;
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    previous = ENV.map((key) => [key, process.env[key]] as const);
    process.env.YOUTUBE_CHANNEL_ID_MAIN = 'UCmain';
    process.env.YOUTUBE_CLIENT_ID = 'id';
    process.env.YOUTUBE_CLIENT_SECRET = 'secret';
    process.env.YOUTUBE_REFRESH_TOKEN_MAIN = 'refresh';
    delete process.env.YOUTUBE_CHANNEL_ID_CLIPS;
    delete process.env.YOUTUBE_REFRESH_TOKEN_CLIPS;
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

  const api = (handlers: {
    jobs?: () => Response;
    reports?: (url: string) => Response;
    download?: (url: string) => Response;
  }) => {
    const calls: Array<{ method: string; url: string }> = [];
    globalThis.fetch = mock(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ method: init?.method ?? 'GET', url });
        if (url.includes('oauth2.googleapis.com'))
          return Response.json({ access_token: 'tok', expires_in: 3600 });
        if (url.includes('/reports?'))
          return handlers.reports?.(url) ?? Response.json({});
        if (url.includes('/jobs'))
          return handlers.jobs?.() ?? Response.json({});
        return handlers.download?.(url) ?? new Response('', { status: 404 });
      },
    ) as unknown as typeof fetch;
    return calls;
  };

  test('an existing reach job is reused, never created twice', async () => {
    const calls = api({
      jobs: () =>
        Response.json({
          jobs: [{ id: 'job1', reportTypeId: REACH_REPORT_TYPE }],
        }),
    });
    const { created, job } = await ensureReachJob('tok');
    expect(created).toBe(false);
    expect(job.id).toBe('job1');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  test('without one, the job is created', async () => {
    const calls = api({
      jobs: () =>
        Response.json({
          id: 'new',
          name: 'x',
          reportTypeId: REACH_REPORT_TYPE,
        }),
    });
    const { created, job } = await ensureReachJob('tok');
    expect(created).toBe(true);
    expect(job.id).toBe('new');
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  test('a disabled Reporting API is an error that says how to fix it', async () => {
    api({
      jobs: () =>
        Response.json(
          {
            error: {
              code: 403,
              errors: [
                {
                  message:
                    'YouTube Reporting API has not been used in project 1 before or it is disabled.',
                  reason: 'accessNotConfigured',
                },
              ],
              message:
                'YouTube Reporting API has not been used in project 1 before or it is disabled.',
            },
          },
          { status: 403 },
        ),
    });
    const error = await ensureReachJob('tok').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(YouTubeReportingError);
    expect((error as YouTubeReportingError).hint).toMatch(
      /Enable the YouTube Reporting API/,
    );
  });

  test('a fresh job with no reports yet is pending, and stores nothing', async () => {
    api({
      jobs: () => Response.json({ id: 'new', reportTypeId: REACH_REPORT_TYPE }),
    });
    const result = await syncVideoReach(new Date('2026-11-10T05:00:00Z'));
    expect(result.channels).toEqual([
      {
        channel: 'main',
        jobCreated: true,
        reports: 0,
        rows: 0,
        status: 'pending',
      },
    ]);
    expect(harness.redis.strings.size).toBe(0);
  });

  test('new reports are merged, the cursor moves, and the next run asks only for newer ones', async () => {
    const report = (id: string, createTime: string) => ({
      createTime,
      downloadUrl: `https://youtubereporting.googleapis.com/v1/media/${id}`,
      id,
      startTime: '2026-11-05T08:00:00Z',
    });
    const reports = [
      report('r2', '2026-11-07T03:00:00Z'),
      report('r1', '2026-11-06T03:00:00Z'),
    ];
    const requested: string[] = [];
    api({
      download: (url) =>
        new Response(
          url.endsWith('r1')
            ? CSV
            : `${CSV.split('\n')[0]}\n20261105,UCmain,vid1,2000,0.06`,
        ),
      jobs: () =>
        Response.json({
          jobs: [{ id: 'job1', reportTypeId: REACH_REPORT_TYPE }],
        }),
      reports: (url) => {
        requested.push(url);
        return Response.json({
          reports: new URL(url).searchParams.has('createdAfter') ? [] : reports,
        });
      },
    });

    const first = await syncVideoReach(new Date('2026-11-10T05:00:00Z'));
    expect(first.channels[0]).toMatchObject({
      reports: 2,
      rows: 3,
      status: 'synced',
    });

    const stored = await readVideoReach();
    // r2 is newer, so its row for vid1 replaces r1's.
    expect(stored.days.vid1['2026-11-05']).toEqual([2000, 6]);
    expect(stored.days.vid2['2026-11-05']).toEqual([200, 10]);
    expect(stored.cursors.main).toBe('2026-11-07T03:00:00Z');

    const second = await syncVideoReach(new Date('2026-11-11T05:00:00Z'));
    expect(second.channels[0]).toMatchObject({ reports: 0, status: 'synced' });
    expect(
      new URL(requested.at(-1) as string).searchParams.get('createdAfter'),
    ).toBe('2026-11-07T03:00:00Z');
  });

  test('a failing download keeps the cursor behind it so the report is retried', async () => {
    api({
      download: () => new Response('nope', { status: 500 }),
      jobs: () =>
        Response.json({
          jobs: [{ id: 'job1', reportTypeId: REACH_REPORT_TYPE }],
        }),
      reports: () =>
        Response.json({
          reports: [
            {
              createTime: '2026-11-06T03:00:00Z',
              downloadUrl:
                'https://youtubereporting.googleapis.com/v1/media/r1',
              id: 'r1',
              startTime: '2026-11-05T08:00:00Z',
            },
          ],
        }),
    });
    const result = await syncVideoReach();
    expect(result.channels[0].status).toBe('failed');
    expect(result.channels[0].error).toBeTruthy();
    expect((await readVideoReach()).cursors).toEqual({});
  });

  test('a report download URL on another host never receives the token', async () => {
    const fetchSpy = mock(async (_url: string) => new Response(CSV));
    api({
      download: (url) => fetchSpy(url) as unknown as Response,
      jobs: () =>
        Response.json({
          jobs: [{ id: 'job1', reportTypeId: REACH_REPORT_TYPE }],
        }),
      reports: () =>
        Response.json({
          reports: [
            {
              createTime: '2026-11-06T03:00:00Z',
              downloadUrl: 'https://evil.example/report.csv',
              id: 'r1',
              startTime: '2026-11-05T08:00:00Z',
            },
          ],
        }),
    });
    const result = await syncVideoReach();
    expect(result.channels[0].status).toBe('failed');
    expect(
      fetchSpy.mock.calls.some(([url]) => String(url).includes('evil.example')),
    ).toBe(false);
  });
});
