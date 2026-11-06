import { cn } from '@shipshitshow/ui';
import { BRAND } from '@shipshitshow/ui/brand';
import { ExternalLink, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LinkFilterSelect } from '@/components/FilterSelect';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { formatNumber } from '@/lib/format';
import {
  missingTranscripts,
  parseSort,
  parseTypeFilter,
  searchTerms,
  searchTranscripts,
  type TranscriptSort,
  type TranscriptTypeFilter,
  transcriptStats,
} from '@/lib/transcript-library';
import {
  loadChannelSnapshotVideos,
  loadTranscriptEntries,
} from '@/lib/transcript-library-server';

export const metadata: Metadata = {
  title: 'Transcripts — Library — ' + BRAND.identity.show_name,
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}

const TYPE_FILTERS: { id: TranscriptTypeFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'video', label: 'Videos' },
  { id: 'livestream', label: 'Livestreams' },
  { id: 'short', label: 'Shorts' },
];

const TYPE_LABELS = {
  livestream: 'Livestream',
  short: 'Short',
  video: 'Video',
} as const;

const SORTS: { id: TranscriptSort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'longest', label: 'Longest' },
];

function pageHref(params: {
  q: string;
  sort: TranscriptSort;
  type: TranscriptTypeFilter;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.type !== 'all') search.set('type', params.type);
  if (params.sort !== (params.q ? 'relevance' : 'newest'))
    search.set('sort', params.sort);
  const qs = search.toString();
  return qs ? `/library/transcripts?${qs}` : '/library/transcripts';
}

export default async function LibraryTranscriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; type?: string }>;
}) {
  const raw = await searchParams;
  const q = (raw.q ?? '').trim().slice(0, 200);
  const type = parseTypeFilter(raw.type);
  const hasQuery = searchTerms(q).length > 0;
  const sortOptions: { id: TranscriptSort; label: string }[] = hasQuery
    ? [{ id: 'relevance', label: 'Best match' }, ...SORTS]
    : SORTS;
  const sort = parseSort(raw.sort, hasQuery);

  const [entries, snapshot] = await Promise.all([
    loadTranscriptEntries(),
    loadChannelSnapshotVideos(),
  ]);
  const stats = transcriptStats(entries);
  const results = searchTranscripts(entries, { q, sort, type });
  const missing = snapshot
    ? missingTranscripts(snapshot, entries).sort((a, b) =>
        a.privacyStatus === b.privacyStatus
          ? a.title.localeCompare(b.title)
          : a.privacyStatus === 'public'
            ? -1
            : 1,
      )
    : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-7">
      <LibraryHeader title="Transcripts" />

      <form
        action="/library/transcripts"
        className="mt-6 flex gap-2"
        role="search"
      >
        <label className="relative flex-1">
          <span className="sr-only">Search transcripts</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          />
          <input
            className="w-full rounded-xl border border-surface-border bg-surface-card py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-red/60 focus:outline-none"
            defaultValue={q}
            name="q"
            placeholder="Search what was said, e.g. harness, Moltbook, dead internet"
            type="search"
          />
        </label>
        {type !== 'all' ? (
          <input name="type" type="hidden" value={type} />
        ) : null}
        <button
          className="rounded-xl bg-accent-red px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-text-primary"
          type="submit"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <LinkFilterSelect
          label="Type"
          value={type}
          options={TYPE_FILTERS.map((filter) => ({
            label: filter.label,
            value: filter.id,
          }))}
          hrefs={Object.fromEntries(
            TYPE_FILTERS.map((filter) => [
              filter.id,
              pageHref({ q, sort, type: filter.id }),
            ]),
          )}
        />
        <LinkFilterSelect
          label="Sort"
          value={sort}
          options={sortOptions.map((option) => ({
            label: option.label,
            value: option.id,
          }))}
          hrefs={Object.fromEntries(
            sortOptions.map((option) => [
              option.id,
              pageHref({ q, sort: option.id, type }),
            ]),
          )}
        />
      </div>

      <p aria-live="polite" className="mt-6 text-xs text-text-muted">
        {hasQuery
          ? `${formatNumber(results.length)} of ${formatNumber(entries.length)} transcripts match`
          : `${formatNumber(results.length)} transcripts`}
      </p>

      {results.length > 0 ? (
        <ul className="mt-3 divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
          {results.map(({ entry, hits, snippet }) => (
            <li key={entry.routeSlug}>
              <Link
                className="group block px-5 py-4 transition-colors hover:bg-surface-elevated/40"
                href={`/library/transcripts/${encodeURIComponent(entry.routeSlug)}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                    {formatDate(entry.date)}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium text-text-primary',
                      entry.type === 'livestream'
                        ? 'border-accent-red/30 bg-accent-red/10'
                        : 'border-surface-border',
                    )}
                  >
                    {TYPE_LABELS[entry.type]}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {formatNumber(entry.wordCount)} words
                    {hits > 0 ? ` · ${formatNumber(hits)} hits` : ''}
                  </span>
                </div>
                <h2 className="mt-1 text-sm font-semibold text-text-primary transition-colors group-hover:text-accent-red">
                  {entry.title}
                </h2>
                {snippet ? (
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    {snippet.map((part, index) =>
                      part.hit ? (
                        <mark
                          className="rounded bg-accent-red/20 px-0.5 text-text-primary"
                          key={index}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      ),
                    )}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-surface-border bg-surface-card/40 p-8 text-center">
          <p className="text-sm font-medium text-text-primary">
            No transcript matches “{q}”.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Every word you type has to appear in the title or the transcript.
          </p>
        </div>
      )}

      {missing.length > 0 ? (
        <details className="mt-8 rounded-2xl border border-surface-border bg-surface-card/40 px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium text-text-primary">
            Not saved yet ({formatNumber(missing.length)})
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            On the main channel but with no transcript in the library, usually
            because the video is private, scheduled or has no captions yet.
          </p>
          <ul className="mt-3 space-y-1.5">
            {missing.map((video) => (
              <li
                className="flex items-center justify-between gap-3 text-xs"
                key={video.id}
              >
                <span className="min-w-0 truncate text-text-secondary">
                  {video.title}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-text-muted">
                  {video.privacyStatus}
                  <a
                    aria-label={`Open ${video.title} on YouTube`}
                    className="transition-colors hover:text-accent-red"
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
