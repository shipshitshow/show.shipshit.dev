'use client';

import type { TrendItem } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import { SourceLogo } from './SourceLogo';

interface TrendCardProps {
  item: TrendItem;
  selected: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
  added?: boolean;
  adding?: boolean;
  onAddToLivestream?: (item: TrendItem) => void;
  onPreview?: (id: string) => void;
  previewControls?: string;
  previewed?: boolean;
}

export function TrendCard({
  item,
  selected,
  onToggle,
  compact,
  added,
  adding,
  onAddToLivestream,
  onPreview,
  previewControls,
  previewed,
}: TrendCardProps) {
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), {
    addSuffix: true,
  });

  return (
    <div
      className={`bg-surface-card border rounded-xl ${compact ? 'p-3' : 'p-4'} transition-colors cursor-pointer focus-within:border-accent-red/60 ${
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
            <SourceLogo source={item.source} />
            {item.subreddit && (
              <span className="text-[10px] font-mono text-text-muted">
                r/{item.subreddit}
              </span>
            )}
            <span className="text-[10px] text-text-muted ml-auto">
              {timeAgo}
            </span>
            {onPreview && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open source: ${item.title}`}
                className="-m-1 rounded p-1 text-text-muted transition-colors hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/40"
                onClick={(e) => e.stopPropagation()}
              >
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>

          {onPreview ? (
            <Button
              type="button"
              variant="ghost"
              data-trend-preview={item.id}
              aria-controls={previewControls}
              aria-current={previewed ? 'true' : undefined}
              className="block h-auto w-full whitespace-normal rounded-sm p-0 text-left text-sm font-semibold leading-tight text-text-primary hover:bg-transparent hover:text-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item.id);
              }}
            >
              {item.title}
            </Button>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline text-sm font-semibold text-text-primary hover:text-accent-red transition-colors leading-tight"
              onClick={(e) => e.stopPropagation()}
            >
              {item.title}
            </a>
          )}

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
              disabled={added || adding}
              size="sm"
              className="mt-2 rounded-md bg-accent-red/10 text-[10px] text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
            >
              {added ? 'Added' : '+ Livestream'}
            </Button>
          )}
        </div>

        {item.thumbnail && !compact && (
          <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0">
            <Image
              src={item.thumbnail}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
