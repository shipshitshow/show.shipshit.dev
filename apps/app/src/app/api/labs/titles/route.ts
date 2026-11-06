import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { getProducerStorageBackend } from '@/lib/producer-storage';
import { buildBatch } from '@/lib/title-lab';
import { readTitleDrafts, readTitleSnapshot } from '@/lib/title-lab-store';

const headers = { 'Cache-Control': 'private, no-store' };

/** The latest snapshot and the drafts; ?export=1 downloads the batch file. */
export async function GET(request: Request) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const [snapshot, drafts] = await Promise.all([
      readTitleSnapshot(),
      readTitleDrafts(),
    ]);
    if (new URL(request.url).searchParams.has('export')) {
      if (!snapshot)
        return NextResponse.json(
          { error: 'Run bun run youtube:sync first.' },
          { headers, status: 404 },
        );
      return new NextResponse(
        `${JSON.stringify(buildBatch(snapshot, drafts).batch, null, 2)}\n`,
        {
          headers: {
            ...headers,
            'Content-Disposition': 'attachment; filename="title-batch.json"',
            'Content-Type': 'application/json',
          },
        },
      );
    }
    return NextResponse.json(
      {
        drafts,
        snapshot,
        writable: getProducerStorageBackend() === 'filesystem',
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'The titles request failed.',
      },
      { headers, status: 400 },
    );
  }
}
