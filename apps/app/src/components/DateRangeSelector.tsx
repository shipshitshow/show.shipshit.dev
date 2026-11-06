'use client';

import type { DateRange } from '@shipshitshow/types';
import { FilterSelect } from './FilterSelect';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

const OPTIONS: { label: string; value: `${DateRange}` }[] = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <FilterSelect
      label="Date range"
      value={`${value}`}
      onChange={(next) => onChange(Number(next) as DateRange)}
      options={OPTIONS}
    />
  );
}
