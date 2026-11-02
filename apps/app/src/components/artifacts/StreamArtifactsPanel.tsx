import Link from 'next/link';
import { ArtifactCards } from '@/components/artifacts/ArtifactCards';

/** The Artifacts tab of a livestream's public notes. */
export function StreamArtifactsPanel() {
  return (
    <div className="space-y-4">
      <p className="text-base text-text-secondary">
        Timelines and tweet slideshows we made to show on the livestream.{' '}
        <Link
          href="/artifacts"
          className="text-text-primary underline decoration-surface-border underline-offset-4 hover:decoration-accent-red"
        >
          See the whole library
        </Link>
        .
      </p>
      <ArtifactCards />
    </div>
  );
}
