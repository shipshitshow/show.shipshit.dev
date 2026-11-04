import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { isAssetHash, isVideoId, thumbnailCdnUrl } from '@/lib/thumbnail-lab';
import { readLocalThumbnailAsset } from '@/lib/thumbnail-lab-assets';
import { thumbnailError, thumbnailHeaders } from '@/lib/thumbnail-lab-http';
import { getThumbnailItem } from '@/lib/thumbnail-lab-store';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string; hash: string }> },
) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  const { videoId, hash } = await params;
  if (!isVideoId(videoId) || !isAssetHash(hash))
    return NextResponse.json({ error: 'Invalid thumbnail.' }, { status: 400 });
  try {
    const item = await getThumbnailItem(videoId),
      version = item?.versions.find((v) => v.assetHash === hash);
    if (!item || !version)
      return NextResponse.json(
        { error: 'Thumbnail not found.' },
        { status: 404 },
      );
    const download = new URL(request.url).searchParams.get('download') === '1';
    const headers: Record<string, string> = {
      ...thumbnailHeaders,
      'Content-Type': 'image/jpeg',
    };
    if (download)
      headers['Content-Disposition'] =
        "attachment; filename*=UTF-8''" +
        encodeURIComponent(
          item.id + ' - ' + item.title.replace(/[/\\:\r\n]/g, ' - ') + '.jpg',
        );
    if (!process.env.VERCEL && !process.env.THUMBNAIL_LAB_USE_CDN)
      return new Response(
        new Uint8Array(await readLocalThumbnailAsset(videoId, hash)),
        { headers },
      );
    if (!download)
      return new Response(null, {
        headers: {
          ...thumbnailHeaders,
          Location: thumbnailCdnUrl(item, version),
        },
        status: 302,
      });
    const image = await fetch(thumbnailCdnUrl(item, version));
    if (!image.ok) throw new Error('The CDN thumbnail is unavailable.');
    return new Response(image.body, { headers });
  } catch (error) {
    return thumbnailError(error);
  }
}
