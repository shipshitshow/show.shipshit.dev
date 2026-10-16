import fs from 'node:fs';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { todayLocalDate } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import {
  getTopicsForDate,
  listAvailableLivestreamDates,
  listLivestreamArchive,
} from '@/lib/livestreams-store';
import { formatLivestreamDate, isPastDate } from '@/lib/livestreams-ui';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import { analyzeTranscriptScorecard } from '@/lib/transcript-scorecard';

export const metadata: Metadata = {
  description:
    'All Ship Sh!t Show livestreams — weekly AI dev tool news and hot takes.',
  title: 'Livestreams - Ship Sh!t Show',
};

interface StreamListItem {
  date: string;
  hasTranscript: boolean;
  routeSlug: string;
  thumbnailUrl: string;
  title: string;
  topicCount: number;
  transcriptGrade: string | null;
  transcriptScore: number | null;
  transcriptWords: number | null;
  transcriptMinutes: number | null;
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
    hasTranscript: false,
    routeSlug: archive?.videoId ?? date,
    thumbnailUrl,
    title,
    topicCount: activeTopics.length || archive?.topicCount || 0,
    transcriptGrade: null,
    transcriptMinutes: null,
    transcriptScore: null,
    transcriptWords: null,
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
        hasTranscript: Boolean(archive?.hasTranscript),
        routeSlug: archive?.videoId ?? date,
        thumbnailUrl,
        title,
        topicCount: publicTopics.length || archive?.topicCount || 0,
        transcriptGrade: scorecard?.grade ?? null,
        transcriptMinutes: scorecard?.stats.estimatedMinutes ?? null,
        transcriptScore: scorecard?.overall ?? null,
        transcriptWords: scorecard?.stats.wordCount ?? null,
      };
    }),
  );
}

export default async function LivestreamPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const { date, tab } = await searchParams;
  if (date) {
    const tabSegment = tab === 'transcript' ? 'transcript' : 'talking-points';
    redirect(`/livestreams/${encodeURIComponent(date)}/${tabSegment}`);
  }

  const [upcoming, streams] = await Promise.all([
    buildUpcomingStream(),
    buildDoneStreams(),
  ]);

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

      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
              Past
            </p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">
              Previous Livestreams
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            {streams.length} stream{streams.length === 1 ? '' : 's'}
          </span>
        </div>

        {streams.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {streams.map((stream) => (
              <Link
                key={stream.date}
                href={`/livestreams/${encodeURIComponent(stream.routeSlug)}/talking-points`}
                className="group overflow-hidden rounded-2xl border border-surface-border bg-surface-card transition-colors hover:border-accent-red/40"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-elevated">
                  {stream.thumbnailUrl === '/icon.svg' ? (
                    <div className="flex size-full items-center justify-center">
                      <Image src="/icon.svg" alt="" width={48} height={48} />
                    </div>
                  ) : (
                    <Image
                      src={stream.thumbnailUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                        {formatLivestreamDate(stream.date)}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-text-primary transition-colors group-hover:text-accent-red">
                        {stream.title}
                      </h3>
                    </div>
                    {stream.transcriptScore !== null ? (
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          stream.transcriptScore >= 8
                            ? 'border-green-500/20 bg-green-500/10 text-green-400'
                            : stream.transcriptScore >= 6
                              ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                              : 'border-red-500/20 bg-red-500/10 text-red-400'
                        }`}
                      >
                        {stream.transcriptScore}/10
                      </span>
                    ) : null}
                  </div>
                  {stream.hasTranscript ? (
                    <div className="flex items-center gap-3 text-[10px] text-text-muted">
                      {stream.transcriptGrade ? (
                        <span>Grade {stream.transcriptGrade}</span>
                      ) : null}
                      {stream.transcriptWords ? (
                        <span>
                          {formatNumber(stream.transcriptWords)} words
                        </span>
                      ) : null}
                      {stream.transcriptMinutes ? (
                        <span>~{stream.transcriptMinutes} min</span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-muted/50">
                      No transcript
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
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
