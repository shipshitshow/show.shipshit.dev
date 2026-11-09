import { describe, expect, test } from 'bun:test';
import type { Topic } from '@shipshitshow/types';
import {
  buildEpisodeDescription,
  buildVideoObjectJsonLd,
  GENERIC_EPISODE_DESCRIPTION,
  serializeJsonLd,
} from '@/lib/episode-seo';

function topic(title: string, content = ''): Topic {
  return {
    announcement_tweet: null,
    content,
    date: '2026-11-03',
    fileName: `${title}.md`,
    generated: {
      linkedin_post: null,
      livestream_tweet: null,
      recap_tweet: null,
      thumbnail_v1: null,
      thumbnail_v2: null,
      thumbnail_v3: null,
      youtube_description: null,
      youtube_title: null,
    },
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    source: '',
    status: 'done',
    thumbnail_prompt: null,
    title,
  };
}

describe('buildEpisodeDescription', () => {
  test('falls back to the generic line without topics', () => {
    expect(buildEpisodeDescription([])).toBe(GENERIC_EPISODE_DESCRIPTION);
  });

  test('uses the written summary of the first topics', () => {
    const description = buildEpisodeDescription([
      topic('A', '## Summary\n\nFirst take on agents.\n'),
      topic('B', '## Summary\n\nSecond take on SaaS.\n'),
      topic('C', '## Summary\n\nNever shown.\n'),
    ]);
    expect(description).toBe('First take on agents. Second take on SaaS.');
  });

  test('uses the title when a topic has no summary', () => {
    expect(buildEpisodeDescription([topic('Black October', '- notes')])).toBe(
      'Black October',
    );
  });

  test('truncates long descriptions on a word boundary', () => {
    const long = `${'word '.repeat(60)}end`;
    const description = buildEpisodeDescription([
      topic('A', `## Summary\n\n${long}\n`),
    ]);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith('…')).toBe(true);
    expect(description).not.toContain('wor…');
  });
});

describe('buildVideoObjectJsonLd', () => {
  const base = {
    description: 'Desc',
    name: 'Title',
    pageUrl: 'https://show.shipshit.dev/talking-points/2026-11-03',
    thumbnailUrl: 'https://img.youtube.com/vi/qAw_zC1_BDM/maxresdefault.jpg',
    uploadDate: '2026-11-03',
    videoId: 'qAw_zC1_BDM',
  };

  test('emits a VideoObject from the archive video id', () => {
    expect(buildVideoObjectJsonLd(base)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      description: 'Desc',
      embedUrl: 'https://www.youtube.com/embed/qAw_zC1_BDM',
      mainEntityOfPage: base.pageUrl,
      name: 'Title',
      thumbnailUrl: [base.thumbnailUrl],
      uploadDate: '2026-11-03',
    });
  });

  test('emits nothing without a valid video id or upload date', () => {
    expect(buildVideoObjectJsonLd({ ...base, videoId: null })).toBeNull();
    expect(buildVideoObjectJsonLd({ ...base, videoId: 'short' })).toBeNull();
    expect(buildVideoObjectJsonLd({ ...base, uploadDate: null })).toBeNull();
    expect(
      buildVideoObjectJsonLd({ ...base, uploadDate: 'not a date' }),
    ).toBeNull();
  });
});

describe('serializeJsonLd', () => {
  test('cannot close the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)');
  });
});
