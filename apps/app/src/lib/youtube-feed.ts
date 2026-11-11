import { MAIN_CHANNEL_ID } from '@/lib/youtube/channels';

export type PublicVideo = {
  id: string;
  publishedAt: string;
  thumbnailUrl: string;
  title: string;
  url: string;
};

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

export function youtubeChannelId(): string {
  const configured = process.env.YOUTUBE_CHANNEL_ID_MAIN?.trim();
  return configured && configured.length > 0 ? configured : MAIN_CHANNEL_ID;
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'");
}

function readTag(entry: string, tag: string): string | null {
  const cdata = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`,
  );
  const plain = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  const value = (entry.match(cdata) ?? entry.match(plain))?.[1]?.trim();
  return value ? decodeXml(value) : null;
}

export function parseYoutubeFeed(xml: string): PublicVideo[] {
  const videos: PublicVideo[] = [];

  for (const entry of xml.split('<entry>').slice(1)) {
    const id = readTag(entry, 'yt:videoId');
    const title = readTag(entry, 'title');
    const publishedAt = readTag(entry, 'published');
    if (!id || !title || !publishedAt) {
      continue;
    }

    videos.push({
      id,
      publishedAt,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  }

  return videos;
}

export async function getLatestVideos(): Promise<PublicVideo[]> {
  try {
    const response = await fetch(`${FEED_URL}${youtubeChannelId()}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return [];
    }
    return parseYoutubeFeed(await response.text());
  } catch {
    return [];
  }
}
