import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { getProducerStorageBackend } from '@/lib/producer-storage';
import { listEditSummaries } from '@/lib/transcript-edit-store';

const headers = { 'Cache-Control': 'private, no-store' };

/** The transcripts pushed for editing, newest first. */
export async function GET() {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    return NextResponse.json(
      {
        edits: await listEditSummaries(),
        writable: getProducerStorageBackend() !== 'read-only',
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'The edits did not load.',
      },
      { headers, status: 500 },
    );
  }
}
