import type { ChannelUpload } from '@/lib/youtube/client';

export interface EpisodeVideoMatch {
  /** The edited long-form video, if one was published in the episode's window. */
  flagshipId: string | null;
  /** Shorts published in the episode's window, oldest first. */
  shortIds: string[];
}

/** An episode never claims uploads more than a week after its date. */
const MAX_WINDOW_DAYS = 7;

function daysBetween(from: string, to: string): number {
  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000
  );
}

const EMPTY_MATCH: EpisodeVideoMatch = { flagshipId: null, shortIds: [] };

/**
 * Assigns channel uploads to episodes by publish date.
 *
 * An episode owns every public upload from its own date up to (not including)
 * the next episode's date, capped at a week so a gap in the archive can't pull
 * in unrelated videos. The livestream
 * itself is excluded, since it is resolved separately from the archive. Within
 * a window the earliest long-form video is the flagship and every Short counts
 * as one of the episode's Shorts. Private and scheduled uploads are skipped so
 * a not-yet-public video can't show up as a measured zero.
 */
export function matchEpisodeVideos(
  episodeDates: string[],
  uploads: ChannelUpload[],
  excludedVideoIds: ReadonlySet<string> = new Set(),
): Map<string, EpisodeVideoMatch> {
  const dates = [...new Set(episodeDates)].sort();
  const result = new Map<string, EpisodeVideoMatch>(
    dates.map((date) => [date, { ...EMPTY_MATCH, shortIds: [] }] as const),
  );

  const candidates = uploads
    .filter(
      (upload) =>
        upload.isPublic &&
        upload.type !== 'livestream' &&
        !excludedVideoIds.has(upload.videoId),
    )
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

  for (const upload of candidates) {
    const day = upload.publishedAt.slice(0, 10);
    let owner: string | null = null;
    for (const date of dates) {
      if (date <= day) owner = date;
      else break;
    }
    if (!owner || daysBetween(owner, day) >= MAX_WINDOW_DAYS) continue;
    const match = result.get(owner);
    if (!match) continue;

    if (upload.type === 'short') match.shortIds.push(upload.videoId);
    else if (match.flagshipId === null) match.flagshipId = upload.videoId;
  }

  return result;
}
