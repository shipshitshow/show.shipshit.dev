import Link from 'next/link';
import { ArtifactCards } from '@/components/artifacts/ArtifactCards';
import { getArtifactsForStream } from '@/lib/artifacts/registry';

const LINK_CLASS =
  'text-text-primary underline decoration-surface-border underline-offset-4 hover:decoration-accent-red';

/** The Artifacts tab of a livestream's public notes. */
export function StreamArtifactsPanel({
  date,
  slug,
}: {
  date: string;
  slug: string;
}) {
  const artifacts = getArtifactsForStream(date);

  return (
    <div className="space-y-4">
      <p className="text-base text-text-secondary">
        {artifacts.length > 0
          ? 'Timelines and tweet slideshows we show on this livestream. '
          : 'No artifacts are attached to this livestream yet. '}
        <Link
          href={`/talking-points/${encodeURIComponent(slug)}/artifacts`}
          className={LINK_CLASS}
        >
          Open the artifacts view
        </Link>{' '}
        or{' '}
        <Link href="/artifacts" className={LINK_CLASS}>
          see the whole library
        </Link>
        .
      </p>
      {artifacts.length > 0 ? <ArtifactCards artifacts={artifacts} /> : null}
    </div>
  );
}
