import { BRAND } from '@shipshitshow/ui/brand';
import { ArrowUpRight, Play } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { BrandMark } from '@/components/BrandMark';
import { getPublicEpisodes, type PublicEpisode } from '@/lib/public-episodes';
import { showXAccounts } from '@/lib/show-accounts';
import styles from './home.module.scss';

export const metadata: Metadata = {
  description:
    'Think AI. Vincent and Mitchell share what it takes to build and run businesses with AI. Watch the latest videos and livestreams.',
  title: `${BRAND.identity.show_name} — ${BRAND.identity.baseline}`,
};
export const revalidate = 3600;
const CHANNEL = 'https://www.youtube.com/@ShipShitShow';
const resources = [
  {
    description: 'The workflows behind the show.',
    href: 'https://github.com/shipshitshow/skills',
    name: 'Skills',
  },
  {
    description: 'Transcripts, links and sources.',
    href: 'https://github.com/shipshitshow/vault',
    name: 'Show notes',
  },
  {
    description: 'What we build and share.',
    href: 'https://github.com/shipshitshow/examples',
    name: 'Examples',
  },
  {
    description: 'The show identity and production guides.',
    href: 'https://github.com/shipshitshow/vault/tree/master/brand',
    name: 'Brand kit',
  },
];

function EpisodeSection({
  episodes,
  format,
  id,
  title,
}: {
  episodes: PublicEpisode[];
  format: PublicEpisode['format'];
  id: string;
  title: string;
}) {
  const allHref = `${CHANNEL}/${format === 'livestream' ? 'streams' : 'videos'}`;
  return (
    <section aria-labelledby={`${id}-title`} className={styles.library} id={id}>
      <div className={styles.sectionHeading}>
        <h2 id={`${id}-title`}>{title}</h2>
        <a className={styles.textLink} href={allHref}>
          View all <ArrowUpRight aria-hidden="true" size={18} />
        </a>
      </div>
      {episodes.length ? (
        <ul className={styles.episodeGrid}>
          {episodes.slice(0, 3).map((episode) => (
            <li key={episode.id}>
              <a className={styles.episodeCard} href={episode.url}>
                <div className={styles.thumbnail}>
                  <Image
                    alt=""
                    height={360}
                    sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 400px"
                    src={episode.thumbnailUrl}
                    width={480}
                  />
                  <span
                    className={`${styles.signature} ${format === 'livestream' ? styles.liveSignature : ''}`}
                  >
                    <BrandMark />
                  </span>
                </div>
                <div className={styles.episodeMeta}>
                  <span>
                    {format === 'livestream' ? 'Livestream' : 'Video'}
                  </span>
                  <time dateTime={episode.publishedAt}>
                    {new Intl.DateTimeFormat('en', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                      year: 'numeric',
                    }).format(new Date(episode.publishedAt))}
                  </time>
                </div>
                <h3>{episode.title}</h3>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          Watch the latest {format === 'livestream' ? 'livestreams' : 'videos'}{' '}
          on <a href={allHref}>YouTube</a>.
        </p>
      )}
    </section>
  );
}

export default async function HomePage() {
  const { livestreams, videos } = await getPublicEpisodes();
  const latest = [...videos, ...livestreams].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  )[0];
  return (
    <main className={styles.home}>
      <a className={styles.skipLink} href="#library">
        Skip to episodes
      </a>
      <div className={styles.page}>
        <header className={styles.header}>
          <a
            aria-label="Ship Sh!t Show home"
            className={styles.wordmark}
            href="/"
          >
            <BrandMark />
            <span>{BRAND.identity.show_name}</span>
          </a>
          <nav aria-label="Main navigation" className={styles.navigation}>
            <a href="#library">Videos</a>
            <a href="#live">Live</a>
            <a href="#about">About</a>
          </nav>
          <a
            aria-label="Watch Ship Sh!t Show on YouTube"
            className={styles.headerWatch}
            href={CHANNEL}
          >
            <Play aria-hidden="true" fill="currentColor" size={15} />
            <span>Watch on YouTube</span>
          </a>
        </header>
        <section aria-labelledby="show-title" className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 id="show-title">
              <BrandMark />
              {BRAND.identity.baseline}
            </h1>
            <p className={styles.hosts}>Vincent &amp; Mitchell</p>
            <p className={styles.intro}>
              Two founders building with AI. The tools, the workflows, and what
              happens when we put them to work.
            </p>
            <a className={styles.watchButton} href={latest?.url ?? CHANNEL}>
              <Play aria-hidden="true" fill="currentColor" size={17} />
              Watch the latest episode
            </a>
          </div>
          <div className={styles.portrait}>
            <Image
              alt="Vincent on the left and Mitchell on the right"
              className={styles.hostImage}
              height={1024}
              priority
              sizes="(max-width: 760px) 100vw, (max-width: 1376px) 70vw, 902px"
              src="/brand/hosts-2026-10.jpg"
              width={1536}
            />
          </div>
        </section>
        <EpisodeSection
          episodes={videos}
          format="video"
          id="library"
          title="Latest videos"
        />
        <EpisodeSection
          episodes={livestreams}
          format="livestream"
          id="live"
          title="The live show"
        />
        <section
          aria-labelledby="about-title"
          className={styles.about}
          id="about"
        >
          <div>
            <h2 id="about-title">Built in public.</h2>
            <p>
              We run businesses, build products and compare notes on AI. Join us
              for honest conversations about what works, what breaks and what
              we’re shipping next.
            </p>
          </div>
          <a className={styles.textLink} href={`${CHANNEL}?sub_confirmation=1`}>
            Subscribe on YouTube <ArrowUpRight aria-hidden="true" size={18} />
          </a>
        </section>
        <section aria-labelledby="setup-title" className={styles.setup}>
          <h2 id="setup-title">Take it further.</h2>
          <ul className={styles.setupGrid}>
            {resources.map((resource) => (
              <li key={resource.href}>
                <a className={styles.setupCard} href={resource.href}>
                  <div>
                    <h3>{resource.name}</h3>
                    <p>{resource.description}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" size={20} />
                </a>
              </li>
            ))}
          </ul>
        </section>
        <a className={styles.business} href="https://shipshit.dev">
          <BrandMark />
          <div>
            <h2>Build with us.</h2>
            <p>AI systems, SaaS and automation. shipshit.dev</p>
          </div>
          <ArrowUpRight aria-hidden="true" size={30} />
        </a>
        <footer className={styles.footer}>
          <span>{BRAND.identity.show_name}</span>
          <div>
            <a href="https://www.youtube.com/@ShipShitShowClips/shorts">
              Clips
            </a>
            {showXAccounts.map((account) => (
              <a href={account.href} key={account.handle}>
                @{account.handle}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
