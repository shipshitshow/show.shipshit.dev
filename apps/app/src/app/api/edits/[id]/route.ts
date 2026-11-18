import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { getProducerStorageBackend } from '@/lib/producer-storage';
import {
  readEditCuts,
  readEditSession,
  saveEditSession,
} from '@/lib/transcript-edit-store';

const headers = { 'Cache-Control': 'private, no-store' };

function failure(error: unknown, fallback: string, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { headers, status },
  );
}

/** One transcript with its saved cuts. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const { id } = await params;
    const [session, cuts] = await Promise.all([
      readEditSession(id),
      readEditCuts(id),
    ]);
    if (!session)
      return NextResponse.json(
        { error: 'That transcript is not pushed yet.' },
        { headers, status: 404 },
      );
    return NextResponse.json(
      {
        cuts,
        session,
        writable: getProducerStorageBackend() !== 'read-only',
      },
      { headers },
    );
  } catch (error) {
    return failure(error, 'The transcript did not load.');
  }
}

/** Push (or replace) a word-level transcript. Saved cuts are kept. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const { id } = await params;
    return NextResponse.json(
      { edit: await saveEditSession(id, await request.json()) },
      { headers },
    );
  } catch (error) {
    return failure(error, 'The transcript was not saved.');
  }
}
