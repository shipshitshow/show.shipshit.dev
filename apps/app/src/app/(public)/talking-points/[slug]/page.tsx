import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PublicTalkingPointsTabs } from '@/components/livestreams/PublicTalkingPointsTabs';
import { StreamPromptsPanel } from '@/components/livestreams/StreamPromptsPanel';
import { StreamResourcesPanel } from '@/components/livestreams/StreamResourcesPanel';
import { StreamRundownPanel } from '@/components/livestreams/StreamRundownPanel';
import {
  buildTopicImageUrl,
  isDateSlug,
  isYouTubeVideoId,
  resolveUpcomingLivestreamDate,
  UPCOMING_STREAM_SLUG,
} from '@/lib/livestreams-routing';
import {
  getLivestreamArchiveByDate,
  getLivestreamArchiveByVideoId,
  getTopicsForArchive,
  listAvailableLivestreamDates,
  listLivestreamArchive,
  resolveLivestreamDate,
} from '@/lib/livestreams-store';
import {
  buildCards,
  getEffectiveStatus,
  getLivestreamTitle,
  getVisibleTopics,
  sortTopics,
} from '@/lib/livestreams-ui';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';

export const revalidate = 60;

async function resolveDate(slug: string): Promise<string | null> {
  if (isDateSlug(slug)) return slug;

  if (slug === UPCOMING_STREAM_SLUG) {
    return resolveUpcomingLivestreamDate();
  }

  if (isYouTubeVideoId(slug)) {
    const archive = await getLivestreamArchiveByVideoId(slug);
    return archive?.date ?? null;
  }

  return null;
}

async function resolveFullDate(slug: string): Promise<string | null> {
  const requestedDate = await resolveDate(slug);
  if (!requestedDate) return null;

  const [topicDates, livestreams] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
  ]);
  const availableDates = Array.from(
    new Set([...topicDates, ...livestreams.map((item) => item.date)]),
  ).sort((a, b) => b.localeCompare(a));

  return availableDates.includes(requestedDate)
    ? requestedDate
    : await resolveLivestreamDate(requestedDate);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolvedDate = await resolveFullDate(slug);
  const defaults = buildDefaultMetadata();

  if (!resolvedDate) {
    return {
      ...defaults,
      description: 'Public talking points for Ship Sh!t Show.',
      title: 'Ship Sh!t Show - Talking Points',
    };
  }

  const archive = await getLivestreamArchiveByDate(resolvedDate);
  const topics = await getTopicsForArchive(archive, resolvedDate);
  const visibleTopics = sortTopics(getVisibleTopics(topics, resolvedDate));
  const streamTitle = getLivestreamTitle(
    resolvedDate,
    visibleTopics,
    archive?.title,
  );
  const pageTitle = `${streamTitle} - Talking Points`;
  const description = 'Public livestream talking points for Ship Sh!t Show.';
  const pageUrl = toAbsoluteUrl(`/talking-points/${encodeURIComponent(slug)}`);
  const primaryTopic = visibleTopics[0];
  const imageUrl = archive?.videoId
    ? await buildYouTubeThumbnailUrl(archive.videoId)
    : primaryTopic
      ? await buildTopicImageUrl(
          primaryTopic.slug,
          primaryTopic.date,
          primaryTopic.content,
        )
      : toAbsoluteUrl('/api/og');

  return {
    ...defaults,
    alternates: { canonical: pageUrl },
    description,
    openGraph: {
      ...defaults.openGraph,
      description,
      images: [{ alt: streamTitle, height: 630, url: imageUrl, width: 1200 }],
      title: pageTitle,
      url: pageUrl,
    },
    title: pageTitle,
    twitter: {
      ...defaults.twitter,
      description,
      images: [imageUrl],
      title: pageTitle,
    },
  };
}

export default async function PublicTalkingPointsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === UPCOMING_STREAM_SLUG) {
    redirect(
      `/talking-points/${encodeURIComponent(await resolveUpcomingLivestreamDate())}`,
    );
  }

  const resolvedDate = await resolveFullDate(slug);
  if (!resolvedDate) notFound();

  const archive = await getLivestreamArchiveByDate(resolvedDate);
  const topics = await getTopicsForArchive(archive, resolvedDate);
  const visibleTopics = sortTopics(getVisibleTopics(topics, resolvedDate));
  const effectiveStatus = getEffectiveStatus(resolvedDate);
  const cards = await buildCards(visibleTopics, effectiveStatus);

  return (
    <main className="min-h-screen bg-surface px-5 py-6 text-text-primary md:px-8 md:py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-red">
            Ship Sh!t Show
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">
            Talking Points
          </h1>
        </div>
        <PublicTalkingPointsTabs
          prompts={<StreamPromptsPanel cards={cards} />}
          ressources={<StreamResourcesPanel cards={cards} />}
          talkingPoints={<StreamRundownPanel cards={cards} />}
        />
      </div>
    </main>
  );
}
