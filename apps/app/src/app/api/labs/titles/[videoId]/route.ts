import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { getProducerStorageBackend } from '@/lib/producer-storage';
import { saveTitleDraft } from '@/lib/title-lab-store';

const headers = { 'Cache-Control': 'private, no-store' };

/** Save or clear a draft title. This only writes the local drafts file. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    if (getProducerStorageBackend() !== 'filesystem')
      throw new Error('Drafts can only be saved from a local checkout.');
    const { videoId } = await params;
    const body: unknown = await request.json();
    const text =
      body && typeof body === 'object' && 'text' in body ? body.text : null;
    if (typeof text !== 'string') throw new Error('Send the draft as text.');
    return NextResponse.json(
      { drafts: await saveTitleDraft(videoId, text) },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'The draft was not saved.',
      },
      { headers, status: 400 },
    );
  }
}
