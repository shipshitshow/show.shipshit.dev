import type { QuotedTweet, Tweet } from 'react-tweet/api';
import { parseSections } from '@/lib/markdown-render';

const STATUS_URL =
  /https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(\w+)\/status(?:es)?\/(\d+)[^\s)\]|>"]*/g;
const NOTE_MAX_LENGTH = 220;

/** One tweet the hosts plan to show, in run-of-show order. */
export interface TweetDeckEntry {
  handle: string;
  id: string;
  /** Producer-only context taken from the markdown line that links it. */
  note: string;
  topicTitle: string;
  url: string;
}

export interface TweetSlideMedia {
  alt: string;
  height: number;
  kind: 'photo' | 'video' | 'gif';
  posterUrl: string;
  videoUrl: string | null;
  width: number;
}

export interface TweetSlideBody {
  author: {
    avatarUrl: string;
    handle: string;
    name: string;
    verified: boolean;
  };
  createdAt: string;
  likes: number | null;
  media: TweetSlideMedia[];
  replies: number | null;
  text: string;
  truncated: boolean;
}

export interface TweetSlide extends TweetDeckEntry {
  quoted: TweetSlideBody | null;
  tweet: TweetSlideBody | null;
}

interface DeckSource {
  content: string;
  title: string;
}

/**
 * Collects tweet links from the episode's topic notes. A topic with a
 * `## Tweets` section uses only that section, so producers can curate the
 * on-screen list; otherwise every X status link in the notes is used.
 */
export function buildTweetDeck(topics: DeckSource[]): TweetDeckEntry[] {
  const seen = new Set<string>();
  const deck: TweetDeckEntry[] = [];

  for (const topic of topics) {
    const curated = parseSections(topic.content).filter(({ title }) =>
      title.toLowerCase().startsWith('tweets'),
    );
    const bodies =
      curated.length > 0 ? curated.map(({ body }) => body) : [topic.content];

    for (const line of bodies.join('\n').split('\n')) {
      for (const match of line.matchAll(STATUS_URL)) {
        const [, handle, id] = match;
        if (seen.has(id)) continue;
        seen.add(id);
        deck.push({
          handle,
          id,
          note: noteFromLine(line, match[0]),
          topicTitle: topic.title,
          url: `https://x.com/${handle}/status/${id}`,
        });
      }
    }
  }

  return deck;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function noteFromLine(line: string, url: string): string {
  const trimmed = line.trim();
  let note: string;

  if (trimmed.startsWith('|')) {
    const cells = trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    const others = cells.filter((cell) => !cell.includes(url));
    note = stripMarkdown(others.join(' · '));
  } else {
    note = stripMarkdown(
      trimmed.replace(/^(?:[-*+]|\d+\.)\s+/, '').replace(/^>\s*/, ''),
    )
      .replace(/^[—–:\-\s]+|[—–:\-\s]+$/g, '')
      .trim();
  }

  return note.length > NOTE_MAX_LENGTH
    ? `${note.slice(0, NOTE_MAX_LENGTH - 1).trimEnd()}…`
    : note;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * The visible tweet text: the display range only (no reply mentions or
 * trailing media links), with t.co links expanded to their display form.
 */
export function formatTweetText(tweet: Tweet | QuotedTweet): string {
  const [start, end] = tweet.display_text_range ?? [0, tweet.text.length];
  let text = Array.from(tweet.text).slice(start, end).join('');
  const quotedId = 'quoted_tweet' in tweet ? tweet.quoted_tweet?.id_str : null;

  for (const entity of tweet.entities?.urls ?? []) {
    const isQuoteLink =
      quotedId !== null &&
      quotedId !== undefined &&
      entity.expanded_url.includes(`/status/${quotedId}`);
    text = text.replace(entity.url, isQuoteLink ? '' : entity.display_url);
  }
  for (const entity of tweet.entities?.media ?? []) {
    text = text.replace(entity.url, '');
  }

  return decodeEntities(text).trim();
}

function bestMp4(
  variants: { bitrate?: number; content_type: string; url: string }[],
): string | null {
  const mp4 = variants
    .filter((variant) => variant.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return mp4[0]?.url ?? null;
}

function toSlideBody(tweet: Tweet | QuotedTweet): TweetSlideBody {
  const media: TweetSlideMedia[] = (tweet.mediaDetails ?? []).map((item) => ({
    alt: item.type === 'photo' ? (item.ext_alt_text ?? '') : '',
    height: item.original_info.height,
    kind:
      item.type === 'animated_gif'
        ? 'gif'
        : item.type === 'video'
          ? 'video'
          : 'photo',
    posterUrl: item.media_url_https,
    videoUrl: item.type === 'photo' ? null : bestMp4(item.video_info.variants),
    width: item.original_info.width,
  }));

  return {
    author: {
      avatarUrl: tweet.user.profile_image_url_https.replace(
        '_normal.',
        '_400x400.',
      ),
      handle: tweet.user.screen_name,
      name: tweet.user.name,
      verified: Boolean(tweet.user.verified || tweet.user.is_blue_verified),
    },
    createdAt: tweet.created_at,
    likes: tweet.favorite_count ?? null,
    media,
    replies:
      'conversation_count' in tweet
        ? tweet.conversation_count
        : (tweet.reply_count ?? null),
    text: formatTweetText(tweet),
    truncated: Boolean(tweet.note_tweet),
  };
}

type TweetFetcher = (id: string) => Promise<Tweet | undefined>;

/** Loads every tweet in parallel; a tweet that fails keeps its note. */
export async function loadTweetSlides(
  deck: TweetDeckEntry[],
  fetchTweet: TweetFetcher,
): Promise<TweetSlide[]> {
  return Promise.all(
    deck.map(async (entry) => {
      try {
        const tweet = await fetchTweet(entry.id);
        if (!tweet) return { ...entry, quoted: null, tweet: null };
        return {
          ...entry,
          quoted: tweet.quoted_tweet ? toSlideBody(tweet.quoted_tweet) : null,
          tweet: toSlideBody(tweet),
        };
      } catch {
        return { ...entry, quoted: null, tweet: null };
      }
    }),
  );
}
