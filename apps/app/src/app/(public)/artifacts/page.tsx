import { BRAND } from '@shipshitshow/ui/brand';
import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { ARTIFACTS, type ArtifactKind } from '@/lib/artifacts/registry';
import { buildDefaultMetadata } from '@/lib/site';

const KIND_LABELS: Record<ArtifactKind, string> = {
  timeline: 'Timeline',
  tweets: 'Tweet slideshow',
};

export const metadata: Metadata = {
  ...buildDefaultMetadata(),
  description:
    'Assets made to show during the Ship Sh!t Show livestream: timelines, tweet slideshows and more.',
  title: `Artifacts library — ${BRAND.identity.show_name}`,
};

export default function ArtifactsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-3 text-lg font-bold text-text-primary"
      >
        <BrandMark size={32} className="text-accent-red" />
        {BRAND.identity.show_name}
      </Link>
      <h1 className="mt-10 text-balance text-4xl font-bold text-text-primary md:text-5xl">
        Artifacts library
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-text-secondary">
        Assets we made to show during the livestream. Each one lists its sources
        and how far we checked them.
      </p>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {ARTIFACTS.map((artifact) => (
          <li key={artifact.slug}>
            <Link
              href={`/artifacts/${artifact.slug}`}
              className="flex h-full flex-col gap-3 rounded-lg border border-surface-border bg-surface-card p-5 hover:border-text-muted"
            >
              <span className="font-mono text-xs uppercase tracking-wide text-text-muted">
                {KIND_LABELS[artifact.kind]} · Updated {artifact.updated}
              </span>
              <span className="flex items-center justify-between gap-3 text-xl font-bold text-text-primary">
                {artifact.title}
                <ArrowUpRight aria-hidden="true" className="size-5 shrink-0" />
              </span>
              <span className="text-base text-text-secondary">
                {artifact.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
