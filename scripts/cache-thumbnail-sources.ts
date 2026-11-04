import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import manifest from '../docs/thumbnail-sources.json';

const root = path.resolve(
  process.env.THUMBNAIL_SOURCE_DIR || 'editing/sources/thumbnails',
);
let downloaded = 0,
  reused = 0;
for (const source of manifest.assets) {
  const file = path.resolve(root, source.file);
  if (!file.startsWith(root + path.sep))
    throw new Error('Invalid source cache path.');
  let data: Buffer | null = null;
  try {
    data = await readFile(file);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  if (data) {
    if (createHash('sha256').update(data).digest('hex') !== source.sha256)
      throw new Error(
        'Cached source changed: ' +
          source.file +
          '. Preserve it and verify before refreshing.',
      );
    reused++;
    continue;
  }
  if (process.argv.includes('--check') || !source.sourceUrl)
    throw new Error('Restore the cached source: ' + source.file);
  const url = new URL(source.sourceUrl);
  if (url.protocol !== 'https:') throw new Error('Sources must use HTTPS.');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Source download failed: ' + source.file);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256)
    throw new Error(
      'The official source changed. Review it and update the manifest explicitly: ' +
        source.file,
    );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes, { flag: 'wx' });
  downloaded++;
}
process.stdout.write(JSON.stringify({ downloaded, reused }) + '\n');
