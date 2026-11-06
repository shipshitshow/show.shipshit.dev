import { todayLocalDate } from '@/lib/date';
import {
  getLivestreamArchiveByDate,
  getLivestreamArchiveByVideoId,
  listAvailableLivestreamDates,
  listLivestreamArchive,
  resolveLivestreamDate,
} from '@/lib/livestreams-store';
import {
  buildYouTubeThumbnailUrl,
  extractVideoId,
  extractYouTubeUrl,
} from '@/lib/livestreams-youtube';
import { toAbsoluteUrl } from '@/lib/site';
import { stripMarkdown } from '@/lib/text';

export const UPCOMING_STREAM_SLUG = 'live-stream-upcoming';

export function isDateSlug(slug: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(slug);
}

export function isYouTubeVideoId(slug: string): boolean {
  return /^[\w-]{11}$/.test(slug);
}

export async function resolveUpcomingLivestreamDate(): Promise<string> {
  const today = todayLocalDate();
  const dates = await listAvailableLivestreamDates();
  const upcoming = dates
    .filter((date) => date >= today)
    .sort((a, b) => a.localeCompare(b))[0];

  return upcoming ?? resolveLivestreamDate(today);
}

/**
 * Resolve a livestream route slug (date, YouTube video id, or the upcoming
 * sentinel) to the episode date its data is stored under. Null when the slug
 * does not point at a known stream.
 */
export async function resolveStreamDate(slug: string): Promise<string | null> {
  let requestedDate: string | null = null;

  if (isDateSlug(slug)) {
    requestedDate = slug;
  } else if (slug === UPCOMING_STREAM_SLUG) {
    requestedDate = await resolveUpcomingLivestreamDate();
  } else if (isYouTubeVideoId(slug)) {
    requestedDate = (await getLivestreamArchiveByVideoId(slug))?.date ?? null;
  }

  if (!requestedDate) return null;

  const [topicDates, livestreams] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
  ]);
  const availableDates = new Set([
    ...topicDates,
    ...livestreams.map((item) => item.date),
  ]);

  return availableDates.has(requestedDate)
    ? requestedDate
    : await resolveLivestreamDate(requestedDate);
}

export async function resolveStreamPathForDate(date: string): Promise<string> {
  if (date >= todayLocalDate()) {
    return `/content/livestreams/${UPCOMING_STREAM_SLUG}`;
  }

  const archive = await getLivestreamArchiveByDate(date);
  return archive?.videoId
    ? `/content/livestreams/${encodeURIComponent(archive.videoId)}`
    : `/content/livestreams/${encodeURIComponent(date)}`;
}

export function extractSummary(content: string): string | null {
  const match = content.match(/## Summary\n([\s\S]*?)(?:\n## |\n?$)/);
  if (!match) return null;

  const summary = stripMarkdown(match[1]).trim();
  return summary.length > 0 ? summary : null;
}

export async function buildTopicImageUrl(
  slug: string,
  date: string,
  content: string,
): Promise<string> {
  const youtubeUrl = extractYouTubeUrl(content);
  const videoId = youtubeUrl ? extractVideoId(youtubeUrl) : null;

  if (videoId) {
    return await buildYouTubeThumbnailUrl(videoId);
  }

  return toAbsoluteUrl(
    `/api/og/livestreams/${encodeURIComponent(slug)}?date=${encodeURIComponent(date)}`,
  );
}
