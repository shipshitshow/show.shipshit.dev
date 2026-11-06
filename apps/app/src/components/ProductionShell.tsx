'use client';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppRail } from '@/components/AppRail';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTitlebar } from '@/components/AppTitlebar';
import { ContentAgent } from '@/components/agent/ContentAgent';
import { useSidebarState } from '@/components/livestreams/SidebarStateContext';

export function ProductionShell({ children }: { children: React.ReactNode }) {
  const { agentOpen, collapsed } = useSidebarState();
  const pathname = usePathname();
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const mobileOpen = mobilePath === pathname;
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLButtonElement>('button')?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobilePath(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        drawer?.querySelectorAll<HTMLElement>('a[href], button') ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [mobileOpen]);
  const closeNavigation = () => setMobilePath(null);
  return (
    <div
      id="app-content-shell"
      className="production-shell flex h-dvh min-h-0 bg-surface text-text-primary"
    >
      <a
        href="#production-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-surface-card focus:p-3"
      >
        Skip to content
      </a>
      <div className="hidden md:flex">
        <AppRail />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTitlebar onOpenNavigation={() => setMobilePath(pathname)} />
        <div className="flex min-h-0 flex-1 overflow-hidden border-surface-border bg-surface-card md:mb-2 md:mr-2 md:rounded-lg md:border">
          {!collapsed && (
            <div className="hidden min-h-0 md:flex">
              <AppSidebar />
            </div>
          )}
          <main
            id="production-content"
            tabIndex={-1}
            className="min-h-0 min-w-0 flex-1 overflow-auto outline-none"
          >
            {children}
          </main>
          {agentOpen ? <ContentAgent /> : null}
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation backdrop"
            className="absolute inset-0 bg-black/60"
            onClick={closeNavigation}
            tabIndex={-1}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Production navigation"
            className="relative flex h-full w-[90vw] max-w-80 flex-col border-r border-surface-border bg-surface"
          >
            <div className="flex h-12 shrink-0 items-center justify-between px-4">
              <span className="text-sm font-medium">Production</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={closeNavigation}
                className="flex size-9 items-center justify-center rounded-md hover:bg-surface-elevated"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1">
              <AppRail onNavigate={closeNavigation} />
              <AppSidebar onNavigate={closeNavigation} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
