import { ExternalLink } from 'lucide-react';
import { getResourceLinks } from '@/lib/livestream-sections';
import type { LivestreamCard } from '@/lib/livestreams-ui';

/** Every link in the prep, once, and nothing else. */
export function StreamResourcesPanel({ cards }: { cards: LivestreamCard[] }) {
  const links = getResourceLinks(cards);

  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card/40 p-6 text-base text-text-muted">
        No resources have been added for this livestream yet.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border bg-surface-card">
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-elevated/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary group-hover:text-accent-red">
                {link.label}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {hostOf(link.url)}
              </span>
            </span>
            <ExternalLink
              aria-hidden
              className="size-3.5 shrink-0 text-text-muted"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

function hostOf(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return hostname.replace(/^www\./, '') + (pathname === '/' ? '' : pathname);
  } catch {
    return url;
  }
}
