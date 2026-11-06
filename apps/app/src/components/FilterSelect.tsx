'use client';

import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shipshitshow/ui';
import { useRouter } from 'next/navigation';

interface Option<T extends string> {
  label: string;
  value: T;
}

/** A filter as a dropdown: the one control for every filter in the app. */
export function FilterSelect<T extends string>({
  className,
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  value: T;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger
        aria-label={label}
        className={cn('h-9 text-xs', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A filter kept in the URL: picking an option opens its link. */
export function LinkFilterSelect({
  hrefs,
  ...props
}: {
  className?: string;
  /** The link for each option value. */
  hrefs: Record<string, string>;
  label: string;
  options: readonly Option<string>[];
  value: string;
}) {
  const router = useRouter();
  return (
    <FilterSelect
      {...props}
      onChange={(value) => router.push(hrefs[value], { scroll: false })}
    />
  );
}
