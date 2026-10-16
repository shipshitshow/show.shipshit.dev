import type { TrendItem, TrendSource } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { formatDistanceToNow } from 'date-fns';

const SOURCE_COLORS: Record<TrendSource, string> = {
  hackernews: 'bg-orange-500/20 text-orange-400',
  reddit: 'bg-orange-600/20 text-orange-300',
  x: 'bg-blue-400/20 text-blue-400',
  youtube: 'bg-red-500/20 text-red-400',
};

const SOURCE_LABELS: Record<TrendSource, string> = {
  hackernews: 'HN',
  reddit: 'Reddit',
  x: 'X',
  youtube: 'YouTube',
};

interface TrendCardProps {
  item: TrendItem;
  selected: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
  onAddToLivestream?: (item: TrendItem) => void;
  onPreview?: (id: string) => void;
  previewed?: boolean;
}

export function TrendCard({
  item,
  selected,
  onToggle,
  compact,
  onAddToLivestream,
  onPreview,
  previewed,
}: TrendCardProps) {
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), {
    addSuffix: true,
  });

  return (
    <div
      className={`bg-surface-card border rounded-xl ${compact ? 'p-3' : 'p-4'} transition-colors cursor-pointer ${
        selected || previewed
          ? 'border-accent-red'
          : 'border-surface-border hover:border-accent-red/40'
      }`}
      onClick={() => (onPreview ? onPreview(item.id) : onToggle(item.id))}
    >
      <div className="flex items-start gap-3">
        {!compact && (
          <div className="pt-0.5">
            <Button
              type="button"
              aria-label={selected ? 'Deselect trend' : 'Select trend'}
              variant="ghost"
              size="icon"
              className={`size-4 rounded border p-0 transition-colors ${
                selected
                  ? 'bg-accent-red border-accent-red'
                  : 'border-surface-border'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(item.id);
              }}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5L4 7L8 3"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </Button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${SOURCE_COLORS[item.source]}`}
            >
              {SOURCE_LABELS[item.source]}
            </span>
            {item.subreddit && (
              <span className="text-[10px] font-mono text-text-muted">
                r/{item.subreddit}
              </span>
            )}
            <span className="text-[10px] text-text-muted ml-auto">
              {timeAgo}
            </span>
          </div>
          {typeof item.showScore === 'number' && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              <span className="rounded bg-accent-red/10 px-1.5 py-0.5 text-text-primary">
                fit {item.showScore}
              </span>
              {item.showReasons?.slice(0, compact ? 1 : 3).map((reason) => (
                <span
                  key={reason}
                  className="rounded bg-surface-elevated px-1.5 py-0.5 text-text-muted"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline text-sm font-semibold text-text-primary hover:text-accent-red transition-colors leading-tight"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </a>

          {item.summary && !compact && (
            <p className="text-xs text-text-secondary leading-relaxed mt-1.5 line-clamp-2">
              {item.summary}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted font-mono">
            <span>
              {item.score.toLocaleString()}{' '}
              {item.source === 'youtube' ? 'views' : 'pts'}
            </span>
            <span>{item.commentCount.toLocaleString()} comments</span>
            {item.author && <span className="ml-auto">by {item.author}</span>}
          </div>

          {compact && onAddToLivestream && (
            <Button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onAddToLivestream(item);
              }}
              size="sm"
              className="mt-2 rounded-md bg-accent-red/10 text-[10px] text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
            >
              + Livestream
            </Button>
          )}
        </div>

        {item.thumbnail && !compact && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-24 h-16 rounded-lg object-cover shrink-0"
          />
        )}
      </div>
    </div>
  );
}
