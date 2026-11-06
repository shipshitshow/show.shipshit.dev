import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  appendThumbnailVersion,
  applyThumbnailDecision,
  applyThumbnailTitle,
  awaitingItems,
  awaitingVersions,
  currentThumbnail,
  isThumbnailItem,
  paginate,
  parseThumbnailChange,
  parseThumbnailDecision,
  revisionPrompt,
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
  test('an approved version can be rejected, then reopened', () => {
    const item = fixture(),
      approved = applyThumbnailDecision(
        item,
        { action: 'approve', revision: 0, versionId: item.currentVersionId },
        'owner',
        'now',
      ),
      rejected = applyThumbnailDecision(
        approved,
        { action: 'reject', revision: 1, versionId: approved.currentVersionId },
        'owner',
        'later',
      );
    expect(currentThumbnail(rejected).review.status).toBe('rejected');
    expect(rejected.revision).toBe(2);
    const reopened = applyThumbnailDecision(
      rejected,
      { action: 'reopen', revision: 2, versionId: rejected.currentVersionId },
      'owner',
      'later',
    );
    expect(currentThumbnail(reopened).review.status).toBe('pending');
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
    expect(visibleThumbnail(next, 'all')).toBe(true);
    const review = currentThumbnail(next).review;
    if (review.status !== 'revise') throw Error('Wrong review status');
    expect(review.prompt).toContain('photographic shell');
    expect(review.prompt).toContain('white');
    expect(review.prompt).toContain(item.title);
  });
  test('a title edit leaves versions alone and reviews still parse', () => {
    const item = fixture();
    const decision = {
      action: 'approve' as const,
      revision: 0,
      versionId: item.currentVersionId,
    };
    expect(parseThumbnailChange(decision)).toEqual(decision);
    const approved = applyThumbnailDecision(
      item,
      decision,
      'user_lab',
      '2026-11-05T00:00:00.000Z',
    );
    const renamed = applyThumbnailTitle(
      approved,
      { action: 'title', revision: approved.revision, title: 'Shorter' },
      '2026-11-05T00:00:01.000Z',
    );
    expect(renamed.title).toBe('Shorter');
    expect(renamed.versions).toEqual(approved.versions);
    expect(renamed.revision).toBe(approved.revision + 1);
    expect(() =>
      applyThumbnailTitle(
        renamed,
        { action: 'title', revision: approved.revision, title: 'Stale' },
        '2026-11-05T00:00:02.000Z',
      ),
    ).toThrow(ThumbnailConflict);
    expect(() =>
      parseThumbnailChange({ action: 'title', revision: 0, title: ' ' }),
    ).toThrow('Add a title of 1–100 characters.');
  });

  test('reopening an approved version unlocks it for a new decision', () => {
    const item = fixture(),
      versionId = item.currentVersionId,
      approved = applyThumbnailDecision(
        item,
        { action: 'approve', revision: 0, versionId },
        'owner',
        'then',
      ),
      reopened = applyThumbnailDecision(
        approved,
        parseThumbnailDecision({ action: 'reopen', revision: 1, versionId }),
        'owner',
        'now',
      );
    expect(currentThumbnail(reopened).review).toEqual({ status: 'pending' });
    expect(reopened.revision).toBe(2);
    expect(visibleThumbnail(reopened, 'pending')).toBe(true);
    const revised = applyThumbnailDecision(
      reopened,
      { action: 'revise', feedback: 'change', revision: 2, versionId },
      'owner',
      'now',
    );
    expect(currentThumbnail(revised).review.status).toBe('revise');
  });
  test('only an approved version can be reopened, current or not', () => {
    const item = fixture(),
      versionId = item.currentVersionId,
      reopen = (target: ThumbnailItem, revision: number, id = versionId) =>
        applyThumbnailDecision(
          target,
          { action: 'reopen', revision, versionId: id },
          'owner',
          'now',
        );
    expect(() => reopen(item, 0)).toThrow('Only an approved');
    const approved = applyThumbnailDecision(
      item,
      { action: 'approve', revision: 0, versionId },
      'owner',
      'now',
    );
    expect(() => reopen(approved, 0)).toThrow(ThumbnailConflict);
    const next = appendThumbnailVersion(
      approved,
      {
        ...currentThumbnail(item),
        assetHash: 'b'.repeat(64),
        id: 'b'.repeat(64),
        review: { status: 'pending' },
      },
      1,
    );
    // The older approved version is no longer current but can still be reopened.
    const reopened = reopen(next, next.revision);
    expect(reopened.versions[0]?.review).toEqual({ status: 'pending' });
    expect(reopened.currentVersionId).toBe('b'.repeat(64));
  });
  test('every version can be approved or revised, and approval makes it current', () => {
    const first = fixture(),
      second = 'b'.repeat(64),
      third = 'c'.repeat(64),
      base = first.versions[0];
    if (!base) throw new Error('fixture has no version');
    const item: ThumbnailItem = {
      ...first,
      versions: [
        base,
        { ...base, assetHash: second, id: second, prompt: 'Second prompt.' },
        { ...base, assetHash: third, id: third, prompt: 'Third prompt.' },
      ],
    };
    expect(awaitingVersions(item)).toHaveLength(3);
    const revised = applyThumbnailDecision(
      item,
      { action: 'revise', feedback: 'No logos', revision: 0, versionId: third },
      'owner',
      'now',
    );
    // A revision on a non-current version keeps the current one and uses that version's prompt.
    expect(revised.currentVersionId).toBe(item.currentVersionId);
    const review = revised.versions[2]?.review;
    expect(review?.status).toBe('revise');
    if (review?.status !== 'revise') throw new Error('expected a revision');
    expect(review.prompt).toContain('Previous prompt: Third prompt.');
    expect(revised.versions[0]?.review.status).toBe('pending');
    expect(awaitingVersions(revised)).toHaveLength(2);
    const approved = applyThumbnailDecision(
      revised,
      { action: 'approve', revision: 1, versionId: second },
      'owner',
      'now',
    );
    expect(approved.currentVersionId).toBe(second);
    expect(currentThumbnail(approved).review.status).toBe('approved');
    expect(revised.currentVersionId).toBe(item.currentVersionId);
    // Approving one variation rejects the rest, so nothing is left to review.
    expect(approved.versions.map((v) => v.review.status)).toEqual([
      'rejected',
      'approved',
      'rejected',
    ]);
    expect(visibleThumbnail(approved, 'pending')).toBe(false);
    expect(visibleThumbnail(approved, 'all')).toBe(true);
    expect(() =>
      applyThumbnailDecision(
        approved,
        { action: 'approve', revision: 2, versionId: second },
        'owner',
        'now',
      ),
    ).toThrow('locked');
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
function variations(): ThumbnailItem {
  const first = fixture(),
    base = first.versions[0];
  if (!base) throw new Error('fixture has no version');
  const ids = ['b'.repeat(64), 'c'.repeat(64)];
  return {
    ...first,
    versions: [base, ...ids.map((id) => ({ ...base, assetHash: id, id }))],
  };
}
describe('rejecting and locking variations', () => {
  test('a rejected version leaves the review queue and can be reopened', () => {
    const item = variations(),
      versionId = 'b'.repeat(64),
      rejected = applyThumbnailDecision(
        item,
        parseThumbnailDecision({
          action: 'reject',
          reason: '  Too busy  ',
          revision: 0,
          versionId,
        }),
        'owner',
        'now',
      );
    expect(rejected.versions[1]?.review).toEqual({
      at: 'now',
      by: 'owner',
      reason: 'Too busy',
      status: 'rejected',
    });
    expect(awaitingVersions(rejected)).toHaveLength(2);
    expect(rejected.currentVersionId).toBe(item.currentVersionId);
    // A rejected version cannot be decided on until it is reopened.
    expect(() =>
      applyThumbnailDecision(
        rejected,
        { action: 'approve', revision: 1, versionId },
        'owner',
        'now',
      ),
    ).toThrow('Reopen it first');
    const reopened = applyThumbnailDecision(
      rejected,
      { action: 'reopen', revision: 1, versionId },
      'owner',
      'now',
    );
    expect(reopened.versions[1]?.review).toEqual({ status: 'pending' });
  });
  test('a reason is optional and bounded', () => {
    const decision = parseThumbnailDecision({
      action: 'reject',
      revision: 0,
      versionId: 'a'.repeat(64),
    });
    expect(decision).toEqual({
      action: 'reject',
      revision: 0,
      versionId: 'a'.repeat(64),
    });
    expect(() =>
      parseThumbnailDecision({
        action: 'reject',
        reason: 'x'.repeat(4001),
        revision: 0,
        versionId: 'a'.repeat(64),
      }),
    ).toThrow();
  });
  test('approving one version rejects every other variation in the same write', () => {
    const item = variations(),
      winner = 'c'.repeat(64),
      approved = applyThumbnailDecision(
        item,
        { action: 'approve', revision: 0, versionId: winner },
        'owner',
        'now',
      );
    expect(approved.currentVersionId).toBe(winner);
    expect(approved.revision).toBe(1);
    expect(approved.versions.map((v) => v.review.status)).toEqual([
      'rejected',
      'rejected',
      'approved',
    ]);
    expect(awaitingVersions(approved)).toHaveLength(0);
    expect(visibleThumbnail(approved, 'pending')).toBe(false);
    // Reopening any rejected variation brings it back for review.
    const back = applyThumbnailDecision(
      approved,
      { action: 'reopen', revision: 1, versionId: item.currentVersionId },
      'owner',
      'now',
    );
    expect(back.versions[0]?.review).toEqual({ status: 'pending' });
    expect(back.versions[2]?.review.status).toBe('approved');
  });
  test('a later approval supersedes an earlier one: exactly one approved version', () => {
    const first = applyThumbnailDecision(
        variations(),
        { action: 'approve', revision: 0, versionId: 'b'.repeat(64) },
        'owner',
        'then',
      ),
      reopened = applyThumbnailDecision(
        first,
        { action: 'reopen', revision: 1, versionId: 'c'.repeat(64) },
        'owner',
        'then',
      ),
      second = applyThumbnailDecision(
        reopened,
        { action: 'approve', revision: 2, versionId: 'c'.repeat(64) },
        'owner',
        'now',
      );
    const approved = second.versions.filter(
      (v) => v.review.status === 'approved',
    );
    expect(approved.map((v) => v.id)).toEqual(['c'.repeat(64)]);
    expect(second.currentVersionId).toBe('c'.repeat(64));
  });
  test('the review queue counts videos, not variations', () => {
    const many = variations(),
      done = applyThumbnailDecision(
        { ...variations(), id: 'dQw4w9WgXcQ' },
        { action: 'approve', revision: 0, versionId: 'b'.repeat(64) },
        'owner',
        'now',
      );
    expect(many.versions.length).toBe(3);
    expect(awaitingItems([many, done])).toEqual([many]);
  });
  test('YouTube-live versions are a valid source', () => {
    const item = variations(),
      live = { ...item.versions[0], source: 'youtube-live' };
    expect(isThumbnailItem({ ...item, versions: [live] })).toBe(true);
    expect(
      isThumbnailItem({ ...item, versions: [{ ...live, source: 'nope' }] }),
    ).toBe(false);
  });
});
describe('thumbnail pagination', () => {
  const list = Array.from({ length: 50 }, (_, i) => i);
  test('pages of 24, clamped into range', () => {
    expect(paginate(list, 1).items).toHaveLength(24);
    expect(paginate(list, 3).items).toEqual([48, 49]);
    expect(paginate(list, 3)).toMatchObject({
      page: 3,
      pageCount: 3,
      total: 50,
    });
    expect(paginate(list, 99).page).toBe(3);
    expect(paginate(list, 0).page).toBe(1);
    expect(paginate([], 1)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
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
    // Shared placement table: 144px at x1680/y96 on 1920x1080.
    const sample = (left: number, top: number) =>
        sharp(output.bytes)
          .extract({ height: 1, left, top, width: 1 })
          .raw()
          .toBuffer(),
      expected = format === 'video' ? [255, 255, 255] : [232, 59, 59],
      centre = await sample(1752, 168),
      bottomArm = await sample(1752, 228),
      aboveBox = await sample(1776, 80);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs((centre[i] ?? 0) - (expected[i] ?? 0))).toBeLessThan(5);
      expect(Math.abs((bottomArm[i] ?? 0) - (expected[i] ?? 0))).toBeLessThan(
        5,
      );
      expect(Math.abs((aboveBox[i] ?? 0) - 0x22)).toBeLessThan(5);
    }
  }
});

test('a Short gets the red 120px star at its own position, in portrait', async () => {
  const source = await sharp({
    create: { background: '#222222', channels: 3, height: 640, width: 360 },
  })
    .png()
    .toBuffer();
  const { bytes } = await renderThumbnail(source, 'short');
  const meta = await sharp(bytes).metadata();
  expect([meta.width, meta.height]).toEqual([1080, 1920]);
  const pixel = async (left: number, top: number) => [
    ...(await sharp(bytes)
      .extract({ height: 1, left, top, width: 1 })
      .raw()
      .toBuffer()),
  ];
  for (const [left, top] of [
    [940, 290],
    [940, 340],
    [940, 240],
    [897, 258],
  ] as const) {
    const [r, g, b] = await pixel(left, top);
    expect(Math.abs(r! - 0xe8)).toBeLessThan(5);
    expect(Math.abs(g! - 0x3b)).toBeLessThan(5);
    expect(Math.abs(b! - 0x3b)).toBeLessThan(5);
  }
  expect(Math.abs((await pixel(964, 220))[0]! - 0x22)).toBeLessThan(5);
});

test('each format refuses the other orientation', async () => {
  const image = (width: number, height: number) =>
    sharp({
      create: { background: '#222222', channels: 3, height, width },
    })
      .png()
      .toBuffer();
  await expect(renderThumbnail(await image(640, 360), 'short')).rejects.toThrow(
    'Upload 9:16',
  );
  await expect(renderThumbnail(await image(360, 640), 'video')).rejects.toThrow(
    'Upload 16:9',
  );
});

test('a stored Short is valid and its revision prompt is portrait', () => {
  const item = { ...fixture(), format: 'short' as const };
  expect(isThumbnailItem(item)).toBe(true);
  const prompt = revisionPrompt(item, 'Bigger hero.');
  expect(prompt).toContain('9:16 YouTube Shorts cover');
  expect(prompt).toContain('x940/y290');
  expect(prompt).not.toContain('linked');
});
