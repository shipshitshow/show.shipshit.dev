'use client';

import '@excalidraw/excalidraw/index.css';
import {
  exportToBlob,
  MainMenu,
  serializeAsJSON,
  WelcomeScreen,
} from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types';
import type {
  LivestreamListResponse,
  Topic,
  TopicDrawingResponse,
} from '@shipshitshow/types';
import { isErrorResponse } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false },
);

const DRAWING_BACKGROUND = '#000000';

const EMPTY_SCENE: ExcalidrawInitialDataState = {
  appState: {
    viewBackgroundColor: DRAWING_BACKGROUND,
  },
  elements: [],
};

interface TopicDrawingBoardProps {
  date: string;
  slug: string;
}

interface ParsedSection {
  heading: string;
  body: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type SerializedSceneElements = Parameters<typeof serializeAsJSON>[0];
type SerializedSceneAppState = Parameters<typeof serializeAsJSON>[1];
type SerializedSceneFiles = Parameters<typeof serializeAsJSON>[2];

function parseMarkdownSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split('\n');
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({
          body: currentBody.join('\n').trim(),
          heading: currentHeading,
        });
      }
      currentHeading = line.slice(3);
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    sections.push({
      body: currentBody.join('\n').trim(),
      heading: currentHeading,
    });
  }

  return sections;
}

function isTalkingPointSection(heading: string): boolean {
  return heading.toLowerCase().includes('talking point');
}

function parseTalkingPoints(body: string): string[] {
  return body
    .split('\n')
    .filter((line) => line.startsWith('- ') && !line.startsWith('  - '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSavedAt(value: string | null): string {
  if (!value) return 'Not saved yet';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function serializePersistedScene(
  elements: SerializedSceneElements,
  appState: SerializedSceneAppState,
  files: SerializedSceneFiles,
): string {
  return serializeAsJSON(
    elements,
    {
      viewBackgroundColor: appState.viewBackgroundColor,
    } as AppState,
    files,
    'database',
  );
}

export function TopicDrawingBoard({ date, slug }: TopicDrawingBoardProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);
  const savingRef = useRef(false);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [initialScene, setInitialScene] =
    useState<ExcalidrawInitialDataState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sections = useMemo(
    () => parseMarkdownSections(topic?.content ?? ''),
    [topic?.content],
  );
  const summary = sections.find((section) => section.heading === 'Summary');
  const talkingPointSections = sections.filter((section) =>
    isTalkingPointSection(section.heading),
  );

  const saveDrawing = useCallback(async () => {
    if (!pendingContentRef.current || savingRef.current) return;

    const content = pendingContentRef.current;
    if (content === lastSavedContentRef.current) {
      pendingContentRef.current = null;
      return;
    }

    pendingContentRef.current = null;
    savingRef.current = true;
    setSaveStatus('saving');

    try {
      const res = await fetch(`/api/livestreams/${slug}/drawing?date=${date}`, {
        body: JSON.stringify({ content }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = (await res.json()) as { error?: string; updatedAt?: string };
      if (!res.ok) {
        throw new Error(data.error || `Save failed with ${res.status}`);
      }

      lastSavedContentRef.current = content;
      setLastSavedAt(data.updatedAt || new Date().toISOString());
      setSaveStatus('saved');
    } catch {
      pendingContentRef.current = content;
      setSaveStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [date, slug]);

  const scheduleSave = useCallback(
    (content: string) => {
      if (content === lastSavedContentRef.current) {
        pendingContentRef.current = null;
        return;
      }

      pendingContentRef.current = content;
      setSaveStatus((current) => (current === 'saving' ? current : 'idle'));

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveDrawing().catch(() => {
          setSaveStatus('error');
        });
      }, 3000);
    },
    [saveDrawing],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [topicsRes, drawingRes] = await Promise.all([
          fetch(`/api/livestreams?date=${date}`),
          fetch(`/api/livestreams/${slug}/drawing?date=${date}`),
        ]);

        const topicsData = (await topicsRes.json()) as
          | LivestreamListResponse
          | { error: string };
        const drawingData = (await drawingRes.json()) as
          | TopicDrawingResponse
          | { error: string };

        if (!topicsRes.ok || isErrorResponse(topicsData)) {
          throw new Error(
            isErrorResponse(topicsData)
              ? topicsData.error
              : `Failed to load topic ${topicsRes.status}`,
          );
        }

        if (!drawingRes.ok) {
          throw new Error(
            isErrorResponse(drawingData)
              ? drawingData.error
              : `Failed to load drawing ${drawingRes.status}`,
          );
        }

        if (isErrorResponse(drawingData)) {
          throw new Error(`Failed to load drawing ${drawingRes.status}`);
        }

        if (cancelled) return;

        const livestreamData = topicsData as LivestreamListResponse;
        const topicDrawingData = drawingData as TopicDrawingResponse;
        const sceneAppState = {
          ...(topicDrawingData.scene?.appState ?? EMPTY_SCENE.appState),
          viewBackgroundColor: DRAWING_BACKGROUND,
        };

        setTopic(
          livestreamData.topics.find((item) => item.slug === slug) || null,
        );
        setInitialScene(
          topicDrawingData.scene
            ? ({
                ...topicDrawingData.scene,
                appState: sceneAppState,
              } as ExcalidrawInitialDataState)
            : EMPTY_SCENE,
        );
        if (topicDrawingData.scene) {
          lastSavedContentRef.current = serializePersistedScene(
            (topicDrawingData.scene.elements ?? []) as SerializedSceneElements,
            sceneAppState as AppState,
            (topicDrawingData.scene.files ?? {}) as BinaryFiles,
          );
        } else {
          lastSavedContentRef.current = serializePersistedScene(
            [] as SerializedSceneElements,
            EMPTY_SCENE.appState as AppState,
            {} as BinaryFiles,
          );
        }
        setLastSavedAt(topicDrawingData.updatedAt);
        setSaveStatus(topicDrawingData.updatedAt ? 'saved' : 'idle');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load().catch(() => {
      if (!cancelled) {
        setInitialScene(EMPTY_SCENE);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [date, slug]);

  useEffect(() => {
    const flushPendingSave = () => {
      if (!pendingContentRef.current) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveDrawing().catch(() => {
        setSaveStatus('error');
      });
    };

    window.addEventListener('pointerup', flushPendingSave);

    return () => {
      window.removeEventListener('pointerup', flushPendingSave);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (
      elements: SerializedSceneElements,
      appState: SerializedSceneAppState,
      files: SerializedSceneFiles,
    ) => {
      scheduleSave(serializePersistedScene(elements, appState, files));
    },
    [scheduleSave],
  );

  const handleSaveNow = useCallback(async () => {
    const api = apiRef.current;
    if (api) {
      pendingContentRef.current = serializePersistedScene(
        api.getSceneElements() as SerializedSceneElements,
        {
          ...api.getAppState(),
          viewBackgroundColor: DRAWING_BACKGROUND,
        } as AppState,
        api.getFiles() as SerializedSceneFiles,
      );
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveDrawing();
  }, [saveDrawing]);

  const handleExportPng = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;

    setExporting(true);
    try {
      const blob = await exportToBlob({
        appState: {
          ...api.getAppState(),
          exportBackground: true,
        },
        elements: api.getSceneElements(),
        files: api.getFiles(),
        mimeType: 'image/png',
      });

      downloadBlob(blob, `${slug}-${date}.png`);
    } finally {
      setExporting(false);
    }
  }, [date, slug]);

  if (loading || !initialScene) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-black">
        <p className="text-sm text-text-muted animate-pulse">
          Loading drawing board…
        </p>
      </div>
    );
  }

  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error'
        ? 'Save failed'
        : `Saved ${formatSavedAt(lastSavedAt)}`;

  return (
    <div className="flex h-[calc(100vh-65px)] bg-black">
      <aside
        id="talking-points-sidebar"
        className="shrink-0 overflow-hidden border-r border-surface-border bg-surface transition-[width] duration-200 ease-out"
        style={{ width: isSidebarOpen ? 'min(360px, 85vw)' : '4.5rem' }}
      >
        {isSidebarOpen ? (
          <div className="h-full overflow-y-auto p-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/livestreams/${slug}?date=${date}`}
                  className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  <span aria-hidden="true">←</span>
                  Back to rundown
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-expanded={true}
                  aria-controls="talking-points-sidebar"
                >
                  Hide
                </Button>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-text-muted">
                  Topic Drawing Board
                </p>
                <h1 className="mt-2 text-xl font-semibold leading-tight text-text-primary">
                  {topic?.title || slug}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {summary
                    ? stripMarkdown(summary.body)
                    : 'Use this board to sketch key ideas live.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              <button
                type="button"
                onClick={handleSaveNow}
                className="rounded-lg bg-accent-red px-4 py-3 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
              >
                Save Board
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                disabled={exporting}
                className="rounded-lg border border-surface-border bg-black px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-red/30 hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? 'Exporting PNG…' : 'Download PNG'}
              </button>
              <p
                className={`text-xs ${
                  saveStatus === 'error' ? 'text-red-400' : 'text-text-muted'
                }`}
              >
                {saveLabel}
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {talkingPointSections.map((section) => {
                const points = parseTalkingPoints(section.body);

                return (
                  <section
                    key={section.heading}
                    className="rounded-xl border border-surface-border bg-surface-elevated p-4"
                  >
                    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                      {section.heading}
                    </h2>
                    <div className="mt-3 space-y-3">
                      {points.map((point, index) => (
                        <div
                          key={`${section.heading}-${index}`}
                          className="rounded-lg border border-surface-border/70 bg-surface-card px-3 py-2"
                        >
                          <p className="text-sm leading-relaxed text-text-primary">
                            {stripMarkdown(point)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center gap-3 p-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-surface-border bg-surface-elevated px-2 py-3 text-text-secondary transition-colors hover:border-accent-red/30 hover:text-text-primary"
              aria-expanded={false}
              aria-controls="talking-points-sidebar"
            >
              <span aria-hidden="true" className="text-sm">
                ☰
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                Points
              </span>
            </button>

            <Link
              href={`/livestreams/${slug}?date=${date}`}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-surface-border bg-surface-elevated px-2 py-3 text-text-secondary transition-colors hover:border-accent-red/30 hover:text-text-primary"
            >
              <span aria-hidden="true" className="text-sm">
                ←
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                Back
              </span>
            </Link>
          </div>
        )}
      </aside>

      <main className="flex-1">
        <div className="h-full w-full">
          <Excalidraw
            excalidrawAPI={(api) => {
              apiRef.current = api;
            }}
            initialData={initialScene}
            onChange={handleChange}
            renderTopRightUI={() => (
              <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-black/90 px-3 py-2 text-xs text-text-secondary shadow-sm">
                <span>{topic?.title || slug}</span>
                <span className="text-text-muted">•</span>
                <span>{date}</span>
              </div>
            )}
            theme="dark"
          >
            <MainMenu>
              <MainMenu.DefaultItems.LoadScene />
              <MainMenu.DefaultItems.SaveToActiveFile />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.ClearCanvas />
            </MainMenu>
            <WelcomeScreen>
              <WelcomeScreen.Center>
                <WelcomeScreen.Center.Logo />
                <WelcomeScreen.Center.Heading>
                  Sketch the talking points live
                </WelcomeScreen.Center.Heading>
                <WelcomeScreen.Center.Menu>
                  <WelcomeScreen.Center.MenuItemHelp />
                </WelcomeScreen.Center.Menu>
              </WelcomeScreen.Center>
            </WelcomeScreen>
          </Excalidraw>
        </div>
      </main>
    </div>
  );
}
