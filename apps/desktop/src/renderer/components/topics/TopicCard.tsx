import type { Topic, TopicStatus } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import type React from 'react';

const SOURCE_COLORS: Record<string, string> = {
  GitHub: 'bg-purple-500/20 text-purple-400',
  HN: 'bg-orange-500/20 text-orange-400',
  Reddit: 'bg-orange-600/20 text-orange-300',
  X: 'bg-blue-400/20 text-blue-400',
  YouTube: 'bg-red-500/20 text-red-400',
};

interface TopicCardProps {
  topic: Topic;
  showDate?: boolean;
  onStatusChange: (topic: Topic, status: TopicStatus) => void;
  onSelect: (slug: string) => void;
}

export function TopicCard({
  topic,
  showDate,
  onStatusChange,
  onSelect,
}: TopicCardProps) {
  const sources = topic.source.split(',').map((s) => s.trim());

  const summary =
    topic.content
      .split('\n')
      .find(
        (line) =>
          line.length > 20 && !line.startsWith('#') && !line.startsWith('-'),
      )
      ?.slice(0, 140) + '…';

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
      role="button"
      tabIndex={0}
      className="bg-surface-card border border-surface-border rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-accent-red/40 transition-colors group"
      onClick={() => onSelect(topic.slug)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(topic.slug);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-red transition-colors leading-tight">
          {topic.title}
        </h3>
        {showDate && (
          <span className="shrink-0 rounded bg-surface-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            {topic.date}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 mb-3">
        {sources.map((src) => (
          <span
            key={src}
            className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
              SOURCE_COLORS[src] || 'bg-surface-border text-text-secondary'
            }`}
          >
            {src}
          </span>
        ))}
      </div>

      {summary && (
        <p className="text-xs text-text-secondary leading-relaxed mb-3">
          {summary}
        </p>
      )}

      <div className="flex gap-2">
        {topic.status === 'draft' && (
          <Button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStatusChange(topic, 'backlog');
            }}
            size="sm"
            className="rounded-md bg-surface-border text-[10px] text-text-muted hover:bg-surface-border hover:text-text-secondary"
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
            className="rounded-md bg-accent-red/10 text-[10px] text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
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
              className="rounded-md border-green-500/20 bg-green-500/10 text-[10px] text-green-400 hover:bg-green-500/20 hover:text-green-300"
            >
              Mark covered
            </Button>
            <Button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onStatusChange(topic, 'backlog');
              }}
              size="sm"
              className="rounded-md bg-surface-border text-[10px] text-text-muted hover:bg-surface-border hover:text-text-secondary"
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
            className="rounded-md bg-surface-border text-[10px] text-text-muted hover:bg-surface-border hover:text-text-secondary"
          >
            Reopen
          </Button>
        )}
      </div>
    </div>
  );
}
