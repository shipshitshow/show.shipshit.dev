import { describe, expect, test } from 'bun:test';
import { loadContent } from '@/lib/content-library-server';

describe('livestreams from the repo', () => {
  test('find a transcript saved under the next day without a video ID', async () => {
    // 20 Oct stream (XCyY0VDiRps); its transcript file is dated 21 Oct.
    const { items } = await loadContent();
    const stream = items.find((item) => item.videoId === 'XCyY0VDiRps');
    expect(stream?.type).toBe('livestream');
    expect(stream?.transcriptWords).toBeGreaterThan(1000);
    expect(
      items.filter(
        (item) => item.type === 'livestream' && item.date === '2026-10-21',
      ),
    ).toHaveLength(0);
  });
});
