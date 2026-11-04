import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import {
  ARTIFACTS,
  type ArtifactEntry,
  type ArtifactKind,
} from '@/lib/artifacts/registry';

const KIND_LABELS: Record<ArtifactKind, string> = {
  timeline: 'Timeline',
  tweets: 'Tweet slideshow',
};

/** Artifacts as a grid of links, newest first; the whole library by default. */
export function ArtifactCards({
  artifacts: source = ARTIFACTS,
}: {
  artifacts?: ArtifactEntry[];
}) {
  const artifacts = [...source].sort((a, b) =>
    b.updated.localeCompare(a.updated),
  );

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {artifacts.map((artifact) => (
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
  );
}
