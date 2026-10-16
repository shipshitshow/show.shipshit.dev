'use client';
import { cn } from '@shipshitshow/ui';
import { Ellipsis, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppAccountButton } from '@/components/AppAccountButton';
import { BrandMark } from '@/components/BrandMark';
import { useSidebarState } from '@/components/livestreams/SidebarStateContext';
import { getProductionApp, PRODUCTION_APPS } from '@/lib/app-navigation';

export function AppRail({ onNavigate }: { onNavigate?: () => void }) {
  const active = getProductionApp(usePathname());
  const { collapsed, toggle } = useSidebarState();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    function outside(event: PointerEvent) {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreButton.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [moreOpen]);
  function navigate() {
    setMoreOpen(false);
    onNavigate?.();
  }
  return (
    <nav
      aria-label="Production apps"
      className="flex w-[52px] shrink-0 flex-col items-center gap-2 bg-surface py-3"
    >
      <Link
        href="/"
        aria-label="Ship Sh!t Show home"
        className="mb-2 flex size-9 items-center justify-center text-accent-red"
      >
        <BrandMark size={26} />
      </Link>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="mb-4 hidden size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-elevated md:flex"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
      {PRODUCTION_APPS.filter((app) => app.group === 'daily').map((app) => (
        <Link
          key={app.id}
          href={app.href}
          onClick={navigate}
          aria-label={app.label}
          title={app.label}
          aria-current={active?.id === app.id ? 'page' : undefined}
          className={cn(
            'flex size-9 items-center justify-center rounded-lg transition-colors',
            active?.id === app.id
              ? 'bg-surface-border text-text-primary'
              : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
          )}
        >
          <app.icon size={17} aria-hidden="true" />
        </Link>
      ))}
      <div
        ref={moreRef}
        className="relative mt-1 border-t border-surface-border pt-3"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setMoreOpen(false);
        }}
      >
        <button
          ref={moreButton}
          type="button"
          aria-label="More apps"
          title="More apps"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            'flex size-9 items-center justify-center rounded-lg',
            active?.group === 'more' || moreOpen
              ? 'bg-surface-border text-text-primary'
              : 'text-text-secondary hover:bg-surface-elevated',
          )}
        >
          <Ellipsis size={18} aria-hidden="true" />
        </button>
        {moreOpen && (
          <div className="absolute left-11 top-2 z-50 w-52 rounded-xl border border-surface-border bg-surface-card p-1.5 shadow-xl">
            <p className="px-3 py-2 text-xs text-text-muted">More apps</p>
            {PRODUCTION_APPS.filter((app) => app.group === 'more').map(
              (app) => (
                <Link
                  key={app.id}
                  href={app.href}
                  onClick={navigate}
                  aria-current={active?.id === app.id ? 'page' : undefined}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                >
                  <app.icon size={16} aria-hidden="true" />
                  {app.label}
                </Link>
              ),
            )}
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center justify-center pt-4">
        <AppAccountButton />
      </div>
    </nav>
  );
}
