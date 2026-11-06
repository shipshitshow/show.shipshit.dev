import type { Metadata } from 'next';
import type { ChannelVideo } from '@/components/channel/ChannelVideoCard';
import {
  ChannelVideoGrid,
  SortChips,
  StatsFreshness,
} from '@/components/channel/ChannelVideoGrid';
import { formatNumber } from '@/lib/format';
import { listPublishedVideos } from '@/lib/livestreams-store';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';
import { parseSort, sortVideos } from '@/lib/video-stats';
import { readVideoStats } from '@/lib/video-stats-store';

export const metadata: Metadata = {
  ...buildDefaultMetadata(),
  alternates: {
    canonical: toAbsoluteUrl('/videos'),
  },
  description: 'Published Ship Sh*t Show videos.',
  title: 'Ship Sh*t Show - Videos',
};

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sort = parseSort((await searchParams).sort);
  const now = new Date();
  const [published, stats] = await Promise.all([
    listPublishedVideos(),
    readVideoStats(),
  ]);

  const cards = await Promise.all(
    published
      .filter((video) => video.type === 'video')
      .map(async (video) => {
        const stat = video.videoId ? stats?.videos[video.videoId] : undefined;
        return {
          date: video.date,
          href: `/library/transcripts/${encodeURIComponent(video.routeSlug)}`,
          key: video.routeSlug,
          stat,
          thumbnailUrl: video.videoId
            ? await buildYouTubeThumbnailUrl(video.videoId)
            : '/icon.svg',
          title: video.title,
          views: stat?.views,
        };
      }),
  );
  const videos: ChannelVideo[] = sortVideos(cards, sort);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
            Archive
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">
            Videos
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {formatNumber(videos.length)} videos ·{' '}
            <StatsFreshness now={now} stats={stats} />
          </p>
        </div>
        <SortChips basePath="/videos" sort={sort} />
      </section>

      {videos.length > 0 ? (
        <ChannelVideoGrid now={now} videos={videos} />
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-card/40 p-8 text-center">
          <p className="text-sm font-medium text-text-primary">
            No imported videos yet.
          </p>
        </div>
      )}
    </main>
  );
}
