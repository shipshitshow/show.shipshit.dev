import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import {
  isThumbnailKind,
  kindOf,
  type ThumbnailItem,
  type ThumbnailVersion,
} from '../lib/thumbnail-lab';
import {
  assetDirectory,
  readLocalThumbnailAsset,
  uploadThumbnailAsset,
} from '../lib/thumbnail-lab-assets';
import {
  listThumbnailItems,
  saveThumbnailItems,
} from '../lib/thumbnail-lab-store';
import {
  decideLiveSync,
  type LiveMatch,
  readSyncLedger,
  recordLive,
  syncedItem,
  writeSyncLedger,
} from '../lib/thumbnail-lab-sync';

// Makes each item's current version match the thumbnail that is live on
// YouTube. Read-only towards YouTube; dry run unless --commit is passed.
// An approved version that has not been pushed yet is never touched: it is
// reported as "approved, pending push".
function arg(name: string) {
  const at = process.argv.indexOf(name);
  return at < 0 ? null : (process.argv[at + 1] ?? null);
}
const commit = process.argv.includes('--commit');
const by = arg('--by') ?? 'live-sync';
const only = arg('--id');

async function signature(data: Buffer) {
  return sharp(data)
    .resize(128, 72, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
}
function distance(a: Buffer, b: Buffer) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}
async function fetchLive(id: string) {
  for (const name of ['maxresdefault', 'hqdefault']) {
    const response = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
  }
  return null;
}
async function normalise(live: Buffer) {
  for (const quality of [92, 85, 75]) {
    const data = await sharp(live)
      .resize(1920, 1080, { fit: 'cover' })
      .jpeg({ mozjpeg: true, quality })
      .toBuffer();
    if (data.length <= 2_000_000) return data;
  }
  throw new Error('Live thumbnail does not fit under 2 MB.');
}

interface Change {
  id: string;
  kind: 'matched' | 'added' | 'in-sync' | 'pending-push' | 'skipped' | 'error';
  detail: string;
}
const now = new Date().toISOString();
const ledgerPath = path.join(assetDirectory(), 'youtube-sync.json');
const ledger = readSyncLedger(ledgerPath);
const changes: Change[] = [];
const updates: Array<{ item: ThumbnailItem; expectedRevision: number }> = [];
const uploads: Array<{ id: string; hash: string; data: Buffer }> = [];
const confirmedLive: Array<{ id: string; assetHash: string }> = [];

for (const item of await listThumbnailItems()) {
  if (only && item.id !== only) continue;
  if (!isThumbnailKind(item)) {
    changes.push({
      detail: `${kindOf(item)} is not a video thumbnail`,
      id: item.id,
      kind: 'skipped',
    });
    continue;
  }
  if (item.format === 'short') {
    changes.push({
      detail: 'Shorts are skipped',
      id: item.id,
      kind: 'skipped',
    });
    continue;
  }
  try {
    const live = await fetchLive(item.id);
    if (!live) {
      changes.push({ detail: 'no live thumbnail', id: item.id, kind: 'error' });
      continue;
    }
    const target = await signature(live);
    let best: LiveMatch | null = null;
    for (const version of item.versions) {
      const score = distance(
        target,
        await signature(
          await readLocalThumbnailAsset(item.id, version.assetHash),
        ),
      );
      if (!best || score < best.score) best = { id: version.id, score };
    }
    const decision = decideLiveSync(
      item,
      best,
      ledger[item.id]?.assetHash ?? null,
    );
    const hashOf = (id: string) =>
      item.versions.find((v) => v.id === id)?.assetHash ?? id;
    if (decision.kind === 'pending-push') {
      changes.push({
        detail: `${decision.versionId.slice(0, 8)} is approved but not live yet`,
        id: item.id,
        kind: 'pending-push',
      });
      continue;
    }
    if (decision.kind === 'in-sync') {
      changes.push({
        detail: decision.versionId.slice(0, 8),
        id: item.id,
        kind: 'in-sync',
      });
      confirmedLive.push({
        assetHash: hashOf(decision.versionId),
        id: item.id,
      });
      continue;
    }
    if (decision.kind === 'matched') {
      updates.push({
        expectedRevision: item.revision,
        item: syncedItem(item, item.versions, decision.versionId, now, by),
      });
      confirmedLive.push({
        assetHash: hashOf(decision.versionId),
        id: item.id,
      });
      changes.push({
        detail: `existing ${decision.versionId.slice(0, 8)} (diff ${decision.score.toFixed(1)})`,
        id: item.id,
        kind: 'matched',
      });
      continue;
    }
    const data = await normalise(live);
    const hash = createHash('sha256').update(data).digest('hex');
    const version: ThumbnailVersion = {
      assetHash: hash,
      createdAt: now,
      id: hash,
      legacyRevision: null,
      prompt: 'Thumbnail that was live on YouTube when the Lab was synced.',
      review: { at: now, by, status: 'approved' },
      source: 'youtube-live',
    };
    uploads.push({ data, hash, id: item.id });
    updates.push({
      expectedRevision: item.revision,
      item: syncedItem(item, [...item.versions, version], hash, now, by),
    });
    confirmedLive.push({ assetHash: hash, id: item.id });
    changes.push({
      detail: `new live version ${hash.slice(0, 8)} (closest diff ${decision.closest?.toFixed(1) ?? 'n/a'})`,
      id: item.id,
      kind: 'added',
    });
  } catch (error) {
    changes.push({
      detail: error instanceof Error ? error.message : String(error),
      id: item.id,
      kind: 'error',
    });
  }
}

const count = (kind: Change['kind']) =>
  changes.filter((c) => c.kind === kind).length;
process.stdout.write(
  JSON.stringify({
    added: count('added'),
    errors: count('error'),
    inSync: count('in-sync'),
    matched: count('matched'),
    mode: commit ? 'commit' : 'preview',
    pendingPush: count('pending-push'),
    skipped: count('skipped'),
  }) + '\n',
);
for (const c of changes.filter(
  (c) => c.kind !== 'in-sync' && c.kind !== 'skipped',
))
  process.stdout.write(
    `${c.kind === 'pending-push' ? 'approved, pending push' : c.kind}\t${c.id}\t${c.detail}\n`,
  );

if (commit) {
  if (updates.length) {
    for (const u of uploads) await uploadThumbnailAsset(u.id, u.hash, u.data);
    await saveThumbnailItems(updates);
    process.stdout.write(JSON.stringify({ updated: updates.length }) + '\n');
  }
  const stale = confirmedLive.filter(
    (e) => ledger[e.id]?.assetHash !== e.assetHash,
  );
  if (stale.length) {
    writeSyncLedger(ledgerPath, recordLive(ledger, stale, now));
    process.stdout.write(
      JSON.stringify({ ledgerEntries: stale.length }) + '\n',
    );
  }
}
