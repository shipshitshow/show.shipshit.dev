import type { LivestreamCard, MarkdownSection } from '@/lib/livestreams-ui';
import { parseSections, parseSubSections } from '@/lib/livestreams-ui';

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
