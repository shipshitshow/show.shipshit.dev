import { readRedisJson, redisKey, writeRedisJson } from './redis-storage';
import {
  isVideoStatsSnapshot,
  VIDEO_STATS_KEY,
  type VideoStatsSnapshot,
} from './video-stats';

const videoStatsKey = () => redisKey(VIDEO_STATS_KEY);

/** Null when nothing is stored or Redis is unreachable. */
export async function readVideoStats(): Promise<VideoStatsSnapshot | null> {
  const data = await readRedisJson<unknown>(videoStatsKey());
  return isVideoStatsSnapshot(data) ? data : null;
}

export async function writeVideoStats(
  snapshot: VideoStatsSnapshot,
): Promise<void> {
  await writeRedisJson(videoStatsKey(), snapshot);
}
