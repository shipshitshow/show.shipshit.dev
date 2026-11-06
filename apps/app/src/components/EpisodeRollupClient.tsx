'use client';

import type {
  EpisodeAssetLink,
  EpisodeMetric,
  EpisodeRollupResponse,
  EpisodeRollupRow,
  ErrorResponse,
  NotTrackedReason,
} from '@shipshitshow/types';
import { isErrorResponse, isReauthRequiredResponse } from '@shipshitshow/types';
import { Button, cn } from '@shipshitshow/ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FilterSelect } from '@/components/FilterSelect';
import { EpisodeRollupTableSkeleton } from '@/components/PageSkeletons';
import { readCachedSnapshot, writeCachedSnapshot } from '@/lib/client-cache';
import { OUTLIER_THRESHOLD, outlierScores } from '@/lib/content-library';
import { formatNumber } from '@/lib/format';
import { parseJsonResponse } from '@/lib/parse-json-response';

const CACHE_KEY = 'episode-rollup';

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Epic #9 forbids zero-faking, so a blank cell always explains itself. These
 * four reasons are the whole vocabulary — see `NotTrackedReason`.
 */
const NOT_TRACKED_COPY: Record<NotTrackedReason, string> = {
  no_asset: 'Nothing published on this surface for this episode',
  no_checklist: 'No distribution checklist recorded for this episode yet',
  no_data: 'Platform reported no data for this asset',
  no_integration: 'Metrics ingestion for this surface has not shipped yet',
};

/** Legend order: least to most known about the surface. */
const NOT_TRACKED_REASONS: NotTrackedReason[] = [
  'no_checklist',
  'no_asset',
  'no_integration',
  'no_data',
];

function formatViews(value: number): string {
  return formatNumber(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatEpisodeDate(date: string): string {
  const timestamp = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? date : DATE_FORMATTER.format(timestamp);
}

function AssetLinks({ assets }: { assets: EpisodeAssetLink[] }) {
  if (assets.length === 0) return null;

  if (assets.length === 1) {
    return (
      <a
        href={assets[0].url}
        target="_blank"
        rel="noopener noreferrer"
        title={assets[0].label}
        className="mt-0.5 block text-[10px] text-text-muted transition-colors hover:text-accent-red"
      >
        Open ↗
      </a>
    );
  }

  return (
    <div className="mt-0.5 flex flex-wrap justify-end gap-1">
      {assets.map((asset, index) => (
        <a
          key={asset.url}
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          title={asset.label}
          className="text-[10px] text-text-muted transition-colors hover:text-accent-red"
        >
          {index + 1}↗
        </a>
      ))}
    </div>
  );
}

function OutlierChip({ label, score }: { label: string; score: number }) {
  return (
    <span
      title={`${score}x the median ${label} of these episodes`}
      className={cn(
        'ml-1.5 text-[10px]',
        score >= OUTLIER_THRESHOLD
          ? 'rounded-full border border-green-500/20 bg-green-500/10 px-1.5 font-semibold text-green-400'
          : 'text-text-muted',
      )}
    >
      {score}x
    </span>
  );
}

function MetricCell({
  assets = [],
  format,
  metric,
  outlier,
}: {
  assets?: EpisodeAssetLink[];
  format: (value: number) => string;
  metric: EpisodeMetric;
  outlier?: { label: string; score: number | undefined };
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
      {metric.state === 'tracked' ? (
        <span className="text-text-secondary">
          {format(metric.value)}
          {outlier?.score !== undefined ? (
            <OutlierChip label={outlier.label} score={outlier.score} />
          ) : null}
        </span>
      ) : (
        <span
          title={NOT_TRACKED_COPY[metric.reason]}
          className="cursor-help text-text-muted/60 underline decoration-dotted underline-offset-4"
        >
          —
        </span>
      )}
      <AssetLinks assets={assets} />
    </td>
  );
}

type ViewColumn = 'flagship' | 'livestream' | 'shorts';
type Scores = Record<ViewColumn, number | undefined>;

const VIEW_COLUMNS: ViewColumn[] = ['flagship', 'livestream', 'shorts'];

const OUTLIER_LABEL: Record<ViewColumn, string> = {
  flagship: 'video views',
  livestream: 'live views',
  shorts: 'Shorts views',
};

const tracked = (metric: EpisodeMetric) =>
  metric.state === 'tracked' ? metric.value : undefined;

/** Each episode's views against the median of the same column. */
function scoreEpisodes(episodes: EpisodeRollupRow[]): Map<string, Scores> {
  const columns = Object.fromEntries(
    VIEW_COLUMNS.map((column) => [
      column,
      outlierScores(episodes.map((row) => tracked(row[column].views))),
    ]),
  ) as Record<ViewColumn, Array<number | undefined>>;
  return new Map(
    episodes.map((row, index) => [
      row.date,
      {
        flagship: columns.flagship[index],
        livestream: columns.livestream[index],
        shorts: columns.shorts[index],
      },
    ]),
  );
}

type EpisodeSort = 'latest' | 'views' | 'outliers';

const SORTS: Array<{ label: string; value: EpisodeSort }> = [
  { label: 'Latest', value: 'latest' },
  { label: 'Most viewed', value: 'views' },
  { label: 'Outliers', value: 'outliers' },
];

function totalViews(row: EpisodeRollupRow): number {
  return VIEW_COLUMNS.reduce(
    (sum, column) => sum + (tracked(row[column].views) ?? 0),
    0,
  );
}

function bestScore(scores: Scores | undefined): number {
  return Math.max(-1, ...VIEW_COLUMNS.map((column) => scores?.[column] ?? -1));
}

function EpisodeRow({
  episode,
  scores,
}: {
  episode: EpisodeRollupRow;
  scores: Scores | undefined;
}) {
  return (
    <tr className="group border-b border-surface-border/50 transition-colors hover:bg-surface-elevated/50">
      <td className="px-4 py-3 align-top">
        <Link href={episode.href} className="flex items-start gap-3">
          <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
            {episode.thumbnailUrl ? (
              <img
                src={episode.thumbnailUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="line-clamp-2 max-w-xs text-text-primary transition-colors group-hover:text-accent-red">
              {episode.title}
            </span>
            <span className="mt-0.5 block text-[11px] text-text-muted">
              {formatEpisodeDate(episode.date)}
            </span>
          </span>
        </Link>
      </td>

      <MetricCell
        metric={episode.flagship.views}
        format={formatViews}
        assets={episode.flagship.assets}
        outlier={{ label: OUTLIER_LABEL.flagship, score: scores?.flagship }}
      />
      <MetricCell metric={episode.flagship.ctr} format={formatPercentage} />
      <MetricCell
        metric={episode.flagship.avgViewPercentage}
        format={formatPercentage}
      />
      <MetricCell
        metric={episode.livestream.views}
        format={formatViews}
        assets={episode.livestream.assets}
        outlier={{ label: OUTLIER_LABEL.livestream, score: scores?.livestream }}
      />
      <MetricCell
        metric={episode.shorts.views}
        format={formatViews}
        assets={episode.shorts.assets}
        outlier={{ label: OUTLIER_LABEL.shorts, score: scores?.shorts }}
      />
      <MetricCell
        metric={episode.x.impressions}
        format={formatViews}
        assets={episode.x.assets}
      />
      <MetricCell
        metric={episode.linkedin.clicks}
        format={formatViews}
        assets={episode.linkedin.assets}
      />
      <MetricCell metric={episode.leads.count} format={formatViews} />
    </tr>
  );
}

/** One header row: each column says what it counts and where. */
const HEADERS: Array<{ label: string; title: string }> = [
  { label: 'Video views', title: 'Views of the edited video on YouTube' },
  { label: 'Video CTR', title: 'Click-through rate of the edited video' },
  { label: 'Avg watched', title: 'Average share of the edited video watched' },
  { label: 'Live views', title: 'Views of the livestream on YouTube' },
  { label: 'Shorts views', title: 'Views of every Short from the episode' },
  { label: 'X impressions', title: 'Impressions of the X posts' },
  { label: 'LinkedIn clicks', title: 'Clicks from LinkedIn posts (UTM)' },
  { label: 'Leads', title: 'Leads logged for the episode' },
];

function RollupTable({
  episodes,
  scores,
}: {
  episodes: EpisodeRollupRow[];
  scores: Map<string, Scores>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-surface-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">
              Episode
            </th>
            {HEADERS.map((header) => (
              <th
                key={header.label}
                title={header.title}
                className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-text-secondary"
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.date}
              episode={episode}
              scores={scores.get(episode.date)}
            />
          ))}
        </tbody>
      </table>

      {episodes.length === 0 && (
        <div className="py-12 text-center text-sm text-text-muted">
          No published episodes found
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-surface-border px-5 py-3 text-[11px] text-text-muted">
      <span className="text-text-secondary">
        <span className="underline decoration-dotted underline-offset-4">
          —
        </span>{' '}
        means not tracked, never zero:
      </span>
      {NOT_TRACKED_REASONS.map((reason) => (
        <span key={reason}>{NOT_TRACKED_COPY[reason]}</span>
      ))}
    </div>
  );
}

export function EpisodeRollupClient() {
  const [rollup, setRollup] = useState<EpisodeRollupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [sort, setSort] = useState<EpisodeSort>('latest');

  const load = useCallback(async (options?: { force?: boolean }) => {
    setLoading(true);
    setError(null);

    if (!options?.force) {
      const cached = readCachedSnapshot<EpisodeRollupResponse>(CACHE_KEY);
      if (cached) {
        setRollup(cached.data);
        setCachedAt(cached.savedAt);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/episode-rollup');
      const data = await parseJsonResponse<
        EpisodeRollupResponse | ErrorResponse
      >(res);

      if (!res.ok) {
        if (isReauthRequiredResponse(data)) {
          window.location.href = `/auth/youtube?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setRollup(null);
        setError(
          isErrorResponse(data) ? data : { error: `API error ${res.status}` },
        );
        return;
      }
      if (isErrorResponse(data)) {
        setRollup(null);
        setError(data);
        return;
      }

      setRollup(data);
      writeCachedSnapshot(CACHE_KEY, data);
      setCachedAt(new Date().toISOString());
    } catch (e) {
      setRollup(null);
      setError(
        e instanceof Error
          ? { error: e.message }
          : { error: 'Failed to load episode rollup' },
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="text-4xl text-accent-red">⚠</div>
        <div className="max-w-xl space-y-2 text-center">
          <p className="text-sm font-medium text-text-primary">{error.error}</p>
          {error.hint ? (
            <p className="text-xs leading-relaxed text-text-muted">
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

  const episodes = [...(rollup?.episodes ?? [])];
  const scores = scoreEpisodes(episodes);
  if (sort === 'views') episodes.sort((a, b) => totalViews(b) - totalViews(a));
  else if (sort === 'outliers')
    episodes.sort(
      (a, b) => bestScore(scores.get(b.date)) - bestScore(scores.get(a.date)),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Episodes</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            {`${episodes.length} ${episodes.length === 1 ? 'episode' : 'episodes'} across every surface`}
            {cachedAt
              ? ` · cached ${new Date(cachedAt).toLocaleTimeString()}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={setSort}
            options={SORTS}
          />
          <Button
            onClick={() => load({ force: true })}
            aria-label="Refresh episode rollup"
            disabled={loading}
            className="px-2.5 hover:border-accent-red disabled:opacity-50"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                loading && 'animate-spin',
              )}
            >
              <path d="M1 1v4h4M15 15v-4h-4" />
              <path d="M13.5 6A6 6 0 0 0 3 3.5L1 5M2.5 10A6 6 0 0 0 13 12.5l2-1.5" />
            </svg>
          </Button>
        </div>
      </div>

      {rollup && !rollup.isYouTubeConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-elevated/30 px-5 py-4">
          <p className="text-xs leading-relaxed text-text-muted">
            YouTube is not connected, so flagship, livestream and shorts columns
            stay not-tracked.
          </p>
          <Button
            asChild
            size="sm"
            className="rounded bg-surface-elevated text-xs text-text-secondary hover:text-text-primary"
          >
            <a href="/auth/youtube">Connect YouTube</a>
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-surface-border bg-surface-card">
        {loading ? (
          <EpisodeRollupTableSkeleton />
        ) : (
          <RollupTable episodes={episodes} scores={scores} />
        )}
        <Legend />
      </div>
    </div>
  );
}
