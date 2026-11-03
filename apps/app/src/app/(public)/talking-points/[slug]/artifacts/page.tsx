import { BRAND } from '@shipshitshow/ui/brand';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtifactCards } from '@/components/artifacts/ArtifactCards';
import { BrandMark } from '@/components/BrandMark';
import { getArtifactsForStream } from '@/lib/artifacts/registry';
import { isDateSlug, resolveStreamDate } from '@/lib/livestreams-routing';
import {
  getLivestreamArchiveByDate,
  getTopicsForArchive,
} from '@/lib/livestreams-store';
import {
  getLivestreamTitle,
  getVisibleTopics,
  sortTopics,
} from '@/lib/livestreams-ui';
import { buildDefaultMetadata } from '@/lib/site';

export const revalidate = 60;

async function loadStream(slug: string) {
  // A dated slug is used as is, so a stream without topics yet still shows
  // the artifacts attached to its date.
  const date = isDateSlug(slug) ? slug : await resolveStreamDate(slug);
  if (!date) return null;
  const archive = await getLivestreamArchiveByDate(date);
  const topics = sortTopics(
    getVisibleTopics(await getTopicsForArchive(archive, date), date),
  );
  return { date, title: getLivestreamTitle(date, topics, archive?.title) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stream = await loadStream(slug);
  return {
    ...buildDefaultMetadata(),
    description: 'Artifacts we show on this Ship Sh!t Show livestream.',
    title: stream
      ? `${stream.title} - Artifacts`
      : `Artifacts — ${BRAND.identity.show_name}`,
  };
}

export default async function StreamArtifactsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stream = await loadStream(slug);
  if (!stream) notFound();

  const artifacts = getArtifactsForStream(stream.date);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 md:py-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/talking-points/${encodeURIComponent(slug)}`}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Talking points
        </Link>
        <span className="inline-flex items-center gap-3 text-base font-bold text-text-primary">
          <BrandMark size={28} className="text-accent-red" />
          {BRAND.identity.show_name}
        </span>
      </div>
      <p className="mt-10 font-mono text-sm uppercase tracking-wide text-text-muted">
        {stream.title}
      </p>
      <h1 className="mt-2 text-balance text-4xl font-bold text-text-primary md:text-5xl">
        Artifacts for this livestream
      </h1>
      {artifacts.length > 0 ? (
        <div className="mt-10">
          <ArtifactCards artifacts={artifacts} />
        </div>
      ) : (
        <p className="mt-6 max-w-2xl text-lg text-text-secondary">
          No artifacts are attached to this livestream yet.
        </p>
      )}
      <p className="mt-10 text-base text-text-secondary">
        <Link
          href="/artifacts"
          className="text-text-primary underline decoration-surface-border underline-offset-4 hover:decoration-accent-red"
        >
          See the whole artifacts library
        </Link>
      </p>
    </main>
  );
}
