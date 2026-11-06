import { BarChart3, Library, Radio, Telescope, Users } from 'lucide-react';

/** The five rail apps. Each app's links are its sidebar. */
export const PRODUCTION_APPS = [
  {
    href: '/content',
    icon: Radio,
    id: 'content',
    label: 'Content',
    links: [
      { href: '/content', label: 'All content' },
      { href: '/content/livestreams', label: 'Livestreams' },
      { href: '/content/videos', label: 'Videos' },
      { href: '/content/shorts', label: 'Shorts' },
    ],
    roots: ['/content', '/artifacts'],
  },
  {
    href: '/analytics',
    icon: BarChart3,
    id: 'analytics',
    label: 'Analytics',
    links: [
      { href: '/analytics', label: 'Channels' },
      { href: '/analytics/episodes', label: 'Episodes' },
      { href: '/analytics/socials', label: 'Socials' },
    ],
    roots: ['/analytics'],
  },
  {
    href: '/library/thumbnails',
    icon: Library,
    id: 'library',
    label: 'Library',
    links: [
      { href: '/library/thumbnails', label: 'Thumbnails' },
      { href: '/library/titles', label: 'Titles' },
      { href: '/library/covers', label: 'Shorts covers' },
      { href: '/library/transcripts', label: 'Transcripts' },
      { href: '/library/artifacts', label: 'Artifacts' },
      { href: '/library/assets', label: 'Assets' },
    ],
    roots: ['/library'],
  },
  {
    href: '/prep/sources',
    icon: Telescope,
    id: 'prep',
    label: 'Prep',
    links: [
      { href: '/prep/sources', label: 'Sources' },
      { href: '/prep/backlog', label: 'Backlog' },
    ],
    roots: ['/prep'],
  },
  {
    href: '/audience/comments',
    icon: Users,
    id: 'audience',
    label: 'Audience',
    links: [
      { href: '/audience/comments', label: 'Comments' },
      { href: '/audience/leads', label: 'Leads' },
    ],
    roots: ['/audience'],
  },
] as const;

/** Page route of one livestream's prep tab. */
export function livestreamPath(slug: string, tab?: string): string {
  const base = `/content/livestreams/${encodeURIComponent(slug)}`;
  return tab ? `${base}/${tab}` : base;
}

export function isNavigationActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
export function getActiveNavigationHref(
  pathname: string,
  links: readonly { href: string }[],
): string | undefined {
  return links
    .filter((link) => isNavigationActive(pathname, link.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
export function getProductionApp(pathname: string) {
  return PRODUCTION_APPS.find((app) =>
    app.roots.some((root) => isNavigationActive(pathname, root)),
  );
}
export function getProductionPageLabel(pathname: string): string {
  if (pathname.endsWith('/draw')) return 'Drawing board';
  if (pathname.startsWith('/content/livestreams/')) {
    const tabs: Record<string, string> = {
      distribution: 'Distribution',
      resources: 'Resources',
      'talking-points': 'Talking points',
      transcript: 'Transcript',
      tweets: 'Tweets',
      'x-posts': 'X posts',
    };
    return tabs[pathname.split('/').at(-1) ?? ''] ?? 'Livestream';
  }
  const app = getProductionApp(pathname);
  return (
    app?.links.find((link) => link.href === pathname)?.label ??
    app?.label ??
    'Production'
  );
}
