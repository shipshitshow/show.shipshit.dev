/**
 * One list of everything both channels published: livestreams, edited videos
 * and Shorts. Repo files (topic seeds, transcripts) give the livestreams and
 * videos we prepared; the daily YouTube stats add views, likes, length and the
 * uploads the repo does not know about, which is where the Shorts come from.
 * Pure, so the pages and tests share it; the loader is content-library-server.
 */
import type { ThumbnailItem, ThumbnailVersion } from './thumbnail-lab';
import { sortVideos, type VideoSort, type VideoStat } from './video-stats';

export type ContentType = 'livestream' | 'video' | 'short';
type ContentChannel = 'main' | 'clips';
export type ChannelFilter = 'all' | ContentChannel;

export const CONTENT_TYPES: Array<{
  id: ContentType;
  label: string;
  path: string;
}> = [
  { id: 'livestream', label: 'Livestreams', path: '/content/livestreams' },
  { id: 'video', label: 'Videos', path: '/content/videos' },
  { id: 'short', label: 'Shorts', path: '/content/shorts' },
];

export const CHANNEL_FILTERS: Array<{ id: ChannelFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'main', label: '@shipshitshow' },
  { id: 'clips', label: '@shipshitshowclips' },
];

/** YouTube accepts Shorts up to three minutes long. */
const SHORT_MAX_SECONDS = 180;

export interface ContentItem {
  channel: ContentChannel;
  /** YYYY-MM-DD: the show date for repo items, the publish day otherwise. */
  date: string;
  /** True when the link goes to YouTube because the app has no page for it. */
  external: boolean;
  href: string;
  key: string;
  /**
   * Views divided by the median views of the same channel and type: 3 means
   * three times what that kind of upload usually gets. Public uploads only.
   */
  outlier?: number;
  stat?: VideoStat;
  thumbnailUrl: string;
  title: string;
  /** Transcript quality out of 10, livestreams only. */
  transcriptScore?: number;
  /** Words in the saved transcript; undefined when the repo has none. */
  transcriptWords?: number;
  type: ContentType;
  upcoming?: boolean;
  /** Thumbnail versions from the Library, when there is a choice to see. */
  variants?: CardVariants;
  videoId: string | null;
  views?: number;
}

/** One thumbnail version shown under a card. */
interface CardVariant {
  current: boolean;
  /** Opens the Library on this video with this version selected. */
  href: string;
  id: string;
  label: string;
  status: 'approved' | 'pending' | 'revise';
  url: string;
}

export interface CardVariants {
  /** Opens the Library on this video. */
  href: string;
  /** Versions left out of the strip. */
  more: number;
  shown: CardVariant[];
}

/** How many versions fit under a card before the rest become "+N". */
const VARIANTS_SHOWN = 4;

const VARIANT_STATUS: Record<CardVariant['status'], string> = {
  approved: 'Approved',
  pending: 'Awaiting review',
  revise: 'Revision requested',
};

function thumbnailLabHref(videoId: string, versionId?: string): string {
  const params = new URLSearchParams({ video: videoId });
  if (versionId) params.set('version', versionId);
  return `/library/thumbnails?${params}`;
}

/**
 * The versions of a video's thumbnail worth comparing on its card: the
 * current one first, then the newest. Rejected versions stay in the Library.
 * Nothing when there is only one version left, since there is no choice.
 */
export function cardVariants(
  item: ThumbnailItem,
  url: (item: ThumbnailItem, version: ThumbnailVersion) => string,
): CardVariants | undefined {
  const numbered = item.versions.map((version, index) => ({
    index,
    version,
  }));
  const open = numbered
    .filter(({ version }) => version.review.status !== 'rejected')
    .sort(
      (a, b) =>
        Number(b.version.id === item.currentVersionId) -
          Number(a.version.id === item.currentVersionId) || b.index - a.index,
    );
  if (open.length < 2) return undefined;
  return {
    href: thumbnailLabHref(item.id),
    more: Math.max(0, open.length - VARIANTS_SHOWN),
    shown: open.slice(0, VARIANTS_SHOWN).map(({ index, version }) => {
      const status = version.review.status as CardVariant['status'];
      return {
        current: version.id === item.currentVersionId,
        href: thumbnailLabHref(item.id, version.id),
        id: version.id,
        label: `Version ${index + 1} · ${VARIANT_STATUS[status]}`,
        status,
        url: url(item, version),
      };
    }),
  };
}

/** Puts each video's Library versions on its card, matched by video ID. */
export function attachVariants(
  items: ContentItem[],
  catalogue: ThumbnailItem[],
  url: (item: ThumbnailItem, version: ThumbnailVersion) => string,
): ContentItem[] {
  const byVideo = new Map(catalogue.map((entry) => [entry.id, entry]));
  return items.map((item) => {
    const entry = item.videoId ? byVideo.get(item.videoId) : undefined;
    const variants = entry ? cardVariants(entry, url) : undefined;
    return variants ? { ...item, variants } : item;
  });
}

/** A livestream, video or Short the repo knows about, before the stats are joined. */
export interface RepoContent {
  date: string;
  href: string;
  key: string;
  thumbnailUrl?: string;
  title: string;
  transcriptScore?: number;
  transcriptWords?: number;
  type: ContentType;
  upcoming?: boolean;
  videoId: string | null;
}

function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function channelOf(stat: VideoStat | undefined): ContentChannel {
  return stat?.channel === 'clips' ? 'clips' : 'main';
}

/** What an upload the repo does not know is, from its numbers alone. */
export function classifyUpload(stat: VideoStat): ContentType {
  if (stat.live) return 'livestream';
  if (stat.durationSeconds > 0 && stat.durationSeconds <= SHORT_MAX_SECONDS)
    return 'short';
  return 'video';
}

export function buildContentItems(
  repo: RepoContent[],
  stats: Record<string, VideoStat>,
): ContentItem[] {
  const known = new Set<string>();
  const items: ContentItem[] = repo.map((entry) => {
    const stat = entry.videoId ? stats[entry.videoId] : undefined;
    if (entry.videoId) known.add(entry.videoId);
    return {
      ...entry,
      channel: channelOf(stat),
      external: false,
      stat,
      thumbnailUrl:
        stat?.thumbnail ??
        entry.thumbnailUrl ??
        (entry.videoId ? youtubeThumbnail(entry.videoId) : '/icon.svg'),
      // The title on YouTube now, which may differ from the prep notes.
      title: stat?.title ?? entry.title,
      views: stat?.views,
    };
  });

  for (const [id, stat] of Object.entries(stats)) {
    if (known.has(id)) continue;
    const type = classifyUpload(stat);
    items.push({
      channel: channelOf(stat),
      date: stat.publishedAt?.slice(0, 10) ?? '',
      external: true,
      href:
        type === 'short'
          ? `https://www.youtube.com/shorts/${id}`
          : `https://www.youtube.com/watch?v=${id}`,
      key: id,
      stat,
      thumbnailUrl: stat.thumbnail ?? youtubeThumbnail(id),
      title: stat.title ?? id,
      type,
      videoId: id,
      views: stat.views,
    });
  }
  scoreOutliers(items);
  return items;
}

/** A typical upload needs this many peers before a score means anything. */
const OUTLIER_MIN_PEERS = 3;
/** From this ratio up, a card marks the upload as an outlier. */
export const OUTLIER_THRESHOLD = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Sets `outlier` on every public upload with numbers, against the median of
 * its own channel and type, so a Short is compared with Shorts and a stream
 * with streams. New uploads score low until their views catch up.
 */
function scoreOutliers(items: ContentItem[]) {
  const groups = new Map<string, ContentItem[]>();
  for (const item of items) {
    if (!item.stat || item.upcoming) continue;
    if (item.stat.privacy && item.stat.privacy !== 'public') continue;
    const key = `${item.channel}:${item.type}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  for (const group of groups.values()) {
    if (group.length < OUTLIER_MIN_PEERS) continue;
    const typical = median(group.map((item) => item.stat?.views ?? 0));
    if (typical <= 0) continue;
    for (const item of group)
      item.outlier = Math.round(((item.stat?.views ?? 0) / typical) * 10) / 10;
  }
}

export interface ContentFilters {
  channel: ChannelFilter;
  missing: boolean;
  sort: VideoSort;
}

export function parseChannel(value: string | undefined): ChannelFilter {
  return value === 'main' || value === 'clips' ? value : 'all';
}

/** Upcoming streams have no transcript yet, so they never count as missing. */
export function isMissingTranscript(item: ContentItem): boolean {
  return !item.upcoming && item.transcriptWords === undefined;
}

export function filterContent(
  items: ContentItem[],
  { channel, missing, sort }: ContentFilters,
  type?: ContentType,
): ContentItem[] {
  return sortVideos(
    items.filter(
      (item) =>
        (!type || item.type === type) &&
        (channel === 'all' || item.channel === channel) &&
        (!missing || isMissingTranscript(item)),
    ),
    sort,
  );
}

/** Keeps the other filters when one changes. Defaults stay out of the URL. */
export function contentHref(
  path: string,
  filters: ContentFilters,
  change: Partial<ContentFilters> = {},
): string {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.channel !== 'all') params.set('channel', next.channel);
  if (next.sort !== 'latest') params.set('sort', next.sort);
  if (next.missing) params.set('transcript', 'missing');
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
