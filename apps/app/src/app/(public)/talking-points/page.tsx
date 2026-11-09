import type { Metadata } from 'next';
import Link from 'next/link';
import { listEpisodePages } from '@/lib/episode-pages';
import { formatLivestreamDate } from '@/lib/livestreams-ui';
import { buildDefaultMetadata, toAbsoluteUrl } from '@/lib/site';

export const revalidate = 3600;

const TITLE = 'Episode notes - Ship Sh*t Show';
const DESCRIPTION =
  'Talking points, sources and resources for every Ship Sh*t Show livestream.';

export function generateMetadata(): Metadata {
  const defaults = buildDefaultMetadata();
  const url = toAbsoluteUrl('/talking-points');
  return {
    ...defaults,
    alternates: { canonical: url },
    description: DESCRIPTION,
    openGraph: {
      ...defaults.openGraph,
      description: DESCRIPTION,
      title: TITLE,
      url,
    },
    title: TITLE,
    twitter: { ...defaults.twitter, description: DESCRIPTION, title: TITLE },
  };
}

export default async function EpisodeNotesPage() {
  const pages = await listEpisodePages();

  return (
    <main className="min-h-screen bg-surface px-5 py-6 text-text-primary md:px-8 md:py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-red">
            Ship Sh*t Show
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">
            Episode notes
          </h1>
          <p className="mt-2 text-base text-text-muted">{DESCRIPTION}</p>
        </div>
        {pages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-border bg-surface-card/40 p-6 text-base text-text-muted">
            No episode notes are published yet.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-card">
            {pages.map((page) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-4"
                key={page.date}
              >
                <Link
                  className="text-lg font-semibold text-text-primary hover:underline"
                  href={page.href}
                >
                  {page.title}
                </Link>
                <span className="flex items-center gap-4 text-sm text-text-muted">
                  <time dateTime={page.date}>
                    {formatLivestreamDate(page.date)}
                  </time>
                  {page.youtubeUrl ? (
                    <a
                      className="hover:text-text-primary hover:underline"
                      href={page.youtubeUrl}
                      rel="noopener"
                    >
                      Watch on YouTube
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
