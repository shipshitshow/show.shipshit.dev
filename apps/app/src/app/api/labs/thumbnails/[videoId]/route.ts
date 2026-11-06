import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import {
  appendThumbnailVersion,
  applyThumbnailDecision,
  applyThumbnailTitle,
  currentThumbnail,
  isVideoId,
  parseThumbnailChange,
} from '@/lib/thumbnail-lab';
import {
  renderThumbnail,
  uploadThumbnailAsset,
} from '@/lib/thumbnail-lab-assets';
import { thumbnailError, thumbnailHeaders } from '@/lib/thumbnail-lab-http';
import { getThumbnailItem, saveThumbnailItem } from '@/lib/thumbnail-lab-store';

type Context = { params: Promise<{ videoId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  const { videoId } = await params;
  if (!isVideoId(videoId))
    return NextResponse.json({ error: 'Invalid video ID.' }, { status: 400 });
  try {
    const change = parseThumbnailChange(await request.json()),
      item = await getThumbnailItem(videoId);
    if (!item)
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    const at = new Date().toISOString(),
      updated =
        change.action === 'title'
          ? applyThumbnailTitle(item, change, at)
          : applyThumbnailDecision(item, change, producer.userId, at);
    await saveThumbnailItem(updated, item.revision);
    return NextResponse.json({ item: updated }, { headers: thumbnailHeaders });
  } catch (error) {
    return thumbnailError(error);
  }
}
export async function POST(request: Request, { params }: Context) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  const { videoId } = await params;
  if (!isVideoId(videoId))
    return NextResponse.json({ error: 'Invalid video ID.' }, { status: 400 });
  try {
    const form = await request.formData(),
      artwork = form.get('artwork'),
      revision = form.get('revision'),
      prompt = form.get('prompt');
    if (
      !(artwork instanceof File) ||
      artwork.size > 4_000_000 ||
      typeof revision !== 'string' ||
      !/^\d+$/.test(revision) ||
      typeof prompt !== 'string' ||
      prompt.length > 20000
    )
      return NextResponse.json(
        {
          error:
            'Upload a 16:9 image, or 9:16 for a Short, under 4 MB and a prompt of at most 20,000 characters.',
        },
        { status: 400 },
      );
    const item = await getThumbnailItem(videoId);
    if (!item)
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    const rendered = await renderThumbnail(
      Buffer.from(await artwork.arrayBuffer()),
      item.format,
    );
    const updated = appendThumbnailVersion(
      item,
      {
        assetHash: rendered.hash,
        createdAt: new Date().toISOString(),
        id: rendered.hash,
        legacyRevision: null,
        prompt: prompt.trim() || currentThumbnail(item).prompt,
        review: { status: 'pending' },
        source: 'upload',
      },
      Number(revision),
    );
    if (updated !== item) {
      await uploadThumbnailAsset(item.id, rendered.hash, rendered.bytes);
      await saveThumbnailItem(updated, item.revision);
    }
    return NextResponse.json(
      { item: updated },
      { headers: thumbnailHeaders, status: updated === item ? 200 : 201 },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
