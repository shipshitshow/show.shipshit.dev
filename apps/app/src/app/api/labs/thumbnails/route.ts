import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/producer-auth';
import { getProducerStorageBackend } from '@/lib/producer-storage';
import { parseThumbnailCatalogue } from '@/lib/thumbnail-lab';
import {
  thumbnailUploadsAvailable,
  verifyThumbnailAsset,
} from '@/lib/thumbnail-lab-assets';
import { thumbnailError, thumbnailHeaders } from '@/lib/thumbnail-lab-http';
import {
  listThumbnailItems,
  saveThumbnailItems,
} from '@/lib/thumbnail-lab-store';
export async function GET() {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    return NextResponse.json(
      {
        items: (await listThumbnailItems()).sort(
          (a, b) => a.position - b.position,
        ),
        uploadsAvailable: thumbnailUploadsAvailable(),
        writable: getProducerStorageBackend() !== 'read-only',
      },
      { headers: thumbnailHeaders },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
export async function POST(request: Request) {
  const producer = await requireProducer();
  if (!producer.ok) return producer.response;
  try {
    const input = await request.text();
    if (Buffer.byteLength(input) > 2_000_000)
      throw new Error('Catalogue files must be smaller than 2 MB.');
    const catalogue = parseThumbnailCatalogue(JSON.parse(input));
    if (
      catalogue.items.length > 1000 ||
      catalogue.items.some((item) => item.versions.length > 50)
    )
      throw new Error('Import at most 1,000 videos with 50 versions each.');
    const existing = new Set(
      (await listThumbnailItems()).map((item) => item.id),
    );
    const known = new Set([
      ...existing,
      ...catalogue.items.map((item) => item.id),
    ]);
    const fresh = catalogue.items.filter((item) => !existing.has(item.id));
    if (fresh.some((item) => item.pairIds.some((id) => !known.has(id))))
      throw new Error('A linked video is missing from the catalogue.');
    const assets = fresh.flatMap((item) =>
      item.versions.map((version) => ({ item, version })),
    );
    for (let at = 0; at < assets.length; at += 8)
      await Promise.all(
        assets
          .slice(at, at + 8)
          .map(({ item, version }) => verifyThumbnailAsset(item, version)),
      );
    await saveThumbnailItems(
      fresh.map((item) => ({ expectedRevision: -1, item })),
    );
    return NextResponse.json(
      { imported: fresh.length, preserved: existing.size },
      { headers: thumbnailHeaders },
    );
  } catch (error) {
    return thumbnailError(error);
  }
}
