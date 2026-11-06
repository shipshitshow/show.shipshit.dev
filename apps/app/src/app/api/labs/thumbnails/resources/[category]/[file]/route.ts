import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { thumbnailError, thumbnailHeaders } from '@/lib/thumbnail-lab-http';
import {
  isResourceCategory,
  isResourceFile,
  resourceContentType,
} from '@/lib/thumbnail-resources';
import { readThumbnailResource } from '@/lib/thumbnail-resources-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string; file: string }> },
) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  const { category, file } = await params;
  if (!isResourceCategory(category) || !isResourceFile(file))
    return NextResponse.json({ error: 'Invalid resource.' }, { status: 400 });
  try {
    const bytes = await readThumbnailResource(category, file);
    const type = resourceContentType(file);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...thumbnailHeaders,
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        ...(type === 'image/svg+xml'
          ? { 'Content-Security-Policy': "sandbox; default-src 'none'" }
          : {}),
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT')
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return thumbnailError(error);
  }
}
