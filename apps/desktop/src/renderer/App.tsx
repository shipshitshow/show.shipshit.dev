import { LayoutGrid, MessageSquare, Settings, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { YouTubeAuthView } from './components/auth/YouTubeAuthView';
import { CommentsView } from './components/comments/CommentsView';
import { type ShellNavItem, Sidebar } from './components/shell/Sidebar';
import { TerminalDrawer } from './components/shell/TerminalDrawer';
import { Titlebar } from './components/shell/Titlebar';
import { TerminalView } from './components/TerminalView';
import { KanbanBoard } from './components/topics/KanbanBoard';
import { TrendsView } from './components/trends/TrendsView';

const PRIMARY_VIEWS: ShellNavItem[] = [
  { icon: LayoutGrid, id: 'topics', label: 'Topics' },
  { icon: TrendingUp, id: 'trends', label: 'Trends' },
  { icon: MessageSquare, id: 'comments', label: 'Comments' },
];

const SECONDARY_VIEWS: ShellNavItem[] = [
  { icon: Settings, id: 'settings', label: 'Settings' },
];

const ALL_VIEWS = [...PRIMARY_VIEWS, ...SECONDARY_VIEWS];

type ViewId = 'topics' | 'trends' | 'comments' | 'settings';

function renderView(activeView: ViewId) {
  switch (activeView) {
    case 'topics':
      return <KanbanBoard />;
    case 'trends':
      return <TrendsView />;
    case 'comments':
      return <CommentsView />;
    case 'settings':
      return <YouTubeAuthView />;
    default:
      return <TerminalView />;
  }
}

export function App() {
  const [activeView, setActiveView] = useState<ViewId>('topics');
  const [previousView, setPreviousView] = useState<ViewId>('topics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(280);

  const activeViewLabel =
    ALL_VIEWS.find((item) => item.id === activeView)?.label ?? 'Topics';
  const isSettingsView = activeView === 'settings';
  const hideMainContent = terminalVisible && terminalMaximized;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => !current);
  }, []);

  const toggleTerminal = useCallback(() => {
    setTerminalVisible((current) => {
      const nextVisible = !current;
      if (!nextVisible) {
        setTerminalMaximized(false);
      }
      return nextVisible;
    });
  }, []);

  const toggleTerminalMaximized = useCallback(() => {
    setTerminalVisible(true);
    setTerminalMaximized((current) => !current);
  }, []);

  const handleSelectSettings = useCallback(() => {
    if (isSettingsView) {
      setActiveView(previousView);
    } else {
      setPreviousView(activeView);
      setActiveView('settings');
    }
  }, [isSettingsView, activeView, previousView]);

  const handleSelectView = useCallback((viewId: string) => {
    setActiveView(viewId as ViewId);
  }, []);

  // use-effect-audit: ignore subscribes to window keydown for app shortcuts (browser event)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        Boolean(target?.isContentEditable);

      if (isEditable) {
        return;
      }

      const modifierPressed = event.metaKey || event.ctrlKey;

      if (!modifierPressed || event.altKey || event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }

      if (key === 'j') {
        event.preventDefault();
        toggleTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleTerminal]);

  const content = useMemo(() => renderView(activeView), [activeView]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-text-primary">
      <Titlebar
        activeViewLabel={activeViewLabel}
        isSettingsView={isSettingsView}
        onSelectSettings={handleSelectSettings}
        onToggleSidebar={toggleSidebar}
        onToggleTerminal={toggleTerminal}
        sidebarCollapsed={sidebarCollapsed}
        terminalVisible={terminalVisible}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <Sidebar
            activeView={activeView}
            onSelect={handleSelectView}
            primaryItems={PRIMARY_VIEWS}
            secondaryItems={SECONDARY_VIEWS}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              hideMainContent ? 'hidden' : 'min-h-0 flex-1 overflow-hidden'
            }
          >
            {content}
          </div>
          {terminalVisible && (
            <TerminalDrawer
              height={terminalHeight}
              maximized={terminalMaximized}
              onClose={toggleTerminal}
              onHeightChange={setTerminalHeight}
              onToggleMaximize={toggleTerminalMaximized}
            />
          )}
        </div>
      </div>
    </div>
  );
}
