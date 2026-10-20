import { describe, expect, test } from 'bun:test';
import type { Tweet } from 'react-tweet/api';
import {
  buildTweetDeck,
  formatTweetText,
  loadTweetSlides,
} from '@/lib/tweet-slider';

describe('buildTweetDeck', () => {
  test('collects X links in note order, deduped, with the line as a note', () => {
    const deck = buildTweetDeck([
      {
        content: [
          '## Sources',
          '| [@finkd](https://x.com/finkd/status/111) 12 Oct | The **launch** post |',
          '- Positive take ([@chetaslua](https://twitter.com/chetaslua/status/222?s=20))',
          '## Description',
          'https://x.com/finkd/status/111',
        ].join('\n'),
        title: 'Muse Wonder',
      },
      {
        content: 'See https://x.com/someone/status/333 for the demo.',
        title: 'Second topic',
      },
    ]);

    expect(deck).toEqual([
      {
        handle: 'finkd',
        id: '111',
        note: 'The launch post',
        topicTitle: 'Muse Wonder',
        url: 'https://x.com/finkd/status/111',
      },
      {
        handle: 'chetaslua',
        id: '222',
        note: 'Positive take (@chetaslua)',
        topicTitle: 'Muse Wonder',
        url: 'https://x.com/chetaslua/status/222',
      },
      {
        handle: 'someone',
        id: '333',
        note: 'See for the demo.',
        topicTitle: 'Second topic',
        url: 'https://x.com/someone/status/333',
      },
    ]);
  });

  test('a Tweets section limits the topic to exactly those posts', () => {
    const deck = buildTweetDeck([
      {
        content: [
          '## Sources',
          'https://x.com/a/status/1',
          '## Tweets',
          '- https://x.com/b/status/2',
          '- https://x.com/c/status/3',
        ].join('\n'),
        title: 'Curated',
      },
    ]);

    expect(deck.map(({ id }) => id)).toEqual(['2', '3']);
  });
});

function tweet(overrides: Partial<Tweet>): Tweet {
  return {
    display_text_range: [0, 0],
    entities: { hashtags: [], symbols: [], urls: [], user_mentions: [] },
    id_str: '1',
    text: '',
    ...overrides,
  } as Tweet;
}

describe('formatTweetText', () => {
  test('keeps the display range, expands links and drops media and quote links', () => {
    const text =
      '@reply Big news &amp; more: https://t.co/abc https://t.co/quote https://t.co/media';
    expect(
      formatTweetText(
        tweet({
          display_text_range: [7, 63],
          entities: {
            hashtags: [],
            media: [
              {
                display_url: 'pic.x.com/x',
                expanded_url: 'https://x.com/a/status/1/photo/1',
                indices: [64, 87],
                url: 'https://t.co/media',
              },
            ],
            symbols: [],
            urls: [
              {
                display_url: 'about.fb.com/news/…',
                expanded_url: 'https://about.fb.com/news/x',
                indices: [28, 45],
                url: 'https://t.co/abc',
              },
              {
                display_url: 'x.com/b/status/9',
                expanded_url: 'https://x.com/b/status/9',
                indices: [46, 63],
                url: 'https://t.co/quote',
              },
            ],
            user_mentions: [],
          },
          quoted_tweet: { id_str: '9' } as Tweet['quoted_tweet'],
          text,
        }),
      ),
    ).toBe('Big news & more: about.fb.com/news/…');
  });

  test('slices by code point so emoji do not shift the range', () => {
    expect(
      formatTweetText(
        tweet({ display_text_range: [0, 4], text: '🚀 hi there' }),
      ),
    ).toBe('🚀 hi');
  });
});

describe('loadTweetSlides', () => {
  test('keeps an entry with no tweet when the fetch fails', async () => {
    const slides = await loadTweetSlides(
      [
        {
          handle: 'a',
          id: '1',
          note: 'note',
          topicTitle: 'T',
          url: 'https://x.com/a/status/1',
        },
      ],
      async () => {
        throw new Error('rate limited');
      },
    );
    expect(slides[0].tweet).toBeNull();
    expect(slides[0].note).toBe('note');
  });
});
