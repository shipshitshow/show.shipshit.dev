interface TranscriptTurn {
  paragraphs: string[];
  /** True when a `>>` caption marker opened this turn. Speakers are unnamed. */
  speakerChange: boolean;
}

export interface NormalizedTranscript {
  hasSpeakerMarkers: boolean;
  plainText: string;
  turns: TranscriptTurn[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

const SPEAKER_MARKER = /(?:>>\s*)+/;
/** Older imports mark a speaker with a single line-leading `> `. */
const LINE_LEADING_MARKER = /^[ \t]*>+[ \t]*/gm;
const SENTENCE_BOUNDARY = /(?<=[.!?…]["')\]]?)\s+(?=["'([]?[\p{Lu}\p{N}])/u;
const PARAGRAPH_TARGET_LENGTH = 480;
const PARAGRAPH_MAX_LENGTH = 720;
const PARAGRAPH_MAX_SENTENCES = 5;

/**
 * Caption imports carry HTML-escaped text (`&gt;&gt;` speaker markers,
 * `&nbsp;`). Decode in one pass so `&amp;gt;` becomes `&gt;`, not `>`.
 */
export function decodeTranscriptEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code[0] === '#') {
        const value =
          code[1] === 'x' || code[1] === 'X'
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(value) && value > 0 && value <= 0x10ffff
          ? String.fromCodePoint(value)
          : entity;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    },
  );
}

/** Unpunctuated ASR runs have no sentence boundary; break them between words. */
function chunkLongSentence(sentence: string): string[] {
  if (sentence.length <= PARAGRAPH_MAX_LENGTH) return [sentence];

  const chunks: string[] = [];
  let current = '';
  for (const word of sentence.split(' ')) {
    if (current && current.length + word.length + 1 > PARAGRAPH_TARGET_LENGTH) {
      chunks.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitParagraphs(turn: string): string[] {
  const sentences = turn.split(SENTENCE_BOUNDARY).flatMap(chunkLongSentence);
  const paragraphs: string[] = [];
  let current: string[] = [];
  let length = 0;

  for (const sentence of sentences) {
    if (current.length > 0 && length + sentence.length > PARAGRAPH_MAX_LENGTH) {
      paragraphs.push(current.join(' '));
      current = [];
      length = 0;
    }
    current.push(sentence);
    length += sentence.length + 1;
    if (
      length >= PARAGRAPH_TARGET_LENGTH ||
      current.length >= PARAGRAPH_MAX_SENTENCES
    ) {
      paragraphs.push(current.join(' '));
      current = [];
      length = 0;
    }
  }

  if (current.length > 0) paragraphs.push(current.join(' '));
  return paragraphs;
}

/**
 * Render-only structure for imported caption transcripts. Wrapped caption
 * lines are joined, `>>` and line-leading `>` markers become unnamed speaker
 * turns, and long turns break at sentence boundaries. Wording is never changed: uncertain names and
 * claims stay exactly as captured. The source file is not rewritten.
 */
export function normalizeTranscript(raw: string): NormalizedTranscript {
  const text = decodeTranscriptEntities(raw)
    .replace(LINE_LEADING_MARKER, '>> ')
    .replace(/\s+/g, ' ')
    .trim();
  const turns: TranscriptTurn[] = [];
  text.split(SPEAKER_MARKER).forEach((segment, index) => {
    const content = segment.trim();
    if (!content) return;
    turns.push({
      paragraphs: splitParagraphs(content),
      speakerChange: index > 0,
    });
  });

  return {
    hasSpeakerMarkers: turns.some((turn) => turn.speakerChange),
    plainText: turns.map((turn) => turn.paragraphs.join(' ')).join('\n\n'),
    turns,
  };
}
