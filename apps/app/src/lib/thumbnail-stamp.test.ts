import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import sharp from 'sharp';
import { stampPlacement, stampThumbnail } from './thumbnail-stamp';

const brandDir = path.join(import.meta.dir, '../../public/brand');

async function art(width: number, height: number) {
  return sharp({
    create: { background: '#0D0D0D', channels: 3, height, width },
  })
    .png()
    .toBuffer();
}

async function pixel(bytes: Buffer, x: number, y: number) {
  const { data, info } = await sharp(bytes)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}

describe('stampThumbnail', () => {
  test('uses the placement table for 16:9', () => {
    expect(stampPlacement('landscape').mark).toMatchObject({
      height: 144,
      width: 144,
      x: 1680,
      y: 96,
    });
  });

  test('puts a white mark top-right on an edited-video thumbnail', async () => {
    const out = await stampThumbnail(await art(1280, 720), {
      brandDir,
      format: 'landscape',
      kind: 'video',
    });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1920, 1080]);
    expect(await pixel(out, 1752, 168)).toEqual([255, 255, 255]);
    expect(await pixel(out, 1752, 40)).toEqual([13, 13, 13]);
  });

  test('uses the red master for a livestream', async () => {
    const out = await stampThumbnail(await art(1920, 1080), {
      brandDir,
      format: 'landscape',
      kind: 'live',
    });
    const [r, g, b] = await pixel(out, 1752, 168);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(90);
    expect(b).toBeLessThan(90);
  });

  test('stamps a Shorts cover with the Short video mark', async () => {
    const { mark } = stampPlacement('shorts');
    expect(mark).toMatchObject({ height: 120, width: 120, x: 880, y: 230 });
    const out = await stampThumbnail(await art(1080, 1920), {
      brandDir,
      format: 'shorts',
      kind: 'video',
    });
    const [r, g, b] = await pixel(out, 940, 290);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(90);
    expect(b).toBeLessThan(90);
  });

  test('rejects art with the wrong aspect ratio', async () => {
    await expect(
      stampThumbnail(await art(1000, 1000), {
        brandDir,
        format: 'landscape',
        kind: 'video',
      }),
    ).rejects.toThrow('16:9');
  });
});
