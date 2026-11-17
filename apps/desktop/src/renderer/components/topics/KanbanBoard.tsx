import type { Topic, TopicStatus } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';

const COLUMNS: TopicStatus[] = ['draft', 'backlog', 'in_progress', 'done'];
const ALL_DATES_VALUE = '__all__';
const NO_DATES: string[] = [];
const NO_TOPICS: Topic[] = [];

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [selectedDate, setDate] = useState(() => todayLocalDate());

  const datesQuery = useQuery({
    queryFn: () => window.electronAPI.topics.listDates(),
    queryKey: ['kanban', 'dates'],
  });
  const availableDates = datesQuery.data ?? NO_DATES;
  // A date with no topic file falls back to the newest one.
  const date =
    selectedDate === ALL_DATES_VALUE || availableDates.includes(selectedDate)
      ? selectedDate
      : availableDates[0] || selectedDate;

  const topicsKey = ['kanban', 'topics', date];
  const topicsQuery = useQuery({
    enabled: datesQuery.isSuccess,
    queryFn: async () => {
      if (date !== ALL_DATES_VALUE) return window.electronAPI.topics.list(date);
      const results = await Promise.all(
        availableDates.map((availableDate) =>
          window.electronAPI.topics.list(availableDate),
        ),
      );
      return results.flat();
    },
    queryKey: topicsKey,
  });
  const topics = topicsQuery.data ?? NO_TOPICS;
  const loading =
    datesQuery.isPending || (datesQuery.isSuccess && topicsQuery.isPending);
  const error = (datesQuery.error ?? topicsQuery.error)?.message ?? null;
  const fetchTopics = () =>
    queryClient.invalidateQueries({ queryKey: ['kanban'] });

  async function handleStatusChange(topic: Topic, status: TopicStatus) {
    queryClient.setQueryData<Topic[]>(topicsKey, (prev) =>
      prev?.map((t) =>
        t.slug === topic.slug && t.date === topic.date ? { ...t, status } : t,
      ),
    );
    await window.electronAPI.topics.updateStatus(
      topic.date,
      topic.slug,
      status,
    );
  }

  function handleSelect(_slug: string) {
    // Topic detail view — future phase
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Loading topics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-accent-red text-4xl">!</div>
        <p className="text-text-secondary text-sm">{error}</p>
        <Button
          onClick={fetchTopics}
          className="text-xs hover:border-accent-red"
        >
          Retry
        </Button>
      </div>
    );
  }

  const selectedCount = topics.filter((t) => t.status === 'in_progress').length;
  const isAllDates = date === ALL_DATES_VALUE;
  const headerLabel = isAllDates ? 'All topics' : date;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {headerLabel} · {selectedCount}/{topics.length} selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          {availableDates.length > 1 && (
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded-md border border-surface-border bg-surface-card px-2 text-xs text-text-secondary"
            >
              <option value={ALL_DATES_VALUE}>All topics</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={fetchTopics}
            className="h-8 text-xs text-text-secondary"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {topics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-border bg-surface-card/30 p-8 text-center">
            <p className="text-sm text-text-primary">
              No livestream topics yet.
            </p>
            <p className="text-xs text-text-muted mt-2">
              Add topics via the Trends tab or create markdown files under{' '}
              <code>apps/app/data/livestream/{date}/</code>.
            </p>
          </div>
        ) : (
          <div className="grid min-w-[900px] grid-cols-3 gap-6">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                topics={topics.filter((t) => t.status === status)}
                showDates={isAllDates}
                onStatusChange={handleStatusChange}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
