import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BRAND } from '@shipshitshow/ui/brand';
import sharp from 'sharp';

/**
 * Stamps the show asterisk on finished thumbnail art, using the canonical SVG
 * masters and the vault placement table (synced into brand-tokens.json by
 * scripts/sync-brand.py). Never redraw the mark or place it by eye.
 */
export type StampKind = 'live' | 'video';
export type StampFormat = 'landscape' | 'shorts';

const MASTERS: Record<StampKind, string> = {
  live: 'asterisk-red.svg',
  video: 'asterisk-white.svg',
};

export function stampPlacement(format: StampFormat) {
  const thumbnail = BRAND.thumbnail;
  const [width, height] =
    format === 'landscape'
      ? thumbnail.landscape_1080.reference_canvas
      : thumbnail.shorts.reference_canvas;
  const mark =
    format === 'landscape'
      ? thumbnail.landscape_1080.signature
      : thumbnail.shorts.signature;
  return { height, mark, width };
}

export async function stampThumbnail(
  art: Buffer,
  options: {
    brandDir?: string;
    format: StampFormat;
    kind: StampKind;
    /** Overrides the vault top-left position of the mark (rare: one-off recovery). */
    position?: { x: number; y: number };
  },
): Promise<Buffer> {
  const { height, mark, width } = stampPlacement(options.format);
  const image = sharp(art, { limitInputPixels: 40_000_000 }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height)
    throw new Error('Could not read the thumbnail art.');
  if (Math.abs(metadata.width / metadata.height - width / height) > 0.04)
    throw new Error(
      `The art must be ${options.format === 'landscape' ? '16:9' : '9:16'}; got ${metadata.width}x${metadata.height}.`,
    );
  const brandDir =
    options.brandDir ?? path.join(import.meta.dir, '../../public/brand');
  // Shorts covers carry the red master, like the Short video. Since 2026-11-07
  // the cover mark sits lower (y345) than the video mark (y230) because the
  // Shorts grid crops the top of the cover.
  const kind: StampKind = options.format === 'shorts' ? 'live' : options.kind;
  const svg = await readFile(path.join(brandDir, MASTERS[kind]));
  const signature = await sharp(svg, { density: 300 })
    .resize(mark.width, mark.height)
    .png()
    .toBuffer();
  return image
    .resize(width, height, { fit: 'cover' })
    .composite([
      {
        input: signature,
        left: options.position?.x ?? mark.x,
        top: options.position?.y ?? mark.y,
      },
    ])
    .png()
    .toBuffer();
}
