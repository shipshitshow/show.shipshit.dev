import { BrandMark, Button, cn } from '@shipshitshow/ui';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Terminal,
  X,
} from 'lucide-react';

interface TitlebarProps {
  activeViewLabel: string;
  isSettingsView: boolean;
  onSelectSettings: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  sidebarCollapsed: boolean;
  terminalVisible: boolean;
}

export function Titlebar({
  activeViewLabel,
  isSettingsView,
  onSelectSettings,
  onToggleSidebar,
  onToggleTerminal,
  sidebarCollapsed,
  terminalVisible,
}: TitlebarProps) {
  return (
    <header className="relative flex h-[38px] shrink-0 items-center justify-between border-b border-surface-border bg-surface pl-[84px] pr-2 app-region-drag">
      <div className="flex min-w-0 items-center gap-2 text-[11px]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 rounded-md app-region-no-drag"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={14} />
          ) : (
            <PanelLeftClose size={14} />
          )}
        </Button>
        <BrandMark size={16} className="text-accent-red" />
        <span className="text-text-muted">Ship Sh!t Show</span>
        <span className="text-text-muted">/</span>
        <span className="truncate font-medium text-text-primary">
          {activeViewLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {!isSettingsView && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'shrink-0 gap-1.5 rounded-md app-region-no-drag',
              terminalVisible && 'bg-surface-elevated text-text-primary',
            )}
            onClick={onToggleTerminal}
            title={
              terminalVisible ? 'Hide terminal (⌘J)' : 'Show terminal (⌘J)'
            }
          >
            <Terminal
              size={14}
              className={
                terminalVisible ? 'text-text-primary' : 'text-text-secondary'
              }
            />
            <span className="text-[11px]">Terminal</span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'shrink-0 rounded-md app-region-no-drag',
            isSettingsView && 'bg-surface-elevated text-text-primary',
          )}
          onClick={onSelectSettings}
          title="Settings"
        >
          {isSettingsView ? (
            <X size={14} className="text-text-primary" />
          ) : (
            <Settings size={14} className="text-text-secondary" />
          )}
        </Button>
      </div>
    </header>
  );
}
