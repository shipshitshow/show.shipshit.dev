import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LinkedInMeasurementPanel } from '@/components/livestreams/LinkedInMeasurementPanel';
import { StreamDistributionPanel } from '@/components/livestreams/StreamDistributionPanel';
import { getEpisodeDistribution } from '@/lib/distribution-store';
import { getEpisodeLinkedInMeasurement } from '@/lib/linkedin-measurement';
import {
  isDateSlug,
  isYouTubeVideoId,
  resolveStreamPathForDate,
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
  getLivestreamTitle,
  getVisibleTopics,
  sortTopics,
} from '@/lib/livestreams-ui';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';
import { isStorageWritable } from '@/lib/storage-capability-server';

async function resolveDate(slug: string): Promise<string> {
  if (isDateSlug(slug)) return slug;

  if (slug === UPCOMING_STREAM_SLUG) {
    return resolveUpcomingLivestreamDate();
  }

  if (isYouTubeVideoId(slug)) {
    const archive = await getLivestreamArchiveByVideoId(slug);
    if (!archive) redirect('/livestreams');
    return archive.date;
  }

  redirect('/livestreams');
}

async function resolveFullDate(slug: string): Promise<string> {
  const requestedDate = await resolveDate(slug);
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

  const archive = await getLivestreamArchiveByDate(resolvedDate);
  const topics = await getTopicsForArchive(archive, resolvedDate);
  const visibleTopics = sortTopics(getVisibleTopics(topics, resolvedDate));
  const streamTitle = getLivestreamTitle(
    resolvedDate,
    visibleTopics,
    archive?.title,
  );
  const pageTitle = `${streamTitle} — Distribution · Ship Sh!t Show`;
  const description =
    'Published episode assets, URLs, UTM click-through, and manually recorded LinkedIn post metrics.';
  const pageUrl = toAbsoluteUrl(
    `/livestreams/${encodeURIComponent(slug)}/distribution`,
  );
  const imageUrl = archive?.videoId
    ? await buildYouTubeThumbnailUrl(archive.videoId)
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

export default async function DistributionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isDateSlug(slug)) {
    const canonicalPath = await resolveStreamPathForDate(slug);
    if (canonicalPath !== `/livestreams/${encodeURIComponent(slug)}`) {
      redirect(`${canonicalPath}/distribution`);
    }
  }

  const resolvedDate = await resolveFullDate(slug);
  const [distribution, measurement] = await Promise.all([
    getEpisodeDistribution(resolvedDate),
    getEpisodeLinkedInMeasurement(resolvedDate),
  ]);

  const isWritable = isStorageWritable();

  return (
    <div className="space-y-8">
      <StreamDistributionPanel
        date={resolvedDate}
        initialDistribution={distribution}
        isWritable={isWritable}
      />
      <LinkedInMeasurementPanel
        isWritable={isWritable}
        measurement={measurement}
      />
    </div>
  );
}
