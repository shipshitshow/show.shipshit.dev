import {
  buildLivestreamTopicDraft,
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
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
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

const SOURCE_STATUS_LABELS: Record<TrendSource, string> = {
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  x: 'X',
  youtube: 'YouTube',
};

export function TrendsView() {
  const trendsQuery = useQuery({
    queryFn: (): Promise<TrendsResponse> => window.electronAPI.trends.fetch(),
    queryKey: ['trends'],
  });
  const items = useMemo(
    () => trendsQuery.data?.items ?? [],
    [trendsQuery.data],
  );
  const fetchedAt = trendsQuery.data?.fetchedAt ?? null;
  const sources = trendsQuery.data?.sources ?? null;
  const loading = trendsQuery.isFetching;
  const error = trendsQuery.error?.message ?? null;
  const fetchTrends = () => trendsQuery.refetch();
  const [chosenItemId, setActiveItemId] = useState<string | null>(null);
  // The previewed item falls back to the first one when the choice is gone.
  const activeItemId =
    chosenItemId && items.some((item) => item.id === chosenItemId)
      ? chosenItemId
      : (items[0]?.id ?? null);
  const [sourceFilter, setSourceFilter] = useState<FilterValue>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deepDiveItems, setDeepDiveItems] = useState<TrendItem[]>([]);
  const [deepDiveQuery, setDeepDiveQuery] = useState<string | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [manualXLoading, setManualXLoading] = useState(false);
  const [addingToLivestream, setAddingToLivestream] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    if (sourceFilter === 'all') return items;
    return items.filter((item) => item.source === sourceFilter);
  }, [items, sourceFilter]);

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

    const failed = Object.entries(sources)
      .filter(([, status]) => status === 'error')
      .map(([source]) => SOURCE_STATUS_LABELS[source as TrendSource]);
    const manual = Object.entries(sources)
      .filter(([, status]) => status === 'manual')
      .map(([source]) => SOURCE_STATUS_LABELS[source as TrendSource]);

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
    const selectedTitles = items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.title);
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

  async function handleGoDeeper() {
    const query = getSelectedQuery();
    if (!query) return;

    const hasSameQuery = deepDiveQuery === query;
    setDeepDiveLoading(true);
    setDeepDiveQuery(query);

    try {
      const data: TrendsSearchResponse =
        await window.electronAPI.trends.search(query);
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

    const hasSameQuery = deepDiveQuery === query;
    setManualXLoading(true);
    setDeepDiveQuery(query);

    try {
      const data: TrendsSearchResponse =
        await window.electronAPI.trends.searchX(query);
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
    setAddingToLivestream(true);
    const date = todayLocalDate();

    try {
      await Promise.all(
        trendsToAdd.map((item) => {
          const draft = buildLivestreamTopicDraft(item);
          return window.electronAPI.topics.create({ date, ...draft });
        }),
      );
      setAddedIds(
        (prev) => new Set([...prev, ...trendsToAdd.map((i) => i.id)]),
      );
    } finally {
      setAddingToLivestream(false);
    }
  }

  function handleAddSelectedToLivestream() {
    const selected = items.filter(
      (item) => selectedIds.has(item.id) && !addedIds.has(item.id),
    );
    if (selected.length > 0) addToLivestream(selected);
  }

  function handleAddSingleToLivestream(item: TrendItem) {
    if (!addedIds.has(item.id)) addToLivestream([item]);
  }

  function handleRefresh() {
    setSelectedIds(new Set());
    setActiveItemId(null);
    setDeepDiveItems([]);
    setDeepDiveQuery(null);
    setManualXLoading(false);
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
    <div className="flex h-full min-h-0 gap-6 overflow-hidden p-4">
      <div className="flex h-full min-h-0 w-3/5 min-w-0 flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 items-center justify-between">
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
            : filteredItems.map((item) => (
                <TrendCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleSelection}
                  onPreview={setActiveItemId}
                  previewed={activeItemId === item.id}
                />
              ))}
        </div>

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

      <div className="h-full min-h-0 w-2/5 overflow-y-auto border-l border-surface-border pl-6">
        <DeepDivePanel
          activeItem={activeItem}
          activeSelected={!!activeItem && selectedIds.has(activeItem.id)}
          items={deepDiveItems}
          loading={deepDiveLoading}
          query={deepDiveQuery}
          onToggleActive={(item) => toggleSelection(item.id)}
          onAddToLivestream={handleAddSingleToLivestream}
        />
      </div>
    </div>
  );
}
