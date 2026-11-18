/**
 * Transcript editing: the word-level transcript of a recording, the cut
 * categories that are marked in it, and the cuts a producer saves.
 *
 * A cut is a word index. Cutting words never changes the transcript, so a cut
 * set can always be restored, and the recut script reads the saved word
 * indexes (`idx`) or the merged source-time `ranges`.
 */

export type CutCategory = 'D' | 'E' | 'F' | 'H' | 'R' | 'S';

export const CUT_CATEGORIES: Record<
  CutCategory,
  { hint: string; label: string }
> = {
  D: { hint: 'a word said twice', label: 'Repeats' },
  E: { hint: 'a word in another language', label: 'French' },
  F: { hint: 'uh, um, hmm', label: 'Fillers' },
  H: { hint: 'go ahead Vincent', label: 'Handovers' },
  R: { hint: 'a one-word answer', label: 'Reactions' },
  S: { hint: 'a word cut off mid-way', label: 'Stutters' },
};

/** Categories in the order the dropdown lists them. */
export const CUT_CATEGORY_ORDER: readonly CutCategory[] = [
  'F',
  'S',
  'D',
  'R',
  'H',
  'E',
];

export interface EditWord {
  /** Marked category, or '' for a word nobody suggested cutting. */
  flag: CutCategory | '';
  /** Index in the whole transcript. Stable: cuts refer to it. */
  idx: number;
  /** Speaker index into `EditSession.speakers`. */
  spk: number;
  t0: number;
  t1: number;
  text: string;
  /** Turn counter: a new turn starts a new speaker block. */
  turn: number;
}

export interface EditSection {
  /** Last word idx in the section, inclusive. */
  to: number;
  /** First word idx in the section. */
  from: number;
  title: string;
}

export interface EditSession {
  id: string;
  sections: EditSection[];
  speakers: string[];
  title: string;
  words: EditWord[];
}

export interface EditSummary {
  duration: number;
  id: string;
  title: string;
  updatedAt: string;
  words: number;
}

/** [idx, t0, t1, text, speaker, flag, turn]: one word on the wire. */
export type EditWordTuple = [
  number,
  number,
  number,
  string,
  number,
  string,
  number,
];

export interface EditCuts {
  cutSeconds: number;
  cutWords: number;
  edited: true;
  idx: number[];
  ranges: EditRange[];
  updated: string;
  version: 1;
}

export interface EditRange {
  a: number;
  b: number;
  text: string;
}

const EDIT_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const EDIT_MAX_WORDS = 60_000;

export function isEditId(value: unknown): value is string {
  return typeof value === 'string' && EDIT_ID_PATTERN.test(value);
}

const CATEGORY_KEYS = new Set<string>(Object.keys(CUT_CATEGORIES));

function isCategory(value: unknown): value is CutCategory {
  return typeof value === 'string' && CATEGORY_KEYS.has(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The word on the wire, with its position kept so a failure can name it. */
export function toTuple(word: EditWord): EditWordTuple {
  return [
    word.idx,
    word.t0,
    word.t1,
    word.text,
    word.spk,
    word.flag,
    word.turn,
  ];
}

function parseTuple(value: unknown, position: number): EditWord {
  if (!Array.isArray(value) || value.length < 4)
    throw new Error(`Word ${position} must be [idx, t0, t1, text, ...].`);
  const [idx, t0, t1, text, spk = 0, flag = '', turn = 0] = value as unknown[];
  if (!Number.isInteger(idx) || (idx as number) < 0)
    throw new Error(`Word ${position} needs a whole-number idx.`);
  if (!isFiniteNumber(t0) || !isFiniteNumber(t1) || t1 < t0)
    throw new Error(`Word ${position} needs t0 <= t1 in seconds.`);
  if (typeof text !== 'string' || !text)
    throw new Error(`Word ${position} needs text.`);
  if (!Number.isInteger(spk) || (spk as number) < 0)
    throw new Error(`Word ${position} needs a speaker index.`);
  if (!Number.isInteger(turn) || (turn as number) < 0)
    throw new Error(`Word ${position} needs a turn number.`);
  if (flag !== '' && !isCategory(flag))
    throw new Error(`Word ${position} has an unknown category "${flag}".`);
  return {
    flag: flag as CutCategory | '',
    idx: idx as number,
    spk: spk as number,
    t0,
    t1,
    text,
    turn: turn as number,
  };
}

/**
 * Validates a pushed transcript: `{ id, title, speakers, sections?, words }`
 * with words as tuples. Categories the file leaves empty are suggested by
 * `markWords`.
 */
export function parseEditSession(value: unknown, id: string): EditSession {
  if (!value || typeof value !== 'object') throw new Error('Send a JSON body.');
  const body = value as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) throw new Error('The transcript needs a title.');
  const speakers = body.speakers;
  if (
    !Array.isArray(speakers) ||
    speakers.length === 0 ||
    !speakers.every((name) => typeof name === 'string' && name)
  )
    throw new Error('speakers must be a list of names.');
  if (!Array.isArray(body.words) || body.words.length === 0)
    throw new Error('The transcript needs words.');
  if (body.words.length > EDIT_MAX_WORDS)
    throw new Error(`At most ${EDIT_MAX_WORDS} words.`);

  const words = body.words.map((word, position) => parseTuple(word, position));
  const seen = new Set<number>();
  for (const word of words) {
    if (seen.has(word.idx))
      throw new Error(`Word idx ${word.idx} is repeated.`);
    seen.add(word.idx);
    if (word.spk >= speakers.length)
      throw new Error(`Word ${word.idx} names an unknown speaker.`);
  }

  let sections: EditSection[] = [];
  if (body.sections !== undefined) {
    if (!Array.isArray(body.sections)) throw new Error('Bad sections.');
    sections = body.sections.map((section: unknown) => {
      const {
        from,
        title: name,
        to,
      } = (section ?? {}) as Record<string, unknown>;
      if (
        typeof name !== 'string' ||
        !Number.isInteger(from) ||
        !Number.isInteger(to)
      )
        throw new Error('A section needs title, from and to.');
      return { from: from as number, title: name, to: to as number };
    });
  }
  return {
    id,
    sections,
    speakers: speakers as string[],
    title,
    words: markWords(words),
  };
}

/* ---------- marking ---------- */

const FILLERS = new Set(['uh', 'um', 'uhm', 'umm', 'er', 'erm', 'ah', 'hmm']);
const REACTIONS = new Set([
  'absolutely',
  'definitely',
  'exactly',
  'mhm',
  'mm-hm',
  'mm-hmm',
  'ok',
  'okay',
  'sure',
  'totally',
  'true',
  'uh-huh',
  'wow',
  'yeah',
  'yep',
  'yes',
  'yup',
]);
const HANDOVER_NAMES = new Set(['brian', 'mitchell', 'vincent']);
/** "I was like," is the quote itself, so that "like" is kept. */
const QUOTE_LEAD = new Set(["he's", 'i', "i'm", "she's", 'was', 'were']);

/** Lowercase, without surrounding punctuation or a cut-off hyphen. */
function plain(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}']+$/u, '');
}

function endsSentence(text: string) {
  return /[.!?…]["')\]]*$/.test(text);
}

function isSentenceStart(words: EditWord[], at: number) {
  const word = words[at];
  const before = words[at - 1];
  return (
    !before ||
    before.turn !== word.turn ||
    before.spk !== word.spk ||
    endsSentence(before.text)
  );
}

/**
 * Suggests cut categories for words the file left unmarked: fillers, words cut
 * off mid-way, repeats, "go ahead <name>" and one-word answers. It leaves
 * "you know", "I mean", "like" and "kind of" alone: those are the producer's
 * call (see `stutterAndLikeIds` for the one-click version).
 */
export function markWords(words: EditWord[]): EditWord[] {
  const flags = words.map((word) => word.flag);
  const mark = (at: number, flag: CutCategory) => {
    if (!flags[at]) flags[at] = flag;
  };

  words.forEach((word, at) => {
    const text = plain(word.text);
    if (FILLERS.has(text)) mark(at, 'F');
    else if (/[-–—]$/.test(word.text) && text.length > 0) mark(at, 'S');
  });

  words.forEach((word, at) => {
    if (
      plain(word.text) === 'go' &&
      plain(words[at + 1]?.text ?? '') === 'ahead'
    ) {
      const name = words[at + 2];
      if (name && HANDOVER_NAMES.has(plain(name.text))) {
        mark(at, 'H');
        mark(at + 1, 'H');
        mark(at + 2, 'H');
      }
    }
  });

  // A whole sentence of up to three reaction words: "Yeah.", "Mm-hmm.", "Yeah, yeah, yeah."
  words.forEach((word, at) => {
    if (!isSentenceStart(words, at)) return;
    let end = at;
    while (end + 1 < words.length && !endsSentence(words[end].text)) {
      end += 1;
      if (end - at > 3) return;
    }
    const sentence = words.slice(at, end + 1);
    const last = sentence[sentence.length - 1];
    if (sentence.length > 3 || /\?["')\]]*$/.test(last.text)) return;
    if (sentence.some((part) => part.turn !== word.turn)) return;
    const reaction = sentence.filter((part) => REACTIONS.has(plain(part.text)));
    if (reaction.length === 0) return;
    const rest = sentence.filter((part) => !REACTIONS.has(plain(part.text)));
    if (rest.some((part) => plain(part.text) !== 'oh')) return;
    sentence.forEach((_part, offset) => mark(at + offset, 'R'));
  });
  // A word said twice: "I I mean", "it's, uh, it's".
  words.forEach((word, at) => {
    if (flags[at] || at + 1 >= words.length) return;
    const text = plain(word.text);
    if (!text) return;
    let next = at + 1;
    while (next < words.length && (flags[next] === 'F' || flags[next] === 'S'))
      next += 1;
    const other = words[next];
    if (
      other &&
      other.spk === word.spk &&
      plain(other.text) === text &&
      !endsSentence(word.text)
    )
      mark(at, 'D');
  });

  return words.map((word, at) => ({ ...word, flag: flags[at] }));
}

/** Words suggested for cutting before the producer touches anything. */
export function suggestedCuts(words: readonly EditWord[]): Set<number> {
  return new Set(words.filter((word) => word.flag).map((word) => word.idx));
}

/**
 * A "like" that is filler: it has a comma after it ("like, I wanted"), and
 * isn't the quote lead in "I was like, ...".
 */
function isFillerLike(words: readonly EditWord[], at: number): boolean {
  const word = words[at];
  if (plain(word.text) !== 'like') return false;
  if (!/,["')\]]*$/.test(word.text)) return false;
  const before = words[at - 1];
  if (before && before.turn === word.turn && QUOTE_LEAD.has(plain(before.text)))
    return false;
  return true;
}

export interface StutterLikeIds {
  /** Every "like" word, filler or not. */
  allLike: number[];
  fillerLike: number[];
  stutters: number[];
}

/** The words the one-click "delete stutters and like" action touches. */
export function stutterAndLikeIds(words: readonly EditWord[]): StutterLikeIds {
  const stutters: number[] = [];
  const fillerLike: number[] = [];
  const allLike: number[] = [];
  words.forEach((word, at) => {
    if (word.flag === 'S' || word.flag === 'D') stutters.push(word.idx);
    if (plain(word.text) === 'like') {
      allLike.push(word.idx);
      if (isFillerLike(words, at)) fillerLike.push(word.idx);
    }
  });
  return { allLike, fillerLike, stutters };
}

/* ---------- sections ---------- */

const AUTO_SECTION_SECONDS = 600;

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** The sections a session shows: its own, or ten-minute blocks. */
export function sectionsOf(session: EditSession): EditSection[] {
  if (session.sections.length > 0) return session.sections;
  const sections: EditSection[] = [];
  let current: { from: number; start: number; to: number } | null = null;
  for (const word of session.words) {
    const block = Math.floor(word.t0 / AUTO_SECTION_SECONDS);
    if (!current || block !== current.start) {
      if (current)
        sections.push({
          from: current.from,
          title: `${formatClock(current.start * AUTO_SECTION_SECONDS)} to ${formatClock((current.start + 1) * AUTO_SECTION_SECONDS)}`,
          to: current.to,
        });
      current = { from: word.idx, start: block, to: word.idx };
    } else current.to = word.idx;
  }
  if (current)
    sections.push({
      from: current.from,
      title: `${formatClock(current.start * AUTO_SECTION_SECONDS)} to ${formatClock((current.start + 1) * AUTO_SECTION_SECONDS)}`,
      to: current.to,
    });
  return sections;
}

export function wordsInSection(
  session: EditSession,
  section: EditSection,
): EditWord[] {
  return session.words.filter(
    (word) => word.idx >= section.from && word.idx <= section.to,
  );
}

/* ---------- cuts ---------- */

/** Two cut words this far apart in time are separate ranges. */
const RANGE_GAP_SECONDS = 2;

export function rangesFromCuts(
  words: readonly EditWord[],
  cut: ReadonlySet<number>,
): EditRange[] {
  const ranges: Array<EditRange & { parts: string[] }> = [];
  let open: (typeof ranges)[number] | null = null;
  let previous: EditWord | null = null;
  for (const word of words) {
    if (!cut.has(word.idx)) {
      open = null;
      previous = word;
      continue;
    }
    const continues =
      open !== null &&
      previous !== null &&
      cut.has(previous.idx) &&
      word.t0 - previous.t1 <= RANGE_GAP_SECONDS;
    if (open && continues) {
      open.b = word.t1;
      open.parts.push(word.text);
    } else {
      open = { a: word.t0, b: word.t1, parts: [word.text], text: '' };
      ranges.push(open);
    }
    previous = word;
  }
  return ranges.map(({ a, b, parts }) => ({
    a: Number(a.toFixed(3)),
    b: Number(b.toFixed(3)),
    text: parts.join(' '),
  }));
}

export function buildCuts(
  words: readonly EditWord[],
  cut: ReadonlySet<number>,
  now: Date = new Date(),
): EditCuts {
  const ranges = rangesFromCuts(words, cut);
  const known = new Set(words.map((word) => word.idx));
  const idx = [...cut].filter((id) => known.has(id)).sort((a, b) => a - b);
  return {
    cutSeconds: Number(
      ranges.reduce((sum, range) => sum + (range.b - range.a), 0).toFixed(2),
    ),
    cutWords: idx.length,
    edited: true,
    idx,
    ranges,
    updated: now.toISOString(),
    version: 1,
  };
}

export function isEditCuts(value: unknown): value is EditCuts {
  if (!value || typeof value !== 'object') return false;
  const cuts = value as Record<string, unknown>;
  return (
    cuts.version === 1 &&
    Array.isArray(cuts.idx) &&
    cuts.idx.every((id) => Number.isInteger(id) && (id as number) >= 0) &&
    Array.isArray(cuts.ranges) &&
    cuts.ranges.every((range) => {
      const { a, b, text } = (range ?? {}) as Record<string, unknown>;
      return isFiniteNumber(a) && isFiniteNumber(b) && typeof text === 'string';
    }) &&
    isFiniteNumber(cuts.cutSeconds) &&
    isFiniteNumber(cuts.cutWords) &&
    typeof cuts.updated === 'string'
  );
}

export interface CutStats {
  cutSeconds: number;
  cutWords: number;
  keptWords: number;
}

export function cutStats(
  words: readonly EditWord[],
  cut: ReadonlySet<number>,
): CutStats {
  const ranges = rangesFromCuts(words, cut);
  const cutWords = words.filter((word) => cut.has(word.idx)).length;
  return {
    cutSeconds: ranges.reduce((sum, range) => sum + (range.b - range.a), 0),
    cutWords,
    keptWords: words.length - cutWords,
  };
}

export function summarise(
  session: EditSession,
  updatedAt: string,
): EditSummary {
  const last = session.words[session.words.length - 1];
  return {
    duration: last ? last.t1 : 0,
    id: session.id,
    title: session.title,
    updatedAt,
    words: session.words.length,
  };
}
