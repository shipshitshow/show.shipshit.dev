import type { Topic } from '@shipshitshow/types';
import publicEpisodes from '@/lib/data/public-episodes.json';
import { getTopicSummary } from '@/lib/topic-card-content';

export const GENERIC_EPISODE_DESCRIPTION =
  'Public livestream talking points for Ship Sh*t Show.';

const DESCRIPTION_LIMIT = 160;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/**
 * Search and share-card description built only from what the page shows: the
 * summaries of the first two visible topics (their titles when a topic has no
 * written summary). Falls back to the generic line when nothing is visible.
 */
export function buildEpisodeDescription(topics: Topic[]): string {
  const parts: string[] = [];
  for (const topic of topics.slice(0, 2)) {
    const text = (getTopicSummary(topic.content) ?? topic.title).trim();
    if (text && !parts.includes(text)) parts.push(text);
  }
  if (parts.length === 0) return GENERIC_EPISODE_DESCRIPTION;
  return truncate(parts.join(' '), DESCRIPTION_LIMIT);
}

export interface VideoObjectInput {
  description: string;
  name: string;
  pageUrl: string;
  thumbnailUrl: string;
  /** ISO 8601 date the video went up. */
  uploadDate: string | null;
  videoId: string | null;
}

/**
 * schema.org VideoObject for Google's video rich results. Emits nothing unless
 * the YouTube video ID and an upload date are both known: no invented fields.
 * Only the embed URL is set; YouTube exposes no direct media file for
 * `contentUrl`.
 */
export function buildVideoObjectJsonLd(
  input: VideoObjectInput,
): Record<string, unknown> | null {
  if (!input.videoId || !/^[\w-]{11}$/.test(input.videoId)) return null;
  if (!input.uploadDate || Number.isNaN(Date.parse(input.uploadDate))) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    description: input.description,
    embedUrl: `https://www.youtube.com/embed/${input.videoId}`,
    mainEntityOfPage: input.pageUrl,
    name: input.name,
    thumbnailUrl: [input.thumbnailUrl],
    uploadDate: input.uploadDate,
  };
}

/** Serialises JSON-LD for an inline script tag without allowing `</script>`. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Upload date for a video: the channel archive's `publishedAt` when the video
 * is listed there, otherwise the date the stream aired.
 */
export function getEpisodeUploadDate(
  videoId: string | null,
  airDate: string,
): string {
  const entry = videoId
    ? publicEpisodes.items.find((item) => item.id === videoId)
    : undefined;
  return entry?.publishedAt || airDate;
}
