import type { TrendItem, TrendSource } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { formatDistanceToNow } from 'date-fns';
import { TrendCard } from './TrendCard';

const SOURCE_ORDER: TrendSource[] = ['hackernews', 'reddit', 'youtube', 'x'];
const SOURCE_LABELS: Record<TrendSource, string> = {
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  x: 'X',
  youtube: 'YouTube',
};
const SOURCE_BADGES: Record<TrendSource, string> = {
  hackernews: 'bg-orange-500/20 text-orange-400',
  reddit: 'bg-orange-600/20 text-orange-300',
  x: 'bg-blue-400/20 text-blue-400',
  youtube: 'bg-red-500/20 text-red-400',
};

interface DeepDivePanelProps {
  activeItem: TrendItem | null;
  activeSelected: boolean;
  items: TrendItem[];
  loading: boolean;
  query: string | null;
  onToggleActive: (item: TrendItem) => void;
  onAddToLivestream: (item: TrendItem) => void;
}

export function DeepDivePanel({
  activeItem,
  activeSelected,
  items,
  loading,
  query,
  onToggleActive,
  onAddToLivestream,
}: DeepDivePanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-text-muted font-mono mb-3">
          Searching for &ldquo;{query}&rdquo;...
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-surface-card border border-surface-border rounded-xl h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const grouped = new Map<TrendSource, TrendItem[]>();
  for (const item of items) {
    const list = grouped.get(item.source) || [];
    list.push(item);
    grouped.set(item.source, list);
  }

  return (
    <div className="space-y-6">
      {activeItem ? (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-surface-border">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${SOURCE_BADGES[activeItem.source]}`}
                >
                  {SOURCE_LABELS[activeItem.source]}
                </span>
                {activeItem.subreddit && (
                  <span className="text-[10px] font-mono text-text-muted">
                    r/{activeItem.subreddit}
                  </span>
                )}
                <span className="text-[10px] text-text-muted">
                  {formatDistanceToNow(new Date(activeItem.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {typeof activeItem.showScore === 'number' && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="rounded bg-accent-red/10 px-1.5 py-0.5 text-text-primary">
                    fit {activeItem.showScore}
                  </span>
                  {activeItem.showReasons?.slice(0, 3).map((reason) => (
                    <span
                      key={reason}
                      className="rounded bg-surface-elevated px-1.5 py-0.5 text-text-muted"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}
              <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                {activeItem.title}
              </h3>
            </div>
            <Button
              type="button"
              onClick={() => onToggleActive(activeItem)}
              size="sm"
              className={`shrink-0 rounded-md text-[10px] transition-colors ${
                activeSelected
                  ? 'bg-accent-red text-on-accent hover:bg-accent-red hover:text-on-accent'
                  : 'bg-accent-red/10 text-text-primary hover:bg-accent-red/20 hover:text-text-primary'
              }`}
            >
              {activeSelected ? 'Selected' : 'Select'}
            </Button>
          </div>

          {activeItem.thumbnail && (
            <img
              src={activeItem.thumbnail}
              alt=""
              className="w-full aspect-video object-cover bg-surface-elevated"
            />
          )}

          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
              <span>
                {activeItem.score.toLocaleString()}{' '}
                {activeItem.source === 'youtube' ? 'views' : 'pts'}
              </span>
              <span>{activeItem.commentCount.toLocaleString()} comments</span>
              {activeItem.author && <span>by {activeItem.author}</span>}
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">
                Preview
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                {activeItem.summary ||
                  'No inline preview for this source. Open the original content to read the full post.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-surface-elevated border border-surface-border text-text-primary hover:border-accent-red/40 transition-colors"
              >
                Open Source
              </a>
              <Button
                type="button"
                onClick={() => onAddToLivestream(activeItem)}
                size="sm"
                className="rounded-md bg-accent-red/10 text-[10px] text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
              >
                + Livestream
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center py-24">
          <p className="text-sm text-text-muted">
            Click a trend to preview it here
          </p>
          <p className="text-xs text-text-muted mt-1">
            {query
              ? 'Then add it to the livestream if it is worth keeping'
              : 'Select from the feed to read the story'}
          </p>
        </div>
      )}

      {query && items.length > 0 && (
        <div className="space-y-6">
          <div className="text-xs text-text-muted font-mono">
            Related content: &ldquo;{query}&rdquo; &mdash; {items.length}{' '}
            results
          </div>
          {SOURCE_ORDER.filter((s) => grouped.has(s)).map((source) => (
            <div key={source}>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-2">
                {SOURCE_LABELS[source]}
              </h4>
              <div className="space-y-2">
                {grouped.get(source)!.map((item) => (
                  <TrendCard
                    key={item.id}
                    item={item}
                    selected={false}
                    onToggle={() => {}}
                    compact
                    onAddToLivestream={onAddToLivestream}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {query && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <p className="text-sm text-text-muted">
            No related results for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
