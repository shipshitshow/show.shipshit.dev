'use client';

import { BRAND } from '@shipshitshow/ui/brand';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';

const NAV_LINKS = [
  { href: '/analytics', label: 'Analytics' },
  { href: '/livestreams', label: 'Livestreams' },
  { href: '/videos', label: 'Videos' },
];

const SUBTITLE_MAP: Record<string, string> = {
  '/analytics': 'Analytics Dashboard',
  '/auth/youtube': 'Reconnect YouTube',
  '/livestreams': 'Livestreams',
  '/videos': 'Videos',
};

function resolveSubtitle(pathname: string): string {
  if (pathname.includes('/draw')) return 'Drawing Board';
  if (pathname.startsWith('/videos/')) return 'Video Transcript';
  if (pathname.startsWith('/livestreams/')) return 'Show Rundown';
  return SUBTITLE_MAP[pathname] ?? BRAND.identity.show_name;
}

function resolveActiveHref(pathname: string): string {
  if (pathname.startsWith('/livestreams')) return '/livestreams';
  if (pathname.startsWith('/videos')) return '/videos';
  if (pathname.startsWith('/analytics') || pathname === '/')
    return '/analytics';
  return '';
}

export function AppHeader() {
  const pathname = usePathname();
  const subtitle = resolveSubtitle(pathname);
  const activeHref = resolveActiveHref(pathname);

  return (
    <header className="border-b border-surface-border px-6 py-4 flex items-center justify-between gap-6">
      <Link
        href="/analytics"
        className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity"
      >
        <div className="size-8 rounded-lg bg-accent-red flex items-center justify-center shrink-0">
          <BrandMark size={24} className="text-on-accent" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-text-primary leading-none">
            {BRAND.identity.show_name}
          </h1>
          <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>
        </div>
      </Link>
      <nav className="flex items-center gap-4 text-xs text-text-secondary shrink-0">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === activeHref
                ? 'text-text-primary font-medium'
                : 'hover:text-text-primary transition-colors'
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
