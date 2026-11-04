import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  appendThumbnailVersion,
  applyThumbnailDecision,
  currentThumbnail,
  isThumbnailItem,
  parseThumbnailDecision,
  ThumbnailConflict,
  type ThumbnailItem,
  thumbnailCdnUrl,
  visibleThumbnail,
} from './thumbnail-lab';
import { renderThumbnail } from './thumbnail-lab-assets';
import {
  getThumbnailItem,
  listThumbnailItems,
  saveThumbnailItem,
  saveThumbnailItems,
} from './thumbnail-lab-store';

function fixture(id = 'WJJZHyhlAuI'): ThumbnailItem {
  const hash = 'a'.repeat(64);
  return {
    currentVersionId: hash,
    format: 'video',
    id,
    pairIds: [],
    position: 0,
    revision: 0,
    title: 'OpenClaw on Discord',
    updatedAt: '2026-11-04T00:00:00Z',
    versions: [
      {
        assetHash: hash,
        createdAt: '2026-11-04T00:00:00Z',
        id: hash,
        legacyRevision: 'r1',
        prompt: 'One lobster and Discord.',
        review: { status: 'pending' },
        source: 'import',
      },
    ],
    visibility: 'unlisted',
  };
}
describe('thumbnail review contract', () => {
  test('approval locks only the exact version; a new variation preserves it', () => {
    const item = fixture(),
      approved = applyThumbnailDecision(
        item,
        { action: 'approve', revision: 0, versionId: item.currentVersionId },
        'owner',
        'now',
      );
    expect(currentThumbnail(item).review.status).toBe('pending');
    expect(() =>
      applyThumbnailDecision(
        approved,
        {
          action: 'revise',
          feedback: 'change',
          revision: 1,
          versionId: approved.currentVersionId,
        },
        'owner',
        'now',
      ),
    ).toThrow('locked');
    const version = {
      ...currentThumbnail(item),
      assetHash: 'b'.repeat(64),
      id: 'b'.repeat(64),
    };
    const next = appendThumbnailVersion(approved, version, 1);
    expect(next.versions[0]?.review.status).toBe('approved');
    expect(currentThumbnail(next).review.status).toBe('pending');
  });
  test('revision requests leave the review queue and carry a useful prompt', () => {
    const item = fixture(),
      next = applyThumbnailDecision(
        item,
        {
          action: 'revise',
          feedback: 'Use photographic shell detail.',
          revision: 0,
          versionId: item.currentVersionId,
        },
        'owner',
        'now',
      );
    expect(visibleThumbnail(next, 'pending')).toBe(false);
    expect(visibleThumbnail(next, 'revise')).toBe(true);
    const review = currentThumbnail(next).review;
    if (review.status !== 'revise') throw Error('Wrong review status');
    expect(review.prompt).toContain('photographic shell');
    expect(review.prompt).toContain('white');
    expect(review.prompt).toContain(item.title);
  });
  test('stale versions and untrusted decisions are refused', () => {
    const item = fixture();
    expect(() =>
      applyThumbnailDecision(
        item,
        { action: 'approve', revision: 0, versionId: 'b'.repeat(64) },
        'owner',
        'now',
      ),
    ).toThrow(ThumbnailConflict);
    expect(() =>
      parseThumbnailDecision({
        action: 'revise',
        feedback: ' ',
        revision: 0,
        versionId: item.currentVersionId,
      }),
    ).toThrow();
    expect(isThumbnailItem({ ...item, pairIds: ['../secret'] })).toBe(false);
    expect(thumbnailCdnUrl(item, currentThumbnail(item))).toBe(
      'https://cdn.shipshit.dev/shipshitshow/thumbnails/' +
        item.id +
        '/' +
        item.currentVersionId +
        '.jpg',
    );
  });
});
describe('durable thumbnail decisions', () => {
  let directory: string;
  const saved = {
    PRODUCER_STORAGE: process.env.PRODUCER_STORAGE,
    THUMBNAIL_LAB_DIR: process.env.THUMBNAIL_LAB_DIR,
    VERCEL: process.env.VERCEL,
  };
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'thumbnail-lab-'));
    delete process.env.VERCEL;
    delete process.env.PRODUCER_STORAGE;
    process.env.THUMBNAIL_LAB_DIR = directory;
  });
  afterEach(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { force: true, recursive: true });
  });
  test('saved decisions survive reads and cannot be overwritten by a stale batch', async () => {
    const a = fixture(),
      b = fixture('ashs_xXPwE8');
    await saveThumbnailItems([
      { expectedRevision: -1, item: a },
      { expectedRevision: -1, item: b },
    ]);
    const approved = applyThumbnailDecision(
      a,
      { action: 'approve', revision: 0, versionId: a.currentVersionId },
      'owner',
      'now',
    );
    await saveThumbnailItem(approved, 0);
    expect(
      currentThumbnail((await getThumbnailItem(a.id))!).review.status,
    ).toBe('approved');
    await expect(
      saveThumbnailItems([
        { expectedRevision: 0, item: a },
        { expectedRevision: 0, item: { ...b, title: 'Should not save' } },
      ]),
    ).rejects.toBeInstanceOf(ThumbnailConflict);
    expect((await getThumbnailItem(b.id))?.title).toBe(b.title);
    expect((await listThumbnailItems()).length).toBe(2);
  });
  test('simultaneous reviews do not lose an approval', async () => {
    const item = fixture();
    await saveThumbnailItem(item, -1);
    const approved = applyThumbnailDecision(
      item,
      { action: 'approve', revision: 0, versionId: item.currentVersionId },
      'owner',
      'now',
    );
    const revision = applyThumbnailDecision(
      item,
      {
        action: 'revise',
        feedback: 'Simplify',
        revision: 0,
        versionId: item.currentVersionId,
      },
      'owner',
      'now',
    );
    const results = await Promise.allSettled([
      saveThumbnailItem(approved, 0),
      saveThumbnailItem(revision, 0),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect((await getThumbnailItem(item.id))?.revision).toBe(1);
  });
});
test('new artwork gets the exact format-specific star and upload dimensions', async () => {
  const input = await sharp({
    create: { background: '#222222', channels: 3, height: 360, width: 640 },
  })
    .png()
    .toBuffer();
  for (const format of ['video', 'live'] satisfies Array<'video' | 'live'>) {
    const output = await renderThumbnail(input, format),
      decoded = sharp(output.bytes),
      metadata = await decoded.metadata();
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
    expect(output.bytes.length).toBeLessThan(2_000_000);
    const pixel = await decoded
        .extract({ height: 1, left: 1776, top: 144, width: 1 })
        .raw()
        .toBuffer(),
      expected = format === 'video' ? [255, 255, 255] : [232, 59, 59];
    for (let i = 0; i < 3; i++)
      expect(Math.abs((pixel[i] ?? 0) - (expected[i] ?? 0))).toBeLessThan(5);
  }
});
