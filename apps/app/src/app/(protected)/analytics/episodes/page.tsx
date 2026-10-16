import type { Metadata } from 'next';
import { EpisodeRollupPage } from '@/components/EpisodeRollupPage';

export const metadata: Metadata = {
  description:
    'Per-episode performance across every distribution surface for Ship Sh!t Show.',
  title: 'Episode Rollup - Ship Sh!t Show',
};

export default function EpisodeRollupRoutePage() {
  return <EpisodeRollupPage />;
}
