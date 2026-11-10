import { describe, expect, test } from 'bun:test';
import {
  displayTitle,
  parseMetaLine,
  pickCaptionFile,
  planImport,
  vttToClean,
} from './import-transcripts.ts';
import {
  cleanFileName,
  decodeCleanText,
  parseCleanFileName,
  parseRawFileName,
  rawFileName,
} from './lib/transcripts.ts';

describe('id-keyed transcript names', () => {
  test('raw and clean names carry the video id, never the title', () => {
    expect(rawFileName('eYGDOk2HsOg', 'en')).toBe('eYGDOk2HsOg.en.vtt');
    expect(cleanFileName('2026-10-27', 'livestream', '1CFi5rzc2bU')).toBe(
      '2026-10-27-livestream-1CFi5rzc2bU.txt',
    );
  });
  test('names parse back to their parts, legacy title names do not', () => {
    expect(parseRawFileName('-qsSddwzjpY.ko.vtt')).toEqual({
      id: '-qsSddwzjpY',
      lang: 'ko',
    });
    expect(parseRawFileName('eYGDOk2HsOg-[LIVE] Fable 5.en.vtt')).toBeNull();
    expect(parseCleanFileName('2026-10-27-livestream-1CFi5rzc2bU.txt')).toEqual(
      { date: '2026-10-27', id: '1CFi5rzc2bU', type: 'livestream' },
    );
    expect(
      parseCleanFileName('2026-10-27-livestream-npm-is-broken.txt'),
    ).toBeNull();
  });
  test('trailing hashtags are dropped from titles', () => {
    expect(displayTitle('GPT 5.4 vs Opus 4.6: The Verdict #shorts')).toBe(
      'GPT 5.4 vs Opus 4.6: The Verdict',
    );
    expect(displayTitle('#1 Tip #ai #shorts')).toBe('#1 Tip');
    expect(displayTitle('#shorts')).toBe('#shorts');
  });
  test('the stream start day wins over the upload day', () => {
    expect(parseMetaLine('1CFi5rzc2bU|20261028|20261027|Launch | Day')).toEqual(
      { date: '2026-10-27', id: '1CFi5rzc2bU', title: 'Launch | Day' },
    );
    expect(parseMetaLine('kH3jy7CK1YU|20261029|NA|Genfeed')?.date).toBe(
      '2026-10-29',
    );
    expect(parseMetaLine('broken')).toBeNull();
  });
});

describe('caption language', () => {
  test('picks the original-language track, never the translation', () => {
    const names = ['abcdefghijk.en.vtt', 'abcdefghijk.ko-orig.vtt'];
    expect(pickCaptionFile(names, 'abcdefghijk')).toEqual({
      lang: 'ko',
      name: 'abcdefghijk.ko-orig.vtt',
    });
  });
  test('a video with only a translated track has no original', () => {
    expect(pickCaptionFile(['abcdefghijk.en.vtt'], 'abcdefghijk')).toBeNull();
  });
  test('English wins among several originals; other ids are ignored', () => {
    const names = [
      'abcdefghijk.ja-orig.vtt',
      'abcdefghijk.en-orig.vtt',
      'zzzzzzzzzzz.fr-orig.vtt',
    ];
    expect(pickCaptionFile(names, 'abcdefghijk')?.lang).toBe('en');
    expect(pickCaptionFile(names, 'zzzzzzzzzzz')?.lang).toBe('fr');
  });
});

describe('import plan', () => {
  test('a retitled video that is already saved is not imported again', () => {
    const listed = [
      {
        id: 'timLg3kKS4s',
        title: 'Your SaaS Will Get Hacked',
        type: 'video' as const,
      },
      { id: 'newnewnew11', title: 'New', type: 'short' as const },
    ];
    const plan = planImport(
      listed,
      new Set(['timLg3kKS4s']),
      new Set(['timLg3kKS4s']),
    );
    expect(plan.missing.map((v) => v.id)).toEqual(['newnewnew11']);
    expect(plan.unindexed).toEqual([]);
  });
  test('saved captions without an index row are indexed, not downloaded', () => {
    const listed = [{ id: 'abcdefghijk', title: 'X', type: 'short' as const }];
    const plan = planImport(listed, new Set(['abcdefghijk']), new Set());
    expect(plan.missing).toEqual([]);
    expect(plan.unindexed.map((v) => v.id)).toEqual(['abcdefghijk']);
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
  test('decodes the entities VTT escapes, so speaker marks are real', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
&gt;&gt; Tom &amp; Jerry&nbsp;said it.
`;
    expect(vttToClean(vtt)).toBe('>> Tom & Jerry said it.\n');
  });
  test('decodeCleanText fixes files an older import left escaped', () => {
    expect(decodeCleanText('&gt;&gt; So  it&#39;s &amp;gt; fine\n')).toBe(
      ">> So it's &gt; fine\n",
    );
  });
});
