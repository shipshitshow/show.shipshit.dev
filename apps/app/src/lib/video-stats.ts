/**
 * Per-video numbers for the channel-style grids on /videos and /livestreams.
 * One Redis value, rewritten daily by /api/cron/video-stats (or by hand with
 * `bun run youtube:sync --push-redis`). The pages only read it, so they never
 * call YouTube and never fail when it is missing.
 */
export const VIDEO_STATS_KEY = 'video-stats';

export interface VideoStat {
  comments?: number;
  /** Length in seconds; 0 while a livestream has not ended. */
  durationSeconds: number;
  likes?: number;
  publishedAt?: string;
  views: number;
}

export interface VideoStatsSnapshot {
  fetchedAt: string;
  videos: Record<string, VideoStat>;
}

/** The part of a YouTube `videos.list` item that the stats need. */
export interface StatsSource {
  contentDetails?: { duration?: string };
  id: string;
  snippet?: { publishedAt?: string };
  statistics?: {
    commentCount?: string;
    likeCount?: string;
    viewCount?: string;
  };
}

/** ISO 8601 duration (PT1H2M3S, P0D) to seconds. */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = iso.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match.map(Number);
  return (
    (days || 0) * 86_400 +
    (hours || 0) * 3600 +
    (minutes || 0) * 60 +
    (seconds || 0)
  );
}

function count(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toVideoStat(source: StatsSource): VideoStat {
  const stat: VideoStat = {
    durationSeconds: parseIsoDuration(source.contentDetails?.duration),
    views: count(source.statistics?.viewCount) ?? 0,
  };
  const likes = count(source.statistics?.likeCount);
  const comments = count(source.statistics?.commentCount);
  if (likes !== undefined) stat.likes = likes;
  if (comments !== undefined) stat.comments = comments;
  if (source.snippet?.publishedAt)
    stat.publishedAt = source.snippet.publishedAt;
  return stat;
}

/**
 * Fresh numbers win; a video that was not fetched this time (one channel's
 * token failed) keeps its last known numbers.
 */
export function mergeVideoStats(
  previous: VideoStatsSnapshot | null,
  fresh: Record<string, VideoStat>,
  fetchedAt: string,
): VideoStatsSnapshot {
  return { fetchedAt, videos: { ...previous?.videos, ...fresh } };
}

export function isVideoStatsSnapshot(
  value: unknown,
): value is VideoStatsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.fetchedAt !== 'string') return false;
  const videos = snapshot.videos;
  if (!videos || typeof videos !== 'object' || Array.isArray(videos))
    return false;
  return Object.values(videos).every(
    (video) =>
      video &&
      typeof video === 'object' &&
      typeof (video as VideoStat).views === 'number' &&
      typeof (video as VideoStat).durationSeconds === 'number',
  );
}

/** 3725 -> 1:02:05, 654 -> 10:54. Empty for a video that has no length yet. */
export function formatDuration(totalSeconds: number): string {
  if (!(totalSeconds > 0)) return '';
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${minutes}:${rest}`;
}

/** 682 -> "682", 1520 -> "1.5K", 12_400 -> "12K", 1_250_000 -> "1.3M". */
export function formatCount(value: number): string {
  const compact = (n: number, unit: string) =>
    `${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10}${unit}`;
  if (value >= 999_500) return compact(value / 1_000_000, 'M');
  if (value >= 1000) return compact(value / 1000, 'K');
  return String(value);
}

const UNITS: Array<[string, number]> = [
  ['year', 365 * 86_400],
  ['month', 30 * 86_400],
  ['week', 7 * 86_400],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 days ago", "1 month ago", like the channel page. */
export function formatAge(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      const amount = Math.floor(seconds / size);
      return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

export type VideoSort = 'latest' | 'popular' | 'oldest';
export const VIDEO_SORTS: Array<{ id: VideoSort; label: string }> = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Popular' },
  { id: 'oldest', label: 'Oldest' },
];

export function parseSort(value: string | undefined): VideoSort {
  return value === 'popular' || value === 'oldest' ? value : 'latest';
}

/** Sorts a copy. Videos without numbers go last under "popular". */
export function sortVideos<T extends { date: string; views?: number }>(
  videos: T[],
  sort: VideoSort,
): T[] {
  const byDate = (a: T, b: T) => b.date.localeCompare(a.date);
  const copy = [...videos];
  if (sort === 'oldest') return copy.sort((a, b) => -byDate(a, b));
  if (sort === 'popular')
    return copy.sort(
      (a, b) => (b.views ?? -1) - (a.views ?? -1) || byDate(a, b),
    );
  return copy.sort(byDate);
}
