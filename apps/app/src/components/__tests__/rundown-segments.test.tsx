import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RundownSegments } from '@/components/livestreams/RundownSegments';
import type { TalkingPointSegment } from '@/lib/livestream-sections';
import type { TweetSlide } from '@/lib/tweet-slider';

const entry = (id: string) => ({
  handle: 'wickedguro',
  id,
  note: 'High-end edit',
  topicTitle: 'High end',
  url: `https://x.com/wickedguro/status/${id}`,
});

const slide: TweetSlide = {
  ...entry('1'),
  quoted: null,
  tweet: {
    author: {
      avatarUrl: 'https://example.com/a.png',
      handle: 'wickedguro',
      name: 'Nevo David',
      verified: false,
    },
    createdAt: '2026-11-09T10:00:00.000Z',
    likes: 1000,
    media: [],
    replies: 136,
    text: 'The internet is dead',
    truncated: false,
  },
};

const segments: TalkingPointSegment[] = [
  {
    eyebrow: 'Segment 3',
    points: ['What does $10k buy?'],
    title: 'The $10k edit',
    tweets: [entry('1'), entry('2')],
  },
  { eyebrow: null, points: ['Wrap it up'], title: 'Closing', tweets: [] },
];

describe('collapsible rundown', () => {
  const markup = renderToStaticMarkup(
    <RundownSegments segments={segments} slides={{ 1: slide }} />,
  );

  test('every segment starts open and can be folded', () => {
    expect(markup.match(/aria-expanded="true"/g)?.length).toBe(2);
    expect(markup).toContain('Collapse all');
    expect(markup).toContain('What does $10k buy?');
  });

  test('a segment with tweets gets a slider, one post at a time', () => {
    expect(markup.match(/aria-roledescription="carousel"/g)?.length).toBe(1);
    expect(markup).toContain('The internet is dead');
    expect(markup).toContain('1 / 2');
  });

  test('segments without tweets get no slider', () => {
    expect(markup.split('Closing')[1]).not.toContain('carousel');
  });
});
