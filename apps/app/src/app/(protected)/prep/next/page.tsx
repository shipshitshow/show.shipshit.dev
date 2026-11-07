import type { TopicStatus } from '@shipshitshow/types';
import { Button, cn } from '@shipshitshow/ui';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { livestreamPath } from '@/lib/app-navigation';
import { loadNextShow } from '@/lib/content-library-server';
import { formatLivestreamDate } from '@/lib/livestreams-ui';

export const metadata: Metadata = { title: 'Next show - Ship Sh*t Show' };

/** The prep pages of a show, in the order the week runs. */
const PREP_TABS = [
  { label: 'Talking points', tab: 'talking-points' },
  { label: 'Resources', tab: 'resources' },
  { label: 'Posts', tab: 'posts' },
];

const STATUS: Record<TopicStatus, { dot: string; label: string }> = {
  backlog: { dot: 'bg-text-muted', label: 'Backlog' },
  done: { dot: 'bg-green-400', label: 'Done' },
  draft: { dot: 'bg-text-muted/50', label: 'Draft' },
  in_progress: { dot: 'bg-accent-red', label: 'In progress' },
};

const ORDER: TopicStatus[] = ['in_progress', 'draft', 'backlog', 'done'];

export default async function NextShowPage() {
  const show = await loadNextShow();

  if (!show)
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-8">
        <h1 className="text-2xl font-semibold">Next show</h1>
        <p className="text-sm text-text-secondary">
          No show is planned yet. Add topics with a date in the Backlog to start
          one.
        </p>
        <Button asChild size="sm">
          <Link href="/prep/backlog">Open the Backlog</Link>
        </Button>
      </div>
    );

  const topics = [...show.topics].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
          {formatLivestreamDate(show.date)}
        </p>
        <h1 className="text-2xl font-semibold">{show.title}</h1>
      </div>

      <nav aria-label="Prep pages" className="flex flex-wrap gap-2">
        {PREP_TABS.map(({ label, tab }, index) => (
          <Button
            key={tab}
            asChild
            size="sm"
            variant={index === 0 ? 'accent' : 'default'}
          >
            <Link href={livestreamPath(show.slug, tab)}>
              {label}
              {index === 0 ? <ArrowRight size={14} aria-hidden="true" /> : null}
            </Link>
          </Button>
        ))}
      </nav>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-text-secondary">
            Topics · {topics.length}
          </h2>
          <Link
            href="/prep/backlog"
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Edit in Backlog
          </Link>
        </div>
        {topics.length > 0 ? (
          <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-card">
            {topics.map((topic) => (
              <li
                key={topic.slug}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm text-text-primary">
                  {topic.title}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1.5 rounded-full',
                      STATUS[topic.status].dot,
                    )}
                  />
                  {STATUS[topic.status].label}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">
            No topics for this date yet.
          </p>
        )}
      </section>
    </div>
  );
}
