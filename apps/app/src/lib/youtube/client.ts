import { createHash } from 'node:crypto';
import type {
  ChannelStats,
  DailyMetric,
  ErrorResponse,
  VideoStats,
} from '@shipshitshow/types';
import type {
  YouTubeAnalyticsResponse,
  YouTubeChannelItem,
  YouTubeSearchItem,
  YouTubeVideoItem,
} from '@/lib/youtube/types';
import { cachedFetch, TTL } from './cache';
import { normalizeYouTubeError } from './error';

const DATA_API = 'https://www.googleapis.com/youtube/v3';
const ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2/reports';

/** The Data API `videos.list` endpoint accepts at most 50 IDs per request. */
const MAX_VIDEO_IDS_PER_REQUEST = 50;

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Cache-key part for a set of video ids: the same ids in any order give the
 * same key, and any different set gives a different one. Keys that kept only
 * the first few ids let two requests share an entry and return each other's data.
 */
export function videoIdsKey(videoIds: string[]): string {
  const sorted = [...new Set(videoIds)].sort();
  const digest = createHash('sha1').update(sorted.join(',')).digest('hex');
  return `${sorted.length}:${digest.slice(0, 16)}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchVideoItems(
  token: string,
  videoIds: string[],
): Promise<YouTubeVideoItem[]> {
  const url = `${DATA_API}/videos?part=snippet,statistics,contentDetails,liveStreamingDetails,status&id=${videoIds.join(',')}`;
  const res = await ytFetch<{ items?: YouTubeVideoItem[] }>(url, token);
  return res.items ?? [];
}

function toVideoStats(item: YouTubeVideoItem, channelId: string): VideoStats {
  const durationSec = parseDuration(item.contentDetails?.duration);
  const isLive = !!item.liveStreamingDetails;
  const isShort = durationSec > 0 && durationSec <= 60;
  const videoType = isLive ? 'livestream' : isShort ? 'short' : 'video';
  const thumbnail =
    item.snippet?.thumbnails?.medium?.url ??
    item.snippet?.thumbnails?.default?.url ??
    '';

  return {
    avg_view_duration_seconds: durationSec,
    channel_id: channelId,
    comments: Number(item.statistics?.commentCount ?? 0),
    ctr: 0,
    impressions: 0,
    likes: Number(item.statistics?.likeCount ?? 0),
    published_at: item.snippet?.publishedAt ?? '',
    thumbnail_url: thumbnail,
    title: item.snippet?.title ?? item.id,
    video_id: item.id,
    video_type: videoType,
    views: Number(item.statistics?.viewCount ?? 0),
    watch_time_minutes: 0,
  };
}

export async function fetchChannelStats(
  token: string,
  channelId: string,
): Promise<ChannelStats> {
  return cachedFetch(`channel:${channelId}`, TTL.CHANNEL_STATS, async () => {
    const url = `${DATA_API}/channels?part=snippet,statistics&id=${channelId}`;
    const res = await ytFetch<{ items?: YouTubeChannelItem[] }>(url, token);
    const item = res.items?.[0];
    if (!item) throw new Error(`Channel not found: ${channelId}`);

    return {
      channel_id: channelId,
      channel_title: item.snippet?.title ?? channelId,
      subscriber_count: Number(item.statistics?.subscriberCount ?? 0),
      total_videos: Number(item.statistics?.videoCount ?? 0),
      total_views: Number(item.statistics?.viewCount ?? 0),
    };
  });
}

export async function fetchChannelVideos(
  token: string,
  channelId: string,
  maxResults = 50,
): Promise<VideoStats[]> {
  return cachedFetch(
    `videos:${channelId}:${maxResults}`,
    TTL.VIDEO_LIST,
    async () => {
      const searchUrl = `${DATA_API}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}`;
      const searchRes = await ytFetch<{ items?: YouTubeSearchItem[] }>(
        searchUrl,
        token,
      );
      const videoIds = searchRes.items
        ?.map((item) => item.id?.videoId)
        .filter(isDefined);

      if (!videoIds?.length) return [];

      const items = await fetchVideoItems(token, videoIds);
      return items.map((item) => toVideoStats(item, channelId));
    },
  );
}

/** A channel upload with just enough detail to match it to an episode. */
export interface ChannelUpload {
  channelId: string;
  isPublic: boolean;
  publishedAt: string;
  type: NonNullable<VideoStats['video_type']>;
  videoId: string;
}

/** The uploads playlist ID is the channel ID with its `UC` prefix swapped for `UU`. */
function uploadsPlaylistId(channelId: string): string | null {
  return channelId.startsWith('UC') ? `UU${channelId.slice(2)}` : null;
}

/**
 * Recent uploads for a channel, newest first, via the uploads playlist.
 * `playlistItems.list` costs 1 quota unit a page where `search.list` costs 100,
 * and the playlist reaches back past the 50 most recent videos, so older
 * episodes can still be matched.
 */
export async function fetchChannelUploads(
  token: string,
  channelId: string,
  maxItems = 200,
): Promise<ChannelUpload[]> {
  const playlistId = uploadsPlaylistId(channelId);
  if (!playlistId) return [];

  return cachedFetch(`uploads:${channelId}`, TTL.VIDEO_LIST, async () => {
    const videoIds: string[] = [];
    let pageToken: string | undefined;
    while (videoIds.length < maxItems) {
      const params = new URLSearchParams({
        maxResults: '50',
        part: 'contentDetails',
        playlistId,
      });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await ytFetch<{
        items?: Array<{ contentDetails?: { videoId?: string } }>;
        nextPageToken?: string;
      }>(`${DATA_API}/playlistItems?${params}`, token);
      for (const item of page.items ?? []) {
        const id = item.contentDetails?.videoId;
        if (id) videoIds.push(id);
      }
      pageToken = page.nextPageToken;
      if (!pageToken) break;
    }

    const batches = await Promise.all(
      chunk(videoIds.slice(0, maxItems), MAX_VIDEO_IDS_PER_REQUEST).map((ids) =>
        fetchVideoItems(token, ids),
      ),
    );

    return batches.flat().map((item): ChannelUpload => {
      const stats = toVideoStats(item, channelId);
      return {
        channelId,
        isPublic: item.status?.privacyStatus === 'public',
        publishedAt: stats.published_at,
        type: stats.video_type ?? 'video',
        videoId: item.id,
      };
    });
  });
}

/**
 * Look up specific videos by ID, regardless of how far back they were
 * published. `fetchChannelVideos` only reaches the most recent 50 uploads, which
 * is fine for a rolling dashboard but not for the per-episode rollup, where an
 * old episode's video must still resolve.
 */
export async function fetchVideosByIds(
  token: string,
  channelId: string,
  videoIds: string[],
): Promise<VideoStats[]> {
  if (!videoIds.length) return [];

  const sortedIds = [...new Set(videoIds)].sort();
  const cacheKey = `videosbyid:${channelId}:${videoIdsKey(sortedIds)}`;

  return cachedFetch(cacheKey, TTL.VIDEO_LIST, async () => {
    const batches = await Promise.all(
      chunk(sortedIds, MAX_VIDEO_IDS_PER_REQUEST).map((ids) =>
        fetchVideoItems(token, ids),
      ),
    );

    return batches.flat().map((item) => toVideoStats(item, channelId));
  });
}

export async function fetchDailyMetrics(
  token: string,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<DailyMetric[]> {
  const cacheKey = `daily:${channelId}:${startDate}:${endDate}`;
  return cachedFetch(cacheKey, TTL.DAILY_METRICS, async () => {
    const params = new URLSearchParams({
      dimensions: 'day',
      endDate,
      ids: `channel==${channelId}`,
      metrics:
        'views,estimatedMinutesWatched,subscribersGained,averageViewDuration,averageViewPercentage,likes',
      sort: 'day',
      startDate,
    });

    const res = await ytFetch<YouTubeAnalyticsResponse>(
      `${ANALYTICS_API}?${params}`,
      token,
    );

    return (res.rows ?? []).map(
      (row): DailyMetric => ({
        avg_view_duration_seconds: Number(row[4]),
        avg_view_percentage: Number(row[5]),
        day: String(row[0] ?? ''),
        likes: Number(row[6]),
        subscribers_gained: Number(row[3]),
        views: Number(row[1]),
        watch_time_minutes: Number(row[2]),
      }),
    );
  });
}

export async function fetchVideoAnalytics(
  token: string,
  channelId: string,
  videoIds: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, { watch_time_minutes: number }>> {
  if (!videoIds.length) return new Map();

  const cacheKey = `vidanalytics:${channelId}:${startDate}:${endDate}:${videoIdsKey(videoIds)}`;
  const rows = await cachedFetch(cacheKey, TTL.VIDEO_ANALYTICS, async () => {
    const params = new URLSearchParams({
      dimensions: 'video',
      endDate,
      filters: `video==${videoIds.join(',')}`,
      ids: `channel==${channelId}`,
      metrics: 'views,estimatedMinutesWatched,likes,shares,averageViewDuration',
      sort: '-views',
      startDate,
    });

    const res = await ytFetch<YouTubeAnalyticsResponse>(
      `${ANALYTICS_API}?${params}`,
      token,
    );
    return res.rows ?? [];
  });

  const map = new Map<string, { watch_time_minutes: number }>();
  for (const row of rows) {
    map.set(String(row[0] ?? ''), {
      watch_time_minutes: Number(row[2]),
    });
  }
  return map;
}

/**
 * Average view percentage per video. Errors propagate: a failed query is not
 * the same as "not reported", and callers decide how to show it (the rollup
 * logs it and renders not-tracked).
 */
export async function fetchVideoRetentionMetrics(
  token: string,
  channelId: string,
  videoIds: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, { avg_view_percentage: number }>> {
  if (!videoIds.length) return new Map();

  const cacheKey = `vidretention:${channelId}:${startDate}:${endDate}:${videoIdsKey(videoIds)}`;
  const rows = await cachedFetch(cacheKey, TTL.VIDEO_ANALYTICS, async () => {
    const params = new URLSearchParams({
      dimensions: 'video',
      endDate,
      filters: `video==${videoIds.join(',')}`,
      ids: `channel==${channelId}`,
      metrics: 'averageViewPercentage',
      sort: '-averageViewPercentage',
      startDate,
    });

    const res = await ytFetch<YouTubeAnalyticsResponse>(
      `${ANALYTICS_API}?${params}`,
      token,
    );
    return res.rows ?? [];
  });

  const map = new Map<string, { avg_view_percentage: number }>();
  for (const row of rows) {
    map.set(String(row[0] ?? ''), {
      avg_view_percentage: Number(row[1] ?? 0),
    });
  }
  return map;
}

async function ytFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    const normalized = normalizeYouTubeError(res.status, body);
    const error = new Error(normalized.error) as Error & ErrorResponse;
    error.code = normalized.code;
    error.hint = normalized.hint;
    throw error;
  }
  return (await res.json()) as T;
}

/** Parse ISO 8601 duration (PT4M13S) to seconds */
function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    (Number(match[1]) || 0) * 3600 +
    (Number(match[2]) || 0) * 60 +
    (Number(match[3]) || 0)
  );
}
