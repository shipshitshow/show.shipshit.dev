import { Button, cn } from '@shipshitshow/ui';
import Link from 'next/link';
import { LinkFilterSelect } from '@/components/FilterSelect';
import {
  CHANNEL_FILTERS,
  type ContentFilters,
  type ContentItem,
  contentHref,
  filterContent,
  parseChannel,
  parseType,
  TYPE_FILTERS,
} from '@/lib/content-library';
import { loadContent } from '@/lib/content-library-server';
import {
  formatAge,
  parseSort,
  VIDEO_SORTS,
  type VideoStatsSnapshot,
} from '@/lib/video-stats';
import { ContentCard } from './ContentCard';
import { MasonryGrid } from './MasonryGrid';

export interface ContentSearchParams {
  channel?: string;
  sort?: string;
  transcript?: string;
  type?: string;
}

const PATH = '/content';

/** A card's height in column widths: the image, the text, the version strip. */
function cardHeight(item: ContentItem): number {
  return (
    (item.type === 'short' ? 16 / 9 : 9 / 16) + 0.55 + (item.variants ? 0.2 : 0)
  );
}

/** One filter as a dropdown whose options are links keeping the others. */
function Filter<K extends 'channel' | 'sort' | 'type'>({
  filters,
  label,
  name,
  options,
}: {
  filters: ContentFilters;
  label: string;
  name: K;
  options: Array<{ id: ContentFilters[K]; label: string }>;
}) {
  return (
    <LinkFilterSelect
      label={label}
      value={filters[name]}
      options={options.map((option) => ({
        label: option.label,
        value: option.id,
      }))}
      hrefs={Object.fromEntries(
        options.map((option) => [
          option.id,
          contentHref(PATH, filters, { [name]: option.id }),
        ]),
      )}
    />
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

/** Livestreams, videos and Shorts of both channels in one grid. */
export async function ContentView({
  searchParams,
}: {
  searchParams: ContentSearchParams;
}) {
  const filters: ContentFilters = {
    channel: parseChannel(searchParams.channel),
    missing: searchParams.transcript === 'missing',
    sort: parseSort(searchParams.sort),
    type: parseType(searchParams.type),
  };
  const { items, stats } = await loadContent();
  const shown = filterContent(items, filters);
  const missingCount = filterContent(items, {
    ...filters,
    missing: true,
  }).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Content</h1>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Filter
            filters={filters}
            label="Type"
            name="type"
            options={TYPE_FILTERS}
          />
          <Filter
            filters={filters}
            label="Channel"
            name="channel"
            options={CHANNEL_FILTERS}
          />
          <Filter
            filters={filters}
            label="Sort"
            name="sort"
            options={VIDEO_SORTS}
          />
          <Button
            asChild
            size="sm"
            className={cn(
              'h-9 px-2.5',
              filters.missing && 'border-accent-red/60 text-text-primary',
            )}
          >
            <Link
              href={contentHref(PATH, filters, { missing: !filters.missing })}
              scroll={false}
              aria-current={filters.missing ? 'true' : undefined}
            >
              No transcript <span className="tabular-nums">{missingCount}</span>
            </Link>
          </Button>
        </div>
      </div>

      {shown.length > 0 ? (
        <MasonryGrid heights={shown.map(cardHeight)}>
          {shown.map((item) => (
            <ContentCard key={item.key} item={item} />
          ))}
        </MasonryGrid>
      ) : (
        <Empty />
      )}

      <Freshness stats={stats} />
    </div>
  );
}
