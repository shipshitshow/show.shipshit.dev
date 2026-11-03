import { BRAND } from '@shipshitshow/ui/brand';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTweet } from 'react-tweet/api';
import { TimelineArtifact } from '@/components/artifacts/TimelineArtifact';
import { BrandMark } from '@/components/BrandMark';
import { TweetSlider } from '@/components/livestreams/TweetSlider';
import {
  CVE_INDEX,
  TIMELINE_EVENTS,
  TWEET_DECK,
} from '@/lib/artifacts/agent-security-2026-10';
import { ARTIFACTS, getArtifact } from '@/lib/artifacts/registry';
import { logError } from '@/lib/logger';
import { buildDefaultMetadata } from '@/lib/site';
import { loadTweetSlides } from '@/lib/tweet-slider';

export const revalidate = 600;

export function generateStaticParams() {
  return ARTIFACTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artifact = getArtifact(slug);
  if (!artifact) return { title: `Not found — ${BRAND.identity.show_name}` };
  return {
    ...buildDefaultMetadata(),
    description: artifact.summary,
    title: `${artifact.title} — ${BRAND.identity.show_name}`,
  };
}

async function fetchTweet(id: string) {
  try {
    return await getTweet(id, { next: { revalidate: 600 } } as RequestInit);
  } catch (error) {
    logError('artifact_tweet_fetch_failed', error, { id });
    throw error;
  }
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = getArtifact(slug);
  if (!artifact) notFound();

  if (artifact.kind === 'tweets') {
    const slides = await loadTweetSlides(TWEET_DECK, fetchTweet);
    return (
      <TweetSlider
        backHref="/artifacts"
        date={artifact.slug}
        slides={slides}
        title={artifact.title}
      />
    );
  }

  const slideshow = ARTIFACTS.find(({ kind }) => kind === 'tweets');

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 md:py-16">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/artifacts"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Artifacts library
        </Link>
        <span className="inline-flex items-center gap-3 text-base font-bold text-text-primary">
          <BrandMark size={28} className="text-accent-red" />
          {BRAND.identity.show_name}
        </span>
      </div>
      <p className="mt-10 font-mono text-sm uppercase tracking-wide text-text-muted">
        Compiled 2 Nov 2026
      </p>
      <h1 className="mt-2 text-balance text-4xl font-bold text-text-primary md:text-5xl">
        Bot swarm timeline: CVEs and what followed
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-text-secondary">
        PHP2Shell, the trojanized Claude Code extension on Cursor's marketplace
        and the AI-agent intrusions reported around them, in date order. Every
        entry lists its sources and how far we could check it.
      </p>
      <div className="mt-10">
        <TimelineArtifact
          cves={CVE_INDEX}
          events={TIMELINE_EVENTS}
          slideshowHref={
            slideshow ? `/artifacts/${slideshow.slug}` : '/artifacts'
          }
        />
      </div>
      <footer className="mt-16 flex items-center justify-between gap-4 border-t border-surface-border pt-6">
        <p className="text-sm text-text-muted">
          {BRAND.identity.show_name} · {BRAND.identity.baseline}
        </p>
        <BrandMark size={48} className="text-accent-red" />
      </footer>
    </main>
  );
}
