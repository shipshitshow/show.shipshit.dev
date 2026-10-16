import type { Topic } from '@shipshitshow/types';
import { isPastDate } from '@/lib/livestreams-visibility';
import {
  buildYouTubeThumbnailUrl,
  extractRestreamUrl,
  extractVideoId,
  extractYouTubeUrl,
} from '@/lib/livestreams-youtube';

export { getVisibleTopics, isPastDate } from '@/lib/livestreams-visibility';
export type { MarkdownSection } from '@/lib/markdown-render';
export {
  extractTweetIds,
  extractYouTubeVideoIds,
  isUsefulSection,
  MarkdownBody,
  parseSections,
  parseSubSections,
  stripEmbedUrls,
} from '@/lib/markdown-render';

export const STATUS_META = {
  done: {
    badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20',
    copy: 'Past livestream dates are treated as done.',
    empty: 'No finished topics for this livestream yet.',
    label: 'Done',
  },
  selected: {
    badgeClass: 'bg-accent-red/10 text-text-primary border-accent-red/20',
    copy: 'Only selected topics stay here. Backlog remains in the desktop Kanban.',
    empty: 'No topic is selected for the current livestream yet.',
    label: 'Selected',
  },
} as const;

export interface LivestreamCard {
  effectiveStatus: keyof typeof STATUS_META;
  thumbnailUrl: string;
  topic: Topic;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

export function formatLivestreamDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}

export function sortTopics(topics: Topic[]): Topic[] {
  return [...topics].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.fileName.localeCompare(b.fileName),
  );
}

export function getEffectiveStatus(date: string): keyof typeof STATUS_META {
  return isPastDate(date) ? 'done' : 'selected';
}

export function getLivestreamTitle(
  date: string,
  topics: Topic[],
  archiveTitle?: string,
): string {
  if (archiveTitle && topics.length === 0) return archiveTitle;
  if (topics.length === 1) return topics[0].title;
  return `${formatLivestreamDate(date)} Livestream`;
}

export function getYoutubeUrl(
  topics: Topic[],
  archiveUrl?: string | null,
): string | null {
  if (archiveUrl) return archiveUrl;
  return (
    topics
      .map((topic) => extractYouTubeUrl(topic.content))
      .find((url): url is string => Boolean(url)) ?? null
  );
}

export function getRestreamUrl(topics: Topic[]): string | null {
  return (
    topics
      .map((topic) => extractRestreamUrl(topic.content))
      .find((url): url is string => Boolean(url)) ?? null
  );
}

async function getTopicThumbnailUrl(topic: Topic): Promise<string> {
  const youtubeUrl = extractYouTubeUrl(topic.content);
  const videoId = youtubeUrl ? extractVideoId(youtubeUrl) : null;

  if (videoId) {
    return buildYouTubeThumbnailUrl(videoId);
  }

  return `/api/og/livestreams/${encodeURIComponent(topic.slug)}?date=${encodeURIComponent(topic.date)}`;
}

export async function buildCards(
  topics: Topic[],
  effectiveStatus: keyof typeof STATUS_META,
): Promise<LivestreamCard[]> {
  return Promise.all(
    topics.map(async (topic) => ({
      effectiveStatus,
      thumbnailUrl: await getTopicThumbnailUrl(topic),
      topic,
    })),
  );
}
