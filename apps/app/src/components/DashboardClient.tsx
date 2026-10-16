'use client';

import type {
  ChannelFilter,
  ChannelStats,
  DailyMetric,
  DateRange,
  ErrorResponse,
  MultiChannelReport,
  VideoStats,
} from '@shipshitshow/types';
import { isErrorResponse, isReauthRequiredResponse } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChannelSelector } from '@/components/ChannelSelector';
import { DateRangeSelector } from '@/components/DateRangeSelector';
import { SocialPerformance } from '@/components/SocialPerformance';
import { StatCard } from '@/components/StatCard';
import { type ChartLine, TimeSeriesChart } from '@/components/TimeSeriesChart';
import { TopVideos } from '@/components/TopVideos';
import { VideoTable } from '@/components/VideoTable';
import { readCachedSnapshot, writeCachedSnapshot } from '@/lib/client-cache';
import { formatNumber, formatWatchTime } from '@/lib/format';
import { parseJsonResponse } from '@/lib/parse-json-response';

interface MultiChannelMetricPoint {
  day: string;
  views_main?: number;
  views_clips?: number;
  watch_time_minutes_main?: number;
  watch_time_minutes_clips?: number;
  subscribers_gained_main?: number;
  subscribers_gained_clips?: number;
  avg_view_percentage_main?: number;
  avg_view_percentage_clips?: number;
}

export function DashboardClient({
  view = 'channels',
}: {
  view?: 'channels' | 'overview' | 'socials';
}) {
  const [days, setDays] = useState<DateRange>(30);
  const [report, setReport] = useState<MultiChannelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { force?: boolean }) => {
      const cacheKey = `analytics-report:${days}`;

      setLoading(true);
      setError(null);

      if (!options?.force) {
        const cached = readCachedSnapshot<MultiChannelReport>(cacheKey);
        if (cached) {
          setReport(cached.data);
          setCachedAt(cached.savedAt);
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(`/api/report?days=${days}`);
        const data = await parseJsonResponse<
          MultiChannelReport | { error: string }
        >(res);
        if (!res.ok) {
          if (isReauthRequiredResponse(data)) {
            window.location.href = `/auth/youtube?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
          }
          setReport(null);
          setError(
            isErrorResponse(data) ? data : { error: `API error ${res.status}` },
          );
          return;
        }
        if (isErrorResponse(data)) {
          setReport(null);
          setError(data);
          return;
        }
        const nextReport = data as MultiChannelReport;
        setReport(nextReport);
        writeCachedSnapshot(cacheKey, nextReport);
        setCachedAt(new Date().toISOString());
      } catch (e) {
        setReport(null);
        setError(
          e instanceof Error
            ? { error: e.message }
            : { error: 'Failed to load analytics' },
        );
      } finally {
        setLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    load();
  }, [load]);

  const CHANNEL_COLORS: Record<string, string> = {
    clips: 'var(--color-text-primary)',
    main: 'var(--color-accent-red)',
  };

  const {
    channels,
    daily,
    videos,
    headerTitle,
    headerSub,
    multiChartData,
    isMulti,
  } = useMemo(() => {
    if (!report) {
      return {
        channels: [] as ChannelStats[],
        daily: [] as DailyMetric[],
        headerSub: 'Loading channel data…',
        headerTitle: 'Channel Analytics',
        isMulti: false,
        multiChartData: null as null | MultiChannelMetricPoint[],
        videos: [] as VideoStats[],
      };
    }

    if (channelFilter === 'all') {
      const totalSubs = report.channels.reduce(
        (s, c) => s + c.subscriber_count,
        0,
      );
      const totalVids = report.channels.reduce((s, c) => s + c.total_videos, 0);

      const perChannelEntries = Object.entries(report.per_channel);
      const dayMap = new Map<string, MultiChannelMetricPoint>();

      for (const [, chData] of perChannelEntries) {
        const label = chData.channel.channel_title
          .toLowerCase()
          .includes('clip')
          ? 'clips'
          : 'main';
        for (const m of chData.daily_metrics) {
          const existing = dayMap.get(m.day) ?? { day: m.day };
          existing[`views_${label}`] = m.views;
          existing[`watch_time_minutes_${label}`] = m.watch_time_minutes;
          existing[`subscribers_gained_${label}`] = m.subscribers_gained;
          existing[`avg_view_percentage_${label}`] = m.avg_view_percentage;
          dayMap.set(m.day, existing);
        }
      }

      const merged = Array.from(dayMap.values()).sort((a, b) =>
        a.day.localeCompare(b.day),
      );

      return {
        channels: report.channels,
        daily: report.daily_metrics,
        headerSub: `${formatNumber(totalVids)} videos · ${formatNumber(totalSubs)} subscribers`,
        headerTitle: 'All',
        isMulti: perChannelEntries.length > 1,
        multiChartData: merged,
        videos: report.videos,
      };
    }

    const chData = report.per_channel[channelFilter];
    if (!chData) {
      return {
        channels: report.channels,
        daily: report.daily_metrics,
        headerSub: '',
        headerTitle: 'All Channels',
        isMulti: false,
        multiChartData: null,
        videos: report.videos,
      };
    }

    return {
      channels: report.channels,
      daily: chData.daily_metrics,
      headerSub: `${formatNumber(chData.channel.total_videos)} videos · ${formatNumber(chData.channel.subscriber_count)} subscribers`,
      headerTitle: chData.channel.channel_title,
      isMulti: false,
      multiChartData: null,
      videos: chData.videos,
    };
  }, [report, channelFilter]);

  function makeLines(metric: string): ChartLine[] {
    return [
      { color: CHANNEL_COLORS.main, dataKey: `${metric}_main`, label: 'Main' },
      {
        color: CHANNEL_COLORS.clips,
        dataKey: `${metric}_clips`,
        label: 'Clips',
      },
    ];
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-accent-red text-4xl">⚠</div>
        <div className="max-w-xl text-center space-y-2">
          <p className="text-text-primary text-sm font-medium">{error.error}</p>
          {error.hint ? (
            <p className="text-text-muted text-xs leading-relaxed">
              {error.hint}
            </p>
          ) : null}
        </div>
        <Button
          onClick={() => load({ force: true })}
          className="text-xs hover:border-accent-red"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (view === 'socials') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Social performance</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Latest media totals across connected accounts. These are not
              comparable period metrics or unique audience counts.
            </p>
            {cachedAt && (
              <p className="mt-1 text-xs text-text-muted">
                Last loaded {new Date(cachedAt).toLocaleString()}
              </p>
            )}
          </div>
          <Button onClick={() => load({ force: true })} disabled={loading}>
            Refresh socials
          </Button>
        </div>
        {loading ? (
          <TopVideosSkeleton title="Short-Form Performance" />
        ) : (
          <SocialPerformance
            youtubeVideos={videos}
            socialVideos={report?.social_videos ?? []}
            socialStatuses={report?.social_status ?? []}
          />
        )}
        <div className="border-t border-surface-border pt-5 text-sm text-text-secondary">
          <h2 className="mb-2 font-medium text-text-primary">Coverage</h2>
          <p>
            YouTube Shorts, Instagram and TikTok media are supported when
            connected. X analytics and LinkedIn history are not connected to
            this view yet.
          </p>
          <p className="mt-2">
            Use Channel analytics for YouTube metrics over a selected date
            range.
          </p>
        </div>
      </div>
    );
  }

  // Aggregate period totals from daily metrics
  const periodViews = daily.reduce((s, d) => s + d.views, 0);
  const periodWatchTime = daily.reduce((s, d) => s + d.watch_time_minutes, 0);
  const periodSubs = daily.reduce((s, d) => s + d.subscribers_gained, 0);
  const avgViewPct =
    daily.length > 0
      ? daily.reduce((s, d) => s + d.avg_view_percentage, 0) / daily.length
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-text-primary">
              {view === 'overview' ? 'Your channels' : headerTitle}
            </h2>
          </div>
          <p className="text-text-muted text-sm mt-0.5">
            {headerSub}
            {cachedAt
              ? ` · cached ${new Date(cachedAt).toLocaleTimeString()}`
              : ''}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {channels.length > 1 && (
            <ChannelSelector
              channels={channels}
              selected={channelFilter}
              onChange={setChannelFilter}
            />
          )}
          <DateRangeSelector value={days} onChange={setDays} />
          <Button
            onClick={() => load({ force: true })}
            aria-label="Refresh analytics"
            disabled={loading}
            className="hover:border-accent-red px-2.5 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-3.5 w-3.5 transition-transform ${loading ? 'animate-spin' : ''}`}
            >
              <path d="M1 1v4h4M15 15v-4h-4" />
              <path d="M13.5 6A6 6 0 0 0 3 3.5L1 5M2.5 10A6 6 0 0 0 13 12.5l2-1.5" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Views"
          value={formatNumber(periodViews)}
          sub={`last ${days} days`}
          loading={loading}
        />
        <StatCard
          label="Watch Time"
          value={formatWatchTime(periodWatchTime)}
          sub={`last ${days} days`}
          loading={loading}
        />
        <StatCard
          label="Subscribers Gained"
          value={formatNumber(periodSubs)}
          sub={`last ${days} days`}
          accent={periodSubs > 0}
          loading={loading}
        />
        <StatCard
          label="Avg View %"
          value={`${avgViewPct.toFixed(1)}%`}
          sub={`last ${days} days`}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            color: undefined,
            fmtTick: (v: number) => formatNumber(v),
            fmtVal: formatNumber,
            key: 'views',
            label: 'Views over time',
          },
          {
            color: '#22c55e',
            fmtTick: (v: number) => formatNumber(v),
            fmtVal: (v: number) => `+${formatNumber(v)}`,
            key: 'subscribers_gained',
            label: 'Subscriber growth',
          },
          {
            color: '#f59e0b',
            fmtTick: (v: number) => formatWatchTime(v),
            fmtVal: formatWatchTime,
            key: 'watch_time_minutes',
            label: 'Watch time (minutes)',
          },
          {
            color: '#8b5cf6',
            fmtTick: (v: number) => `${v.toFixed(0)}%`,
            fmtVal: (v: number) => `${v.toFixed(1)}%`,
            key: 'avg_view_percentage',
            label: 'Avg view %',
          },
        ].map((chart) => (
          <div
            key={chart.key}
            className="bg-surface-card border border-surface-border rounded-xl p-5"
          >
            <h3 className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-4">
              {chart.label}
            </h3>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={isMulti && multiChartData ? multiChartData : daily}
                dataKey={chart.key}
                color={chart.color}
                formatValue={chart.fmtVal}
                formatTick={chart.fmtTick}
                lines={isMulti ? makeLines(chart.key) : undefined}
              />
            )}
          </div>
        ))}
      </div>

      {loading ? <TopVideosSkeleton /> : <TopVideos videos={videos} />}

      {view === 'channels' &&
        (loading ? (
          <VideoTableSkeleton />
        ) : (
          <div className="bg-surface-card border border-surface-border rounded-xl">
            <div className="px-5 pt-5 pb-3 border-b border-surface-border">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                Videos — {videos.length} total
              </h3>
            </div>
            <VideoTable
              videos={videos}
              showChannel={channelFilter === 'all' && channels.length > 1}
            />
          </div>
        ))}
    </div>
  );
}

const SKELETON_HEIGHTS = [
  43, 50, 62, 52, 47, 28, 15, 19, 27, 48, 45, 52, 71, 41, 26, 14, 9, 14, 30, 54,
];

function ChartSkeleton() {
  return (
    <div className="h-[180px] flex items-end gap-1.5 px-2">
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-surface-elevated rounded-t animate-pulse"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function TopVideosSkeleton({ title = 'Best Performers' }: { title?: string }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl">
      <div className="px-5 pt-5 pb-3 border-b border-surface-border">
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-border">
        {[0, 1, 2].map((col) => (
          <div key={col} className="p-5">
            <div className="h-4 w-16 bg-surface-elevated rounded animate-pulse mb-4" />
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex gap-3">
                  <div className="size-5 bg-surface-elevated rounded animate-pulse" />
                  <div className="w-28 h-16 bg-surface-elevated rounded-lg animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-full bg-surface-elevated rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-surface-elevated rounded animate-pulse" />
                    <div className="h-2 w-1/2 bg-surface-elevated rounded animate-pulse mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoTableSkeleton() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl">
      <div className="px-5 pt-5 pb-3 border-b border-surface-border">
        <div className="h-3 w-28 bg-surface-elevated rounded animate-pulse" />
      </div>
      <div className="divide-y divide-surface-border/50">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-3 flex-1 max-w-xs bg-surface-elevated rounded animate-pulse" />
            <div className="h-3 w-12 bg-surface-elevated rounded animate-pulse" />
            <div className="h-3 w-12 bg-surface-elevated rounded animate-pulse" />
            <div className="h-3 w-10 bg-surface-elevated rounded animate-pulse" />
            <div className="h-3 w-14 bg-surface-elevated rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
