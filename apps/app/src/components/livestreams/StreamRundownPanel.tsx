import { RundownSegments } from '@/components/livestreams/RundownSegments';
import { getTalkingPoints } from '@/lib/livestream-sections';
import type { LivestreamCard } from '@/lib/livestreams-ui';
import { loadRundownSlides } from '@/lib/rundown-tweets';

/**
 * Each segment as a collapsible headline with short bullets and the tweets it
 * links as a slider, readable at a glance during a live.
 */
export async function StreamRundownPanel({
  cards,
}: {
  cards: LivestreamCard[];
}) {
  const segments = getTalkingPoints(cards);

  if (segments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card/40 p-6 text-base text-text-muted">
        No talking points have been selected for this livestream yet.
      </div>
    );
  }

  return (
    <RundownSegments
      segments={segments}
      slides={await loadRundownSlides(segments)}
    />
  );
}
