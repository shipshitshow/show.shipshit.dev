'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

export function RailLogo({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle?: () => void;
}) {
  // The mobile drawer has no sidebar to collapse, so its mark stays plain.
  if (!onToggle)
    return (
      <span
        aria-hidden="true"
        className="mb-4 flex size-9 items-center justify-center text-accent-red"
      >
        <BrandMark size={26} />
      </span>
    );

  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(event) => event.preventDefault()}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      className="group relative mb-4 flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/40"
    >
      <span className="absolute inset-0 flex items-center justify-center text-accent-red transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
        <BrandMark size={26} />
      </span>
      <span
        aria-hidden="true"
        data-rail-toggle-icon
        className="absolute inset-0 flex items-center justify-center text-text-secondary opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <Icon size={16} />
      </span>
    </button>
  );
}
