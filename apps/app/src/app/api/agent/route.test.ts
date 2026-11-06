import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { producerSession } from '@/lib/producer-session';
import { GET, POST } from './route';

// Assembled so secret scanners do not flag the fixture.
const FIXTURE_KEY = ['sk', 'or', 'FIXTURE1'].join('-');
const realFetch = globalThis.fetch;
const saved: Record<string, string | undefined> = {};
let producerSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  for (const key of [
    'PRODUCER_CLERK_USER_IDS',
    'OPENROUTER_API_KEY',
    'CONTENT_AGENT_MODEL',
  ])
    saved[key] = process.env[key];
  process.env.PRODUCER_CLERK_USER_IDS = 'user_producer';
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.CONTENT_AGENT_MODEL;
  producerSpy = spyOn(producerSession, 'getUserId').mockResolvedValue(
    'user_producer',
  );
});

afterEach(() => {
  producerSpy.mockRestore();
  globalThis.fetch = realFetch;
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const post = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/agent', {
      body: JSON.stringify(body),
      method: 'POST',
    }),
  );

const ask = {
  messages: [{ content: 'Which videos are outliers?', role: 'user' }],
  path: '/content/livestreams/XCyY0VDiRps/transcript',
};

describe('/api/agent', () => {
  test('GET says whether a key is set', async () => {
    expect(await (await GET()).json()).toEqual({
      available: false,
      model: 'anthropic/claude-sonnet-5.5',
    });
  });

  test('POST needs a question', async () => {
    expect((await post({ messages: [] })).status).toBe(400);
  });

  test('POST without a key says what is missing', async () => {
    const response = await post(ask);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('OPENROUTER_API_KEY');
  });

  test('POST sends the uploads and the page transcript, returns the answer', async () => {
    process.env.OPENROUTER_API_KEY = FIXTURE_KEY;
    let sent: {
      messages: Array<{ content: string; role: string }>;
      model: string;
    } | null = null;
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      if (String(input).startsWith('https://openrouter.ai/')) {
        sent = JSON.parse(String(init?.body));
        return Response.json({
          choices: [{ message: { content: 'The 20 Oct stream.' } }],
        });
      }
      throw new Error(`unexpected fetch ${input}`);
    }) as typeof fetch;

    const response = await post(ask);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reply: 'The 20 Oct stream.' });
    const payload = sent as unknown as {
      messages: Array<{ content: string; role: string }>;
      model: string;
    };
    expect(payload.model).toBe('anthropic/claude-sonnet-5.5');
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[0].content).toContain('XCyY0VDiRps');
    expect(payload.messages[0].content).toContain('Transcript of the page');
    expect(payload.messages.at(-1)).toEqual(ask.messages[0]);
  });

  test('POST hides provider bodies', async () => {
    process.env.OPENROUTER_API_KEY = FIXTURE_KEY;
    globalThis.fetch = (async () =>
      new Response(`{"error":"bad key ${FIXTURE_KEY}"}`, {
        status: 401,
      })) as unknown as typeof fetch;
    const response = await post(ask);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain(FIXTURE_KEY);
  });
});
