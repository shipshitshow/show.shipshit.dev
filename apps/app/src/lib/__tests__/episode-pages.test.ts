import { describe, expect, test } from 'bun:test';
import type { Topic } from '@shipshitshow/types';
import { episodePagePathsByVideoId, toEpisodePages } from '@/lib/episode-pages';
import type { LivestreamArchiveItem } from '@/lib/livestreams-store';

function topic(date: string, status: Topic['status'], title = 'T'): Topic {
  return {
    announcement_tweet: null,
    content: '',
    date,
    fileName: `${date}.md`,
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
    slug: 't',
    source: '',
    status,
    thumbnail_prompt: null,
    title,
  };
}

function item(
  date: string,
  topics: Topic[],
  videoId: string | null,
): LivestreamArchiveItem {
  return {
    date,
    hasTranscript: false,
    title: `Archive ${date}`,
    topicCount: topics.length,
    topicDate: date,
    topics,
    transcriptPath: null,
    transcriptTitle: null,
    videoId,
    youtubeUrl: videoId ? `https://youtu.be/${videoId}` : null,
  };
}

describe('toEpisodePages', () => {
  test('keeps only dates with publicly visible topics, newest first', () => {
    const pages = toEpisodePages([
      item('2026-01-05', [topic('2026-01-05', 'done', 'Older')], 'aaaaaaaaaaa'),
      item('2026-01-12', [topic('2026-01-12', 'done', 'Newer')], 'bbbbbbbbbbb'),
      item('2026-01-19', [topic('2026-01-19', 'backlog')], 'ccccccccccc'),
      item('2026-01-26', [], 'ddddddddddd'),
    ]);
    expect(pages.map((page) => page.href)).toEqual([
      '/talking-points/2026-01-12',
      '/talking-points/2026-01-05',
    ]);
    expect(pages[0].title).toBe('Newer');
  });
});

test('links the topic date, not a later transcript date', () => {
  const merged = {
    ...item('2026-01-06', [topic('2026-01-05', 'done')], 'aaaaaaaaaaa'),
    topicDate: '2026-01-05',
  };
  expect(toEpisodePages([merged])[0].href).toBe('/talking-points/2026-01-05');
});

describe('episodePagePathsByVideoId', () => {
  test('maps video ids to page paths and skips entries without a video', () => {
    const pages = toEpisodePages([
      item('2026-01-05', [topic('2026-01-05', 'done')], 'aaaaaaaaaaa'),
      item('2026-01-12', [topic('2026-01-12', 'done')], null),
    ]);
    expect([...episodePagePathsByVideoId(pages)]).toEqual([
      ['aaaaaaaaaaa', '/talking-points/2026-01-05'],
    ]);
  });
});
