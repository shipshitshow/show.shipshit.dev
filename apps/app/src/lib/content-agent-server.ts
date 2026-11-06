import { getProductionPageLabel } from './app-navigation';
import {
  type AgentMessage,
  buildSystemPrompt,
  slugFromPath,
} from './content-agent';
import { loadContent } from './content-library-server';
import { getPublishedVideoBySlug } from './livestreams-store';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// OpenRouter model id; override with CONTENT_AGENT_MODEL.
const DEFAULT_MODEL = 'anthropic/claude-sonnet-5.5';

/** Safe to show: never carries a provider body or a key. */
export class AgentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

function config() {
  return {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
    model: process.env.CONTENT_AGENT_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export function agentCapability() {
  const { apiKey, model } = config();
  return { available: Boolean(apiKey), model };
}

function providerFailure(status: number): AgentError {
  if (status === 401 || status === 403)
    return new AgentError(
      'The model provider rejected the key. Check OPENROUTER_API_KEY.',
      502,
    );
  if (status === 429)
    return new AgentError(
      'The model provider is rate limited. Try again in a moment.',
      429,
    );
  return new AgentError(
    `The model provider failed (${status}). Try again in a moment.`,
    502,
  );
}

export async function runContentAgent({
  messages,
  path,
}: {
  messages: AgentMessage[];
  path: string;
}): Promise<string> {
  const { apiKey, model } = config();
  if (!apiKey)
    throw new AgentError(
      'The agent needs OPENROUTER_API_KEY in the server environment.',
      503,
    );

  const slug = slugFromPath(path);
  const [{ items, stats }, video] = await Promise.all([
    loadContent(),
    slug ? getPublishedVideoBySlug(slug) : Promise.resolve(null),
  ]);
  const system = buildSystemPrompt({
    items,
    pageLabel: getProductionPageLabel(path),
    path,
    statsFetchedAt: stats?.fetchedAt ?? null,
    transcript: video ? { text: video.transcript, title: video.title } : null,
  });

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      body: JSON.stringify({
        max_tokens: 1500,
        messages: [{ content: system, role: 'system' }, ...messages],
        model,
        temperature: 0.6,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://show.shipshit.dev',
        'X-Title': 'Ship Sh*t Show',
      },
      method: 'POST',
    });
  } catch {
    throw new AgentError('Could not reach the model provider.', 502);
  }
  if (!response.ok) throw providerFailure(response.status);

  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  } | null;
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim())
    throw new AgentError('The model sent an empty answer. Try again.', 502);
  return reply.trim();
}
