import { cn } from '@shipshitshow/ui';
import { BRAND_COLORS } from '@shipshitshow/ui/brand';
import { useEffect, useRef } from 'react';

type Disposable = { dispose: () => void };

interface TerminalViewProps {
  className?: string;
}

export function TerminalView({ className }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let detachData: (() => void) | null = null;
    let detachExit: (() => void) | null = null;
    let observer: ResizeObserver | null = null;
    let terminalInstance: import('xterm').Terminal | null = null;
    let inputSubscription: Disposable | null = null;
    let resizeSubscription: Disposable | null = null;

    async function init() {
      if (!containerRef.current) return;

      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit'),
      ]);

      if (cancelled || !containerRef.current) {
        return;
      }

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: '"SF Mono", SFMono-Regular, Consolas, Menlo, monospace',
        fontSize: 14,
        theme: {
          background: BRAND_COLORS.ink,
          cursor: BRAND_COLORS.accent_red,
          foreground: BRAND_COLORS.white,
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      terminalInstance = term;

      const { terminal } = window.electronAPI;
      const spawnResult = await terminal.spawn(term.cols, term.rows);

      if (cancelled) {
        await terminal.kill();
        term.dispose();
        return;
      }

      if (spawnResult.error) {
        term.writeln('\x1b[31mUnable to start terminal.\x1b[0m');
        term.writeln(`\r\n${spawnResult.error}`);
        term.writeln(`\r\nShell: ${spawnResult.shell}`);
        term.writeln(`\r\nWorking directory: ${spawnResult.cwd}`);
      } else {
        terminal.subscribe();

        detachData = terminal.onData((data) => term.write(data));
        detachExit = terminal.onExit((code) => {
          term.writeln(`\r\n[Process exited with code ${code}]`);
        });

        inputSubscription = term.onData((data) => {
          void terminal.write(data);
        });
        resizeSubscription = term.onResize(({ cols, rows }) => {
          void terminal.resize(cols, rows);
        });
      }

      observer = new ResizeObserver(() => fitAddon.fit());
      observer.observe(containerRef.current);

      term.focus();
    }

    void init();

    return () => {
      cancelled = true;
      observer?.disconnect();
      inputSubscription?.dispose();
      resizeSubscription?.dispose();
      detachData?.();
      detachExit?.();
      terminalInstance?.dispose();
      void window.electronAPI.terminal.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('h-full w-full bg-surface p-2', className)}
    />
  );
}
