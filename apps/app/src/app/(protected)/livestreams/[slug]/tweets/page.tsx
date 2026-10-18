import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTweet } from 'react-tweet/api';
import { TweetSlider } from '@/components/livestreams/TweetSlider';
import { resolveStreamDate } from '@/lib/livestreams-routing';
import {
  getLivestreamArchiveByDate,
  getTopicsForArchive,
} from '@/lib/livestreams-store';
import {
  getLivestreamTitle,
  getVisibleTopics,
  sortTopics,
} from '@/lib/livestreams-ui';
import { logError } from '@/lib/logger';
import { buildTweetDeck, loadTweetSlides } from '@/lib/tweet-slider';

export const metadata: Metadata = {
  description: 'Full-screen tweet slider for the livestream.',
  title: 'Tweets - Ship Sh!t Show',
};

async function fetchTweet(id: string) {
  try {
    return await getTweet(id, { next: { revalidate: 600 } } as RequestInit);
  } catch (error) {
    logError('tweet_slider_fetch_failed', error, { id });
    throw error;
  }
}

export default async function TweetSliderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const date = await resolveStreamDate(slug);
  if (!date) redirect('/livestreams');

  const archive = await getLivestreamArchiveByDate(date);
  const topics = sortTopics(
    getVisibleTopics(await getTopicsForArchive(archive, date), date),
  );
  const slides = await loadTweetSlides(buildTweetDeck(topics), fetchTweet);

  return (
    <TweetSlider
      backHref={`/livestreams/${encodeURIComponent(slug)}`}
      date={date}
      slides={slides}
      title={getLivestreamTitle(date, topics, archive?.title)}
    />
  );
}
