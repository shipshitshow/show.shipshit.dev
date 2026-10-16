import type { CommentReplyDraftCapability } from '@shipshitshow/types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
// OpenRouter model ids are provider-prefixed; override with OPENROUTER_MODEL.
const DEFAULT_MODEL = 'google/gemini-3.5-flash-lite';
const MAX_PROVIDER_MESSAGE_LENGTH = 200;

interface DraftReplyInput {
  videoTitle: string;
  commentText: string;
  channelLabel: string;
  authorDisplayName: string;
}

interface DraftReplyPayload {
  drafts: string[];
}

export type CommentDraftErrorCode =
  | 'draft_not_configured'
  | 'draft_provider_unauthorized'
  | 'draft_provider_rate_limited'
  | 'draft_provider_rejected'
  | 'draft_provider_unavailable'
  | 'draft_invalid_response';

/** Safe to return to the client: messages never include raw provider bodies. */
export class CommentDraftError extends Error {
  constructor(
    readonly code: CommentDraftErrorCode,
    message: string,
    readonly status: number,
    readonly hint?: string,
  ) {
    super(message);
    this.name = 'CommentDraftError';
  }

  get retryable(): boolean {
    return this.code !== 'draft_not_configured';
  }
}

// Read per call so the capability reflects the live server environment.
function getProviderConfig() {
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const apiKey = process.env.OPENROUTER_API_KEY?.trim() || null;
  return { apiKey, model };
}

export function getCommentDraftCapability(): CommentReplyDraftCapability {
  const { apiKey, model } = getProviderConfig();
  return {
    available: Boolean(apiKey),
    missing: apiKey ? [] : ['OPENROUTER_API_KEY'],
    model,
  };
}

/** Pull the provider's own message out of an error body, minus anything secret. */
function sanitizeProviderMessage(body: string): string | null {
  let message: string | undefined;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: unknown } | string;
      message?: unknown;
    };
    const candidate =
      typeof parsed.error === 'string'
        ? parsed.error
        : (parsed.error?.message ?? parsed.message);
    if (typeof candidate === 'string') message = candidate;
  } catch {
    // Non-JSON bodies (HTML error pages, proxies) are never echoed.
    return null;
  }
  if (!message?.trim()) return null;
  const redacted = message
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(sk|pk|rk)-[A-Za-z0-9_*.-]{4,}/g, '[redacted key]')
    .replace(/\s+/g, ' ')
    .trim();
  return redacted.length > MAX_PROVIDER_MESSAGE_LENGTH
    ? `${redacted.slice(0, MAX_PROVIDER_MESSAGE_LENGTH - 1)}…`
    : redacted;
}

function providerError(status: number, body: string): CommentDraftError {
  const detail = sanitizeProviderMessage(body);
  const withDetail = (hint: string) => (detail ? `${detail} ${hint}` : hint);

  if (status === 401 || status === 403) {
    return new CommentDraftError(
      'draft_provider_unauthorized',
      `The reply-draft provider rejected the API key (${status}).`,
      502,
      'Check OPENROUTER_API_KEY in the server environment.',
    );
  }
  if (status === 429) {
    return new CommentDraftError(
      'draft_provider_rate_limited',
      'The reply-draft provider rate limit or quota was reached (429).',
      429,
      withDetail('Wait a moment and retry, or check the provider billing.'),
    );
  }
  if (status >= 500) {
    return new CommentDraftError(
      'draft_provider_unavailable',
      `The reply-draft provider is unavailable (${status}).`,
      502,
      'This is usually transient. Retry in a moment.',
    );
  }
  return new CommentDraftError(
    'draft_provider_rejected',
    `The reply-draft provider rejected the request (${status}).`,
    502,
    withDetail('Check OPENROUTER_MODEL in the server environment.'),
  );
}

const invalidResponse = () =>
  new CommentDraftError(
    'draft_invalid_response',
    'The model returned drafts in an unexpected format.',
    502,
    'Retry to generate a fresh set.',
  );

function extractJson(raw: string): DraftReplyPayload {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw invalidResponse();
  }

  let parsed: Partial<DraftReplyPayload>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw invalidResponse();
  }
  const drafts = Array.isArray(parsed.drafts)
    ? parsed.drafts.reduce<string[]>((acc, draft) => {
        if (typeof draft === 'string') {
          const trimmed = draft.trim();
          if (trimmed) acc.push(trimmed);
        }
        return acc;
      }, [])
    : [];

  if (drafts.length === 0) {
    throw invalidResponse();
  }

  return { drafts: drafts.slice(0, 3) };
}

export async function generateCommentReplyDrafts(
  input: DraftReplyInput,
): Promise<string[]> {
  const { apiKey, model } = getProviderConfig();
  if (!apiKey) {
    throw new CommentDraftError(
      'draft_not_configured',
      'Reply drafts are not configured on the server.',
      503,
      'Set OPENROUTER_API_KEY (optionally OPENROUTER_MODEL) in the server environment and redeploy.',
    );
  }
  const prompt = [
    'You write reply drafts for the Ship Sh!t Show YouTube channel.',
    'Voice: sharp, founder-level, direct, high-signal, not corporate, not cringe, not needy.',
    'Rules:',
    '- Write exactly 3 distinct reply options.',
    '- Keep each reply under 280 characters.',
    '- Sound human and specific to the comment.',
    '- Do not use emojis.',
    '- Do not mention being AI.',
    '- If the comment is praise, reply with appreciation and one specific angle.',
    '- If the comment is criticism, reply calmly and credibly.',
    '- If the comment asks a question, answer it directly.',
    '- Return JSON only in the form {"drafts":["...","...","..."]}.',
    '',
    `Channel: ${input.channelLabel}`,
    `Video title: ${input.videoTitle}`,
    `Comment author: ${input.authorDisplayName}`,
    `Comment: ${input.commentText}`,
  ].join('\n');

  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      body: JSON.stringify({
        messages: [
          {
            content:
              'You generate concise YouTube creator replies and follow output format exactly.',
            role: 'system',
          },
          { content: prompt, role: 'user' },
        ],
        model,
        temperature: 0.8,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Attribution for OpenRouter's dashboard/leaderboards.
        'HTTP-Referer': 'https://show.shipshit.dev',
        'X-Title': 'Ship Sh!t Show',
      },
      method: 'POST',
    });
  } catch {
    throw new CommentDraftError(
      'draft_provider_unavailable',
      'Could not reach the reply-draft provider.',
      502,
      'This is usually transient. Retry in a moment.',
    );
  }

  if (!res.ok) {
    throw providerError(res.status, await res.text());
  }

  let content: unknown;
  try {
    const data = await res.json();
    content = data.choices?.[0]?.message?.content;
  } catch {
    throw invalidResponse();
  }
  if (typeof content !== 'string') {
    throw invalidResponse();
  }

  return extractJson(content).drafts;
}
