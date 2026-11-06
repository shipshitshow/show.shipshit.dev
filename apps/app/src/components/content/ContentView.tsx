import { Button, cn } from '@shipshitshow/ui';
import Link from 'next/link';
import {
  CHANNEL_FILTERS,
  CONTENT_TYPES,
  type ContentFilters,
  type ContentItem,
  type ContentType,
  contentHref,
  filterContent,
  isMissingTranscript,
  parseChannel,
} from '@/lib/content-library';
import { loadContent } from '@/lib/content-library-server';
import {
  formatAge,
  parseSort,
  VIDEO_SORTS,
  type VideoStatsSnapshot,
} from '@/lib/video-stats';
import { ContentCard } from './ContentCard';

export interface ContentSearchParams {
  channel?: string;
  sort?: string;
  transcript?: string;
}

const gridClass = (type: ContentType) =>
  type === 'short'
    ? 'grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    : 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/** One row at the widest breakpoint on the All page. */
const ROW = { livestream: 4, short: 6, video: 4 } as const;

function Segmented({
  label,
  options,
}: {
  label: string;
  options: Array<{ active: boolean; href: string; label: string }>;
}) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1 rounded-lg border border-surface-border bg-surface-card p-1"
    >
      {options.map((option) => (
        <Button
          key={option.href}
          asChild
          size="sm"
          variant="ghost"
          className={cn(
            'rounded-md text-xs transition-colors',
            option.active
              ? 'bg-accent-red/10 text-text-primary hover:bg-accent-red/10 hover:text-text-primary'
              : 'text-text-muted hover:bg-transparent hover:text-text-secondary',
          )}
        >
          <Link
            href={option.href}
            scroll={false}
            aria-current={option.active ? 'page' : undefined}
          >
            {option.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

function Freshness({ stats }: { stats: VideoStatsSnapshot | null }) {
  return (
    <p
      className="text-xs text-text-muted"
      title={stats ? new Date(stats.fetchedAt).toUTCString() : undefined}
    >
      {stats
        ? `Views and likes updated ${formatAge(stats.fetchedAt)}.`
        : 'Views and likes are not synced yet.'}
    </p>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-surface-card/40 p-8 text-center">
      <p className="text-sm font-medium text-text-primary">
        Nothing matches these filters.
      </p>
    </div>
  );
}

/**
 * Livestreams, videos and Shorts of both channels. Without a type it shows
 * one row of each with a link to the rest.
 */
export async function ContentView({
  searchParams,
  type,
}: {
  searchParams: ContentSearchParams;
  type?: ContentType;
}) {
  const filters: ContentFilters = {
    channel: parseChannel(searchParams.channel),
    missing: searchParams.transcript === 'missing',
    sort: parseSort(searchParams.sort),
  };
  const page = CONTENT_TYPES.find((entry) => entry.id === type);
  const path = page?.path ?? '/content';
  const { items, stats } = await loadContent();
  const inScope = (item: ContentItem) =>
    (!type || item.type === type) &&
    (filters.channel === 'all' || item.channel === filters.channel);
  const missingCount = items.filter(
    (item) => inScope(item) && isMissingTranscript(item),
  ).length;

  const sections = page
    ? [{ ...page, items: filterContent(items, filters, page.id) }]
    : CONTENT_TYPES.map((entry) => ({
        ...entry,
        items: filterContent(items, filters, entry.id),
      })).filter((section) => section.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {page?.label ?? 'All content'}
        </h1>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Segmented
            label="Channel"
            options={CHANNEL_FILTERS.map((option) => ({
              active: filters.channel === option.id,
              href: contentHref(path, filters, { channel: option.id }),
              label: option.label,
            }))}
          />
          <Segmented
            label="Sort"
            options={VIDEO_SORTS.map((option) => ({
              active: filters.sort === option.id,
              href: contentHref(path, filters, { sort: option.id }),
              label: option.label,
            }))}
          />
          <Button
            asChild
            size="sm"
            className={cn(
              'px-2.5',
              filters.missing && 'border-accent-red/60 text-text-primary',
            )}
          >
            <Link
              href={contentHref(path, filters, { missing: !filters.missing })}
              scroll={false}
              aria-current={filters.missing ? 'true' : undefined}
            >
              No transcript <span className="tabular-nums">{missingCount}</span>
            </Link>
          </Button>
        </div>
      </div>

      {page ? (
        sections[0].items.length > 0 ? (
          <div className={gridClass(page.id)}>
            {sections[0].items.map((item) => (
              <ContentCard key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <Empty />
        )
      ) : sections.length > 0 ? (
        sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                {section.label}
              </h2>
              <Link
                href={contentHref(section.path, filters)}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                See all {section.items.length}
              </Link>
            </div>
            <div className={gridClass(section.id)}>
              {section.items.slice(0, ROW[section.id]).map((item) => (
                <ContentCard key={item.key} item={item} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <Empty />
      )}

      <Freshness stats={stats} />
    </div>
  );
}
