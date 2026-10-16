import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { TopicDetailClient } from '@/components/livestreams/TopicDetailClient';
import { LivestreamTopicContentSkeleton } from '@/components/PageSkeletons';
import { todayLocalDate } from '@/lib/date';
import {
  buildTopicImageUrl,
  extractSummary,
  isDateSlug,
  isYouTubeVideoId,
  resolveStreamPathForDate,
  UPCOMING_STREAM_SLUG,
} from '@/lib/livestreams-routing';
import {
  getLivestreamArchiveByVideoId,
  getTopicBySlug,
  resolveLivestreamDate,
} from '@/lib/livestreams-store';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';
import { clampText } from '@/lib/text';

function resolveTabSegment(tab: string | undefined): string {
  return tab === 'transcript' ? 'transcript' : 'talking-points';
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (
    isDateSlug(slug) ||
    isYouTubeVideoId(slug) ||
    slug === UPCOMING_STREAM_SLUG
  ) {
    const defaults = buildDefaultMetadata();
    const pageUrl = toAbsoluteUrl(`/livestreams/${encodeURIComponent(slug)}`);

    return {
      ...defaults,
      alternates: {
        canonical: pageUrl,
      },
      description:
        'Livestream replay, talking points, and transcript for Ship Sh!t Show.',
      openGraph: {
        ...defaults.openGraph,
        description:
          'Livestream replay, talking points, and transcript for Ship Sh!t Show.',
        title: 'Ship Sh!t Show — Livestream',
        url: pageUrl,
      },
      title: 'Ship Sh!t Show — Livestream',
      twitter: {
        ...defaults.twitter,
        description:
          'Livestream replay, talking points, and transcript for Ship Sh!t Show.',
        title: 'Ship Sh!t Show — Livestream',
      },
    };
  }

  const { date } = await searchParams;
  const requestedDate = date || todayLocalDate();
  const resolvedDate = await resolveLivestreamDate(requestedDate);
  const topic = await getTopicBySlug(resolvedDate, slug);
  const defaults = buildDefaultMetadata();

  if (!topic) {
    return {
      ...defaults,
      description: 'Livestream topic and show prep for Ship Sh!t Show.',
      title: 'Ship Sh!t Show — Livestream Topic',
    };
  }

  const summary =
    extractSummary(topic.content) ||
    'Livestream topic and show prep for Ship Sh!t Show.';
  const description = clampText(summary, 220);
  const imageUrl = await buildTopicImageUrl(
    topic.slug,
    resolvedDate,
    topic.content,
  );
  const pageUrl = toAbsoluteUrl(
    `/livestreams/${encodeURIComponent(topic.slug)}?date=${encodeURIComponent(resolvedDate)}`,
  );
  const pageTitle = `${topic.title} — Ship Sh!t Show`;

  return {
    ...defaults,
    alternates: {
      canonical: pageUrl,
    },
    description,
    openGraph: {
      ...defaults.openGraph,
      description,
      images: [
        {
          alt: topic.title,
          height: 630,
          url: imageUrl,
          width: 1200,
        },
      ],
      title: pageTitle,
      type: 'article',
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

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const { date, tab } = await searchParams;
  const tabSegment = resolveTabSegment(tab);

  if (isDateSlug(slug)) {
    const canonicalPath = await resolveStreamPathForDate(slug);
    if (canonicalPath !== `/livestreams/${encodeURIComponent(slug)}`) {
      redirect(`${canonicalPath}/${tabSegment}`);
    }
    redirect(`/livestreams/${encodeURIComponent(slug)}/${tabSegment}`);
  }

  if (slug === UPCOMING_STREAM_SLUG) {
    redirect(`/livestreams/${UPCOMING_STREAM_SLUG}/${tabSegment}`);
  }

  if (isYouTubeVideoId(slug)) {
    const archive = await getLivestreamArchiveByVideoId(slug);
    if (archive) {
      redirect(`/livestreams/${encodeURIComponent(slug)}/${tabSegment}`);
    }
    redirect('/livestreams');
  }

  const requestedDate = date || todayLocalDate();
  const resolvedDate = await resolveLivestreamDate(requestedDate);
  const topic = await getTopicBySlug(resolvedDate, slug);
  if (topic) {
    const streamPath = await resolveStreamPathForDate(resolvedDate);
    redirect(`${streamPath}/talking-points#${encodeURIComponent(topic.slug)}`);
  }

  return (
    <Suspense fallback={<LivestreamTopicContentSkeleton />}>
      <TopicDetailClient />
    </Suspense>
  );
}
