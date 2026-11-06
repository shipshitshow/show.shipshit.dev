import fs from 'node:fs';
import type { Topic } from '@shipshitshow/types';
import {
  attachVariants,
  buildContentItems,
  type ContentItem,
  type RepoContent,
} from './content-library';
import { todayLocalDate } from './date';
import {
  getTopicsForDate,
  type LivestreamArchiveItem,
  listAvailableLivestreamDates,
  listLivestreamArchive,
  listPublishedVideos,
} from './livestreams-store';
import { formatLivestreamDate } from './livestreams-ui';
import {
  isThumbnailKind,
  type ThumbnailItem,
  type ThumbnailVersion,
  thumbnailAssetUrl,
  thumbnailCdnUrl,
} from './thumbnail-lab';
import { listThumbnailItems } from './thumbnail-lab-store';
import { analyzeTranscriptScorecard } from './transcript-scorecard';
import type { VideoStatsSnapshot } from './video-stats';
import { readVideoStats } from './video-stats-store';

/** Transcript files are repo data and never change while the server runs. */
const scoreCache = new Map<string, number | null>();

function transcriptScore(transcriptPath: string | null): number | undefined {
  if (!transcriptPath) return undefined;
  if (!scoreCache.has(transcriptPath)) {
    const scorecard = analyzeTranscriptScorecard(
      fs.readFileSync(transcriptPath, 'utf-8'),
    );
    scoreCache.set(transcriptPath, scorecard?.overall ?? null);
  }
  return scoreCache.get(transcriptPath) ?? undefined;
}

function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

const streamPath = (slug: string) =>
  `/content/livestreams/${encodeURIComponent(slug)}/talking-points`;
const transcriptPath = (slug: string) =>
  `/library/transcripts/${encodeURIComponent(slug)}`;

export interface NextShow {
  date: string;
  /** Route slug of its prep pages: the stream's video ID, else the date. */
  slug: string;
  title: string;
  topics: Topic[];
  videoId: string | null;
}

/** The first show today or later with topics or a scheduled stream. */
async function findNextShow(
  topicDates: string[],
  archive: LivestreamArchiveItem[],
  today: string,
): Promise<NextShow | null> {
  const date = Array.from(
    new Set([...topicDates, ...archive.map((item) => item.date)]),
  )
    .filter((day) => day >= today)
    .sort()[0];
  if (!date) return null;
  const stream = archive.find((item) => item.date === date);
  const topics = await getTopicsForDate(date);
  const active = topics.filter((topic) => topic.status === 'in_progress');
  return {
    date,
    slug: stream?.videoId ?? date,
    title:
      stream?.title ??
      (active.length === 1
        ? active[0].title
        : `${formatLivestreamDate(date)} Livestream`),
    topics,
    videoId: stream?.videoId ?? null,
  };
}

export async function loadNextShow(): Promise<NextShow | null> {
  const [topicDates, archive] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
  ]);
  return findNextShow(topicDates, archive, todayLocalDate());
}

/**
 * The livestreams and videos in the repo. A livestream links to its prep
 * page and is joined to its saved transcript by video ID, file or date (the
 * same day or the next). Published items no stream claims link to their
 * transcript page.
 */
async function loadRepoContent(): Promise<RepoContent[]> {
  const today = todayLocalDate();
  const [topicDates, archive, published] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
    listPublishedVideos(),
  ]);
  const publishedById = new Map(
    published
      .filter((item) => item.videoId)
      .map((item) => [item.videoId as string, item]),
  );
  // Recent livestream transcripts carry no video ID and are often saved
  // under the next day's date (the upload day), so match those by date.
  const unmatchedStreamTranscripts = new Map(
    published
      .filter((item) => item.type === 'livestream' && !item.videoId)
      .map((item) => [item.date, item]),
  );
  const publishedByPath = new Map(
    published.map((item) => [item.transcriptPath, item]),
  );
  const entries: RepoContent[] = [];
  const linked = new Set<string>();

  for (const stream of archive) {
    if (stream.date >= today || !stream.videoId) continue;
    const transcript =
      publishedById.get(stream.videoId) ??
      (stream.transcriptPath
        ? publishedByPath.get(stream.transcriptPath)
        : undefined) ??
      unmatchedStreamTranscripts.get(stream.date) ??
      unmatchedStreamTranscripts.get(nextDay(stream.date));
    if (transcript) {
      linked.add(transcript.routeSlug);
      unmatchedStreamTranscripts.delete(transcript.date);
    }
    entries.push({
      date: stream.date,
      href: streamPath(stream.videoId),
      key: `livestream:${stream.date}`,
      title: stream.title,
      transcriptScore: transcriptScore(
        stream.transcriptPath ?? transcript?.transcriptPath ?? null,
      ),
      transcriptWords: transcript?.wordCount,
      type: 'livestream',
      videoId: stream.videoId,
    });
  }

  const next = await findNextShow(topicDates, archive, today);
  if (next) {
    entries.push({
      date: next.date,
      href: streamPath(next.slug),
      key: `livestream:${next.date}`,
      title: next.title,
      type: 'livestream',
      upcoming: true,
      videoId: next.videoId,
    });
  }

  for (const item of published) {
    if (linked.has(item.routeSlug)) continue;
    entries.push({
      date: item.date,
      href: transcriptPath(item.routeSlug),
      key: `${item.type}:${item.routeSlug}`,
      title: item.title,
      transcriptWords: item.wordCount,
      type: item.type,
      videoId: item.videoId,
    });
  }
  return entries;
}

/**
 * Where a card loads a Library version from. In production that is the public
 * CDN, so a page of cards costs no API call per image; locally it is the
 * asset route, which reads the files on disk.
 */
function variantUrl(item: ThumbnailItem, version: ThumbnailVersion): string {
  return process.env.VERCEL || process.env.THUMBNAIL_LAB_USE_CDN
    ? thumbnailCdnUrl(item, version)
    : thumbnailAssetUrl(item, version);
}

/** The Library's video thumbnails. Cards still render if it cannot load. */
async function loadThumbnailCatalogue(): Promise<ThumbnailItem[]> {
  try {
    return (await listThumbnailItems()).filter(isThumbnailKind);
  } catch {
    return [];
  }
}

export async function loadContent(): Promise<{
  items: ContentItem[];
  stats: VideoStatsSnapshot | null;
}> {
  const [repo, stats, catalogue] = await Promise.all([
    loadRepoContent(),
    readVideoStats(),
    loadThumbnailCatalogue(),
  ]);
  return {
    items: attachVariants(
      buildContentItems(repo, stats?.videos ?? {}),
      catalogue,
      variantUrl,
    ),
    stats,
  };
}
