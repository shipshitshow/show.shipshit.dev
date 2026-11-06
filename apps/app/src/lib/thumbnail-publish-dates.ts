import { logError } from './logger';
import { fetchChannelUploads } from './youtube/client';
import {
  getAccessToken,
  getChannelConfigs,
  hasYouTubeCredentials,
} from './youtube/token';

/**
 * Publish date per video ID across every connected channel, from the cached
 * uploads playlist (1 quota unit a page). Ordering only: a failing channel is
 * skipped and the lab falls back to catalogue order, never an error.
 */
export async function fetchPublishDates(): Promise<Map<string, string>> {
  const dates = new Map<string, string>();
  if (!hasYouTubeCredentials()) return dates;
  try {
    const channels = await getChannelConfigs();
    const uploads = await Promise.all(
      channels.map(async (channel) => {
        try {
          return await fetchChannelUploads(
            await getAccessToken(channel),
            channel.id,
          );
        } catch (error) {
          logError('thumbnail_lab.publish_dates_failed', error);
          return [];
        }
      }),
    );
    for (const upload of uploads.flat())
      if (upload.publishedAt && !dates.has(upload.videoId))
        dates.set(upload.videoId, upload.publishedAt);
  } catch (error) {
    logError('thumbnail_lab.publish_dates_failed', error);
  }
  return dates;
}
