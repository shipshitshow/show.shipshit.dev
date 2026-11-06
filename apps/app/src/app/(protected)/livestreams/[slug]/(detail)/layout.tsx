import { notFound } from 'next/navigation';
import { CollapsibleSidebar } from '@/components/livestreams/CollapsibleSidebar';
import { LivestreamTabsClient } from '@/components/livestreams/LivestreamTabsClient';
import { StreamInfoSidebar } from '@/components/livestreams/StreamInfoSidebar';
import {
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
  getRestreamUrl,
  getVisibleTopics,
  getYoutubeUrl,
  isPastDate,
  sortTopics,
} from '@/lib/livestreams-ui';
import { fetchVideoStats } from '@/lib/livestreams-youtube';
import { analyzeTranscriptScorecard } from '@/lib/transcript-scorecard';

async function resolveSlug(slug: string): Promise<{
  requestedDate: string;
  streamSlug: string;
}> {
  if (isDateSlug(slug)) {
    return { requestedDate: slug, streamSlug: slug };
  }

  if (slug === UPCOMING_STREAM_SLUG) {
    const date = await resolveUpcomingLivestreamDate();
    return { requestedDate: date, streamSlug: UPCOMING_STREAM_SLUG };
  }

  if (isYouTubeVideoId(slug)) {
    const archive = await getLivestreamArchiveByVideoId(slug);
    if (!archive) notFound();
    return { requestedDate: archive.date, streamSlug: slug };
  }

  notFound();
}

export default async function LivestreamDetailLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const { requestedDate, streamSlug } = await resolveSlug(slug);

  const [topicDates, livestreams] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
  ]);
  const availableDates = Array.from(
    new Set([...topicDates, ...livestreams.map((item) => item.date)]),
  ).sort((a, b) => b.localeCompare(a));
  const resolvedDate = availableDates.includes(requestedDate)
    ? requestedDate
    : await resolveLivestreamDate(requestedDate);

  const archive = await getLivestreamArchiveByDate(resolvedDate);
  const topics = await getTopicsForArchive(archive, resolvedDate);
  const visibleTopics = sortTopics(getVisibleTopics(topics, resolvedDate));
  const effectiveStatus = getEffectiveStatus(resolvedDate);
  const videoId = archive?.videoId ?? null;

  const [cards, videoStats] = await Promise.all([
    buildCards(visibleTopics, effectiveStatus),
    videoId && isPastDate(resolvedDate)
      ? fetchVideoStats(videoId)
      : Promise.resolve(null),
  ]);

  const title = getLivestreamTitle(resolvedDate, visibleTopics, archive?.title);
  const youtubeUrl = getYoutubeUrl(visibleTopics, archive?.youtubeUrl);
  const restreamUrl = getRestreamUrl(visibleTopics);
  const thumbnailUrl = cards[0]?.thumbnailUrl ?? null;
  const publicShareUrl = `/talking-points/${encodeURIComponent(streamSlug)}`;
  const transcriptScorecard = analyzeTranscriptScorecard(archive?.transcript);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 p-6 lg:flex-row lg:items-start">
      <main className="min-w-0 flex-1 space-y-6">
        <section className="overflow-hidden rounded-xl border border-surface-border bg-surface/30">
          <LivestreamTabsClient
            date={resolvedDate}
            hasTranscript={Boolean(archive?.transcript)}
            streamSlug={streamSlug}
          />
          <div className="p-5">{children}</div>
        </section>
      </main>
      <CollapsibleSidebar>
        <StreamInfoSidebar
          cards={cards}
          commentCount={videoStats?.commentCount ?? null}
          effectiveStatus={effectiveStatus}
          publicShareUrl={publicShareUrl}
          resolvedDate={resolvedDate}
          restreamUrl={restreamUrl}
          scorecard={transcriptScorecard}
          thumbnailUrl={thumbnailUrl}
          title={title}
          viewCount={videoStats?.viewCount ?? null}
          youtubeUrl={youtubeUrl}
        />
      </CollapsibleSidebar>
    </div>
  );
}
