import {
  BarChart3,
  FlaskConical,
  Handshake,
  Library,
  Radio,
  Share2,
  Telescope,
} from 'lucide-react';

export const PRODUCTION_APPS = [
  {
    href: '/content',
    icon: Radio,
    id: 'content',
    label: 'Content',
    links: [
      { href: '/content', label: 'All content' },
      {
        href: '/content/livestreams',
        label: 'Livestreams',
        match: ['/livestreams'],
      },
      { href: '/content/videos', label: 'Videos' },
      { href: '/content/shorts', label: 'Shorts' },
    ],
    // Livestream prep pages stay under /livestreams/[slug] for now.
    roots: ['/content', '/livestreams', '/artifacts'],
  },
  {
    href: '/analytics',
    icon: BarChart3,
    id: 'analytics',
    label: 'Channel analytics',
    links: [
      { href: '/analytics', label: 'Channels' },
      { href: '/analytics/episodes', label: 'Episode performance' },
    ],
    roots: ['/analytics'],
  },
  {
    href: '/socials',
    icon: Share2,
    id: 'socials',
    label: 'Socials',
    links: [
      { href: '/socials', label: 'Social performance' },
      { href: '/comments', label: 'YouTube comments' },
    ],
    roots: ['/socials', '/comments'],
  },
  {
    href: '/partnerships',
    icon: Handshake,
    id: 'partnerships',
    label: 'Partnerships',
    links: [
      { href: '/partnerships', label: 'Partnerships' },
      { href: '/leads', label: 'Audience leads' },
    ],
    roots: ['/partnerships', '/leads'],
  },
  {
    href: '/research',
    icon: Telescope,
    id: 'research',
    label: 'Research',
    links: [
      { href: '/research', label: 'Source scanner' },
      { href: '/topics', label: 'Topic backlog' },
    ],
    roots: ['/research', '/trends', '/topics'],
  },
  {
    href: '/library',
    icon: Library,
    id: 'library',
    label: 'Library',
    links: [
      { href: '/library', label: 'Overview' },
      { href: '/library/assets', label: 'Assets' },
      { href: '/library/artifacts', label: 'Artifacts' },
      { href: '/library/thumbnails', label: 'Thumbnails' },
      { href: '/library/covers', label: 'Covers' },
      { href: '/library/transcripts', label: 'Transcripts' },
    ],
    roots: ['/library'],
  },
  {
    href: '/labs',
    icon: FlaskConical,
    id: 'labs',
    label: 'Labs',
    links: [
      { href: '/labs', label: 'Overview' },
      { href: '/labs/thumbnails', label: 'Thumbnail Lab' },
      { href: '/labs/titles', label: 'Titles Lab' },
    ],
    roots: ['/labs'],
  },
] as const;

export function isNavigationActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
/** `match` lists other prefixes a link owns, such as a list's detail pages. */
export function getActiveNavigationHref(
  pathname: string,
  links: readonly { href: string; match?: readonly string[] }[],
): string | undefined {
  return links
    .filter((link) =>
      [link.href, ...(link.match ?? [])].some((prefix) =>
        isNavigationActive(pathname, prefix),
      ),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
export function getProductionApp(pathname: string) {
  return PRODUCTION_APPS.find((app) =>
    app.roots.some((root) => isNavigationActive(pathname, root)),
  );
}
export function getProductionPageLabel(pathname: string): string {
  if (pathname.endsWith('/draw')) return 'Drawing board';
  if (pathname.includes('/livestreams/')) {
    const tabs: Record<string, string> = {
      distribution: 'Distribution',
      resources: 'Resources',
      'talking-points': 'Talking points',
      transcript: 'Transcript',
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
