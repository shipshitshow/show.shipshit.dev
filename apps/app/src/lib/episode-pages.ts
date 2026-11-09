import {
  type LivestreamArchiveItem,
  listLivestreamArchive,
} from '@/lib/livestreams-store';
import { getLivestreamTitle, getVisibleTopics } from '@/lib/livestreams-ui';

export interface EpisodePage {
  date: string;
  /** Path of the public on-site page. */
  href: string;
  title: string;
  videoId: string | null;
  youtubeUrl: string | null;
}

/**
 * Archive entries that have a public on-site page worth linking to: a date
 * with at least one topic visible to anonymous readers. Newest first.
 */
export function toEpisodePages(items: LivestreamArchiveItem[]): EpisodePage[] {
  return items
    .flatMap((item) => {
      // The topic date is the stream date and the one the sitemap lists; the
      // archive `date` can be a transcript date a day later.
      const date = item.topicDate;
      const topics = getVisibleTopics(item.topics, date);
      if (topics.length === 0) return [];
      return [
        {
          date,
          href: `/talking-points/${date}`,
          title: getLivestreamTitle(date, topics, item.title),
          videoId: item.videoId,
          youtubeUrl: item.youtubeUrl,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listEpisodePages(): Promise<EpisodePage[]> {
  return toEpisodePages(await listLivestreamArchive());
}

/** YouTube video ID → on-site page path, for linking library cards. */
export function episodePagePathsByVideoId(
  pages: EpisodePage[],
): Map<string, string> {
  return new Map(
    pages.flatMap((page) =>
      page.videoId ? [[page.videoId, page.href] as const] : [],
    ),
  );
}
