'use client';
import { cn } from '@shipshitshow/ui';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getActiveNavigationHref,
  getProductionApp,
} from '@/lib/app-navigation';

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const app = getProductionApp(pathname);
  const activeHref = getActiveNavigationHref(pathname, app?.links ?? []);
  return (
    <aside className="flex w-[232px] min-w-0 shrink flex-col border-r border-surface-border bg-surface-elevated/30">
      <div className="px-4 pb-3 pt-5">
        <p className="text-sm font-semibold text-text-primary">
          Ship Sh!t Show
        </p>
        <p className="mt-1 text-xs text-text-muted">Production workspace</p>
      </div>
      <nav
        aria-label={`${app?.label ?? 'Production'} navigation`}
        className="min-h-0 flex-1 overflow-y-auto px-2"
      >
        <p className="px-3 pb-2 text-xs text-text-muted">
          {app?.label ?? 'Production'}
        </p>
        {app?.links.map((link) => {
          const active = link.href === activeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'mb-0.5 block rounded-md px-3 py-2 text-[13px] transition-colors',
                active
                  ? 'bg-surface-border/60 font-medium text-text-primary'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
              )}
            >
              {link.label}
            </Link>
          );
        })}
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
