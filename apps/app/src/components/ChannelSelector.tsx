'use client';

import type { ChannelFilter, ChannelStats } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';

interface ChannelSelectorProps {
  channels: ChannelStats[];
  selected: ChannelFilter;
  onChange: (filter: ChannelFilter) => void;
}

// Map known channel IDs to their YouTube handles
const CHANNEL_HANDLES: Record<string, string> = {
  'UCxuriP32znodU-8N7zkwuew': '@shipshitshow',
  UCYX8Z9u0cP4T7Dpnm0EcT5Q: '@shipshitshowclips',
};

function getHandle(channel: ChannelStats): string {
  return CHANNEL_HANDLES[channel.channel_id] || channel.channel_title;
}

export function ChannelSelector({
  channels,
  selected,
  onChange,
}: ChannelSelectorProps) {
  const options: { value: ChannelFilter; label: string }[] = [
    { label: 'All', value: 'all' },
    ...channels.map((ch) => ({
      label: getHandle(ch),
      value: ch.channel_id,
    })),
  ];

  return (
    <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-lg p-1">
      {options.map((opt) => (
        <Button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          size="sm"
          variant={selected === opt.value ? 'accent' : 'ghost'}
          className={`rounded-md text-xs transition-colors ${
            selected === opt.value
              ? 'bg-accent-red/10 text-text-primary hover:bg-accent-red/10 hover:text-text-primary'
              : 'text-text-muted hover:bg-transparent hover:text-text-secondary'
          }`}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
