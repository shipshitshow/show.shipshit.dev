'use client';
import { cn } from '@shipshitshow/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppAccountButton } from '@/components/AppAccountButton';
import { useSidebarState } from '@/components/livestreams/SidebarStateContext';
import { RailLogo } from '@/components/RailLogo';
import { getProductionApp, PRODUCTION_APPS } from '@/lib/app-navigation';

export function AppRail({ onNavigate }: { onNavigate?: () => void }) {
  const active = getProductionApp(usePathname());
  const { collapsed, toggle } = useSidebarState();
  return (
    <nav
      aria-label="Production apps"
      className="flex w-[52px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-surface py-3"
    >
      <RailLogo
        collapsed={collapsed}
        onToggle={onNavigate ? undefined : toggle}
      />
      {PRODUCTION_APPS.map((app) => (
        <Link
          key={app.id}
          href={app.href}
          onClick={onNavigate}
          aria-label={app.label}
          title={app.label}
          aria-current={active?.id === app.id ? 'page' : undefined}
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
            active?.id === app.id
              ? 'bg-surface-border text-text-primary'
              : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
          )}
        >
          <app.icon size={17} aria-hidden="true" />
        </Link>
      ))}
      <div className="mt-auto flex items-center justify-center pt-4">
        <AppAccountButton />
      </div>
    </nav>
  );
}
