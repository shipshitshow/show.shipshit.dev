import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { saveEditCuts } from '@/lib/transcript-edit-store';

const headers = { 'Cache-Control': 'private, no-store' };

/** Save the cuts, as `buildCuts` shapes them: the last save wins. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const { id } = await params;
    return NextResponse.json(
      { cuts: await saveEditCuts(id, await request.json()) },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'The cuts were not saved.',
      },
      { headers, status: 400 },
    );
  }
}
