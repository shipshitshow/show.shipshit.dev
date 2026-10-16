import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StreamXPostsPanel } from '@/components/livestreams/StreamXPostsPanel';
import {
  isDateSlug,
  resolveStreamDate,
  resolveStreamPathForDate,
} from '@/lib/livestreams-routing';
import {
  getLivestreamArchiveByDate,
  getTopicsForArchive,
} from '@/lib/livestreams-store';
import {
  getLivestreamTitle,
  getVisibleTopics,
  sortTopics,
} from '@/lib/livestreams-ui';
import { getEpisodeXMetrics } from '@/lib/livestreams-x-posts';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';
import { isStorageWritable } from '@/lib/storage-capability-server';

async function resolveFullDate(slug: string): Promise<string> {
  const resolved = await resolveStreamDate(slug);
  if (!resolved) redirect('/livestreams');
  return resolved;
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
  const pageTitle = `${streamTitle} — X Posts · Ship Sh!t Show`;
  const description =
    'Author-post impressions and engagement for this episode.';
  const pageUrl = toAbsoluteUrl(
    `/livestreams/${encodeURIComponent(slug)}/x-posts`,
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

export default async function XPostsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isDateSlug(slug)) {
    const canonicalPath = await resolveStreamPathForDate(slug);
    if (canonicalPath !== `/livestreams/${encodeURIComponent(slug)}`) {
      redirect(`${canonicalPath}/x-posts`);
    }
  }

  const resolvedDate = await resolveFullDate(slug);
  const metrics = await getEpisodeXMetrics(resolvedDate);

  return (
    <StreamXPostsPanel
      initialMetrics={metrics}
      isWritable={isStorageWritable()}
      slug={slug}
    />
  );
}
