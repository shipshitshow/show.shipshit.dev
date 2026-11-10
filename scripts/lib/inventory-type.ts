/**
 * What kind of upload a channel-inventory item is. The YouTube Data API has
 * no "type" field, so it is read from what the video carries:
 *
 * - `livestream`: has liveStreamingDetails and went live well before it was
 *   published (the stream was recorded as it aired, then published).
 * - `premiere`: has liveStreamingDetails too, but it started at the moment it
 *   was published. A premiere is a pre-recorded video, not a stream.
 * - `short`: up to 3 minutes (YouTube's Shorts limit) and not live. The
 *   channel has no regular video that short, so this is exact today; a longer
 *   normal video is never misread, but a short normal video would be.
 * - `video`: everything else.
 */

export type InventoryType = 'livestream' | 'premiere' | 'short' | 'video';

/** A premiere starts when it is published; allow minutes of scheduling drift. */
const PREMIERE_WINDOW_MS = 10 * 60 * 1000;
const SHORTS_MAX_SECONDS = 180;

export function classifyUpload(input: {
  actualStartTime: string | null;
  durationSeconds: number;
  hasLiveDetails: boolean;
  publishedAt: string;
}): InventoryType {
  if (input.hasLiveDetails) {
    const start = input.actualStartTime
      ? Date.parse(input.actualStartTime)
      : Number.NaN;
    const published = Date.parse(input.publishedAt);
    return Math.abs(start - published) <= PREMIERE_WINDOW_MS
      ? 'premiere'
      : 'livestream';
  }
  return input.durationSeconds <= SHORTS_MAX_SECONDS ? 'short' : 'video';
}
