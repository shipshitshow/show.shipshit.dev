import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { thumbnailError, thumbnailHeaders } from '@/lib/thumbnail-lab-http';
import { RESOURCE_MAX_BYTES } from '@/lib/thumbnail-resources';
import {
  addThumbnailResource,
  listThumbnailResources,
} from '@/lib/thumbnail-resources-store';

export async function GET() {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    return NextResponse.json(
      { resources: await listThumbnailResources() },
      { headers: thumbnailHeaders },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
export async function POST(request: Request) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  if (Number(request.headers.get('content-length')) > RESOURCE_MAX_BYTES + 4096)
    return NextResponse.json(
      { error: 'Resources must be under 8 MB.' },
      { status: 413 },
    );
  try {
    const form = await request.formData();
    const file = form.get('file');
    const category = form.get('category');
    const label = form.get('label');
    if (!(file instanceof File) || typeof category !== 'string')
      return NextResponse.json(
        { error: 'Choose an image to add.' },
        { status: 400 },
      );
    const resource = await addThumbnailResource({
      bytes: new Uint8Array(await file.arrayBuffer()),
      category,
      filename: file.name,
      label: typeof label === 'string' ? label : undefined,
    });
    return NextResponse.json(
      { resource },
      { headers: thumbnailHeaders, status: 201 },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
