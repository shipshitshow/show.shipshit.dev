'use client';
import { cn } from '@shipshitshow/ui';
import { ArrowUpRight, BookOpen, Presentation } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  EPISODE_PAGES,
  episodeSlugFromPath,
  getActiveNavigationHref,
  getProductionApp,
  livestreamPath,
} from '@/lib/app-navigation';
import { useSidebarState } from './livestreams/SidebarStateContext';

const itemClass = (active: boolean) =>
  cn(
    'mb-0.5 block rounded-md px-3 py-2 text-[13px] transition-colors',
    active
      ? 'bg-surface-border/60 font-medium text-text-primary'
      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
  );

/** A livestream's own pages, nested under it while one is open. */
function EpisodePages({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  const { episode } = useSidebarState();
  const slug = episodeSlugFromPath(pathname);
  if (!episode || !slug || episode.slug !== slug) return null;
  const pages = EPISODE_PAGES.filter(
    (page) => page.tab !== 'transcript' || episode.hasTranscript,
  );
  return (
    <div className="mt-3 border-t border-surface-border pt-3">
      <p
        className="mb-1 line-clamp-2 px-3 text-[11px] font-medium text-text-muted"
        title={episode.title}
      >
        {episode.title}
      </p>
      <div className="ml-3 border-l border-surface-border pl-1">
        {pages.map((page) => {
          const href = livestreamPath(slug, page.tab);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={page.tab}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              {page.label}
            </Link>
          );
        })}
        <Link
          href={livestreamPath(slug, 'tweets')}
          target="_blank"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
        >
          <Presentation size={13} aria-hidden="true" />
          Tweet slider
          <ArrowUpRight className="ml-auto" size={12} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const app = getProductionApp(pathname);
  const activeHref = getActiveNavigationHref(pathname, app?.links ?? []);
  return (
    <aside className="flex w-[232px] min-w-0 shrink flex-col border-r border-surface-border bg-surface-elevated/30">
      <nav
        aria-label={`${app?.label ?? 'Production'} navigation`}
        className="min-h-0 flex-1 overflow-y-auto px-2 pt-4"
      >
        {app?.links.map((link) => {
          // Inside a livestream, its nested pages carry the highlight.
          const active =
            link.href === activeHref && !episodeSlugFromPath(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              {link.label}
            </Link>
          );
        })}
        {app?.id === 'content' ? (
          <EpisodePages onNavigate={onNavigate} pathname={pathname} />
        ) : null}
      </nav>
      <div className="space-y-1 p-2 text-xs text-text-secondary">
        <a
          href="https://github.com/shipshitshow/skills"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-surface-elevated"
        >
          <BookOpen size={14} aria-hidden="true" />
          Production skills
          <ArrowUpRight className="ml-auto" size={12} aria-hidden="true" />
        </a>
        <Link
          href="/"
          className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-surface-elevated"
        >
          Public library
          <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
