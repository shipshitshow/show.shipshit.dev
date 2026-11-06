import {
  mergeVideoStats,
  type StatsSource,
  toVideoStat,
  type VideoStat,
} from '@/lib/video-stats';
import { readVideoStats, writeVideoStats } from '@/lib/video-stats-store';
import { getAccessToken, getChannelConfigs } from '@/lib/youtube/token';
import type { ChannelConfig } from '@/lib/youtube/types';

const DATA_API = 'https://www.googleapis.com/youtube/v3';
const PAGE_SIZE = 50;

export interface VideoStatsSyncResult {
  failed: Array<{ channel: string; error: string }>;
  fetchedAt: string;
  synced: Array<{ channel: string; videos: number }>;
}

async function youtubeGet<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${DATA_API}/${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(
      `GET ${path.split('?')[0]} failed: ${response.status} ${(await response.text()).slice(0, 160)}`,
    );
  }
  return (await response.json()) as T;
}

/**
 * Every upload of one channel, private ones included, with its numbers.
 * Costs about 1 quota unit per 50 videos (playlistItems + videos.list), and it
 * bypasses the 30 minute response cache the dashboard uses.
 */
async function fetchChannelStats(
  channel: ChannelConfig,
): Promise<Record<string, VideoStat>> {
  const token = await getAccessToken(channel);
  const channels = await youtubeGet<{
    items?: Array<{
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  }>(token, 'channels?part=contentDetails&mine=true');
  const playlist =
    channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) throw new Error('The token is not linked to a channel.');

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      maxResults: String(PAGE_SIZE),
      part: 'contentDetails',
      playlistId: playlist,
    });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await youtubeGet<{
      items?: Array<{ contentDetails?: { videoId?: string } }>;
      nextPageToken?: string;
    }>(token, `playlistItems?${params}`);
    for (const item of page.items ?? []) {
      if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  const stats: Record<string, VideoStat> = {};
  for (let start = 0; start < ids.length; start += PAGE_SIZE) {
    const params = new URLSearchParams({
      id: ids.slice(start, start + PAGE_SIZE).join(','),
      maxResults: String(PAGE_SIZE),
      part: 'snippet,statistics,contentDetails',
    });
    const data = await youtubeGet<{ items?: StatsSource[] }>(
      token,
      `videos?${params}`,
    );
    for (const item of data.items ?? []) stats[item.id] = toVideoStat(item);
  }
  return stats;
}

/**
 * Refreshes the stored per-video numbers for every configured channel. One
 * channel failing (an expired token) does not stop the others, and its videos
 * keep their last numbers. Nothing is written when every channel fails.
 */
export async function syncVideoStats(
  now: Date = new Date(),
): Promise<VideoStatsSyncResult> {
  const fetchedAt = now.toISOString();
  const result: VideoStatsSyncResult = { failed: [], fetchedAt, synced: [] };
  const fresh: Record<string, VideoStat> = {};

  for (const channel of await getChannelConfigs()) {
    try {
      const stats = await fetchChannelStats(channel);
      Object.assign(fresh, stats);
      result.synced.push({
        channel: channel.label,
        videos: Object.keys(stats).length,
      });
    } catch (error) {
      result.failed.push({
        channel: channel.label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (result.synced.length > 0) {
    await writeVideoStats(
      mergeVideoStats(await readVideoStats(), fresh, fetchedAt),
    );
  }
  return result;
}
