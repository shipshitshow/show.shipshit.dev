import { describe, expect, test } from 'bun:test';
import {
  buildSnippet,
  missingTranscripts,
  parseSort,
  parseTypeFilter,
  searchTerms,
  searchTranscripts,
  type TranscriptEntry,
  transcriptStats,
} from './transcript-library';

function entry(
  slug: string,
  date: string,
  type: TranscriptEntry['type'],
  text: string,
  wordCount = text.split(' ').length,
  videoId: string | null = slug,
): TranscriptEntry {
  return {
    date,
    routeSlug: slug,
    searchText: text,
    title: `Title ${slug}`,
    transcriptPath: `/x/${slug}.txt`,
    type,
    videoId,
    wordCount,
    youtubeUrl: null,
  };
}

const entries = [
  entry('a', '2026-10-01', 'video', 'The harness is the IP. Harness again.'),
  entry('b', '2026-10-08', 'livestream', 'We talk about Claude and harness.'),
  entry('c', '2026-09-01', 'video', 'Nothing relevant in here at all', 900),
];

describe('transcript library search', () => {
  test('no query lists everything newest first', () => {
    expect(
      searchTranscripts(entries, {}).map((r) => r.entry.routeSlug),
    ).toEqual(['b', 'a', 'c']);
  });
  test('every term must be found, case-insensitively', () => {
    const slugs = (q: string) =>
      searchTranscripts(entries, { q }).map((r) => r.entry.routeSlug);
    expect(slugs('HARNESS')).toEqual(['a', 'b']);
    expect(slugs('harness claude')).toEqual(['b']);
    expect(slugs('missing')).toEqual([]);
  });
  test('relevance puts the most hits first', () => {
    const [first] = searchTranscripts(entries, { q: 'harness' });
    expect(first.entry.routeSlug).toBe('a');
    expect(first.hits).toBe(2);
  });
  test('a title match outranks body hits', () => {
    const results = searchTranscripts(entries, { q: 'title b harness' });
    expect(results.map((r) => r.entry.routeSlug)).toEqual(['b']);
    expect(results[0].titleMatch).toBe(true);
  });
  test('type filter and explicit sorts', () => {
    expect(
      searchTranscripts(entries, { type: 'video' }).map(
        (r) => r.entry.routeSlug,
      ),
    ).toEqual(['a', 'c']);
    expect(
      searchTranscripts(entries, { sort: 'longest' })[0].entry.routeSlug,
    ).toBe('c');
    expect(
      searchTranscripts(entries, { sort: 'oldest' })[0].entry.routeSlug,
    ).toBe('c');
  });
  test('a phrase match outranks scattered words, and quotes force a phrase', () => {
    const docs = [
      entry(
        'scattered',
        '2026-10-10',
        'video',
        'the dead dog and the internet',
      ),
      entry('phrase', '2026-10-01', 'video', 'it is the dead internet theory'),
    ];
    const slugs = (q: string) =>
      searchTranscripts(docs, { q }).map((r) => r.entry.routeSlug);
    expect(slugs('dead internet')).toEqual(['phrase', 'scattered']);
    expect(slugs('"dead internet"')).toEqual(['phrase']);
  });
  test('query parsing is forgiving', () => {
    expect(searchTerms('say "dead  internet" now')).toEqual([
      'say',
      'dead internet',
      'now',
    ]);
    expect(searchTerms('  Harness   harness  IP ')).toEqual(['harness', 'ip']);
    expect(parseTypeFilter('livestream')).toBe('livestream');
    expect(parseTypeFilter('nonsense')).toBe('all');
    expect(parseSort(undefined, true)).toBe('relevance');
    expect(parseSort(undefined, false)).toBe('newest');
    expect(parseSort('oldest', true)).toBe('oldest');
  });
});

describe('snippets', () => {
  test('marks hits and trims to word edges', () => {
    const text = `${'word '.repeat(60)}the harness is the IP ${'tail '.repeat(60)}`;
    const parts = buildSnippet(text, ['harness']);
    expect(parts?.some((part) => part.hit && part.text === 'harness')).toBe(
      true,
    );
    const joined = parts?.map((part) => part.text).join('') ?? '';
    expect(joined.startsWith('… ')).toBe(true);
    expect(joined.endsWith(' …')).toBe(true);
    expect(joined.length).toBeLessThan(260);
  });
  test('regex characters in a term are matched literally', () => {
    expect(buildSnippet('costs $5 (maybe)', ['(maybe)'])).toEqual([
      { hit: false, text: 'costs $5 ' },
      { hit: true, text: '(maybe)' },
    ]);
  });
  test('no terms or no match gives no snippet', () => {
    expect(buildSnippet('abc', [])).toBeNull();
    expect(buildSnippet('abc', ['z'])).toBeNull();
  });
});

describe('coverage', () => {
  test('stats add up', () => {
    expect(transcriptStats(entries)).toMatchObject({
      firstDate: '2026-09-01',
      lastDate: '2026-10-08',
      livestreams: 1,
      total: 3,
      videos: 2,
    });
  });
  test('lists snapshot videos without a transcript', () => {
    const snapshot = [
      { id: 'a', privacyStatus: 'public' },
      { id: 'zzz', privacyStatus: 'private' },
    ];
    expect(missingTranscripts(snapshot, entries)).toEqual([snapshot[1]]);
  });
});
