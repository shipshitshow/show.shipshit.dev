import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { ThumbnailItem, ThumbnailVersion } from './thumbnail-lab';

// Planning for `thumbnail-lab:sync-live`: what to do with each item once we
// know which version (if any) is live on YouTube.
export const SYNC_MATCH_THRESHOLD = 10;
export const SYNC_NOTE = 'synced from live';

export interface LiveMatch {
  id: string;
  score: number;
}
export type SyncDecision =
  | { kind: 'in-sync'; versionId: string }
  | { kind: 'matched'; versionId: string; score: number }
  | { kind: 'added'; closest: number | null }
  // Approved in the Lab, never pushed. The live thumbnail is left alone and
  // the item stays untouched until it is pushed.
  | { kind: 'pending-push'; versionId: string };

// `ledgerHash` is the assetHash the push script last sent for this video. An
// approved current version the push script never sent has not reached YouTube
// yet, whatever is live now.
export function decideLiveSync(
  item: ThumbnailItem,
  match: LiveMatch | null,
  ledgerHash: string | null,
): SyncDecision {
  const current = item.versions.find((v) => v.id === item.currentVersionId);
  const live =
    match && match.score < SYNC_MATCH_THRESHOLD
      ? item.versions.find((v) => v.id === match.id)
      : undefined;
  if (live && match) {
    const approved = item.versions.filter(
      (v) => v.review.status === 'approved',
    );
    if (
      live.id === item.currentVersionId &&
      current?.review.status === 'approved' &&
      approved.length === 1
    )
      return { kind: 'in-sync', versionId: live.id };
  }
  if (
    current &&
    current.review.status === 'approved' &&
    current.id !== live?.id &&
    current.assetHash !== ledgerHash
  )
    return { kind: 'pending-push', versionId: current.id };
  if (live && match)
    return { kind: 'matched', score: match.score, versionId: live.id };
  return { closest: match?.score ?? null, kind: 'added' };
}

// Makes `id` the approved, current version and rejects other approved ones.
export function syncedItem(
  item: ThumbnailItem,
  versions: ThumbnailVersion[],
  id: string,
  now: string,
  by: string,
): ThumbnailItem {
  const reason = 'Superseded by the live thumbnail';
  return {
    ...item,
    currentVersionId: id,
    revision: item.revision + 1,
    updatedAt: now,
    versions: versions.map((v) =>
      v.id === id
        ? {
            ...v,
            review: { at: now, by, reason: SYNC_NOTE, status: 'approved' },
          }
        : v.review.status === 'approved'
          ? { ...v, review: { at: now, by, reason, status: 'rejected' } }
          : v,
    ),
  } as ThumbnailItem;
}

export type SyncLedgerFile = Record<
  string,
  { assetHash?: string; at: string; title?: string }
>;

export function readSyncLedger(path: string): SyncLedgerFile {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as SyncLedgerFile;
}

// Records versions confirmed live so `youtube:update --from-lab` does not
// plan them again. Keeps any title already recorded.
export function recordLive(
  ledger: SyncLedgerFile,
  entries: Array<{ id: string; assetHash: string }>,
  now: string,
): SyncLedgerFile {
  const next = { ...ledger };
  for (const { id, assetHash } of entries)
    next[id] = { ...next[id], assetHash, at: now };
  return next;
}

export function writeSyncLedger(path: string, ledger: SyncLedgerFile) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`);
  renameSync(temporary, path);
}
