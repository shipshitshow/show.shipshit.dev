import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TweetSlider } from '@/components/livestreams/TweetSlider';
import type { TweetSlide } from '@/lib/tweet-slider';

const slides: TweetSlide[] = ['one', 'two', 'three'].map((name) => ({
  handle: name,
  id: `id-${name}`,
  note: `note ${name}`,
  quoted: null,
  topicTitle: 'Topic',
  tweet: null,
  url: `https://x.com/${name}/status/1`,
}));

describe('TweetSlider server render', () => {
  // The hidden slides and the URL hash live in the browser, so the server
  // render has to show the first slide of the whole deck without touching them.
  const markup = renderToStaticMarkup(
    <TweetSlider
      backHref="/content"
      date="2026-11-17"
      slides={slides}
      title="Episode"
    />,
  );

  test('renders without a window and opens on the first slide', () => {
    expect(markup).toContain('x.com/one');
    expect(markup).not.toContain('x.com/two');
  });
});
