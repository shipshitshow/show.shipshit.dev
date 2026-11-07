'use client';

import type { TrendSource } from '@shipshitshow/types';
import { FilterSelect } from '@/components/FilterSelect';

type FeedSource = Exclude<TrendSource, 'x'>;
type FilterValue = 'all' | FeedSource;

const FILTERS: FilterValue[] = ['all', 'hackernews', 'reddit', 'youtube'];

const LABELS: Record<FilterValue, string> = {
  all: 'All sources',
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  youtube: 'YouTube',
};

interface TrendFiltersProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

export function TrendFilters({ active, onChange, counts }: TrendFiltersProps) {
  return (
    <FilterSelect
      label="Source"
      value={active}
      onChange={onChange}
      options={FILTERS.map((value) => ({
        label: `${LABELS[value]} · ${counts[value]}`,
        value,
      }))}
    />
  );
}

export type { FilterValue };
