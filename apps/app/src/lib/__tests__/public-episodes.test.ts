import { describe, expect, test } from 'bun:test';
import {
  groupPublicEpisodes,
  type PublicEpisode,
  parsePublicVideoDetails,
} from '@/lib/public-episodes';

const channel = 'main-channel';
function item(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      channelId: channel,
      liveBroadcastContent: 'none',
      publishedAt: '2026-10-01T18:00:00Z',
      title,
    },
    status: { privacyStatus: 'public' },
    ...extra,
  };
}

const known: PublicEpisode = {
  format: 'livestream',
  id: 'stream12345',
  publishedAt: '2026-09-30T18:00:00Z',
  thumbnailUrl: 'https://i.ytimg.com/vi/stream12345/hqdefault.jpg',
  title: 'A model comparison',
  url: 'https://www.youtube.com/watch?v=stream12345',
};

describe('public episode formats', () => {
  test('recognizes completed and scheduled streams without title heuristics', () => {
    const result = parsePublicVideoDetails(
      {
        items: [
          item('stream12345', 'A model comparison', {
            liveStreamingDetails: { actualStartTime: '2026-09-30T17:00:00Z' },
          }),
          item('edited12345', 'LIVE coding: the edited highlights'),
          item('future12345', 'Next conversation', {
            liveStreamingDetails: {
              scheduledStartTime: '2026-10-06T17:00:00Z',
            },
          }),
        ],
      },
      channel,
    );
    expect(result.map(({ id, format }) => ({ format, id }))).toEqual([
      { format: 'livestream', id: 'stream12345' },
      { format: 'video', id: 'edited12345' },
      { format: 'livestream', id: 'future12345' },
    ]);
  });

  test('splits Shorts from long-form videos by duration, never streams', () => {
    const withDuration = (id: string, duration: string, extra = {}) =>
      item(id, id, { contentDetails: { duration }, ...extra });
    const result = parsePublicVideoDetails(
      {
        items: [
          withDuration('short123456', 'PT45S'),
          withDuration('threemin123', 'PT3M'),
          withDuration('long1234567', 'PT3M1S'),
          withDuration('episode1234', 'PT1H2M3S'),
          withDuration('nodur123456', 'P0D'),
          withDuration('stream12345', 'PT50S', {
            liveStreamingDetails: { actualStartTime: '2026-09-30T17:00:00Z' },
          }),
        ],
      },
      channel,
    );
    expect(result.map(({ id, format }) => ({ format, id }))).toEqual([
      { format: 'short', id: 'short123456' },
      { format: 'short', id: 'threemin123' },
      { format: 'video', id: 'long1234567' },
      { format: 'video', id: 'episode1234' },
      { format: 'video', id: 'nodur123456' },
      { format: 'livestream', id: 'stream12345' },
    ]);
  });

  test('groups Shorts into their own list, apart from videos', () => {
    const short = { ...known, format: 'short' as const, id: 'short123456' };
    const video = { ...known, format: 'video' as const, id: 'video123456' };
    const result = groupPublicEpisodes([], [], [short, video]);
    expect(result.shorts.map(({ id }) => id)).toEqual([]);
    const withKnown = groupPublicEpisodes([short, video], [], [short, video]);
    expect(withKnown.shorts.map(({ id }) => id)).toEqual(['short123456']);
    expect(withKnown.videos.map(({ id }) => id)).toEqual(['video123456']);
  });

  test('never returns private, unlisted, other-channel or malformed items', () => {
    expect(
      parsePublicVideoDetails(
        {
          items: [
            item('private1234', 'Private', {
              status: { privacyStatus: 'private' },
            }),
            item('unlisted123', 'Unlisted', {
              status: { privacyStatus: 'unlisted' },
            }),
            item('foreign1234', 'Another creator', {
              snippet: { channelId: 'other' },
            }),
            item('bad-date123', 'Bad date', {
              snippet: {
                channelId: channel,
                publishedAt: 'invalid',
                title: 'Bad date',
              },
            }),
            null,
          ],
        },
        channel,
      ),
    ).toEqual([]);
  });

  test('an API outage uses known formats, but does not guess unknown RSS IDs', () => {
    const { format: _format, ...feedVideo } = known;
    const result = groupPublicEpisodes(
      [
        { ...feedVideo, title: 'Updated public title' },
        { ...feedVideo, id: 'unknown1234', title: '[LIVE] Unknown format' },
      ],
      [known],
      null,
    );
    expect(result.livestreams).toHaveLength(1);
    expect(result.shorts).toEqual([]);
    expect(result.livestreams[0]?.title).toBe('Updated public title');
    expect(result.videos).toEqual([]);
  });

  test('successful metadata removes unavailable archive items and sorts/deduplicates each format', () => {
    expect(groupPublicEpisodes([], [known], [])).toEqual({
      livestreams: [],
      shorts: [],
      videos: [],
    });
    const newer = {
      ...known,
      id: 'newer123456',
      publishedAt: '2026-10-02T18:00:00Z',
    };
    const result = groupPublicEpisodes([newer], [known], [known, newer, newer]);
    expect(result.livestreams.map(({ id }) => id)).toEqual([
      'newer123456',
      'stream12345',
    ]);
    expect(result.videos).toEqual([]);
  });
});
