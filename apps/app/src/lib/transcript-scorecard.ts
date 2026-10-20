import { stripMarkdown } from '@/lib/text';

type TranscriptScoreId =
  | 'hook'
  | 'structure'
  | 'signal'
  | 'specificity'
  | 'delivery'
  | 'audience'
  | 'plain_language';

interface TranscriptScoreCriterion {
  description: string;
  id: TranscriptScoreId;
  label: string;
  weight: number;
}

interface TranscriptScoreItem extends TranscriptScoreCriterion {
  note: string;
  score: number;
}

/** One insider term used on air without a plain-language first mention. */
interface TranscriptJargonFlag {
  count: number;
  examples: string[];
  say: string;
  term: string;
}

export interface TranscriptScorecard {
  grade: string;
  improvements: string[];
  items: TranscriptScoreItem[];
  jargonFlags: TranscriptJargonFlag[];
  overall: number;
  stats: {
    estimatedMinutes: number;
    fillerPerThousand: number;
    jargonPerThousand: number;
    questionCount: number;
    wordCount: number;
  };
  strengths: string[];
}

const TRANSCRIPT_RATE_CARD: TranscriptScoreCriterion[] = [
  {
    description:
      'Opens with a clear promise, tension, or reason to keep watching.',
    id: 'hook',
    label: 'Hook',
    weight: 0.16,
  },
  {
    description:
      'Moves through setup, development, contrast, and close without drifting.',
    id: 'structure',
    label: 'Structure',
    weight: 0.15,
  },
  {
    description:
      'Maintains a high ratio of useful ideas to filler and repeated setup.',
    id: 'signal',
    label: 'Signal',
    weight: 0.17,
  },
  {
    description:
      'Uses concrete names, numbers, tools, examples, and claims that can be clipped.',
    id: 'specificity',
    label: 'Specificity',
    weight: 0.16,
  },
  {
    description:
      'Reads cleanly as spoken media: pace, filler, and repetition are controlled.',
    id: 'delivery',
    label: 'Delivery',
    weight: 0.1,
  },
  {
    description:
      'Gives the audience takeaways, stakes, and a reason to act or share.',
    id: 'audience',
    label: 'Audience Value',
    weight: 0.12,
  },
  {
    description:
      'Spells out model names, abbreviations, and tool nicknames before leaning on the shorthand.',
    id: 'plain_language',
    label: 'Plain Language',
    weight: 0.14,
  },
];

const FILLER_TERMS = [
  'actually',
  'basically',
  'i mean',
  'kind of',
  'like',
  'literally',
  'right',
  'sort of',
  'um',
  'uh',
  'you know',
];

const TECH_SIGNAL_TERMS = [
  'agent',
  'ai',
  'api',
  'app',
  'automation',
  'build',
  'claude',
  'code',
  'codex',
  'cursor',
  'developer',
  'github',
  'gpt',
  'model',
  'open source',
  'product',
  'software',
  'startup',
  'tool',
  'workflow',
];

const SPECIFICITY_TERMS = [
  'anthropic',
  'claude',
  'codex',
  'cursor',
  'github',
  'gpt',
  'openai',
  'sora',
  'vercel',
];

/**
 * Insider vocabulary that a B2B viewer will not decode on their own. This list
 * is the single place to edit the on-air rule: no bare abbreviations, no bare
 * version numbers, no tool nicknames without the full name and the maker.
 *
 * - `match` is tested against one normalised transcript token.
 * - `explainedBy` excuses the term for the whole transcript when it appears
 *   within `EXPLANATION_WINDOW_WORDS` of the first mention, i.e. the host
 *   spelled it out before leaning on the shorthand.
 * - `skipWhenFollowedBy` drops false positives by inspecting the next token
 *   (money, counts, and measurements that look like version numbers).
 * - `say` is echoed back in the scorecard so the host sees the fix.
 */
interface InsiderTerm {
  explainedBy: RegExp;
  label: string;
  match: RegExp;
  say: string;
  skipWhenFollowedBy?: RegExp;
}

const MODEL_MAKERS =
  /claude|anthropic|openai|chatgpt|gpt|gemini|google|llama|meta|grok|mistral|deepseek|qwen|kimi|moonshot|codex|cursor|opus|sonnet|haiku|fable/;

const INSIDER_TERMS: InsiderTerm[] = [
  {
    explainedBy: MODEL_MAKERS,
    label: 'bare version numbers',
    match: /^v?\d{1,2}\.\d{1,2}$/,
    say: 'name the product and the maker, like Claude Fable 5, the newest model from Anthropic',
    skipWhenFollowedBy:
      /^(billion|dollars?|gb|hours?|k|mb|million|minutes?|out|percent|seconds?|stars?|tb|thousand|times|trillion|x)$/,
  },
  {
    explainedBy: /openai|chatgpt|gpt/,
    label: 'model shorthand',
    match: /^(4o|o1|o3|o4)$/,
    say: 'name the model in full, like OpenAI GPT-4o',
  },
  {
    explainedBy: /claude|anthropic/,
    label: 'Fable',
    match: /^fable$/,
    say: 'Claude Fable 5, the newest model from Anthropic',
  },
  {
    explainedBy: /claude|anthropic/,
    label: 'Opus',
    match: /^opus$/,
    say: 'the full model name and maker, like Claude Opus from Anthropic',
  },
  {
    explainedBy: /claude|anthropic/,
    label: 'Sonnet',
    match: /^sonnet$/,
    say: 'the full model name and maker, like Claude Sonnet from Anthropic',
  },
  {
    explainedBy: /claude|anthropic/,
    label: 'Haiku',
    match: /^haiku$/,
    say: 'the full model name and maker, like Claude Haiku from Anthropic',
  },
  {
    explainedBy: /kimi|moonshot/,
    label: 'K2',
    match: /^k2$/,
    say: 'Kimi K2, the open model from Moonshot AI',
  },
  {
    explainedBy: /deepseek/,
    label: 'R1',
    match: /^r1$/,
    say: 'DeepSeek R1, the reasoning model from DeepSeek',
  },
  {
    explainedBy: /moonshot/,
    label: 'Kimi',
    match: /^kimi$/,
    say: 'Kimi, the model family from Moonshot AI',
  },
  {
    explainedBy: /alibaba/,
    label: 'Qwen',
    match: /^qwen[\d.-]*$/,
    say: 'Qwen, the open model family from Alibaba',
  },
  {
    explainedBy: /zhipu/,
    label: 'GLM',
    match: /^glm[\d.-]*$/,
    say: 'GLM, the open model family from Zhipu AI',
  },
  {
    explainedBy: /model context protocol/,
    label: 'MCP',
    match: /^mcps?$/,
    say: 'the Model Context Protocol, the standard that lets AI assistants plug into other tools',
  },
  {
    explainedBy: /retrieval[ -]augmented/,
    label: 'RAG',
    match: /^rag$/,
    say: 'retrieval-augmented generation, where the model looks answers up in your own documents',
  },
  {
    explainedBy: /large language model/,
    label: 'LLM',
    match: /^llms?$/,
    say: 'a large language model',
  },
  {
    explainedBy: /reinforcement learning/,
    label: 'RLHF',
    match: /^rlhf$/,
    say: 'reinforcement learning from human feedback, how a model gets tuned by human ratings',
  },
  {
    explainedBy: /software development kit/,
    label: 'SDK',
    match: /^sdks?$/,
    say: 'a software development kit, the library developers build against',
  },
  {
    explainedBy: /command[ -]line/,
    label: 'CLI',
    match: /^clis?$/,
    say: 'the command line, the text interface developers type into',
  },
  {
    explainedBy: /repositor(y|ies)/,
    label: 'repo',
    match: /^repos?$/,
    say: 'the code repository, where a team keeps its source code',
  },
  {
    explainedBy: /pull request/,
    label: 'PR',
    match: /^prs?$/,
    say: 'a pull request, the code change a developer submits for review',
  },
  {
    explainedBy: /continuous integration/,
    label: 'CI',
    match: /^ci$/,
    say: 'continuous integration, the automated checks that run before code ships',
  },
  {
    explainedBy: /evaluation/,
    label: 'evals',
    match: /^evals?$/,
    say: 'evaluations, the tests that score how well a model performs',
  },
  {
    explainedBy:
      /on its own|by itself|multi[ -]step|without a human|end[ -]to[ -]end/,
    label: 'agentic',
    match: /^agentic$/,
    say: 'software that plans and runs multi-step work on its own',
  },
  {
    explainedBy: /open source/,
    label: 'OSS',
    match: /^oss$/,
    say: 'open source software',
  },
];

const EXPLANATION_WINDOW_WORDS = 20;

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function countMatches(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(pattern)).length;
}

function countTerms(text: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return count + countMatches(text, new RegExp(`\\b${escaped}\\b`, 'gi'));
  }, 0);
}

function getWords(transcript: string): string[] {
  return stripMarkdown(transcript)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9'$%.-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeToken(word: string): string {
  return word.replace(/^[.'-]+|['.-]+$/g, '').replace(/'s$/, '');
}

function findJargonFlags(words: string[]): TranscriptJargonFlag[] {
  const tokens = words.map(normalizeToken);

  const flags = INSIDER_TERMS.flatMap((term) => {
    const hits: string[] = [];
    let firstIndex = -1;

    tokens.forEach((token, index) => {
      if (!term.match.test(token)) return;
      if (term.skipWhenFollowedBy?.test(tokens[index + 1] ?? '')) return;
      if (firstIndex < 0) firstIndex = index;
      hits.push(token);
    });

    if (firstIndex < 0) return [];

    const context = tokens
      .slice(
        Math.max(0, firstIndex - EXPLANATION_WINDOW_WORDS),
        firstIndex + EXPLANATION_WINDOW_WORDS + 1,
      )
      .join(' ');

    if (term.explainedBy.test(context)) return [];

    return [
      {
        count: hits.length,
        examples: Array.from(new Set(hits)).slice(0, 3),
        say: term.say,
        term: term.label,
      },
    ];
  });

  return flags.sort(
    (a, b) => b.count - a.count || a.term.localeCompare(b.term),
  );
}

function formatJargonFlag(flag: TranscriptJargonFlag): string {
  const [firstExample] = flag.examples;
  const examples =
    firstExample && firstExample !== flag.term.toLowerCase()
      ? ` (${flag.examples.join(', ')})`
      : '';

  return `"${flag.term}"${examples} → ${flag.say}`;
}

function getPlainLanguageNote(flags: TranscriptJargonFlag[]): string {
  if (flags.length === 0) {
    return 'Insider terms are spelled out before the shorthand is used.';
  }

  const shown = flags.slice(0, 3).map(formatJargonFlag).join('; ');
  const remaining = flags.length - 3;

  return `Say it plainly: ${shown}${remaining > 0 ? ` (+${remaining} more)` : ''}.`;
}

function getGrade(score: number): string {
  if (score >= 9) return 'A';
  if (score >= 8) return 'B';
  if (score >= 7) return 'C';
  if (score >= 6) return 'D';
  return 'F';
}

function getNote(
  id: TranscriptScoreId,
  score: number,
  jargonFlags: TranscriptJargonFlag[],
): string {
  const level =
    score >= 8 ? 'strong' : score >= 6 ? 'mixed' : 'needs tightening';

  const notes: Record<TranscriptScoreId, string> = {
    audience:
      level === 'strong'
        ? 'Clear viewer stakes and reusable takeaways.'
        : level === 'mixed'
          ? 'Some audience value, but the payoff could be sharper.'
          : 'Needs clearer takeaways and viewer-facing stakes.',
    delivery:
      level === 'strong'
        ? 'Spoken flow is controlled and clip-friendly.'
        : level === 'mixed'
          ? 'Readable, with some filler or pacing drag.'
          : 'Filler and repetition dilute the delivery.',
    hook:
      level === 'strong'
        ? 'Starts with a clear reason to keep watching.'
        : level === 'mixed'
          ? 'Opening has a promise, but it could land faster.'
          : 'Opening needs a sharper promise or conflict.',
    plain_language: getPlainLanguageNote(jargonFlags),
    signal:
      level === 'strong'
        ? 'Dense with useful ideas relative to runtime.'
        : level === 'mixed'
          ? 'Useful material is present, with some drift.'
          : 'Signal gets buried under repetition or setup.',
    specificity:
      level === 'strong'
        ? 'Grounded in concrete tools, numbers, and examples.'
        : level === 'mixed'
          ? 'Some concrete references, but more proof would help.'
          : 'Needs more named examples, numbers, or receipts.',
    structure:
      level === 'strong'
        ? 'Progression is easy to follow.'
        : level === 'mixed'
          ? 'Mostly coherent, with some loose transitions.'
          : 'Needs clearer sections and a stronger close.',
  };

  return notes[id];
}

export function analyzeTranscriptScorecard(
  transcript: string | null | undefined,
): TranscriptScorecard | null {
  if (!transcript?.trim()) return null;

  const words = getWords(transcript);
  if (words.length === 0) return null;

  const lowerText = words.join(' ');
  const firstWords = words.slice(0, 140).join(' ');
  const uniqueRatio = new Set(words).size / words.length;
  const estimatedMinutes = Math.max(1, Math.round(words.length / 150));
  const fillerCount = countTerms(lowerText, FILLER_TERMS);
  const fillerPerThousand = (fillerCount / words.length) * 1000;
  const questionCount = countMatches(transcript, /\?/g);
  const transitionCount = countMatches(
    lowerText,
    /\b(first|second|third|next|then|but|because|so|finally|the point is|what this means|here's why)\b/gi,
  );
  const numberCount = countMatches(lowerText, /\b(?:\d+|\$[\d,.]+|\d+%)\b/g);
  const signalCount = countTerms(lowerText, TECH_SIGNAL_TERMS);
  const specificityCount =
    countTerms(lowerText, SPECIFICITY_TERMS) + numberCount;
  const audienceCount = countMatches(
    lowerText,
    /\b(you|your|watch|build|ship|need|should|learn|takeaway|subscribe|comment|share|try|use this)\b/gi,
  );
  const hookCount = countMatches(
    firstWords,
    /\b(dead|future|why|today|need|problem|build|rebuild|limit|killed|best|worst|watch|talk about)\b/gi,
  );
  const jargonFlags = findJargonFlags(words);
  const jargonCount = jargonFlags.reduce(
    (total, flag) => total + flag.count,
    0,
  );
  const jargonPerThousand = (jargonCount / words.length) * 1000;

  const scores: Record<TranscriptScoreId, number> = {
    audience: clampScore(
      4 + Math.min(4, audienceCount / 35) + Math.min(2, questionCount / 4),
    ),
    delivery: clampScore(10 - fillerPerThousand / 7 + uniqueRatio * 2),
    hook: clampScore(4 + Math.min(5, hookCount) + (questionCount > 0 ? 1 : 0)),
    plain_language: clampScore(
      10 -
        Math.min(4.5, jargonFlags.length * 0.9) -
        Math.min(3, jargonPerThousand / 2.5),
    ),
    signal: clampScore(
      4 +
        Math.min(4, signalCount / 55) +
        uniqueRatio * 3 -
        fillerPerThousand / 20,
    ),
    specificity: clampScore(3 + Math.min(7, specificityCount / 12)),
    structure: clampScore(
      4 +
        Math.min(4, transitionCount / 75) +
        (estimatedMinutes >= 20 && estimatedMinutes <= 90 ? 1 : 0),
    ),
  };

  const items = TRANSCRIPT_RATE_CARD.map((criterion) => ({
    ...criterion,
    note: getNote(criterion.id, scores[criterion.id], jargonFlags),
    score: scores[criterion.id],
  }));

  const overall = clampScore(
    items.reduce((total, item) => total + item.score * item.weight, 0),
  );
  const sorted = [...items].sort((a, b) => b.score - a.score);

  return {
    grade: getGrade(overall),
    improvements: sorted.slice(-2).map((item) => item.note),
    items,
    jargonFlags,
    overall,
    stats: {
      estimatedMinutes,
      fillerPerThousand: Number(fillerPerThousand.toFixed(1)),
      jargonPerThousand: Number(jargonPerThousand.toFixed(1)),
      questionCount,
      wordCount: words.length,
    },
    strengths: sorted.slice(0, 2).map((item) => item.note),
  };
}
