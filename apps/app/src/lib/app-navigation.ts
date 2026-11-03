import {
  BarChart3,
  Handshake,
  Home,
  Radio,
  Share2,
  Telescope,
} from 'lucide-react';

export const PRODUCTION_APPS = [
  {
    group: 'daily',
    href: '/studio',
    icon: Home,
    id: 'home',
    label: 'Home',
    links: [{ href: '/studio', label: 'Overview' }],
    roots: ['/studio'],
  },
  {
    group: 'daily',
    href: '/livestreams',
    icon: Radio,
    id: 'shows',
    label: 'Show prep',
    links: [
      { href: '/livestreams', label: 'Livestreams' },
      { href: '/videos', label: 'Edited videos' },
      { href: '/artifacts', label: 'Artifacts library' },
    ],
    roots: [
      '/livestreams',
      '/livestream',
      '/live-stream',
      '/videos',
      '/artifacts',
    ],
  },
  {
    group: 'daily',
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
    group: 'daily',
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
    group: 'more',
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
    group: 'more',
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
] as const;

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
