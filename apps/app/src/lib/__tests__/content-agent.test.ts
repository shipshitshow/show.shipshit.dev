import { describe, expect, test } from 'bun:test';
import {
  AGENT_MAX_MESSAGES,
  buildSystemPrompt,
  sanitizeMessages,
  slugFromPath,
} from '@/lib/content-agent';
import type { ContentItem } from '@/lib/content-library';

const item: ContentItem = {
  channel: 'clips',
  date: '2026-10-28',
  external: true,
  href: 'https://www.youtube.com/shorts/s1',
  key: 's1',
  outlier: 3.2,
  stat: { durationSeconds: 41, likes: 14, views: 88 },
  thumbnailUrl: '',
  title: 'The tools are free',
  type: 'short',
  videoId: 's1',
};

describe('content agent', () => {
  test('keeps only well-formed recent messages', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      content: `q${index}`,
      role: 'user',
    }));
    const clean = sanitizeMessages([
      ...many,
      { content: '', role: 'user' },
      { content: 'x', role: 'system' },
      null,
    ]);
    expect(clean).toHaveLength(AGENT_MAX_MESSAGES);
    expect(clean.at(-1)?.content).toBe('q19');
    expect(sanitizeMessages('nope')).toEqual([]);
  });

  test('finds the video a page is about', () => {
    expect(slugFromPath('/content/livestreams/abc/transcript')).toBe('abc');
    expect(slugFromPath('/library/transcripts/2026-10-20-x')).toBe(
      '2026-10-20-x',
    );
    expect(slugFromPath('/content/shorts')).toBeNull();
  });

  test('the prompt carries the rules, the page and the numbers', () => {
    const prompt = buildSystemPrompt({
      items: [item],
      pageLabel: 'Shorts',
      path: '/content/shorts',
      statsFetchedAt: null,
      transcript: null,
    });
    expect(prompt).toContain('40 characters or fewer');
    expect(prompt).toContain('Shorts (/content/shorts)');
    expect(prompt).toContain('not synced yet');
    expect(prompt).toContain(
      'short | clips | s1 | The tools are free | 88 | 14 | 3.2',
    );
    expect(prompt).not.toContain('Transcript of');
  });
});
