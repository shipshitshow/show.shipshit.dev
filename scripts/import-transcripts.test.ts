import { describe, expect, test } from 'bun:test';
import {
  cleanFileName,
  displayTitle,
  parseMetaLine,
  rawFileName,
  safeFileTitle,
  slugify,
  vttToClean,
} from './import-transcripts.ts';

describe('transcript import naming', () => {
  test('slugs match the app’s title key', () => {
    expect(
      slugify('Stop Paying For AI. Use OpenRouter Stealth & Free Models.'),
    ).toBe('stop-paying-for-ai-use-openrouter-stealth-free-models');
    expect(slugify('[LIVE] NPM Is Broken')).toBe('npm-is-broken');
  });
  test('trailing hashtags are dropped', () => {
    expect(displayTitle('GPT 5.4 vs Opus 4.6: The Verdict #shorts')).toBe(
      'GPT 5.4 vs Opus 4.6: The Verdict',
    );
    expect(displayTitle('#1 Tip #ai #shorts')).toBe('#1 Tip');
    expect(displayTitle('#shorts')).toBe('#shorts');
  });
  test('livestream raw files keep the [LIVE] tag the app reads the type from', () => {
    expect(
      rawFileName({
        id: 'eYGDOk2HsOg',
        title: 'Fable 5: Gone?',
        type: 'livestream',
      }),
    ).toBe('eYGDOk2HsOg-[LIVE] Fable 5： Gone？.en.vtt');
    expect(
      rawFileName({ id: 'lmLaYAEpFDc', title: 'A/B', type: 'short' }),
    ).toBe('lmLaYAEpFDc-A⧸B.en.vtt');
    expect(safeFileTitle('"we" <checked>')).toBe('_we_ _checked_');
  });
  test('the stream start day wins over the upload day', () => {
    const meta = parseMetaLine('1CFi5rzc2bU|20261028|20261027|Launch | Day');
    expect(meta).toEqual({
      date: '2026-10-27',
      id: '1CFi5rzc2bU',
      title: 'Launch | Day',
    });
    expect(parseMetaLine('kH3jy7CK1YU|20261029|NA|Genfeed')?.date).toBe(
      '2026-10-29',
    );
    expect(parseMetaLine('broken')).toBeNull();
    expect(cleanFileName(meta!, 'livestream')).toBe(
      '2026-10-27-livestream-launch-day.txt',
    );
  });
});

describe('vttToClean', () => {
  test('drops headers, timings, inline tags and rolling repeats', () => {
    const vtt = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000 align:start position:0%
You are in a race<00:00:00.500><c> with</c>

00:00:02.000 --> 00:00:02.010
You are in a race with

00:00:02.010 --> 00:00:04.000
hackers all the time.
`;
    expect(vttToClean(vtt)).toBe(
      'You are in a race with\nhackers all the time.\n',
    );
    expect(vttToClean('WEBVTT\n\n')).toBe('');
  });
});
