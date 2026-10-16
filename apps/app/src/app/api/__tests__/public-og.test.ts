import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { Topic, TopicStatus } from '@shipshitshow/types';
import * as og from 'next/og';
import type { ReactElement } from 'react';
import { GET } from '@/app/api/og/livestreams/[slug]/route';
import * as store from '@/lib/livestreams-store';

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

async function render(
  status: TopicStatus,
  date: string,
  source = 'Private source',
) {
  const topic: Topic = {
    announcement_tweet: null,
    content: '## Summary\nPrivate summary',
    date,
    fileName: 'secret.md',
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
    slug: 'secret',
    source,
    status,
    thumbnail_prompt: null,
    title: 'Private title',
  };
  const dates = spyOn(store, 'resolveLivestreamDate').mockResolvedValue(date);
  const topics = spyOn(store, 'getTopicsForDate').mockResolvedValue([topic]);
  const image = spyOn(
    og as unknown as { ImageResponse: (element: ReactElement) => Response },
    'ImageResponse',
  ).mockImplementation((element) => new Response(JSON.stringify(element)));
  restores.push(
    () => dates.mockRestore(),
    () => topics.mockRestore(),
    () => image.mockRestore(),
  );
  return (
    await GET(
      new Request(
        `https://show.shipshit.dev/api/og/livestreams/secret?date=${date}`,
      ),
      {
        params: Promise.resolve({ slug: 'secret' }),
      },
    )
  ).text();
}

describe('public OG topic visibility', () => {
  for (const date of ['2000-01-01', '2999-01-01']) {
    for (const status of ['draft', 'backlog'] as const) {
      test(`${date} ${status} uses a generic card`, async () => {
        const output = await render(status, date);
        expect(output).toContain('Ship Sh!t Show');
        expect(output).not.toContain('Private title');
        expect(output).not.toContain('Private summary');
        expect(output).not.toContain('Private source');
      });
    }
  }
  test('an upcoming unselected topic uses a generic card', async () => {
    expect(await render('done', '2999-01-01')).not.toContain('Private title');
  });
  test('a past published topic renders its content', async () => {
    const output = await render('done', '2000-01-01');
    expect(output).toContain('Private title');
    expect(output).toContain('Private summary');
    expect(output).toContain('Private source');
  });
  test('a long source paragraph does not take over the card footer', async () => {
    const source =
      '[Official launch](https://example.com/launch) ' +
      'Additional source context. '.repeat(40);
    const output = await render('done', '2000-01-01', source);
    expect(output).toContain('Official launch');
    expect(output).not.toContain('https://example.com/launch');
    expect(output).not.toContain('Additional source context. '.repeat(4));
    expect(output).toContain('Private title');
  });

  test('an upcoming selected topic renders its content', async () => {
    expect(await render('in_progress', '2999-01-01')).toContain(
      'Private title',
    );
  });
});
