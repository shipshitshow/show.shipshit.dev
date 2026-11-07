import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { convertCoverToJpeg, encodeCoverJpeg } from './cover-jpeg';

async function cover(width = 270, height = 480) {
  return sharp({
    create: { background: '#336699', channels: 4, height, width },
  })
    .png()
    .toBuffer();
}

test('a PNG becomes a JPEG of the same size', async () => {
  const { buffer, quality } = await encodeCoverJpeg(await cover());
  const meta = await sharp(buffer).metadata();
  expect(meta).toMatchObject({ format: 'jpeg', height: 480, width: 270 });
  expect(quality).toBe(92);
});

test('quality drops only when the file is over the limit', async () => {
  // Noise doesn't compress, so a tight limit forces a lower quality.
  const noise = await sharp({
    create: {
      background: '#000000',
      channels: 3,
      height: 480,
      noise: { mean: 128, sigma: 60, type: 'gaussian' },
      width: 270,
    },
  })
    .png()
    .toBuffer();
  const high = await encodeCoverJpeg(noise);
  const low = await encodeCoverJpeg(noise, {
    maxBytes: Math.floor(high.buffer.length * 0.85),
  });
  expect(low.quality).toBeLessThan(92);
  expect(low.buffer.length).toBeLessThanOrEqual(high.buffer.length * 0.85);
});

test('an image that never fits is rejected', async () => {
  await expect(
    encodeCoverJpeg(await cover(), { maxBytes: 10 }),
  ).rejects.toThrow('Still over 10 bytes');
});

test('the JPEG is written into a folder that is created for it', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cover-jpeg-'));
  try {
    const source = path.join(directory, 'in.png');
    await Bun.write(source, await cover());
    const destination = path.join(directory, 'nested', 'out.jpg');
    const { bytes } = await convertCoverToJpeg(source, destination);
    expect(readFileSync(destination).length).toBe(bytes);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
