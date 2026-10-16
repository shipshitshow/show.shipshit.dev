'use client';

import {
  dedupeTrendItems,
  extractTrendKeywords,
} from '@shipshitshow/talking-points';
import type {
  TrendItem,
  TrendSource,
  TrendsResponse,
  TrendsSearchResponse,
} from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  describeTopicPersistResult,
  persistTrendTopics,
} from '@/lib/research-topics';
import { DeepDivePanel } from './DeepDivePanel';
import { TrendActionBar } from './TrendActionBar';
import { TrendCard } from './TrendCard';
import { type FilterValue, TrendFilters } from './TrendFilters';

function todayLocalDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PREVIEW_PANEL_ID = 'research-preview';

type AddFeedback =
  | { tone: 'error'; message: string; retryItems: TrendItem[] }
  | { tone: 'success'; message: string };

const SOURCE_STATUS_LABELS: Record<TrendSource, string> = {
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  x: 'X',
  youtube: 'YouTube',
};

export function TrendsView() {
  const [items, setItems] = useState<TrendItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<TrendsResponse['sources'] | null>(
    null,
  );
  const [sourceFilter, setSourceFilter] = useState<FilterValue>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deepDiveItems, setDeepDiveItems] = useState<TrendItem[]>([]);
  const [deepDiveQuery, setDeepDiveQuery] = useState<string | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [manualXLoading, setManualXLoading] = useState(false);
  const [addingToLivestream, setAddingToLivestream] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addFeedback, setAddFeedback] = useState<AddFeedback | null>(null);
  const [page, setPage] = useState(0);
  // Below lg the feed and the preview share one column (master/detail).
  const [mobilePane, setMobilePane] = useState<'feed' | 'preview'>('feed');
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const [focusRequest, setFocusRequest] = useState<{
    pane: 'feed' | 'preview';
  } | null>(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trends');
      if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
      const data: TrendsResponse = await res.json();
      setItems(data.items);
      setActiveItemId((prev) =>
        prev && data.items.some((item) => item.id === prev)
          ? prev
          : (data.items[0]?.id ?? null),
      );
      setFetchedAt(data.fetchedAt);
      setSources(data.sources);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const filteredItems = useMemo(() => {
    if (sourceFilter === 'all') return items;
    return items.filter((item) => item.source === sourceFilter);
  }, [items, sourceFilter]);

  const PAGE_SIZE = 15;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = filteredItems.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [sourceFilter]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.pane === 'preview') {
      // Only on the stacked layout; the desktop split keeps focus in the feed.
      const backButton = backButtonRef.current;
      if (backButton && backButton.offsetParent !== null) backButton.focus();
    } else if (activeItemId) {
      document
        .querySelector<HTMLElement>(
          `[data-trend-preview="${CSS.escape(activeItemId)}"]`,
        )
        ?.focus();
    }
  }, [focusRequest]);

  const counts = useMemo(() => {
    const nextCounts: Record<FilterValue, number> = {
      all: items.length,
      hackernews: 0,
      reddit: 0,
      youtube: 0,
    };

    for (const item of items) {
      if (item.source === 'x') continue;
      nextCounts[item.source]++;
    }

    return nextCounts;
  }, [items]);

  const sourceSummary = useMemo(() => {
    if (!sources) return null;

    const failed: string[] = [];
    const manual: string[] = [];
    for (const [source, status] of Object.entries(sources)) {
      if (status === 'error')
        failed.push(SOURCE_STATUS_LABELS[source as TrendSource]);
      else if (status === 'manual')
        manual.push(SOURCE_STATUS_LABELS[source as TrendSource]);
    }

    const statusParts: string[] = [
      failed.length === 0
        ? 'Automatic sources live'
        : `${failed.join(', ')} unavailable`,
    ];

    if (manual.length > 0) {
      statusParts.push(`${manual.join(', ')} manual`);
    }

    return statusParts.join(' · ');
  }, [sources]);

  const getSelectedQuery = useCallback(() => {
    const selectedTitles = items.reduce<string[]>((acc, item) => {
      if (selectedIds.has(item.id)) acc.push(item.title);
      return acc;
    }, []);
    return extractTrendKeywords(selectedTitles);
  }, [items, selectedIds]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) || null,
    [items, activeItemId],
  );

  function handlePreview(id: string) {
    setActiveItemId(id);
    setMobilePane('preview');
    setFocusRequest({ pane: 'preview' });
  }

  function handleBackToFeed() {
    setMobilePane('feed');
    setFocusRequest({ pane: 'feed' });
  }

  async function handleGoDeeper() {
    const query = getSelectedQuery();
    if (!query) return;
    setMobilePane('preview');
    setFocusRequest({ pane: 'preview' });

    const hasSameQuery = deepDiveQuery === query;
    setDeepDiveLoading(true);
    setDeepDiveQuery(query);

    try {
      const res = await fetch(
        `/api/trends/search?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error('Search failed');
      const data: TrendsSearchResponse = await res.json();
      const mainIds = new Set(items.map((item) => item.id));
      const relatedItems = data.items.filter((item) => !mainIds.has(item.id));

      setDeepDiveItems((prev) => {
        const manualXItems = hasSameQuery
          ? prev.filter((item) => item.source === 'x')
          : [];
        return dedupeTrendItems([...relatedItems, ...manualXItems]);
      });
    } catch {
      setDeepDiveItems([]);
    } finally {
      setDeepDiveLoading(false);
    }
  }

  async function handleCheckX() {
    const query = getSelectedQuery();
    if (!query) return;
    setMobilePane('preview');
    setFocusRequest({ pane: 'preview' });

    const hasSameQuery = deepDiveQuery === query;
    setManualXLoading(true);
    setDeepDiveQuery(query);

    try {
      const res = await fetch(
        `/api/trends/search?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error('X search failed');
      const data: TrendsSearchResponse = await res.json();
      const mainIds = new Set(items.map((item) => item.id));
      const xItems = data.items.filter(
        (item) => item.source === 'x' && !mainIds.has(item.id),
      );

      setDeepDiveItems((prev) => {
        const baseItems = hasSameQuery
          ? prev.filter((item) => item.source !== 'x')
          : [];
        return dedupeTrendItems([...baseItems, ...xItems]);
      });
    } catch {
      setDeepDiveItems((prev) =>
        hasSameQuery ? prev.filter((item) => item.source !== 'x') : [],
      );
    } finally {
      setManualXLoading(false);
    }
  }

  async function addToLivestream(trendsToAdd: TrendItem[]) {
    const pending = trendsToAdd.filter((item) => !addedIds.has(item.id));
    if (pending.length === 0 || addingToLivestream) return;

    setAddingToLivestream(true);
    setAddFeedback(null);
    const date = todayLocalDate();

    try {
      const result = await persistTrendTopics(pending, date);
      setAddedIds((prev) => new Set([...prev, ...result.addedIds]));

      const errorMessage = describeTopicPersistResult(result);
      setAddFeedback(
        errorMessage
          ? {
              message: errorMessage,
              retryItems: result.failures.map((failure) => failure.item),
              tone: 'error',
            }
          : {
              message:
                pending.length === 1
                  ? `Added “${pending[0].title}” to the ${date} livestream backlog.`
                  : `Added ${pending.length} topics to the ${date} livestream backlog.`,
              tone: 'success',
            },
      );
    } finally {
      setAddingToLivestream(false);
    }
  }

  function handleAddSelectedToLivestream() {
    addToLivestream(items.filter((item) => selectedIds.has(item.id)));
  }

  function handleAddSingleToLivestream(item: TrendItem) {
    addToLivestream([item]);
  }

  function handleRefresh() {
    setSelectedIds(new Set());
    setActiveItemId(null);
    setDeepDiveItems([]);
    setDeepDiveQuery(null);
    setManualXLoading(false);
    setMobilePane('feed');
    fetchTrends();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-accent-red text-4xl">!</div>
        <p className="text-text-secondary text-sm">{error}</p>
        <Button
          onClick={handleRefresh}
          className="text-xs hover:border-accent-red"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 sm:p-4">
      {addFeedback && (
        <div
          role={addFeedback.tone === 'error' ? 'alert' : 'status'}
          className={`flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-xs ${
            addFeedback.tone === 'error'
              ? 'border-accent-red/30 bg-accent-red/5 text-text-primary'
              : 'border-surface-border bg-surface-card text-text-secondary'
          }`}
        >
          <p className="min-w-0 flex-1 break-words">{addFeedback.message}</p>
          <div className="flex shrink-0 items-center gap-2">
            {addFeedback.tone === 'error' && (
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={addingToLivestream}
                onClick={() => addToLivestream(addFeedback.retryItems)}
              >
                {addingToLivestream ? 'Retrying...' : 'Retry'}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAddFeedback(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
        <div
          className={`${mobilePane === 'preview' ? 'hidden' : 'flex'} h-full min-h-0 w-full min-w-0 flex-col overflow-hidden lg:flex lg:w-3/5`}
        >
          <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <TrendFilters
                active={sourceFilter}
                onChange={setSourceFilter}
                counts={counts}
              />
              {(fetchedAt || sourceSummary) && (
                <p className="text-[10px] text-text-muted mt-2">
                  {fetchedAt
                    ? `Updated ${new Date(fetchedAt).toLocaleTimeString()}`
                    : 'Not fetched yet'}
                  {sourceSummary ? ` · ${sourceSummary}` : ''}
                </p>
              )}
            </div>
            <Button
              onClick={handleRefresh}
              className="text-xs text-text-secondary hover:text-text-primary shrink-0"
            >
              Refresh
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2 pb-4">
            {loading
              ? Array.from({ length: 8 }, (_, index) => (
                  <div
                    key={index}
                    className="bg-surface-card border border-surface-border rounded-xl h-24 animate-pulse"
                  />
                ))
              : pagedItems.map((item) => (
                  <TrendCard
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onToggle={toggleSelection}
                    onPreview={handlePreview}
                    previewControls={PREVIEW_PANEL_ID}
                    previewed={activeItemId === item.id}
                  />
                ))}
          </div>

          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-surface-border px-1 py-2">
              <Button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs text-text-secondary disabled:opacity-30"
              >
                Previous
              </Button>
              <span className="text-[11px] text-text-muted">
                {page + 1} / {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs text-text-secondary disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          )}

          <TrendActionBar
            selectedCount={selectedIds.size}
            onGoDeeper={handleGoDeeper}
            onCheckX={handleCheckX}
            onAddToLivestream={handleAddSelectedToLivestream}
            deepDiveLoading={deepDiveLoading}
            manualXLoading={manualXLoading}
            addingToLivestream={addingToLivestream}
          />
        </div>

        <section
          id={PREVIEW_PANEL_ID}
          aria-label="Trend preview"
          className={`${mobilePane === 'feed' ? 'hidden' : 'block'} h-full min-h-0 w-full min-w-0 overflow-y-auto lg:block lg:w-2/5 lg:border-l lg:border-surface-border lg:pl-6`}
        >
          <Button
            ref={backButtonRef}
            type="button"
            onClick={handleBackToFeed}
            className="mb-3 text-xs lg:hidden"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to feed
          </Button>
          <DeepDivePanel
            activeItem={activeItem}
            activeSelected={!!activeItem && selectedIds.has(activeItem.id)}
            addedIds={addedIds}
            adding={addingToLivestream}
            items={deepDiveItems}
            loading={deepDiveLoading}
            query={deepDiveQuery}
            onToggleActive={(item) => toggleSelection(item.id)}
            onAddToLivestream={handleAddSingleToLivestream}
          />
        </section>
      </div>
    </div>
  );
}
