import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

/** YouTube's thumbnail upload limit, as enforced by youtube:update. */
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

const QUALITIES = [92, 88, 84, 80, 75];

/**
 * Re-encode an image as a JPEG that fits the upload limit: q92 first, then
 * lower qualities only when the file is still too large. Throws when even the
 * lowest quality is over the limit.
 */
export async function encodeCoverJpeg(
  input: string | Buffer,
  { maxBytes = MAX_COVER_BYTES }: { maxBytes?: number } = {},
) {
  for (const quality of QUALITIES) {
    const buffer = await sharp(input)
      .flatten({ background: '#000000' })
      .jpeg({ mozjpeg: true, quality })
      .toBuffer();
    if (buffer.length <= maxBytes) return { buffer, quality };
  }
  throw new Error(
    `Still over ${maxBytes} bytes at JPEG quality ${QUALITIES.at(-1)}`,
  );
}

/** Write the JPEG for `source` to `destination`, creating its folder. */
export async function convertCoverToJpeg(
  source: string,
  destination: string,
  options?: { maxBytes?: number },
) {
  const { buffer, quality } = await encodeCoverJpeg(source, options);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, buffer);
  return { bytes: buffer.length, quality };
}
