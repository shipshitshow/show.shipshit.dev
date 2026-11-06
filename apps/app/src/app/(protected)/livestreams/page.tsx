import fs from 'node:fs';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ChannelVideo } from '@/components/channel/ChannelVideoCard';
import {
  ChannelVideoGrid,
  SortChips,
  StatsFreshness,
} from '@/components/channel/ChannelVideoGrid';
import { todayLocalDate } from '@/lib/date';
import {
  getTopicsForDate,
  listAvailableLivestreamDates,
  listLivestreamArchive,
} from '@/lib/livestreams-store';
import { formatLivestreamDate, isPastDate } from '@/lib/livestreams-ui';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import { analyzeTranscriptScorecard } from '@/lib/transcript-scorecard';
import { parseSort, sortVideos } from '@/lib/video-stats';
import { readVideoStats } from '@/lib/video-stats-store';

export const metadata: Metadata = {
  description:
    'All Ship Sh*t Show livestreams — weekly AI dev tool news and hot takes.',
  title: 'Livestreams - Ship Sh*t Show',
};

interface StreamListItem {
  date: string;
  routeSlug: string;
  thumbnailUrl: string;
  title: string;
  topicCount: number;
  transcriptScore: number | null;
  videoId: string | null;
}

async function buildUpcomingStream(): Promise<StreamListItem | null> {
  const today = todayLocalDate();
  const [topicDates, archiveItems] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
  ]);
  const archiveByDate = new Map(archiveItems.map((item) => [item.date, item]));
  const upcomingDates = Array.from(
    new Set([...topicDates, ...archiveItems.map((item) => item.date)]),
  )
    .filter((date) => date >= today)
    .sort((a, b) => a.localeCompare(b));

  if (upcomingDates.length === 0) return null;

  const date = upcomingDates[0];
  const archive = archiveByDate.get(date);
  const topics = await getTopicsForDate(date);
  const activeTopics = topics.filter((t) => t.status === 'in_progress');
  const title =
    archive?.title ??
    (activeTopics.length === 1
      ? activeTopics[0].title
      : `${formatLivestreamDate(date)} Livestream`);
  const thumbnailUrl = archive?.videoId
    ? await buildYouTubeThumbnailUrl(archive.videoId)
    : '/icon.svg';

  return {
    date,
    routeSlug: archive?.videoId ?? date,
    thumbnailUrl,
    title,
    topicCount: activeTopics.length || archive?.topicCount || 0,
    transcriptScore: null,
    videoId: archive?.videoId ?? null,
  };
}

async function buildDoneStreams(): Promise<StreamListItem[]> {
  const [topicDates, archiveItems] = await Promise.all([
    listAvailableLivestreamDates(),
    listLivestreamArchive(),
  ]);
  const archiveByDate = new Map(archiveItems.map((item) => [item.date, item]));
  const dates = Array.from(
    new Set([...topicDates, ...archiveItems.map((item) => item.date)]),
  )
    .filter((date) => isPastDate(date) && archiveByDate.get(date)?.videoId)
    .sort((a, b) => b.localeCompare(a));

  return Promise.all(
    dates.map(async (date) => {
      const archive = archiveByDate.get(date);
      const topics = await getTopicsForDate(date);
      const publicTopics = topics.filter(
        (topic) => topic.status !== 'backlog' && topic.status !== 'draft',
      );
      const title =
        archive?.title ??
        (publicTopics.length === 1
          ? publicTopics[0].title
          : `${formatLivestreamDate(date)} Livestream`);
      const thumbnailUrl = archive?.videoId
        ? await buildYouTubeThumbnailUrl(archive.videoId)
        : '/icon.svg';

      const transcript = archive?.transcriptPath
        ? fs.readFileSync(archive.transcriptPath, 'utf-8')
        : null;
      const scorecard = analyzeTranscriptScorecard(transcript);

      return {
        date,
        routeSlug: archive?.videoId ?? date,
        thumbnailUrl,
        title,
        topicCount: publicTopics.length || archive?.topicCount || 0,
        transcriptScore: scorecard?.overall ?? null,
        videoId: archive?.videoId ?? null,
      };
    }),
  );
}

export default async function LivestreamPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; sort?: string; tab?: string }>;
}) {
  const { date, sort: sortParam, tab } = await searchParams;
  if (date) {
    const tabSegment = tab === 'transcript' ? 'transcript' : 'talking-points';
    redirect(`/livestreams/${encodeURIComponent(date)}/${tabSegment}`);
  }

  const sort = parseSort(sortParam);
  const now = new Date();
  const [upcoming, doneStreams, stats] = await Promise.all([
    buildUpcomingStream(),
    buildDoneStreams(),
    readVideoStats(),
  ]);
  const streams: ChannelVideo[] = sortVideos(
    doneStreams.map((stream) => {
      const stat = stream.videoId ? stats?.videos[stream.videoId] : undefined;
      return {
        agePrefix: 'Streamed',
        date: stream.date,
        href: `/livestreams/${encodeURIComponent(stream.routeSlug)}/talking-points`,
        key: stream.date,
        note:
          stream.transcriptScore === null
            ? undefined
            : `Transcript ${stream.transcriptScore}/10`,
        stat,
        thumbnailUrl: stream.thumbnailUrl,
        title: stream.title,
        views: stat?.views,
      };
    }),
    sort,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-8">
      {upcoming ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
                Upcoming
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-text-primary">
                {upcoming.title}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {formatLivestreamDate(upcoming.date)} · {upcoming.topicCount}{' '}
                talking point
                {upcoming.topicCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <Link
            href={`/livestreams/${encodeURIComponent(upcoming.routeSlug)}/talking-points`}
            className="group block overflow-hidden rounded-2xl border border-accent-red/30 bg-surface-card transition-colors hover:border-accent-red/60"
          >
            <div className="relative aspect-[21/9] overflow-hidden bg-surface-elevated">
              {upcoming.thumbnailUrl === '/icon.svg' ? (
                <div className="flex size-full items-center justify-center">
                  <Image src="/icon.svg" alt="" width={64} height={64} />
                </div>
              ) : (
                <Image
                  src={upcoming.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
              )}
            </div>
          </Link>
        </section>
      ) : null}

      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
              Past
            </p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">
              Previous Livestreams
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {streams.length} stream{streams.length === 1 ? '' : 's'} ·{' '}
              <StatsFreshness now={now} stats={stats} />
            </p>
          </div>
          <SortChips basePath="/livestreams" sort={sort} />
        </div>

        {streams.length > 0 ? (
          <ChannelVideoGrid now={now} videos={streams} />
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-border bg-surface-card/40 p-8 text-center">
            <p className="text-sm font-medium text-text-primary">
              No completed livestreams yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
