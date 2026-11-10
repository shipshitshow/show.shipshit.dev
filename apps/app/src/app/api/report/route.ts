import type {
  DailyMetric,
  ErrorResponse,
  MultiChannelReport,
  ReauthRequiredResponse,
  VideoStats,
} from '@shipshitshow/types';
import { NextRequest, NextResponse } from 'next/server';
import { formatLocalDate, todayLocalDate } from '@/lib/date';
import { requireProducer } from '@/lib/producer-auth';
import { fetchSocialPerformance } from '@/lib/social/performance';
import { aggregateReach, type VideoReachSnapshot } from '@/lib/video-reach';
import { readVideoReach } from '@/lib/video-reach-store';
import {
  fetchChannelStats,
  fetchChannelVideos,
  fetchDailyMetrics,
  fetchVideoAnalytics,
} from '@/lib/youtube/client';
import {
  getAccessToken,
  getChannelConfigs,
  hasYouTubeCredentials,
  isYouTubeReauthError,
} from '@/lib/youtube/token';

function getEmptyReport(): MultiChannelReport {
  return {
    channels: [],
    daily_metrics: [],
    per_channel: {},
    social_status: [],
    social_videos: [],
    videos: [],
  };
}

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}

function todayDate(): string {
  return todayLocalDate();
}

/** Combine daily metrics from multiple channels. CTR is weighted by impressions. */
function combineDailyMetrics(...metricSets: DailyMetric[][]): DailyMetric[] {
  const byDay = new Map<string, DailyMetric>();

  for (const metrics of metricSets) {
    for (const m of metrics) {
      const existing = byDay.get(m.day);
      if (existing) {
        const existingViews = existing.views;
        const totalViews = existingViews + m.views;
        existing.views = totalViews;
        existing.watch_time_minutes += m.watch_time_minutes;
        existing.subscribers_gained += m.subscribers_gained;
        existing.likes += m.likes;
        // Weighted averages
        existing.avg_view_duration_seconds =
          totalViews > 0
            ? (existing.avg_view_duration_seconds * existingViews +
                m.avg_view_duration_seconds * m.views) /
              totalViews
            : 0;
        existing.avg_view_percentage =
          totalViews > 0
            ? (existing.avg_view_percentage * existingViews +
                m.avg_view_percentage * m.views) /
              totalViews
            : 0;
      } else {
        byDay.set(m.day, { ...m });
      }
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

async function fetchChannelData(
  channelConfig: { id: string; label: string; refreshToken: string },
  startDate: string,
  endDate: string,
  reachSnapshot: VideoReachSnapshot,
) {
  const token = await getAccessToken(channelConfig);

  const [stats, videos, daily] = await Promise.all([
    fetchChannelStats(token, channelConfig.id),
    fetchChannelVideos(token, channelConfig.id),
    fetchDailyMetrics(token, channelConfig.id, startDate, endDate),
  ]);

  // Enrich videos with analytics data
  const videoIds = videos.map((v) => v.video_id);
  let enrichedVideos: VideoStats[] = videos;

  if (videoIds.length > 0) {
    const analytics = await fetchVideoAnalytics(
      token,
      channelConfig.id,
      videoIds,
      startDate,
      endDate,
    );
    // Impressions and CTR are not in the Analytics API; they come from the
    // stored daily Reporting API reach reports (see lib/video-reach.ts).
    const reach = aggregateReach(reachSnapshot, videoIds, startDate, endDate);

    enrichedVideos = videos.map((v) => {
      const a = analytics.get(v.video_id);
      const r = reach.get(v.video_id);
      return {
        ...v,
        channel_label: channelConfig.label,
        ctr: r?.ctr ?? v.ctr,
        impressions: r?.impressions ?? v.impressions,
        platform: 'youtube',
        watch_time_minutes: a?.watch_time_minutes ?? v.watch_time_minutes,
      };
    });
  }

  return { daily, stats, videos: enrichedVideos };
}

function describeFailure(label: string, reason: unknown): string {
  if (isYouTubeReauthError(reason)) {
    return `${label}: YouTube authentication expired. Reconnect this channel.`;
  }
  const message = reason instanceof Error ? reason.message : String(reason);
  const hint =
    reason instanceof Error && 'hint' in reason && reason.hint
      ? ` ${String(reason.hint)}`
      : '';
  return `${label}: ${message}${hint}`;
}

/** A channel with videos but no stored reach cursor has had no report yet. */
function reachWarnings(
  channels: Array<{ label: string }>,
  snapshot: VideoReachSnapshot,
): string[] {
  return channels
    .filter((channel) => !snapshot.cursors[channel.label])
    .map(
      (channel) =>
        `${channel.label}: no thumbnail reach reports have arrived yet, so impressions and CTR are blank. The daily sync (/api/cron/video-stats) creates the YouTube reporting job; its first report comes within 48 hours.`,
    );
}

export async function GET(req: NextRequest) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30');
  const channels = await getChannelConfigs();
  const socialPerformance = fetchSocialPerformance();

  if (!hasYouTubeCredentials() || channels.length === 0) {
    const social = await socialPerformance;
    return NextResponse.json({
      ...getEmptyReport(),
      social_status: social.statuses,
      social_videos: social.videos,
    });
  }

  try {
    const startDate = daysAgoDate(days);
    const endDate = todayDate();
    const reachSnapshotPromise = readVideoReach();

    // Fetch all channels in parallel (each with its own token). One channel
    // failing (an expired token) must not blank the other; it is reported in
    // `warnings` instead.
    const [settled, social, reachSnapshot] = await Promise.all([
      Promise.allSettled(
        channels.map(async (ch) =>
          fetchChannelData(ch, startDate, endDate, await reachSnapshotPromise),
        ),
      ),
      socialPerformance,
      reachSnapshotPromise,
    ]);

    const warnings: string[] = [];
    const failures = settled.flatMap((result, index) =>
      result.status === 'rejected'
        ? [{ label: channels[index].label, reason: result.reason }]
        : [],
    );
    // Every channel failing is a failed report, not an empty one.
    if (failures.length === channels.length) throw failures[0].reason;
    for (const failure of failures) {
      warnings.push(describeFailure(failure.label, failure.reason));
    }

    const perChannel: MultiChannelReport['per_channel'] = {};
    const allVideos: VideoStats[] = [];
    const allDailyMetrics: DailyMetric[][] = [];
    const allChannelStats = [];

    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      const outcome = settled[i];
      if (outcome.status === 'rejected') continue;
      const data = outcome.value;
      perChannel[ch.id] = {
        channel: data.stats,
        daily_metrics: data.daily,
        videos: data.videos,
      };
      allVideos.push(...data.videos);
      allDailyMetrics.push(data.daily);
      allChannelStats.push(data.stats);
    }

    allVideos.sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

    const report: MultiChannelReport = {
      channels: allChannelStats,
      daily_metrics: combineDailyMetrics(...allDailyMetrics),
      per_channel: perChannel,
      social_status: social.statuses,
      social_videos: social.videos,
      videos: allVideos,
    };
    const succeeded = channels.filter(
      (_, i) => settled[i].status === 'fulfilled',
    );
    warnings.push(...reachWarnings(succeeded, reachSnapshot));
    if (warnings.length > 0) report.warnings = warnings;

    return NextResponse.json(report, {
      // A report with warnings is not worth caching for five minutes.
      headers: {
        'Cache-Control':
          warnings.length > 0 ? 'no-store' : 'private, max-age=300',
      },
    });
  } catch (error) {
    if (isYouTubeReauthError(error)) {
      const response: ReauthRequiredResponse = {
        channelLabel: error.channelLabel ?? null,
        error: 'YouTube authentication expired. Reconnect YouTube to continue.',
        reauthRequired: true,
      };
      return NextResponse.json(response, { status: 401 });
    }
    const response: ErrorResponse =
      error instanceof Error
        ? {
            code:
              'code' in error && typeof error.code === 'string'
                ? error.code
                : undefined,
            error: error.message,
            hint:
              'hint' in error && typeof error.hint === 'string'
                ? error.hint
                : undefined,
          }
        : {
            error: 'Failed to load analytics report',
          };
    return NextResponse.json(response, { status: 503 });
  }
}
