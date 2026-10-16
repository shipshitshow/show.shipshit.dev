import { Button } from '@shipshitshow/ui';

interface TrendActionBarProps {
  selectedCount: number;
  onGoDeeper: () => void;
  onCheckX: () => void;
  onAddToLivestream: () => void;
  deepDiveLoading: boolean;
  manualXLoading: boolean;
  addingToLivestream: boolean;
}

export function TrendActionBar({
  selectedCount,
  onGoDeeper,
  onCheckX,
  onAddToLivestream,
  deepDiveLoading,
  manualXLoading,
  addingToLivestream,
}: TrendActionBarProps) {
  return (
    <div className="z-10 -mx-1 shrink-0 border-t border-surface-border bg-surface px-1 pt-4 pb-1">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onGoDeeper}
          disabled={selectedCount === 0 || deepDiveLoading}
          className="text-xs hover:border-accent-red/40"
        >
          {deepDiveLoading ? 'Searching...' : 'Go Deeper'}
        </Button>
        <Button
          onClick={onCheckX}
          disabled={selectedCount === 0 || manualXLoading}
          className="text-xs hover:border-accent-red/40"
        >
          {manualXLoading ? 'Checking X...' : 'Check X'}
        </Button>
        <Button
          onClick={onAddToLivestream}
          disabled={selectedCount === 0 || addingToLivestream}
          className="text-xs bg-accent-red/10 text-text-primary hover:bg-accent-red/20 hover:text-text-primary"
        >
          {addingToLivestream
            ? 'Adding...'
            : `Add to Livestream (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
}
