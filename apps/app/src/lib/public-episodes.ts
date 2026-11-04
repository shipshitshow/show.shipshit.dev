import archive from '@/lib/data/public-episodes.json';
import {
  getLatestVideos,
  type PublicVideo,
  youtubeChannelId,
} from '@/lib/youtube-feed';

export type PublicEpisode = PublicVideo & {
  format: 'livestream' | 'short' | 'video';
};

// YouTube Shorts are vertical or square and run up to three minutes
// (https://support.google.com/youtube/answer/15424877). The Data API exposes
// no Shorts flag, so duration is the only signal; the channel's long-form
// uploads are far longer than this.
export const SHORT_MAX_SECONDS = 180;

export function parseIsoDuration(iso: unknown): number {
  if (typeof iso !== 'string') return 0;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return (
    (Number(match[1]) || 0) * 3600 +
    (Number(match[2]) || 0) * 60 +
    (Number(match[3]) || 0)
  );
}

type ArchiveEntry = Pick<
  PublicEpisode,
  'id' | 'title' | 'publishedAt' | 'format'
>;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function episode(entry: ArchiveEntry): PublicEpisode {
  return {
    ...entry,
    thumbnailUrl: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${entry.id}`,
  };
}

// A completed stream's liveBroadcastContent becomes "none". Its actual start
// time remains the evidence that distinguishes a replay from an edited upload.
export function parsePublicVideoDetails(
  payload: unknown,
  channelId: string,
): PublicEpisode[] {
  const items = asRecord(payload).items;
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    const video = asRecord(item);
    const snippet = asRecord(video.snippet);
    const status = asRecord(video.status);
    const live = asRecord(video.liveStreamingDetails);
    const seconds = parseIsoDuration(asRecord(video.contentDetails).duration);
    if (
      status.privacyStatus !== 'public' ||
      snippet.channelId !== channelId ||
      typeof video.id !== 'string' ||
      !/^[\w-]{11}$/.test(video.id) ||
      typeof snippet.title !== 'string' ||
      !snippet.title.trim() ||
      typeof snippet.publishedAt !== 'string' ||
      !Number.isFinite(Date.parse(snippet.publishedAt))
    ) {
      return [];
    }

    const isStream =
      typeof live.actualStartTime === 'string' ||
      typeof live.scheduledStartTime === 'string' ||
      ['live', 'upcoming'].includes(String(snippet.liveBroadcastContent));
    const isShort = !isStream && seconds > 0 && seconds <= SHORT_MAX_SECONDS;
    return [
      episode({
        format: isStream ? 'livestream' : isShort ? 'short' : 'video',
        id: video.id,
        publishedAt: snippet.publishedAt,
        title: snippet.title,
      }),
    ];
  });
}

export function groupPublicEpisodes(
  feed: PublicVideo[],
  known: ArchiveEntry[],
  details: PublicEpisode[] | null,
): {
  livestreams: PublicEpisode[];
  shorts: PublicEpisode[];
  videos: PublicEpisode[];
} {
  const entries = new Map(known.map((entry) => [entry.id, episode(entry)]));
  for (const video of feed) {
    const existing = entries.get(video.id);
    // RSS alone cannot classify a new ID. Keep it out of both sections until
    // metadata or the archive identifies it, rather than guessing from titles.
    if (existing) entries.set(video.id, { ...existing, ...video });
  }

  const candidates = new Set([
    ...entries.keys(),
    ...feed.map((video) => video.id),
  ]);
  // A successful API response is authoritative, including removed/private IDs.
  const publicEntries =
    details === null
      ? [...entries.values()]
      : details.filter((entry) => candidates.has(entry.id));
  const sorted = [
    ...new Map(publicEntries.map((entry) => [entry.id, entry])).values(),
  ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return {
    livestreams: sorted.filter((entry) => entry.format === 'livestream'),
    shorts: sorted.filter((entry) => entry.format === 'short'),
    videos: sorted.filter((entry) => entry.format === 'video'),
  };
}

async function fetchPublicVideoDetails(
  ids: string[],
  channelId: string,
): Promise<PublicEpisode[] | null> {
  if (!ids.length) return [];
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    return null;
  }

  try {
    const { getAccessToken, getChannelConfigs } = await import(
      '@/lib/youtube/token'
    );
    const channels = await getChannelConfigs();
    const main = channels.find((channel) => channel.id === channelId);
    if (!main) return null;
    const token = await getAccessToken(main);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set(
      'part',
      'snippet,status,liveStreamingDetails,contentDetails',
    );
    url.searchParams.set('id', ids.slice(0, 50).join(','));
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!Array.isArray(asRecord(payload).items)) return null;
    return parsePublicVideoDetails(payload, channelId);
  } catch {
    return null;
  }
}

export async function getPublicEpisodes() {
  const channelId = youtubeChannelId();
  const known: ArchiveEntry[] =
    channelId === archive.channelId
      ? archive.items.filter(
          (item): item is ArchiveEntry =>
            (item.format === 'livestream' || item.format === 'video') &&
            Boolean(item.publishedAt),
        )
      : [];
  const feed = await getLatestVideos();
  const ids = [
    ...new Set([
      ...feed.map((video) => video.id),
      ...known.map((video) => video.id),
    ]),
  ];
  const details = await fetchPublicVideoDetails(ids, channelId);
  return groupPublicEpisodes(feed, known, details);
}
