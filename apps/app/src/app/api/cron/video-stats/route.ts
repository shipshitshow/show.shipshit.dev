import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
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
 * Daily refresh of the per-video views, likes and durations that /videos and
 * /livestreams show. Vercel Cron (apps/app/vercel.json) calls it with
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
    // Every channel failing is a failed run, so Vercel shows it as one.
    const status = result.synced.length === 0 ? 502 : 200;
    return NextResponse.json(result, { headers, status });
  } catch (error) {
    logError('cron.video_stats_failed', error);
    return NextResponse.json(
      { error: 'The video stats sync failed.' },
      { headers, status: 500 },
    );
  }
}
