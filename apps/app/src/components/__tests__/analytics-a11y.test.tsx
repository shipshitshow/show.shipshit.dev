import { describe, expect, test } from 'bun:test';
import type { VideoStats } from '@shipshitshow/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { EpisodeRollupClient } from '@/components/EpisodeRollupClient';
import { VideoTable } from '@/components/VideoTable';

const videos: VideoStats[] = Array.from({ length: 12 }, (_, index) => ({
  avg_view_duration_seconds: 0,
  comments: index,
  ctr: 4.2,
  impressions: 100 + index,
  likes: index,
  published_at: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
  title: `Video ${index + 1}`,
  video_id: `video-${index + 1}`,
  views: 1000 - index,
  watch_time_minutes: 10,
}));

function headerCells(markup: string): string[] {
  return markup.match(/<th\b[^>]*>.*?<\/th>/g) ?? [];
}

describe('VideoTable sortable headers (#80)', () => {
  const markup = renderToStaticMarkup(<VideoTable videos={videos} />);
  const sortable = headerCells(markup).filter((cell) =>
    cell.includes('aria-sort'),
  );

  test('every sortable column exposes aria-sort with the active direction', () => {
    expect(sortable).toHaveLength(7);
    const active = sortable.filter(
      (cell) => !cell.includes('aria-sort="none"'),
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toContain('aria-sort="descending"');
    expect(active[0]).toContain('Views');
  });

  test('sorting is operated by a native button, not a clickable cell', () => {
    expect(sortable).toHaveLength(7);
    for (const cell of sortable)
      expect(cell).toMatch(/<button[^>]*type="button"/);
  });
});

describe('EpisodeRollupClient refresh control (#80)', () => {
  test('the icon-only refresh button has an accessible name', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <EpisodeRollupClient />
      </QueryClientProvider>,
    );
    expect(markup).toMatch(/<button[^>]*aria-label="Refresh episode rollup"/);
  });
});
