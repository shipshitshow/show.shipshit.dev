import { ChevronDown } from 'lucide-react';
import { getTalkingPoints } from '@/lib/livestream-sections';
import type { LivestreamCard } from '@/lib/livestreams-ui';
import { renderInlineMarkdown } from '@/lib/markdown-render';

/**
 * Each segment as a headline and short bullets, readable at a glance during a
 * live. Segments open by default and collapse on click, so a long rundown can
 * be folded down to the headlines.
 */
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
        <details
          key={`${segment.eyebrow ?? ''}-${segment.title}`}
          className="group rounded-xl border border-surface-border bg-surface-card"
          open
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
            <div>
              {segment.eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-red">
                  {segment.eyebrow}
                </p>
              ) : null}
              <h3 className="mt-1 text-xl font-semibold text-text-primary">
                {segment.title}
              </h3>
            </div>
            <ChevronDown
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
            />
          </summary>
          {segment.points.length > 0 ? (
            <ul className="list-disc space-y-1.5 px-6 pb-5 pl-11 text-lg leading-snug text-text-secondary marker:text-accent-red">
              {segment.points.map((point, index) => (
                <li key={`${index}-${point.slice(0, 24)}`}>
                  {renderInlineMarkdown(point, `${segment.title}-${index}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ))}
    </div>
  );
}
