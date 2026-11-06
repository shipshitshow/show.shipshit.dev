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
import { useCallback, useEffect, useState } from 'react';
import { KanbanColumn } from './KanbanColumn';

const COLUMNS: TopicStatus[] = ['draft', 'backlog', 'in_progress', 'done'];
const ALL_DATES_VALUE = '__all__';

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function KanbanBoard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayLocalDate());
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const datesRes = await fetch('/api/topics/dates');
      if (!datesRes.ok) throw new Error('Failed to load dates');
      const { dates }: { dates: string[] } = await datesRes.json();
      setAvailableDates(dates);

      if (date === ALL_DATES_VALUE) {
        const results = await Promise.all(
          dates.map(async (d) => {
            const res = await fetch(
              `/api/topics?date=${encodeURIComponent(d)}`,
            );
            const data: { topics: Topic[] } = await res.json();
            return data.topics;
          }),
        );
        setTopics(results.flat());
        return;
      }

      const resolvedDate = dates.includes(date) ? date : dates[0] || date;
      if (resolvedDate !== date) {
        setDate(resolvedDate);
        return;
      }

      const res = await fetch(`/api/topics?date=${encodeURIComponent(date)}`);
      if (!res.ok) throw new Error('Failed to load topics');
      const data: { topics: Topic[] } = await res.json();
      setTopics(data.topics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  async function handleStatusChange(topic: Topic, status: TopicStatus) {
    setTopics((prev) =>
      prev.map((t) =>
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
