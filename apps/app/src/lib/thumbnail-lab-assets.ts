import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BRAND_COLORS } from '@shipshitshow/ui/brand';
import sharp from 'sharp';
import { StorageWriteError } from './producer-storage';
import {
  isAssetHash,
  isVideoId,
  type ThumbnailFormat,
  type ThumbnailItem,
  type ThumbnailVersion,
  thumbnailCdnUrl,
} from './thumbnail-lab';

export const THUMBNAIL_CDN_PREFIX = 'shipshitshow/thumbnails';
export function thumbnailUploadsAvailable(): boolean {
  return (
    !process.env.VERCEL ||
    Boolean(
      process.env.THUMBNAIL_LAB_S3_ACCESS_KEY_ID &&
        process.env.THUMBNAIL_LAB_S3_SECRET_ACCESS_KEY,
    )
  );
}
function assetDirectory() {
  return (
    process.env.THUMBNAIL_LAB_DIR ||
    path.join(process.cwd(), 'data/thumbnail-lab')
  );
}
export async function uploadThumbnailAsset(
  id: string,
  hash: string,
  data: Buffer,
): Promise<void> {
  if (!isVideoId(id) || !isAssetHash(hash))
    throw new Error('Invalid thumbnail asset path.');
  if (!process.env.VERCEL && !process.env.THUMBNAIL_LAB_USE_CDN) {
    const dir = path.join(assetDirectory(), 'assets', id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, hash + '.jpg'), data, { flag: 'wx' }).catch(
      (error) => {
        if (
          !(
            error instanceof Error &&
            'code' in error &&
            error.code === 'EEXIST'
          )
        )
          throw error;
      },
    );
    return;
  }
  const accessKeyId = process.env.THUMBNAIL_LAB_S3_ACCESS_KEY_ID,
    secretAccessKey = process.env.THUMBNAIL_LAB_S3_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey)
    throw new StorageWriteError('Thumbnail uploads are not configured.');
  const client = new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    region: 'us-west-1',
  });
  try {
    await client.send(
      new PutObjectCommand({
        Body: data,
        Bucket: 'cdn.shipshit.dev',
        CacheControl: 'public, max-age=31536000, immutable',
        ContentType: 'image/jpeg',
        IfNoneMatch: '*',
        Key: THUMBNAIL_CDN_PREFIX + '/' + id + '/' + hash + '.jpg',
      }),
    );
  } catch (error) {
    if (
      !(
        error instanceof Error &&
        'name' in error &&
        error.name === 'PreconditionFailed'
      )
    )
      throw new StorageWriteError(
        'The CDN did not accept the thumbnail upload.',
        { cause: error },
      );
  } finally {
    client.destroy();
  }
}
export async function readLocalThumbnailAsset(
  id: string,
  hash: string,
): Promise<Buffer> {
  return readFile(path.join(assetDirectory(), 'assets', id, hash + '.jpg'));
}
export async function renderThumbnail(
  data: Buffer,
  format: ThumbnailFormat,
): Promise<{ bytes: Buffer; hash: string }> {
  if (data.length > 4_000_000)
    throw new Error('Upload an image smaller than 4 MB.');
  const image = sharp(data, { limitInputPixels: 40_000_000 }).rotate(),
    metadata = await image.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
    Math.abs(metadata.width / metadata.height - 16 / 9) > 0.04
  )
    throw new Error('Upload 16:9 JPEG, PNG or WebP artwork.');
  const color =
    format === 'video' ? BRAND_COLORS.white : BRAND_COLORS.accent_red;
  const signature = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><g fill="' +
      color +
      '" transform="translate(72 72)">' +
      [0, 60, 120]
        .map(
          (angle) =>
            '<rect x="-15" y="-66" width="30" height="132" transform="rotate(' +
            angle +
            ')"/>',
        )
        .join('') +
      '</g></svg>',
  );
  const bytes = await image
    .resize(1920, 1080)
    .composite([{ input: signature, left: 1704, top: 72 }])
    .jpeg({ quality: 93 })
    .toBuffer();
  if (bytes.length > 2_000_000)
    throw new Error(
      'The exported thumbnail is larger than 2 MB. Use simpler source artwork.',
    );
  return { bytes, hash: createHash('sha256').update(bytes).digest('hex') };
}

export async function verifyThumbnailAsset(
  item: ThumbnailItem,
  version: ThumbnailVersion,
): Promise<void> {
  if (!process.env.VERCEL && !process.env.THUMBNAIL_LAB_USE_CDN) {
    const data = await readLocalThumbnailAsset(item.id, version.assetHash);
    if (createHash('sha256').update(data).digest('hex') !== version.assetHash)
      throw new Error('Catalogue asset hash mismatch: ' + item.id);
    return;
  }
  const response = await fetch(thumbnailCdnUrl(item, version), {
    method: 'HEAD',
    signal: AbortSignal.timeout(15000),
  });
  const size = Number(response.headers.get('content-length'));
  if (
    !response.ok ||
    response.headers.get('content-type') !== 'image/jpeg' ||
    !size ||
    size > 2_000_000
  )
    throw new Error('A catalogue image is missing from the CDN: ' + item.id);
}
