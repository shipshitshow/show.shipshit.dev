import { readRedisJson, redisKey, writeRedisJson } from './redis-storage';
import {
  aggregateReach,
  emptyReachSnapshot,
  isVideoReachSnapshot,
  VIDEO_REACH_KEY,
  type VideoReach,
  type VideoReachSnapshot,
} from './video-reach';

const videoReachKey = () => redisKey(VIDEO_REACH_KEY);

/**
 * Empty snapshot when nothing is stored yet. A Redis outage throws when
 * `strict`, so the sync never overwrites stored history with an empty value.
 */
export async function readVideoReach({
  strict = false,
}: {
  strict?: boolean;
} = {}): Promise<VideoReachSnapshot> {
  const data = await readRedisJson<unknown>(videoReachKey(), { strict });
  return isVideoReachSnapshot(data) ? data : emptyReachSnapshot();
}

export async function writeVideoReach(
  snapshot: VideoReachSnapshot,
): Promise<void> {
  await writeRedisJson(videoReachKey(), snapshot);
}

/**
 * Impressions and CTR for the given videos over [startDate, endDate], from the
 * stored daily reach reports. Videos with no reach data in the window are
 * absent; the caller shows them as "not reported".
 */
export async function getVideoReach(
  videoIds: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, VideoReach>> {
  if (videoIds.length === 0) return new Map();
  return aggregateReach(await readVideoReach(), videoIds, startDate, endDate);
}
