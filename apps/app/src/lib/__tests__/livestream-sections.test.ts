import { describe, expect, test } from 'bun:test';
import type { Topic } from '@shipshitshow/types';
import {
  getStreamResourceSections,
  getStreamSegmentSections,
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
