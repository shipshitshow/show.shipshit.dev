'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  type CveEntry,
  OPEN_QUESTIONS,
  type SourceKind,
  STATUS_HELP,
  STATUS_LABELS,
  type TimelineEvent,
  type TimelineStatus,
  type TimelineTrack,
  TRACK_LABELS,
} from '@/lib/artifacts/agent-security-2026-10';

type Filter = 'all' | TimelineTrack;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'php', label: TRACK_LABELS.php },
  { id: 'extension', label: TRACK_LABELS.extension },
  { id: 'agent', label: TRACK_LABELS.agent },
];

const STATUS_STYLES: Record<TimelineStatus, string> = {
  confirmed: 'border-emerald-300/60 text-emerald-300',
  reported: 'border-sky-300/60 text-sky-300',
  unverified: 'border-amber-300/60 text-amber-300',
};

const SOURCE_LABELS: Record<SourceKind, string> = {
  news: 'news',
  vendor: 'vendor',
  x: 'X',
};

function StatusTag({ status }: { status: TimelineStatus }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${STATUS_STYLES[status]}`}
      title={STATUS_HELP[status]}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  return (
    <li className="relative grid gap-2 pl-7 pb-8 md:grid-cols-[9rem_1fr] md:gap-8 md:pl-0">
      <span
        aria-hidden="true"
        className="absolute left-0 top-2 size-3 rounded-full border-2 border-surface bg-text-muted md:left-[9.5rem]"
      />
      <p className="font-mono text-sm text-text-muted md:pt-1 md:text-right">
        <span className="mr-2 text-text-primary md:mr-0 md:block">
          {event.dateLabel}
        </span>
        {event.subLabel}
      </p>
      <div className="min-w-0 rounded-lg border border-surface-border bg-surface-card p-4 md:ml-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-surface-border px-2 py-0.5 font-mono text-xs uppercase tracking-wide text-text-secondary">
            {TRACK_LABELS[event.track]}
          </span>
          <StatusTag status={event.status} />
        </div>
        <h3 className="text-balance text-lg font-bold text-text-primary">
          {event.title}
        </h3>
        <p className="mt-2 text-base leading-relaxed text-text-secondary">
          {event.body}
        </p>
        <ul className="mt-3 grid gap-1 text-sm">
          {event.sources.map((source) => (
            <li key={source.url} className="flex min-w-0 items-baseline gap-2">
              <span className="w-14 shrink-0 rounded border border-surface-border px-1.5 text-center font-mono text-[0.65rem] uppercase text-text-muted">
                {SOURCE_LABELS[source.kind]}
              </span>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-baseline gap-1 text-text-primary underline decoration-surface-border underline-offset-4 hover:decoration-accent-red"
              >
                <span className="break-words">{source.label}</span>
                <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function TimelineArtifact({
  cves,
  events,
  slideshowHref,
}: {
  cves: CveEntry[];
  events: TimelineEvent[];
  slideshowHref: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const shown =
    filter === 'all'
      ? events
      : events.filter((event) => event.track === filter);

  return (
    <div className="space-y-12">
      <section
        aria-label="How to read the status tags"
        className="grid gap-2 rounded-lg border border-surface-border bg-surface-elevated p-4 text-sm"
      >
        {(Object.keys(STATUS_LABELS) as TimelineStatus[]).map((status) => (
          <p key={status} className="flex flex-wrap items-baseline gap-3">
            <StatusTag status={status} />
            <span className="min-w-0 text-text-secondary">
              {STATUS_HELP[status]}
            </span>
          </p>
        ))}
      </section>

      <section aria-label="Timeline">
        <div
          role="group"
          aria-label="Filter by track"
          className="mb-8 flex flex-wrap gap-2"
        >
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                filter === item.id
                  ? 'border-text-primary bg-text-primary text-surface'
                  : 'border-surface-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ol className="relative before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:bg-surface-border md:before:left-[9.5rem] md:before:ml-[5px]">
          {shown.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ol>
        <Link
          href={slideshowHref}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-text-primary hover:border-text-muted"
        >
          Open the tweet slideshow
        </Link>
      </section>

      <section aria-labelledby="cve-index">
        <h2
          id="cve-index"
          className="mb-4 text-balance text-2xl font-bold text-text-primary"
        >
          CVE index
        </h2>
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="font-mono text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">What</th>
                <th className="p-3">Score</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {cves.map((cve) => (
                <tr key={cve.id} className="border-t border-surface-border">
                  <td className="whitespace-nowrap p-3 font-mono text-text-primary">
                    {cve.id}
                  </td>
                  <td className="p-3">{cve.summary}</td>
                  <td className="p-3">{cve.score}</td>
                  <td className="p-3">
                    {cve.unverified ? (
                      <StatusTag status="unverified" />
                    ) : (
                      cve.state
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="still-open">
        <h2
          id="still-open"
          className="mb-4 text-balance text-2xl font-bold text-text-primary"
        >
          Still open
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-text-secondary">
          {OPEN_QUESTIONS.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
