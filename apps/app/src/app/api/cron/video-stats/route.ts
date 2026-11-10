import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { syncVideoReach } from '@/lib/youtube/reach-sync';
import { syncVideoStats } from '@/lib/youtube/video-stats-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const headers = { 'Cache-Control': 'no-store' };

function authorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily refresh of the per-video views, likes and durations that the Content
 * pages and the content agent use, plus the new daily thumbnail reach reports
 * (impressions and CTR) from the YouTube Reporting API. Vercel Cron (apps/app/vercel.json) calls it with
 * `Authorization: Bearer $CRON_SECRET`. It is public to Clerk and guarded by
 * that secret alone, and it refuses every call while CRON_SECRET is unset.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not set.' },
      { headers, status: 503 },
    );
  }
  if (!authorized(request, secret)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { headers, status: 401 },
    );
  }

  try {
    const result = await syncVideoStats();
    for (const failure of result.failed) {
      logError('cron.video_stats_channel_failed', new Error(failure.error), {
        channel: failure.channel,
      });
    }

    // Reach is separate from the stats: its failure is reported and logged but
    // never costs the stats that were already written.
    let reach: Awaited<ReturnType<typeof syncVideoReach>> | { error: string };
    try {
      reach = await syncVideoReach();
      for (const channel of reach.channels) {
        if (channel.status === 'failed') {
          logError(
            'cron.video_reach_channel_failed',
            new Error(channel.error ?? 'unknown'),
            { channel: channel.channel },
          );
        }
      }
    } catch (error) {
      logError('cron.video_reach_failed', error);
      reach = { error: 'The video reach sync failed.' };
    }

    // Every channel failing is a failed run, so Vercel shows it as one.
    const statsFailed = result.synced.length === 0;
    const reachFailed =
      'error' in reach ||
      (reach.channels.length > 0 &&
        reach.channels.every((channel) => channel.status === 'failed'));
    return NextResponse.json(
      { ...result, reach },
      { headers, status: statsFailed || reachFailed ? 502 : 200 },
    );
  } catch (error) {
    logError('cron.video_stats_failed', error);
    return NextResponse.json(
      { error: 'The video stats sync failed.' },
      { headers, status: 500 },
    );
  }
}
