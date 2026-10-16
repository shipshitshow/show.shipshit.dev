const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface DraftReplyInput {
  videoTitle: string;
  commentText: string;
  channelLabel: string;
  authorDisplayName: string;
}

interface DraftReplyPayload {
  drafts: string[];
}

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  return { apiKey, model };
}

function extractJson(raw: string): DraftReplyPayload {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not return JSON');
  }

  const parsed = JSON.parse(
    raw.slice(start, end + 1),
  ) as Partial<DraftReplyPayload>;
  const drafts = Array.isArray(parsed.drafts)
    ? parsed.drafts
        .filter((draft): draft is string => typeof draft === 'string')
        .map((draft) => draft.trim())
        .filter(Boolean)
    : [];

  if (drafts.length === 0) {
    throw new Error('AI response did not include any drafts');
  }

  return { drafts: drafts.slice(0, 3) };
}

export async function generateCommentReplyDrafts(
  input: DraftReplyInput,
): Promise<string[]> {
  const { apiKey, model } = getOpenAIConfig();
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

  const res = await fetch(OPENAI_API_URL, {
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
    },
    method: 'POST',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenAI response did not include message content');
  }

  return extractJson(content).drafts;
}
