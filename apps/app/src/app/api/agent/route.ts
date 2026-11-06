import { type NextRequest, NextResponse } from 'next/server';
import { sanitizeMessages } from '@/lib/content-agent';
import {
  AgentError,
  agentCapability,
  runContentAgent,
} from '@/lib/content-agent-server';
import { logError } from '@/lib/logger';
import { requireProducer } from '@/lib/producer-auth';

export const maxDuration = 60;

/** Whether the agent can answer here, and with which model. */
export async function GET() {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  return NextResponse.json(agentCapability());
}

/** One answer to the conversation so far, about the page the producer is on. */
export async function POST(req: NextRequest) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;

  const body = (await req.json().catch(() => null)) as {
    messages?: unknown;
    path?: unknown;
  } | null;
  const messages = sanitizeMessages(body?.messages);
  const path =
    typeof body?.path === 'string' && body.path.startsWith('/')
      ? body.path.slice(0, 300)
      : '/content';
  if (messages.at(-1)?.role !== 'user')
    return NextResponse.json(
      { error: 'Send a question first.' },
      { status: 400 },
    );

  try {
    const reply = await runContentAgent({ messages, path });
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof AgentError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    logError('api.agent.failed', error);
    return NextResponse.json(
      { error: 'The agent failed. Try again in a moment.' },
      { status: 502 },
    );
  }
}
