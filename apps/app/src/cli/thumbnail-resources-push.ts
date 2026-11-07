/**
 * Pushes the local lab's assets (logos, people, products, brand, style) to the
 * CDN and writes the production manifest, so show.shipshit.dev/library/assets
 * shows them. Run it on the machine that holds THUMBNAIL_LAB_DIR.
 *
 *   bun run thumbnail-resources:push                 # preview only
 *   bun run thumbnail-resources:push --upload        # copy files with the AWS CLI
 *   PRODUCER_STORAGE=redis VERCEL_ENV=production \
 *     bun run thumbnail-resources:push --commit      # check the CDN, write Redis
 *
 * Files go to cdn.shipshit.dev/shipshitshow/resources/<sha256>.<ext>, so a
 * name can't be guessed. `--skip <regex>` leaves matching files out.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getProducerStorageBackend } from '../lib/producer-storage';
import { writeRedisJson } from '../lib/redis-storage';
import {
  isResourceFile,
  type PublishedResource,
  publishedResourceUrl,
  RESOURCE_CDN_PREFIX,
  resourceContentType,
  resourceExtension,
} from '../lib/thumbnail-resources';
import {
  listLocalThumbnailResources,
  localResourcePath,
  publishedResourcesKey,
} from '../lib/thumbnail-resources-store';

function arg(name: string) {
  const at = process.argv.indexOf(name);
  return at < 0 ? null : (process.argv[at + 1] ?? null);
}
const upload = process.argv.includes('--upload');
const commit = process.argv.includes('--commit');
const profile = arg('--profile') ?? 'genfeedai';
const skip = arg('--skip') ? new RegExp(arg('--skip') as string, 'i') : null;

const local = await listLocalThumbnailResources();
const entries: Array<PublishedResource & { bytes: number; path: string }> = [];
for (const resource of local) {
  if (!resource.file || !isResourceFile(resource.file)) continue;
  if (skip && (skip.test(resource.file) || skip.test(resource.label))) continue;
  const file = localResourcePath(resource.category, resource.file);
  const data = await readFile(file);
  entries.push({
    bytes: data.length,
    category: resource.category,
    ext: resourceExtension(resource.file),
    hash: createHash('sha256').update(data).digest('hex'),
    label: resource.label,
    path: file,
    ...(resource.note ? { note: resource.note } : {}),
    ...(resource.source ? { source: resource.source } : {}),
  });
}

const counts: Record<string, number> = {};
for (const entry of entries)
  counts[entry.category] = (counts[entry.category] ?? 0) + 1;
process.stdout.write(
  `${JSON.stringify({
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    counts,
    labels: entries.map((entry) => `${entry.category}/${entry.label}`),
    mode: commit ? 'commit' : upload ? 'upload' : 'preview',
    total: entries.length,
  })}\n`,
);

if (upload) {
  for (const entry of entries) {
    const target = `s3://cdn.shipshit.dev/${RESOURCE_CDN_PREFIX}/${entry.hash}.${entry.ext}`;
    const run = Bun.spawnSync(
      [
        'aws',
        's3',
        'cp',
        entry.path,
        target,
        '--profile',
        profile,
        '--content-type',
        resourceContentType(`x.${entry.ext}`),
        '--cache-control',
        'public, max-age=31536000, immutable',
        '--only-show-errors',
      ],
      { stderr: 'pipe', stdout: 'pipe' },
    );
    if (run.exitCode !== 0)
      throw new Error(
        `Upload failed for ${entry.category}/${entry.label}: ${run.stderr.toString().trim()}`,
      );
  }
  process.stdout.write(`${JSON.stringify({ uploaded: entries.length })}\n`);
}

if (commit) {
  if (getProducerStorageBackend() !== 'redis')
    throw new Error('Set PRODUCER_STORAGE=redis with the KV credentials.');
  if (!process.env.VERCEL_ENV)
    throw new Error(
      'Set VERCEL_ENV to the namespace to write, e.g. production.',
    );
  const missing: string[] = [];
  for (const entry of entries) {
    const response = await fetch(publishedResourceUrl(entry.hash, entry.ext), {
      method: 'HEAD',
    });
    if (!response.ok) missing.push(`${entry.category}/${entry.label}`);
  }
  if (missing.length)
    throw new Error(
      `Not on the CDN yet, run --upload first: ${missing.join(', ')}`,
    );
  await writeRedisJson(
    publishedResourcesKey(),
    entries.map(({ bytes: _bytes, path: _path, ...entry }) => entry),
  );
  process.stdout.write(
    `${JSON.stringify({ namespace: process.env.VERCEL_ENV, written: entries.length })}\n`,
  );
}
