import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ThumbnailItem, ThumbnailVersion } from './thumbnail-lab';
import {
  decideLiveSync,
  readSyncLedger,
  recordLive,
  syncedItem,
  writeSyncLedger,
} from './thumbnail-lab-sync';

type Status = 'approved' | 'pending' | 'rejected';
function version(id: string, createdAt: string, status: Status) {
  return {
    assetHash: id,
    createdAt,
    id,
    legacyRevision: null,
    prompt: '',
    review:
      status === 'pending' ? { status } : { at: createdAt, by: 'test', status },
    source: 'upload',
  } as ThumbnailVersion;
}
function item(current: string, versions: ThumbnailVersion[]) {
  return {
    currentVersionId: current,
    format: 'video',
    id: 'abcdefghijk',
    pairIds: [],
    position: 0,
    revision: 3,
    title: 'T',
    updatedAt: '2026-11-01T00:00:00.000Z',
    versions,
    visibility: 'public',
  } as ThumbnailItem;
}

const old = version('old', '2026-11-01T00:00:00.000Z', 'approved');
const picked = version('picked', '2026-11-05T00:00:00.000Z', 'approved');

describe('decideLiveSync', () => {
  test('an approved version that is not live yet stays pending push', () => {
    const decision = decideLiveSync(
      item('picked', [old, picked]),
      { id: 'old', score: 2 },
      null,
    );
    expect(decision).toEqual({ kind: 'pending-push', versionId: 'picked' });
  });

  test('pending push also holds when the live thumbnail matches nothing', () => {
    const decision = decideLiveSync(
      item('picked', [old, picked]),
      { id: 'old', score: 80 },
      null,
    );
    expect(decision.kind).toBe('pending-push');
  });

  test('a version already pushed is not pending, live wins when it differs', () => {
    const decision = decideLiveSync(
      item('picked', [old, picked]),
      { id: 'old', score: 2 },
      'picked',
    );
    expect(decision).toEqual({ kind: 'matched', score: 2, versionId: 'old' });
  });

  test('a current version already pushed yields to a different live match', () => {
    const decision = decideLiveSync(
      item('old', [old, picked]),
      { id: 'picked', score: 1 },
      'old',
    );
    expect(decision).toEqual({
      kind: 'matched',
      score: 1,
      versionId: 'picked',
    });
  });

  test('a current version that is not approved never counts as pending', () => {
    const revise = version('picked', '2026-11-05T00:00:00.000Z', 'pending');
    const decision = decideLiveSync(
      item('picked', [old, revise]),
      { id: 'old', score: 2 },
      null,
    );
    expect(decision.kind).toBe('matched');
  });

  test('current approved and live with a single approval is in sync', () => {
    const decision = decideLiveSync(
      item('old', [old]),
      { id: 'old', score: 0.4 },
      null,
    );
    expect(decision).toEqual({ kind: 'in-sync', versionId: 'old' });
  });

  test('live matching nothing and nothing pending adds a live version', () => {
    const decision = decideLiveSync(
      item('old', [old]),
      { id: 'old', score: 90 },
      'old',
    );
    expect(decision).toEqual({ closest: 90, kind: 'added' });
  });
});

describe('syncedItem', () => {
  test('makes the live version current and rejects other approvals', () => {
    const next = syncedItem(
      item('picked', [old, picked]),
      [old, picked],
      'old',
      '2026-11-06T00:00:00.000Z',
      'sync',
    );
    expect(next.currentVersionId).toBe('old');
    expect(next.revision).toBe(4);
    expect(next.versions.map((v) => v.review.status)).toEqual([
      'approved',
      'rejected',
    ]);
  });
});

describe('sync ledger', () => {
  test('records live versions and keeps recorded titles', () => {
    const next = recordLive(
      { abcdefghijk: { at: 'x', title: 'Kept' } },
      [
        { assetHash: 'h1', id: 'abcdefghijk' },
        { assetHash: 'h2', id: 'bcdefghijkl' },
      ],
      'now',
    );
    expect(next.abcdefghijk).toEqual({
      assetHash: 'h1',
      at: 'now',
      title: 'Kept',
    });
    expect(next.bcdefghijkl).toEqual({ assetHash: 'h2', at: 'now' });
  });

  test('writes the ledger atomically and reads it back', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'sync-ledger-'));
    try {
      const file = path.join(dir, 'youtube-sync.json');
      expect(readSyncLedger(file)).toEqual({});
      writeSyncLedger(file, { abcdefghijk: { assetHash: 'h', at: 'now' } });
      expect(readSyncLedger(file).abcdefghijk?.assetHash).toBe('h');
      expect(readFileSync(file, 'utf8').endsWith('\n')).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
