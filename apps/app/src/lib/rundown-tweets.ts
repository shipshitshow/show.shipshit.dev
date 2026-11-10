import { getTweet } from 'react-tweet/api';
import type { TalkingPointSegment } from '@/lib/livestream-sections';
import { logError } from '@/lib/logger';
import { loadTweetSlides, type TweetSlide } from '@/lib/tweet-slider';

async function fetchTweet(id: string) {
  try {
    return await getTweet(id, { next: { revalidate: 600 } } as RequestInit);
  } catch (error) {
    logError('rundown_tweet_fetch_failed', error, { id });
    throw error;
  }
}

/**
 * Loads every tweet the rundown links, keyed by tweet id. A tweet that cannot
 * be loaded stays in the map without a body so its slide still links to X.
 */
export async function loadRundownSlides(
  segments: TalkingPointSegment[],
): Promise<Record<string, TweetSlide>> {
  const slides = await loadTweetSlides(
    segments.flatMap((segment) => segment.tweets),
    fetchTweet,
  );
  return Object.fromEntries(slides.map((slide) => [slide.id, slide]));
}
