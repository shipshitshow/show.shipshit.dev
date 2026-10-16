'use client';

import type { Topic, TopicStatus } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import type React from 'react';
import { useState } from 'react';
import { clampText } from '@/lib/text';
import { getTopicSummary, parseTopicSources } from '@/lib/topic-card-content';

const SOURCE_COLORS: Record<string, string> = {
  GitHub: 'bg-purple-500/20 text-purple-400',
  HN: 'bg-orange-500/20 text-orange-400',
  Reddit: 'bg-orange-600/20 text-orange-300',
  X: 'bg-blue-400/20 text-blue-400',
  YouTube: 'bg-red-500/20 text-red-400',
};

const VISIBLE_SOURCE_COUNT = 3;

interface TopicCardProps {
  topic: Topic;
  showDate?: boolean;
  onStatusChange: (topic: Topic, status: TopicStatus) => void;
}

export function TopicCard({ topic, showDate, onStatusChange }: TopicCardProps) {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const sources = parseTopicSources(topic.source);
  const hiddenSourceCount = Math.max(0, sources.length - VISIBLE_SOURCE_COUNT);
  const visibleSources = isSourcesExpanded
    ? sources
    : sources.slice(0, VISIBLE_SOURCE_COUNT);
  const summary = getTopicSummary(topic.content);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', topic.slug);
        e.dataTransfer.setData('application/json', JSON.stringify(topic));
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).style.opacity = '0.4';
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
      }}
      className="min-w-0 overflow-hidden bg-surface-card border border-surface-border rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-accent-red/40 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="min-w-0 break-words text-sm font-semibold text-text-primary group-hover:text-accent-red transition-colors leading-snug">
          {topic.title}
        </h3>
        {showDate && (
          <span className="shrink-0 rounded bg-surface-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            {topic.date}
          </span>
        )}
      </div>

      {summary ? (
        <p
          title={summary}
          className="mb-3 line-clamp-3 break-words text-xs leading-relaxed text-text-secondary"
        >
          {clampText(summary, 280)}
        </p>
      ) : (
        <p className="mb-3 text-xs italic leading-relaxed text-text-muted">
          No summary yet. Add a Summary section to this topic&apos;s notes.
        </p>
      )}

      {sources.length > 0 ? (
        <div className="mb-3 min-w-0">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-text-muted">
            {sources.length === 1 ? 'Source' : `${sources.length} sources`}
          </p>
          <ul
            className={
              isSourcesExpanded
                ? 'flex flex-col gap-1'
                : 'flex min-w-0 flex-wrap gap-1.5'
            }
          >
            {visibleSources.map((src, index) => (
              <li
                key={`${index}:${src}`}
                title={src}
                className={`max-w-full rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${
                  isSourcesExpanded ? 'break-words' : 'truncate'
                } ${SOURCE_COLORS[src] || 'bg-surface-border text-text-secondary'}`}
              >
                {src}
              </li>
            ))}
          </ul>
          {hiddenSourceCount > 0 ? (
            <button
              type="button"
              aria-expanded={isSourcesExpanded}
              onClick={(e) => {
                e.stopPropagation();
                setIsSourcesExpanded((value) => !value);
              }}
              className="mt-1.5 text-[11px] font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              {isSourcesExpanded
                ? 'Show fewer sources'
                : `+${hiddenSourceCount} more source${hiddenSourceCount === 1 ? '' : 's'}`}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mb-3 text-[11px] text-text-muted">No sources listed.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {topic.status === 'draft' && (
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStatusChange(topic, 'backlog');
            }}
            size="sm"
            className="rounded-md bg-surface-border text-xs text-text-muted hover:bg-surface-border hover:text-text-secondary"
          >
            Move to backlog
          </Button>
        )}
        {topic.status === 'backlog' && (
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStatusChange(topic, 'in_progress');
            }}
            size="sm"
            className="rounded-md bg-accent-red/10 text-xs text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
          >
            Select for tonight
          </Button>
        )}
        {topic.status === 'in_progress' && (
          <>
            <Button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onStatusChange(topic, 'done');
              }}
              size="sm"
              className="rounded-md border-green-500/20 bg-green-500/10 text-xs text-green-400 hover:bg-green-500/20 hover:text-green-300"
            >
              Mark covered
            </Button>
            <Button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onStatusChange(topic, 'backlog');
              }}
              size="sm"
              className="rounded-md bg-surface-border text-xs text-text-muted hover:bg-surface-border hover:text-text-secondary"
            >
              Drop
            </Button>
          </>
        )}
        {topic.status === 'done' && (
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStatusChange(topic, 'in_progress');
            }}
            size="sm"
            className="rounded-md bg-surface-border text-xs text-text-muted hover:bg-surface-border hover:text-text-secondary"
          >
            Reopen
          </Button>
        )}
      </div>
    </div>
  );
}
