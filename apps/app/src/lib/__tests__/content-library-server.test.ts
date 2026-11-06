import { describe, expect, test } from 'bun:test';
import { loadContent } from '@/lib/content-library-server';

describe('content from the repo', () => {
  test('joins the 20 Oct stream to its transcript, listed once', async () => {
    // Its transcript file is dated 21 Oct, the upload day.
    const { items } = await loadContent();
    const streams = items.filter((item) => item.videoId === 'XCyY0VDiRps');
    expect(streams).toHaveLength(1);
    expect(streams[0].type).toBe('livestream');
    expect(streams[0].transcriptWords).toBeGreaterThan(1000);
  });

  test('lists every upload once', async () => {
    const { items } = await loadContent();
    const ids = items.flatMap((item) => (item.videoId ? [item.videoId] : []));
    expect(new Set(ids).size).toBe(ids.length);
    expect(items.some((item) => item.type === 'short')).toBe(true);
  });
});
