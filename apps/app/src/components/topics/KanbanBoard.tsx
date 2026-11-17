'use client';

import type { Topic, TopicStatus } from '@shipshitshow/types';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shipshitshow/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchJson } from '@/lib/fetch-json';
import { KanbanColumn } from './KanbanColumn';

const COLUMNS: TopicStatus[] = ['draft', 'backlog', 'in_progress', 'done'];
const ALL_DATES_VALUE = '__all__';

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [selectedDate, setDate] = useState(() => todayLocalDate());

  const datesQuery = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<{ dates: string[] }>(
        '/api/topics/dates',
        'Failed to load dates',
        signal,
      ),
    queryKey: ['kanban', 'dates'],
  });
  const availableDates = datesQuery.data?.dates ?? [];
  // A date with no topic file falls back to the newest one.
  const date =
    selectedDate === ALL_DATES_VALUE || availableDates.includes(selectedDate)
      ? selectedDate
      : availableDates[0] || selectedDate;

  const topicsKey = ['kanban', 'topics', date];
  const topicsQuery = useQuery({
    enabled: datesQuery.isSuccess,
    queryFn: async ({ signal }) => {
      const dates = date === ALL_DATES_VALUE ? availableDates : [date];
      const results = await Promise.all(
        dates.map(async (d) => {
          const data = await fetchJson<{ topics: Topic[] }>(
            `/api/topics?date=${encodeURIComponent(d)}`,
            'Failed to load topics',
            signal,
          );
          return data.topics;
        }),
      );
      return results.flat();
    },
    queryKey: topicsKey,
  });
  const topics = topicsQuery.data ?? [];
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
    await fetch(
      `/api/topics/${encodeURIComponent(topic.date)}/${encodeURIComponent(topic.slug)}`,
      {
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    );
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
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger
                aria-label="Filter by date"
                className="h-8 px-2 py-1 text-xs text-text-secondary"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DATES_VALUE}>All topics</SelectItem>
                {availableDates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Add topics via the Trends tab or create markdown files in the data
              directory.
            </p>
          </div>
        ) : (
          <div className="grid min-w-[1160px] grid-cols-4 gap-6">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                topics={topics.filter((t) => t.status === status)}
                showDates={isAllDates}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
