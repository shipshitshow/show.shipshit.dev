import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CopyButton } from '@/components/CopyButton';
import { LinkedInMeasurementPanel } from '@/components/livestreams/LinkedInMeasurementPanel';
import { StreamDistributionPanel } from '@/components/livestreams/StreamDistributionPanel';
import { StreamXPostsPanel } from '@/components/livestreams/StreamXPostsPanel';
import { getEpisodeDistribution } from '@/lib/distribution-store';
import { getEpisodeLinkedInMeasurement } from '@/lib/linkedin-measurement';
import {
  isDateSlug,
  resolveStreamDate,
  resolveStreamPathForDate,
} from '@/lib/livestreams-routing';
import {
  getLivestreamArchiveByDate,
  getTopicsForArchive,
} from '@/lib/livestreams-store';
import { getVisibleTopics, sortTopics } from '@/lib/livestreams-ui';
import { getEpisodeXMetrics } from '@/lib/livestreams-x-posts';
import { isStorageWritable } from '@/lib/storage-capability-server';

export const metadata: Metadata = { title: 'Posts - Ship Sh*t Show' };

/** The tweet that announces the live: written in the prep file's front matter. */
function AnnouncementTweet({ text }: { text: string | null }) {
  const isLink = text ? /^https?:\/\/\S+$/.test(text.trim()) : false;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-text-secondary">
        Announcement tweet
      </h2>
      {text ? (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-surface-border bg-surface-card p-5">
          {isLink ? (
            <a
              href={text}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-accent-red hover:underline"
            >
              {text}
            </a>
          ) : (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-text-primary">
              {text}
            </p>
          )}
          <CopyButton text={text} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-surface-border p-5 text-sm text-text-muted">
          No announcement tweet in the prep file. Ask the agent to draft one
          from the talking points.
        </p>
      )}
    </section>
  );
}

export default async function PostsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isDateSlug(slug)) {
    const canonicalPath = await resolveStreamPathForDate(slug);
    if (canonicalPath !== `/content/livestreams/${encodeURIComponent(slug)}`) {
      redirect(`${canonicalPath}/posts`);
    }
  }

  const date = await resolveStreamDate(slug);
  if (!date) notFound();

  const archive = await getLivestreamArchiveByDate(date);
  const [topics, metrics, distribution, measurement] = await Promise.all([
    getTopicsForArchive(archive, date),
    getEpisodeXMetrics(date),
    getEpisodeDistribution(date),
    getEpisodeLinkedInMeasurement(date),
  ]);
  const visible = sortTopics(getVisibleTopics(topics, date));
  const announcement =
    visible.find((topic) => topic.announcement_tweet)?.announcement_tweet ??
    visible.find((topic) => topic.generated.livestream_tweet)?.generated
      .livestream_tweet ??
    null;
  const isWritable = isStorageWritable();

  return (
    <div className="space-y-10">
      <AnnouncementTweet text={announcement} />
      <StreamXPostsPanel
        initialMetrics={metrics}
        isWritable={isWritable}
        slug={slug}
      />
      <details className="group rounded-xl border border-surface-border">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-text-secondary">
          Distribution checklist and LinkedIn numbers
        </summary>
        <div className="space-y-8 border-t border-surface-border p-5">
          <StreamDistributionPanel
            date={date}
            initialDistribution={distribution}
            isWritable={isWritable}
          />
          <LinkedInMeasurementPanel
            isWritable={isWritable}
            measurement={measurement}
          />
        </div>
      </details>
    </div>
  );
}
