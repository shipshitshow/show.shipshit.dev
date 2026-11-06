import { getTalkingPoints } from '@/lib/livestream-sections';
import type { LivestreamCard } from '@/lib/livestreams-ui';
import { renderInlineMarkdown } from '@/lib/markdown-render';

/** Each segment as a headline and short bullets, readable at a glance during a live. */
export function StreamRundownPanel({ cards }: { cards: LivestreamCard[] }) {
  const segments = getTalkingPoints(cards);

  if (segments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card/40 p-6 text-base text-text-muted">
        No talking points have been selected for this livestream yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <article
          key={`${segment.eyebrow ?? ''}-${segment.title}`}
          className="rounded-xl border border-surface-border bg-surface-card px-6 py-5"
        >
          {segment.eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-red">
              {segment.eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-xl font-semibold text-text-primary">
            {segment.title}
          </h3>
          {segment.points.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-lg leading-snug text-text-secondary marker:text-accent-red">
              {segment.points.map((point, index) => (
                <li key={`${index}-${point.slice(0, 24)}`}>
                  {renderInlineMarkdown(point, `${segment.title}-${index}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
