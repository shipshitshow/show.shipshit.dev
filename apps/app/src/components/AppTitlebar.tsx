'use client';
import { cn } from '@shipshitshow/ui';
import { Menu, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSidebarState } from '@/components/livestreams/SidebarStateContext';
import { getProductionApp, getProductionPageLabel } from '@/lib/app-navigation';

export function AppTitlebar({
  onOpenNavigation,
}: {
  onOpenNavigation: () => void;
}) {
  const pathname = usePathname();
  const app = getProductionApp(pathname);
  const label = getProductionPageLabel(pathname);
  const { agentOpen, toggleAgent } = useSidebarState();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 px-3 text-[13px] md:px-4">
      <button
        type="button"
        onClick={onOpenNavigation}
        aria-label="Open navigation"
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated md:hidden"
      >
        <Menu size={18} />
      </button>
      {app && (
        <app.icon
          size={15}
          className="hidden shrink-0 text-text-secondary md:block"
          aria-hidden="true"
        />
      )}
      <span className="shrink-0 text-text-secondary">
        {app?.label ?? 'Production'}
      </span>
      {label !== app?.label && (
        <>
          <span aria-hidden="true" className="text-text-muted">
            /
          </span>
          <span className="truncate text-text-primary">{label}</span>
        </>
      )}
      <button
        type="button"
        onClick={toggleAgent}
        aria-expanded={agentOpen}
        aria-label={agentOpen ? 'Close the agent' : 'Open the agent'}
        title="Content agent"
        className={cn(
          'ml-auto flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
          agentOpen
            ? 'bg-surface-border text-text-primary'
            : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
        )}
      >
        <Sparkles size={16} aria-hidden="true" />
      </button>
    </header>
  );
}
