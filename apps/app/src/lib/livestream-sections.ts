import type { LivestreamCard, MarkdownSection } from '@/lib/livestreams-ui';
import { parseSections, parseSubSections } from '@/lib/livestreams-ui';
import { buildTweetDeck, type TweetDeckEntry } from '@/lib/tweet-slider';

export interface SidebarNote {
  body: string;
  title: string;
}

export interface StreamSegmentSection {
  body: string;
  eyebrow: string | null;
  title: string;
}

export interface StreamResourceSection {
  body: string;
  title: string;
}

export interface StreamPromptSection {
  body: string;
  title: string;
}

/**
 * Segment headings across every prep format the show has used:
 * legacy `## Talking Points — <name>`, the capsule format's
 * `## Segment N — <headline>` / `## Capsule N — <name>`, and the
 * standalone rundown beats.
 */
const SEGMENT_TITLE_PATTERNS = [
  /^talking points\b/,
  /^segment\s+\d+\b/,
  /^capsule\s+\d+\b/,
  /^cold open\b/,
  /^clos(?:e|ing)\b/,
  /^hot take$/,
  /^summary$/,
];

/** `Segment 3 — <headline>` / `Capsule 2 — <name>`: the label half is the rundown index. */
const INDEXED_SEGMENT = /^((?:segment|capsule)\s+\d+)\s+[—–-]\s+(.+)$/i;

function isPromptSection(title: string): boolean {
  const normalized = title.toLowerCase();
  return (
    normalized.includes('/goal') ||
    normalized.includes('copy paste') ||
    normalized.includes('goal prompt')
  );
}

/**
 * The `Livestream Notes` block opens every prep file. Older files kept only
 * stream metadata there; since June it is the episode brief — viewer
 * question, spine, firsthand notes, how to read the references and post
 * order — so it renders first in Ressources as "Episode brief". Studio links
 * never belong on a card, so any line carrying one is dropped.
 */
function isStreamMetadataSection(title: string): boolean {
  return title.toLowerCase().includes('livestream notes');
}

const STUDIO_LINK = /studio\.restream\.io/i;

function toEpisodeBrief(body: string): string {
  return body
    .split('\n')
    .filter((line) => !STUDIO_LINK.test(line))
    .join('\n')
    .trim();
}

function isUtilityTalkingPointSection(title: string): boolean {
  const normalized = title.toLowerCase();
  return (
    normalized.includes('thumbnail') ||
    normalized.includes('clip') ||
    isPromptSection(title)
  );
}

function isTimelineSection(title: string): boolean {
  const normalized = title.toLowerCase();
  // `Talking Points — Thumbnail Prompts` / `— Clip Cues` are production
  // helpers wearing a segment heading; they belong in Ressources.
  if (
    normalized.startsWith('talking points') &&
    isUtilityTalkingPointSection(title)
  )
    return false;
  if (isPromptSection(title)) return false;
  if (isStreamMetadataSection(title)) return false;
  return SEGMENT_TITLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isTimelineSubSection(title: string): boolean {
  const normalized = title.toLowerCase();
  return normalized === '' || normalized === 'talking points';
}

function formatTimelineTitle(title: string): string {
  return title.replace(/^Talking Points\s+[—–-]\s+/i, '');
}

/**
 * Splits `Segment 1 — Headline: Qwen Comes for Fable` into the small rundown
 * label (`Segment 1`) and the headline the card is actually about. Legacy
 * `Talking Points — X` keeps its stripped title with no label, and standalone
 * beats (`Cold Open — Read This`, `Hot Take`) render their heading as written.
 */
function splitSegmentTitle(title: string): {
  eyebrow: string | null;
  title: string;
} {
  const indexed = title.match(INDEXED_SEGMENT);
  if (indexed) {
    const [, label, headline] = indexed;
    return {
      eyebrow: label,
      title: headline.replace(/^headline:\s*/i, '').trim(),
    };
  }

  return { eyebrow: null, title: formatTimelineTitle(title) };
}

function formatSegmentTitle(title: string, subTitle: string): string {
  const segment = formatTimelineTitle(title);
  return subTitle ? `${segment} · ${subTitle}` : segment;
}

function getTopicSections(card: LivestreamCard): MarkdownSection[] {
  return parseSections(card.topic.content);
}

/**
 * One card per news segment, carrying the whole segment body — thesis,
 * talking points, sources and angles together — so the host reads a single
 * card per story instead of hunting across tabs.
 */
export function getStreamSegmentSections(
  cards: LivestreamCard[],
): StreamSegmentSection[] {
  return cards.flatMap((card) =>
    getTopicSections(card)
      .filter((section) => isTimelineSection(section.title))
      .map((section) => ({
        body: section.body,
        ...splitSegmentTitle(section.title),
      })),
  );
}

export function getSidebarNotes(cards: LivestreamCard[]): SidebarNote[] {
  return cards.flatMap((card) =>
    getTopicSections(card).flatMap((section) => {
      if (
        section.title.toLowerCase().startsWith('talking points') &&
        !isUtilityTalkingPointSection(section.title)
      ) {
        return parseSubSections(section.body)
          .filter((sub) => !isTimelineSubSection(sub.title))
          .map((sub) => ({
            body: sub.body,
            title: formatSegmentTitle(section.title, sub.title),
          }));
      }

      return [];
    }),
  );
}

/**
 * Everything that is not a news segment and not a demo prompt: publishing
 * artifacts (YouTube description, announcement tweet), prep sweeps, trend
 * checks and verification checklists. These are show-production material,
 * not talking points, so they never belong on a segment card.
 */
export function getStreamResourceSections(
  cards: LivestreamCard[],
): StreamResourceSection[] {
  const briefs: StreamResourceSection[] = [];
  const resources: StreamResourceSection[] = [];

  for (const card of cards) {
    for (const section of getTopicSections(card)) {
      if (isPromptSection(section.title)) continue;
      if (isStreamMetadataSection(section.title)) {
        const body = toEpisodeBrief(section.body);
        if (body) briefs.push({ body, title: 'Episode brief' });
        continue;
      }
      if (isTimelineSection(section.title)) continue;

      resources.push({
        body: section.body,
        title: formatTimelineTitle(section.title),
      });
    }
  }

  return [...briefs, ...resources];
}

export function getStreamPromptSections(
  cards: LivestreamCard[],
): StreamPromptSection[] {
  return cards.flatMap((card) =>
    getTopicSections(card).flatMap((section) => {
      if (!isPromptSection(section.title)) return [];

      return [
        { body: section.body, title: formatTimelineTitle(section.title) },
      ];
    }),
  );
}

/** Sub-sections that hold sources, not things to say: they go to Resources. */
const REFERENCE_SUBSECTION =
  /evidence|on screen|how to read|sources?\b|references?|what the docs say|open these|planned short|links?\b|producer notes?/i;

/**
 * Bullets that tell the host what to do rather than what to say: timing,
 * transitions, screen actions and guardrails (Vincent, 6 Nov: "don't tell
 * me what to do during the live").
 */
const STAGE_DIRECTION =
  /^(budget\b|exit\b|avoid\b|do not\b|don't\b|never\b|open (the|on|with|a)\b|use (the|it|this|only)\b|treat (this|it)\b|keep (it|the|each|this)\b|viewer payoff\b|start with\b|return to\b|read (the|this|it)\b|show (the|it|only|a)\b|cut to\b|transition\b|share the\b|brief subscribe\b|chat:|how to use\b|guardrails?:|disclose\b|say it\b|frame (it|as)\b|end on\b|close on\b)/i;

const MARKDOWN_LINK = /\[([^\]]+)\]\([^)]+\)/g;

/** The first sentence, so a bullet reads at a glance. */
function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.?!]["”')]?)(\s|$)/);
  return (match ? match[1] : text).trim();
}

/** One bullet as a short point: the bold lead and its first sentence. */
function toPoint(line: string): string | null {
  const text = line
    .replace(/^\s*(?:[-*]|\d+\.)\s+/, '')
    .replace(MARKDOWN_LINK, '$1')
    .replace(
      /^(?:\*\*)?(?:opening |host )?question(?: for us)?:(?:\*\*)?\s*/i,
      '',
    )
    .trim();
  const plain = text.replace(/\*\*/g, '');
  if (!plain || STAGE_DIRECTION.test(plain)) return null;
  const lead = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (lead) {
    const [, head, rest] = lead;
    const label = head.replace(/[:.]\s*$/, '');
    return rest ? `**${label}:** ${firstSentence(rest)}` : `**${label}**`;
  }
  const sentence = firstSentence(text);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export interface TalkingPointSegment {
  eyebrow: string | null;
  points: string[];
  /** X posts linked anywhere in the segment, evidence included, for its slider. */
  tweets: TweetDeckEntry[];
  title: string;
}

/**
 * Each segment as a headline and short bullets: only list items, never
 * prose paragraphs, sources or stage directions, one sentence each. The
 * posts a segment links, evidence included, become its tweet slider; a post
 * linked by two segments appears only in the first.
 */
export function getTalkingPoints(
  cards: LivestreamCard[],
): TalkingPointSegment[] {
  const seenTweets = new Set<string>();
  return getStreamSegmentSections(cards).map((segment) => ({
    eyebrow: segment.eyebrow,
    points: parseSubSections(segment.body)
      .filter((sub) => !REFERENCE_SUBSECTION.test(sub.title))
      .flatMap((sub) =>
        sub.body
          .split('\n')
          .filter((line) => /^\s*(?:[-*]|\d+\.)\s+/.test(line))
          .map(toPoint)
          .filter((point): point is string => point !== null),
      ),
    title: segment.title,
    tweets: buildTweetDeck([
      { content: segment.body, title: segment.title },
    ]).filter((entry) => {
      if (seenTweets.has(entry.id)) return false;
      seenTweets.add(entry.id);
      return true;
    }),
  }));
}

export interface ResourceLink {
  label: string;
  url: string;
}

/**
 * Every link in the prep file, once, in reading order: the Resources page
 * is links only (Vincent, 6 Nov). Studio links stay out.
 */
export function getResourceLinks(cards: LivestreamCard[]): ResourceLink[] {
  const seen = new Set<string>();
  const links: ResourceLink[] = [];
  for (const card of cards) {
    for (const match of card.topic.content.matchAll(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(?<![(\w])(https?:\/\/[^\s)>\]]+)/g,
    )) {
      const url = (match[2] ?? match[3] ?? '').replace(/[.,;:]+$/, '');
      if (!url || seen.has(url) || STUDIO_LINK.test(url)) continue;
      seen.add(url);
      links.push({ label: match[1]?.trim() || url, url });
    }
  }
  return links;
}
