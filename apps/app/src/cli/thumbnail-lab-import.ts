import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  isAssetHash,
  isVideoId,
  type ThumbnailItem,
  type ThumbnailVersion,
} from '../lib/thumbnail-lab';
import { uploadThumbnailAsset } from '../lib/thumbnail-lab-assets';
import {
  listThumbnailItems,
  saveThumbnailItems,
} from '../lib/thumbnail-lab-store';

interface ReviewRow {
  id: string;
  title: string;
  format: 'live' | 'video';
  visibility: string;
  file: string;
  revision: string;
  assetHash: string;
  locked: boolean;
  pairIds: string[];
  previousFile: string | null;
}
function parseRows(value: unknown): ReviewRow[] {
  if (!Array.isArray(value))
    throw new Error('Expected a review catalogue array.');
  return value.map((r: unknown) => {
    if (
      !r ||
      typeof r !== 'object' ||
      !('id' in r) ||
      typeof r.id !== 'string' ||
      !isVideoId(r.id) ||
      !('title' in r) ||
      typeof r.title !== 'string' ||
      !('format' in r) ||
      (r.format !== 'video' && r.format !== 'live') ||
      !('file' in r) ||
      typeof r.file !== 'string' ||
      !('revision' in r) ||
      typeof r.revision !== 'string' ||
      !('assetHash' in r) ||
      typeof r.assetHash !== 'string' ||
      !isAssetHash(r.assetHash)
    )
      throw new Error('Invalid catalogue row.');
    return {
      assetHash: r.assetHash,
      file: r.file,
      format: r.format,
      id: r.id,
      locked: 'locked' in r && r.locked === true,
      pairIds:
        'pairIds' in r && Array.isArray(r.pairIds)
          ? r.pairIds.filter(
              (v: unknown): v is string =>
                typeof v === 'string' && isVideoId(v),
            )
          : [],
      previousFile:
        'previousFile' in r && typeof r.previousFile === 'string'
          ? r.previousFile
          : null,
      revision: r.revision,
      title: r.title,
      visibility:
        'visibility' in r && typeof r.visibility === 'string'
          ? r.visibility
          : 'unlisted',
    };
  });
}
function arg(name: string) {
  const at = process.argv.indexOf(name);
  return at < 0 ? null : (process.argv[at + 1] ?? null);
}
const source = arg('--source');
if (!source)
  throw new Error(
    'Pass --source with the local review artifact directory. Use --commit only after preview.',
  );
const root = path.resolve(source),
  commit = process.argv.includes('--commit');
const rows = parseRows(
  JSON.parse(await readFile(path.join(root, 'catalogue-index.json'), 'utf8')),
);
if (new Set(rows.map((r) => r.id)).size !== rows.length)
  throw new Error('Duplicate IDs.');
const prompts: unknown = JSON.parse(
  await readFile(path.join(root, 'generation-prompts.json'), 'utf8'),
);
function promptFor(id: string) {
  if (!Array.isArray(prompts)) return '';
  const match = prompts.find(
    (p: unknown) => p && typeof p === 'object' && 'id' in p && p.id === id,
  );
  return match &&
    typeof match === 'object' &&
    'prompt' in match &&
    typeof match.prompt === 'string'
    ? match.prompt
    : '';
}
const uploads: Array<{ id: string; hash: string; data: Buffer }> = [],
  items: ThumbnailItem[] = [];
const now = new Date().toISOString();
async function image(file: string, id: string, expected?: string) {
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep))
    throw new Error('Asset escapes source directory.');
  const data = await readFile(resolved),
    metadata = await sharp(data).metadata();
  if (
    metadata.width !== 1920 ||
    metadata.height !== 1080 ||
    metadata.format !== 'jpeg' ||
    data.length > 2_000_000
  )
    throw new Error('Invalid upload export for ' + id);
  const hash = createHash('sha256').update(data).digest('hex');
  if (expected && hash !== expected)
    throw new Error('Thumbnail hash mismatch: ' + id);
  uploads.push({ data, hash, id });
  return hash;
}
for (const [position, row] of rows.entries()) {
  const versions: ThumbnailVersion[] = [];
  if (row.previousFile) {
    const hash = await image(row.previousFile, row.id);
    versions.push({
      assetHash: hash,
      createdAt: now,
      id: hash,
      legacyRevision: null,
      prompt: 'Previous imported thumbnail.',
      review: { status: 'pending' },
      source: 'import',
    });
  }
  const hash = await image(
    path.join('upload-jpg', path.parse(row.file).name + '.jpg'),
    row.id,
    row.assetHash,
  );
  if (versions.some((v) => v.id === hash)) versions.splice(0, versions.length);
  versions.push({
    assetHash: hash,
    createdAt: now,
    id: hash,
    legacyRevision: row.revision,
    prompt: promptFor(row.id),
    review: row.locked
      ? { at: now, by: 'owner-approved-import', status: 'approved' }
      : { status: 'pending' },
    source: 'import',
  });
  items.push({
    currentVersionId: hash,
    format: row.format,
    id: row.id,
    pairIds: row.pairIds,
    position,
    revision: 0,
    title: row.title,
    updatedAt: now,
    versions,
    visibility: row.visibility,
  });
}
process.stdout.write(
  JSON.stringify({
    approved: items.filter((i) =>
      i.versions.some((v) => v.review.status === 'approved'),
    ).length,
    cdnPath:
      'https://cdn.shipshit.dev/shipshitshow/thumbnails/<video-id>/<hash>.jpg',
    imageBytes: uploads.reduce((n, u) => n + u.data.length, 0),
    items: items.length,
    mode: commit ? 'commit' : 'preview',
    versions: uploads.length,
  }) + '\n',
);
if (commit) {
  const existing = new Set((await listThumbnailItems()).map((item) => item.id)),
    fresh = items.filter((item) => !existing.has(item.id)),
    freshIds = new Set(fresh.map((i) => i.id));
  const pending = uploads.filter((u) => freshIds.has(u.id));
  for (let at = 0; at < pending.length; at += 5)
    await Promise.all(
      pending.slice(at, at + 5).map(async (u) => {
        if (process.argv.includes('--assets-uploaded')) {
          const response = await fetch(
            'https://cdn.shipshit.dev/shipshitshow/thumbnails/' +
              u.id +
              '/' +
              u.hash +
              '.jpg',
            { method: 'HEAD' },
          );
          if (!response.ok)
            throw new Error('CDN asset is missing: ' + u.id + '/' + u.hash);
        } else await uploadThumbnailAsset(u.id, u.hash, u.data);
      }),
    );
  await saveThumbnailItems(
    fresh.map((item) => ({ expectedRevision: -1, item })),
  );
  process.stdout.write(
    JSON.stringify({
      imported: fresh.length,
      preservedExisting: existing.size,
    }) + '\n',
  );
}
