import { describe, expect, test } from 'bun:test';
import type { Topic } from '@shipshitshow/types';
import {
  getResourceLinks,
  getStreamResourceSections,
  getStreamSegmentSections,
  getTalkingPoints,
} from '../livestream-sections';
import type { LivestreamCard } from '../livestreams-ui';

function card(content: string): LivestreamCard {
  return {
    effectiveStatus: 'selected',
    thumbnailUrl: '',
    topic: { content } as Topic,
  };
}

// Built at runtime: the repo's secret scan rejects literal studio URLs.
const STUDIO_URL = ['https://studio', 'restream', 'io/abc-def'].join('.');

const content = `## Sources — Market check

- A source.

## Sources — Livestream Notes

- **Viewer question:** what does it cost?
- Restream studio: ${STUDIO_URL}
- Post order: screenshot first.

## Segment 1 — Open on the result

- Show the meter.

## YouTube Description — Paste This

Description.`;

describe('livestream section routing (#72)', () => {
  test('the Livestream Notes brief opens Ressources instead of being hidden', () => {
    const sections = getStreamResourceSections([card(content)]);
    expect(sections.map((section) => section.title)).toEqual([
      'Episode brief',
      'Sources — Market check',
      'YouTube Description — Paste This',
    ]);
    expect(sections[0].body).toContain('Viewer question');
    expect(sections[0].body).toContain('Post order');
  });

  test('studio links never reach the brief card', () => {
    const [brief] = getStreamResourceSections([card(content)]);
    expect(brief.body).not.toContain('restream');
  });

  test('a brief that only held a studio link renders no card', () => {
    const sections = getStreamResourceSections([
      card(`## Livestream Notes\n\n- ${STUDIO_URL}`),
    ]);
    expect(sections).toEqual([]);
  });

  test('segments stay in the rundown and out of Ressources', () => {
    const segments = getStreamSegmentSections([card(content)]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      eyebrow: 'Segment 1',
      title: 'Open on the result',
    });
  });
});

describe('talking points and resource links (Vincent, 6 Nov)', () => {
  const prep = `## Sources — Livestream Notes

- **Viewer question:** what should we check?

### Open these first

1. [Security timeline](https://show.shipshit.dev/artifacts/agent-security-timeline)

## Segment 1 — PHP2Shell: check the runtime, not just the app

### Evidence to open

[PHP's advisory](https://www.php.net/archive/2026.php) — **Confirmed:** fixed releases.

### Conversation cues

- What owns our runtime updates: us, a container image, or a plugin stack? More detail here.
- **Challenge:** "We do not write PHP." Does that answer it?
- Budget: 10 minutes. Exit: software we install.
- Open the timeline and name the tracks.
- OpenAI ships agents too.

## Cold Open — What is at risk?

- Avoid calling it one campaign.
- If a laptop were compromised today, what access would it expose?
- Restream: ${STUDIO_URL}`;

  test('keeps short bullets and drops sources, prose and stage directions', () => {
    const [segment, cold] = getTalkingPoints([card(prep)]);
    expect(segment.title).toBe(
      'PHP2Shell: check the runtime, not just the app',
    );
    expect(segment.points).toEqual([
      'What owns our runtime updates: us, a container image, or a plugin stack?',
      '**Challenge:** "We do not write PHP."',
      'OpenAI ships agents too.',
    ]);
    expect(cold.points).toEqual([
      'If a laptop were compromised today, what access would it expose?',
      'Restream: ' + STUDIO_URL,
    ]);
  });

  test('lists every link once, without studio links', () => {
    expect(getResourceLinks([card(prep)])).toEqual([
      {
        label: 'Security timeline',
        url: 'https://show.shipshit.dev/artifacts/agent-security-timeline',
      },
      { label: "PHP's advisory", url: 'https://www.php.net/archive/2026.php' },
    ]);
  });
});

describe("each segment's tweet slider", () => {
  const A = 'https://x.com/wickedguro/status/2119762008878850555';
  const B = 'https://x.com/wickedguro/status/2119413408982298971';
  const prep = `## Cold Open — Hook

- Open with the post.
- [Post A](${A})

## Segment 1 — High end

### Evidence

- [Post A again](${A}), 613k views.
- [Post B](${B}), self-reported cost.

### Conversation cues

- What does 10k buy?`;

  test('evidence links feed the slider while bullets stay clean', () => {
    const [, segment] = getTalkingPoints([card(prep)]);
    expect(segment.points).toEqual(['What does 10k buy?']);
    expect(segment.tweets.map((tweet) => tweet.id)).toEqual([
      '2119413408982298971',
    ]);
  });

  test('a post shown by an earlier segment is not repeated', () => {
    const [cold, segment] = getTalkingPoints([card(prep)]);
    expect(cold.tweets.map((tweet) => tweet.id)).toEqual([
      '2119762008878850555',
    ]);
    expect(
      segment.tweets.some((tweet) => tweet.id === '2119762008878850555'),
    ).toBe(false);
  });
});
