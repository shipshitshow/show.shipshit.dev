'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { TweetCarousel } from '@/components/livestreams/TweetCarousel';
import type { TalkingPointSegment } from '@/lib/livestream-sections';
import { renderInlineMarkdown } from '@/lib/markdown-render';
import type { TweetSlide } from '@/lib/tweet-slider';

function segmentKey(segment: TalkingPointSegment): string {
  return `${segment.eyebrow ?? ''}-${segment.title}`;
}

/**
 * The rundown as collapsible segment cards. Every segment starts open; the
 * host can fold the ones already covered or fold all and open one at a time.
 */
export function RundownSegments({
  segments,
  slides,
}: {
  segments: TalkingPointSegment[];
  slides: Record<string, TweetSlide>;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const keys = segments.map(segmentKey);
  const allCollapsed = keys.every((key) => collapsed.has(key));

  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(keys))}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-text-muted hover:text-text-primary"
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>
      {segments.map((segment) => {
        const key = segmentKey(segment);
        const open = !collapsed.has(key);
        const panelId = `segment-${keys.indexOf(key)}`;
        const segmentSlides = segment.tweets.map(
          (entry): TweetSlide =>
            slides[entry.id] ?? { ...entry, quoted: null, tweet: null },
        );
        return (
          <article
            key={key}
            className="rounded-xl border border-surface-border bg-surface-card"
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="min-w-0">
                {segment.eyebrow ? (
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-red">
                    {segment.eyebrow}
                  </span>
                ) : null}
                <h3 className="mt-1 text-xl font-semibold text-text-primary">
                  {segment.title}
                </h3>
              </span>
              <ChevronDown
                className={`mt-1 size-5 shrink-0 text-text-muted transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>
            {open ? (
              <div id={panelId} className="px-6 pb-5">
                {segment.points.length > 0 ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-lg leading-snug text-text-secondary marker:text-accent-red">
                    {segment.points.map((point, index) => (
                      <li key={`${index}-${point.slice(0, 24)}`}>
                        {renderInlineMarkdown(
                          point,
                          `${segment.title}-${index}`,
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <TweetCarousel slides={segmentSlides} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
