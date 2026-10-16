import type { Topic } from '@shipshitshow/types';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TranscriptScorecard } from '@/components/TranscriptScorecard';
import { formatNumber } from '@/lib/format';
import {
  getPublishedVideoBySlug,
  getTopicsForDate,
} from '@/lib/livestreams-store';
import { buildYouTubeThumbnailUrl } from '@/lib/livestreams-youtube';
import {
  isUsefulSection,
  MarkdownBody,
  parseSections,
} from '@/lib/markdown-render';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';
import { clampText, stripMarkdown } from '@/lib/text';
import {
  type NormalizedTranscript,
  normalizeTranscript,
} from '@/lib/transcript-normalize';
import { analyzeTranscriptScorecard } from '@/lib/transcript-scorecard';

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

type VideoTab = 'talking-points' | 'transcript';

const TAB_META: Record<VideoTab, string> = {
  'talking-points': 'Talking Points',
  transcript: 'Transcript',
};

function resolveTab(tab: string | undefined): VideoTab {
  if (tab === 'talking-points') return 'talking-points';
  return 'transcript';
}

function formatVideoDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}

function formatVideoType(type: 'livestream' | 'video'): string {
  return type === 'livestream' ? 'Livestream' : 'Video';
}

function VideoTabs({
  activeTab,
  slug,
  hasTalkingPoints,
}: {
  activeTab: VideoTab;
  slug: string;
  hasTalkingPoints: boolean;
}) {
  const tabs = hasTalkingPoints
    ? (Object.entries(TAB_META) as [VideoTab, string][])
    : ([['transcript', 'Transcript']] as [VideoTab, string][]);

  return (
    <div className="flex flex-wrap gap-2 border-b border-surface-border">
      {tabs.map(([tab, label]) => {
        const isActive = tab === activeTab;
        return (
          <Link
            key={tab}
            href={`/videos/${encodeURIComponent(slug)}?tab=${tab}`}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-accent-red text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function TalkingPointsPanel({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card/40 p-6 text-sm text-text-muted">
        No talking points available for this video.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((topic) => {
        const sections = parseSections(topic.content).filter((section) =>
          isUsefulSection(section.title),
        );

        return (
          <article
            key={`${topic.date}-${topic.slug}`}
            id={topic.slug}
            className="rounded-xl border border-surface-border bg-surface-card p-5"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                {topic.source}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-text-primary">
                {topic.title}
              </h3>
            </div>

            <div className="mt-5 space-y-5">
              {sections.map((section) => (
                <section
                  key={`${topic.slug}-${section.title}`}
                  className="space-y-2"
                >
                  <h4 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                    {section.title}
                  </h4>
                  <MarkdownBody body={section.body} />
                </section>
              ))}
              {sections.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No summary or talking point sections found in this topic.
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TranscriptPanel({
  transcript,
  youtubeUrl,
}: {
  transcript: NormalizedTranscript;
  youtubeUrl: string | null;
}) {
  return (
    <>
      <div className="space-y-2 border-b border-surface-border pb-4">
        <h2 className="text-sm font-semibold text-text-primary">Transcript</h2>
        <p className="text-xs leading-relaxed text-text-muted">
          <span className="mr-2 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-yellow-400">
            ASR · not reviewed
          </span>
          Imported from{' '}
          {youtubeUrl ? (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary underline decoration-surface-border underline-offset-2 transition-colors hover:text-accent-red"
            >
              the original YouTube captions
            </a>
          ) : (
            'the original caption file'
          )}
          . Wording, names and claims are kept as captured
          {transcript.hasSpeakerMarkers
            ? '; breaks mark caption speaker changes, speakers are not identified.'
            : '.'}
        </p>
      </div>
      {transcript.turns.length === 0 ? (
        <p className="pt-4 text-sm text-text-muted">
          This transcript is empty.
        </p>
      ) : (
        <div className="max-h-[760px] space-y-3 overflow-auto pt-4 text-sm leading-relaxed text-text-secondary">
          {transcript.turns.map((turn, turnIndex) => (
            <div
              key={turnIndex}
              className={
                turn.speakerChange
                  ? 'space-y-2 border-l-2 border-surface-border pl-3'
                  : 'space-y-2'
              }
            >
              {turn.speakerChange ? (
                <span className="sr-only">Speaker change.</span>
              ) : null}
              {turn.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="break-words">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getPublishedVideoBySlug(slug);
  const defaults = buildDefaultMetadata();

  if (!video) {
    return {
      ...defaults,
      description: 'Published Ship Sh!t Show video transcript.',
      title: 'Ship Sh!t Show - Video Transcript',
    };
  }

  const pageUrl = toAbsoluteUrl(
    `/videos/${encodeURIComponent(video.routeSlug)}`,
  );
  const description = clampText(
    stripMarkdown(normalizeTranscript(video.transcript).plainText),
    180,
  );

  return {
    ...defaults,
    alternates: {
      canonical: pageUrl,
    },
    description,
    openGraph: {
      ...defaults.openGraph,
      description,
      title: `${video.title} - Ship Sh!t Show`,
      type: 'article',
      url: pageUrl,
    },
    title: `${video.title} - Ship Sh!t Show`,
    twitter: {
      ...defaults.twitter,
      description,
      title: `${video.title} - Ship Sh!t Show`,
    },
  };
}

export default async function VideoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const video = await getPublishedVideoBySlug(slug);

  if (!video) notFound();

  const topics =
    video.type === 'livestream'
      ? (await getTopicsForDate(video.date)).filter(
          (t) => t.status !== 'backlog' && t.status !== 'draft',
        )
      : [];
  const hasTalkingPoints = topics.length > 0;
  const activeTab = hasTalkingPoints ? resolveTab(tab) : 'transcript';

  const thumbnailUrl = video.videoId
    ? await buildYouTubeThumbnailUrl(video.videoId)
    : '/icon.svg';
  const transcript = normalizeTranscript(video.transcript);
  const transcriptScorecard = analyzeTranscriptScorecard(transcript.plainText);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/videos"
        className="text-xs font-medium text-text-muted transition-colors hover:text-accent-red"
      >
        Back to videos
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-text-muted">
              {formatVideoType(video.type)}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-text-primary">
              {video.title}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {formatVideoDate(video.date)} · {formatNumber(video.wordCount)}{' '}
              transcript words
            </p>
          </div>

          <section className="overflow-hidden rounded-xl border border-surface-border bg-surface/30">
            <VideoTabs
              activeTab={activeTab}
              slug={video.routeSlug}
              hasTalkingPoints={hasTalkingPoints}
            />
            <div className="p-5">
              {activeTab === 'talking-points' ? (
                <TalkingPointsPanel topics={topics} />
              ) : (
                <TranscriptPanel
                  transcript={transcript}
                  youtubeUrl={video.youtubeUrl}
                />
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <div className="relative aspect-video overflow-hidden bg-surface-elevated">
              <Image
                src={thumbnailUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover"
              />
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent-red/20 bg-accent-red/10 px-2.5 py-1 text-[10px] font-medium text-accent-red">
                  {formatVideoType(video.type)}
                </span>
                <span className="text-xs text-text-muted">
                  {formatVideoDate(video.date)}
                </span>
              </div>
              {video.youtubeUrl ? (
                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent-red px-5 py-3.5 text-sm font-bold text-on-accent transition-colors hover:bg-accent-red/85"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-5"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Watch
                </a>
              ) : null}
            </div>
          </div>
          <TranscriptScorecard scorecard={transcriptScorecard} />
        </aside>
      </div>
    </main>
  );
}
