'use client';

import type { ChannelFilter, ChannelStats } from '@shipshitshow/types';
import { FilterSelect } from './FilterSelect';

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
    { label: 'Both channels', value: 'all' },
    ...channels.map((ch) => ({
      label: getHandle(ch),
      value: ch.channel_id,
    })),
  ];

  return (
    <FilterSelect
      label="Channel"
      value={selected}
      onChange={onChange}
      options={options}
    />
  );
}
