import { describe, expect, test } from 'bun:test';
import { matchEpisodeVideos } from '@/lib/episode-video-match';
import type { ChannelUpload } from '@/lib/youtube/client';

function upload(
  videoId: string,
  publishedAt: string,
  type: ChannelUpload['type'] = 'video',
  isPublic = true,
): ChannelUpload {
  return { channelId: 'UCx', isPublic, publishedAt, type, videoId };
}

const DATES = ['2026-10-20', '2026-10-27', '2026-11-03'];

describe('matchEpisodeVideos', () => {
  test('gives each episode the flagship and Shorts published in its window', () => {
    const match = matchEpisodeVideos(DATES, [
      upload('recap20', '2026-10-21T15:00:00Z'),
      upload('short20', '2026-10-22T10:00:00Z', 'short'),
      upload('recap27', '2026-10-28T15:00:00Z'),
      upload('short27a', '2026-10-28T16:00:00Z', 'short'),
      upload('short27b', '2026-10-29T16:00:00Z', 'short'),
    ]);

    expect(match.get('2026-10-20')).toEqual({
      flagshipId: 'recap20',
      shortIds: ['short20'],
    });
    expect(match.get('2026-10-27')).toEqual({
      flagshipId: 'recap27',
      shortIds: ['short27a', 'short27b'],
    });
    expect(match.get('2026-11-03')).toEqual({ flagshipId: null, shortIds: [] });
  });

  test('skips the livestream, private uploads and uploads before the first episode', () => {
    const match = matchEpisodeVideos(
      DATES,
      [
        upload('live', '2026-10-21T04:00:00Z', 'livestream'),
        upload('excluded', '2026-10-21T05:00:00Z'),
        upload('draft', '2026-10-22T05:00:00Z', 'video', false),
        upload('early', '2026-10-01T05:00:00Z'),
      ],
      new Set(['excluded']),
    );

    expect(match.get('2026-10-20')).toEqual({ flagshipId: null, shortIds: [] });
  });

  test('takes the earliest long-form video as the flagship', () => {
    const match = matchEpisodeVideos(DATES, [
      upload('later', '2026-10-23T10:00:00Z'),
      upload('first', '2026-10-21T10:00:00Z'),
    ]);

    expect(match.get('2026-10-20')?.flagshipId).toBe('first');
  });

  test('does not stretch an episode over a gap longer than a week', () => {
    const match = matchEpisodeVideos(
      ['2026-09-08', '2026-09-29'],
      [upload('stray', '2026-09-25T10:00:00Z')],
    );

    expect(match.get('2026-09-08')).toEqual({ flagshipId: null, shortIds: [] });
    expect(match.get('2026-09-29')).toEqual({ flagshipId: null, shortIds: [] });
  });
});
