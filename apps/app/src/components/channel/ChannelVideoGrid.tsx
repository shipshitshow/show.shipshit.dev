import { Button, cn } from '@shipshitshow/ui';
import Link from 'next/link';
import {
  formatAge,
  VIDEO_SORTS,
  type VideoSort,
  type VideoStatsSnapshot,
} from '@/lib/video-stats';
import { type ChannelVideo, ChannelVideoCard } from './ChannelVideoCard';

/** Latest / Popular / Oldest, the same three chips a channel page has. */
export function SortChips({
  basePath,
  sort,
}: {
  basePath: string;
  sort: VideoSort;
}) {
  return (
    <nav aria-label="Sort videos" className="flex flex-wrap gap-2">
      {VIDEO_SORTS.map((option) => {
        const active = option.id === sort;
        return (
          <Button
            key={option.id}
            asChild
            size="sm"
            variant="default"
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs',
              active &&
                'border-text-primary bg-text-primary text-surface hover:text-surface',
            )}
          >
            <Link
              aria-current={active ? 'page' : undefined}
              href={
                option.id === 'latest'
                  ? basePath
                  : `${basePath}?sort=${option.id}`
              }
              scroll={false}
            >
              {option.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

/** When the views and likes were last refreshed, or that they have not been. */
export function StatsFreshness({
  now,
  stats,
}: {
  now: Date;
  stats: VideoStatsSnapshot | null;
}) {
  return (
    <span title={stats ? new Date(stats.fetchedAt).toUTCString() : undefined}>
      {stats
        ? `Views and likes updated ${formatAge(stats.fetchedAt, now)}`
        : 'Views and likes are not synced yet'}
    </span>
  );
}

export function ChannelVideoGrid({
  now,
  videos,
}: {
  now: Date;
  videos: ChannelVideo[];
}) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <ChannelVideoCard key={video.key} video={video} now={now} />
      ))}
    </div>
  );
}
