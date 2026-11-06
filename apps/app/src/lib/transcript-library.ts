import type { PublishedVideoItem } from './livestreams-store';

export type TranscriptTypeFilter = 'all' | PublishedVideoItem['type'];
export type TranscriptSort = 'longest' | 'newest' | 'oldest' | 'relevance';

export interface TranscriptEntry extends PublishedVideoItem {
  /** Whitespace-collapsed plain text, used only for search. */
  searchText: string;
}

export interface SnippetPart {
  hit: boolean;
  text: string;
}

export interface TranscriptResult {
  entry: TranscriptEntry;
  /** Occurrences of the search terms in the transcript text. */
  hits: number;
  /** The words appear next to each other, in the order typed. */
  phraseMatch: boolean;
  snippet: SnippetPart[] | null;
  titleMatch: boolean;
}

export interface TranscriptQuery {
  q?: string;
  sort?: TranscriptSort;
  type?: TranscriptTypeFilter;
}

const SNIPPET_RADIUS = 90;

export function parseTypeFilter(value: string | undefined) {
  return value === 'livestream' || value === 'short' || value === 'video'
    ? value
    : 'all';
}

export function parseSort(
  value: string | undefined,
  hasQuery: boolean,
): TranscriptSort {
  if (value === 'oldest' || value === 'longest' || value === 'newest')
    return value;
  return hasQuery ? 'relevance' : 'newest';
}

/**
 * Lower-cased words, or "quoted phrases" kept whole; every one must be found
 * for an entry to match.
 */
export function searchTerms(q: string | undefined): string[] {
  const terms: string[] = [];
  for (const match of (q ?? '').toLowerCase().matchAll(/"([^"]+)"|(\S+)/g)) {
    const term = (match[1] ?? match[2]).replace(/\s+/g, ' ').trim();
    if (term && !terms.includes(term)) terms.push(term);
  }
  return terms;
}

/** The query as typed, without quotes, for matching it as one phrase. */
function wholePhrase(q: string | undefined): string {
  return (q ?? '').toLowerCase().replace(/"/g, ' ').replace(/\s+/g, ' ').trim();
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = haystack.indexOf(needle);
  while (from !== -1) {
    count += 1;
    from = haystack.indexOf(needle, from + needle.length);
  }
  return count;
}

/** A short excerpt around the first hit, split so the hits can be marked. */
export function buildSnippet(
  text: string,
  terms: readonly string[],
): SnippetPart[] | null {
  if (terms.length === 0) return null;
  const lower = text.toLowerCase();
  let first = -1;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at !== -1 && (first === -1 || at < first)) first = at;
  }
  if (first === -1) return null;

  let start = Math.max(0, first - SNIPPET_RADIUS);
  let end = Math.min(text.length, first + SNIPPET_RADIUS);
  // Start and end on word edges so the excerpt does not cut a word in half.
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < first) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > first) end = space;
  }
  const excerpt = text.slice(start, end);
  const prefix = start > 0 ? '… ' : '';
  const suffix = end < text.length ? ' …' : '';

  const escaped = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts: SnippetPart[] = [];
  excerpt.split(pattern).forEach((piece, index) => {
    if (piece) parts.push({ hit: index % 2 === 1, text: piece });
  });
  if (prefix) parts.unshift({ hit: false, text: prefix });
  if (suffix) parts.push({ hit: false, text: suffix });
  return parts;
}

const bySort: Record<
  TranscriptSort,
  (a: TranscriptResult, b: TranscriptResult) => number
> = {
  longest: (a, b) => b.entry.wordCount - a.entry.wordCount,
  newest: (a, b) => b.entry.date.localeCompare(a.entry.date),
  oldest: (a, b) => a.entry.date.localeCompare(b.entry.date),
  relevance: (a, b) =>
    Number(b.titleMatch) - Number(a.titleMatch) ||
    Number(b.phraseMatch) - Number(a.phraseMatch) ||
    b.hits - a.hits ||
    b.entry.date.localeCompare(a.entry.date),
};

export function searchTranscripts(
  entries: readonly TranscriptEntry[],
  query: TranscriptQuery,
): TranscriptResult[] {
  const terms = searchTerms(query.q);
  const phrase = terms.length > 1 ? wholePhrase(query.q) : '';
  const type = query.type ?? 'all';
  const results: TranscriptResult[] = [];

  for (const entry of entries) {
    if (type !== 'all' && entry.type !== type) continue;
    if (terms.length === 0) {
      results.push({
        entry,
        hits: 0,
        phraseMatch: false,
        snippet: null,
        titleMatch: false,
      });
      continue;
    }
    const title = entry.title.toLowerCase();
    const text = entry.searchText.toLowerCase();
    if (!terms.every((term) => title.includes(term) || text.includes(term)))
      continue;
    const phraseMatch = phrase !== '' && text.includes(phrase);
    results.push({
      entry,
      hits: terms.reduce((sum, term) => sum + countOccurrences(text, term), 0),
      phraseMatch,
      snippet: buildSnippet(
        entry.searchText,
        phraseMatch ? [phrase, ...terms] : terms,
      ),
      titleMatch: terms.some((term) => title.includes(term)),
    });
  }

  const sort = query.sort ?? (terms.length > 0 ? 'relevance' : 'newest');
  return results.sort(bySort[sort]);
}

export interface TranscriptStats {
  firstDate: string | null;
  lastDate: string | null;
  livestreams: number;
  shorts: number;
  total: number;
  videos: number;
  words: number;
}

export function transcriptStats(
  entries: readonly PublishedVideoItem[],
): TranscriptStats {
  const dates = entries.map((entry) => entry.date).sort();
  return {
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    livestreams: entries.filter((entry) => entry.type === 'livestream').length,
    shorts: entries.filter((entry) => entry.type === 'short').length,
    total: entries.length,
    videos: entries.filter((entry) => entry.type === 'video').length,
    words: entries.reduce((sum, entry) => sum + entry.wordCount, 0),
  };
}

/** Snapshot videos that no transcript in the library points at. */
export function missingTranscripts<
  T extends { id: string; privacyStatus: string },
>(snapshot: readonly T[], entries: readonly PublishedVideoItem[]): T[] {
  const have = new Set(
    entries.map((entry) => entry.videoId).filter((id): id is string => !!id),
  );
  return snapshot.filter((video) => !have.has(video.id));
}
