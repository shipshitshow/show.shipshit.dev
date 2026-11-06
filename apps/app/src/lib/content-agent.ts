/**
 * The content agent in the right sidebar: prompt and context building. Pure,
 * so tests cover it without a model; the call itself is content-agent-server.
 */
import type { ContentItem } from './content-library';

export interface AgentMessage {
  content: string;
  role: 'assistant' | 'user';
}

export const AGENT_MAX_MESSAGES = 12;
export const AGENT_MAX_MESSAGE_CHARS = 4000;
const TRANSCRIPT_MAX_CHARS = 40_000;

/** Starting points shown before the first message. */
export const AGENT_SUGGESTIONS = [
  'Which uploads are outliers, and what do they have in common?',
  'Write 3 titles under 40 characters for the latest livestream',
  'Pick 3 Shorts from this episode with source ranges',
  'Draft the LinkedIn post for the latest video',
];

/** Keeps the last messages, trimmed, and drops anything malformed. */
export function sanitizeMessages(value: unknown): AgentMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (message): message is AgentMessage =>
        !!message &&
        typeof message === 'object' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0,
    )
    .slice(-AGENT_MAX_MESSAGES)
    .map((message) => ({
      content: message.content.slice(0, AGENT_MAX_MESSAGE_CHARS),
      role: message.role,
    }));
}

/** The video a page is about, from /content/livestreams/<slug> or a transcript page. */
export function slugFromPath(path: string): string | null {
  const match = path.match(
    /^\/(?:content\/livestreams|library\/transcripts)\/([^/?#]+)/,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** One line per upload, newest first, for the model to reason over. */
export function contentTable(items: ContentItem[]): string {
  const rows = [...items]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((item) =>
      [
        item.date || '?',
        item.type,
        item.channel,
        item.videoId ?? '-',
        item.title.replace(/\s+/g, ' '),
        item.stat ? item.stat.views : '-',
        item.stat?.likes ?? '-',
        item.outlier ?? '-',
        item.stat?.durationSeconds ?? '-',
        item.transcriptWords ?? 'none',
        item.upcoming ? 'upcoming' : (item.stat?.privacy ?? '-'),
      ].join(' | '),
    );
  return [
    'date | type | channel | video id | title | views | likes | outlier (x median of channel+type) | seconds | transcript words | status',
    ...rows,
  ].join('\n');
}

export function buildSystemPrompt({
  items,
  pageLabel,
  path,
  statsFetchedAt,
  transcript,
}: {
  items: ContentItem[];
  pageLabel: string;
  path: string;
  statsFetchedAt: string | null;
  transcript: { text: string; title: string } | null;
}): string {
  return [
    'You are the content agent inside the Ship Sh*t Show producer app.',
    'The show: a weekly YouTube show and podcast where two founders, Vincent and Mitchell, talk about how they actually use AI to run their businesses. Two channels: @shipshitshow (main: livestreams and edited videos) and @shipshitshowclips (Shorts).',
    'Your job: help improve views and distribution. Find what works, suggest titles, Shorts, posts and next topics.',
    '',
    'House rules:',
    '- Titles fit one line on the home feed: 40 characters or fewer, never over 45, the take first. No "[LIVE]" prefix.',
    '- Shorts: one hot take or founder lesson, never a feature walkthrough. The take lands in the first 2 seconds, under 60 seconds, ends on a clean payoff. Keep a host opinion phrased as opinion.',
    '- Voice: direct, no fluff, no corporate speak. Swearing is fine, sparingly.',
    '- Use only the data below. Say when a number is missing or stale instead of guessing. Never invent views, quotes or timestamps.',
    '- You only draft. Nothing you write is published; say so if asked to post.',
    '- Answer short. Use lists for options. Plain text, light Markdown.',
    '',
    `The producer is on: ${pageLabel} (${path}).`,
    statsFetchedAt
      ? `Views and likes were fetched ${statsFetchedAt}.`
      : 'Views and likes are not synced yet, so only repo data is known.',
    '',
    'All uploads:',
    contentTable(items),
    ...(transcript
      ? [
          '',
          `Transcript of the page's video, "${transcript.title}"${transcript.text.length > TRANSCRIPT_MAX_CHARS ? ' (cut)' : ''}:`,
          transcript.text.slice(0, TRANSCRIPT_MAX_CHARS),
        ]
      : []),
  ].join('\n');
}
