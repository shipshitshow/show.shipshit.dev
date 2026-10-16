'use client';

import type { TrendSource } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { SourceLogo } from './SourceLogo';

type FeedSource = Exclude<TrendSource, 'x'>;
type FilterValue = 'all' | FeedSource;

const FILTERS: FilterValue[] = ['all', 'hackernews', 'reddit', 'youtube'];

interface TrendFiltersProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

export function TrendFilters({ active, onChange, counts }: TrendFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((value) => (
        <Button
          key={value}
          onClick={() => onChange(value)}
          aria-pressed={active === value}
          size="sm"
          variant={active === value ? 'accent' : 'ghost'}
          className={`gap-1.5 rounded-md text-[11px] transition-colors ${
            active === value
              ? 'bg-accent-red/10 text-text-primary hover:bg-accent-red/10 hover:text-text-primary'
              : 'text-text-muted hover:bg-transparent hover:text-text-secondary'
          }`}
        >
          {value === 'all' ? (
            'All'
          ) : (
            <SourceLogo
              source={value}
              className={`size-3.5 ${active === value ? '' : 'opacity-70'}`}
            />
          )}{' '}
          <span className="opacity-60">{counts[value]}</span>
        </Button>
      ))}
    </div>
  );
}

export type { FilterValue };
