import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { producerSession } from '@/lib/producer-session';
import { currentThumbnail, type ThumbnailItem } from '@/lib/thumbnail-lab';
import { uploadThumbnailAsset } from '@/lib/thumbnail-lab-assets';
import { getThumbnailItem, saveThumbnailItem } from '@/lib/thumbnail-lab-store';
import { GET as asset } from './[videoId]/assets/[hash]/route';
import { PATCH, POST } from './[videoId]/route';
import { GET as exportReview, POST as importReview } from './reviews/route';
import { GET, POST as importCatalogue } from './route';

let directory: string;
const saved = {
  PRODUCER_CLERK_USER_IDS: process.env.PRODUCER_CLERK_USER_IDS,
  PRODUCER_STORAGE: process.env.PRODUCER_STORAGE,
  THUMBNAIL_LAB_DIR: process.env.THUMBNAIL_LAB_DIR,
  THUMBNAIL_LAB_USE_CDN: process.env.THUMBNAIL_LAB_USE_CDN,
  VERCEL: process.env.VERCEL,
};
let session: ReturnType<typeof spyOn<typeof producerSession, 'getUserId'>>;
const id = 'WJJZHyhlAuI',
  hash = 'a'.repeat(64),
  context = { params: Promise.resolve({ videoId: id }) };
function fixture(): ThumbnailItem {
  return {
    currentVersionId: hash,
    format: 'video',
    id,
    pairIds: [],
    position: 0,
    revision: 0,
    title: 'OpenClaw on Discord',
    updatedAt: 'now',
    versions: [
      {
        assetHash: hash,
        createdAt: 'now',
        id: hash,
        legacyRevision: 'r1',
        prompt: 'Purple Discord and claw.',
        review: { status: 'pending' },
        source: 'import',
      },
    ],
    visibility: 'unlisted',
  };
}
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'thumbnail-api-'));
  delete process.env.VERCEL;
  delete process.env.PRODUCER_STORAGE;
  delete process.env.THUMBNAIL_LAB_USE_CDN;
  process.env.THUMBNAIL_LAB_DIR = directory;
  process.env.PRODUCER_CLERK_USER_IDS = 'user_lab';
  session = spyOn(producerSession, 'getUserId').mockResolvedValue('user_lab');
  await saveThumbnailItem(fixture(), -1);
});
afterEach(async () => {
  session.mockRestore();
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { force: true, recursive: true });
});
test('private catalogue and asset routes deny signed-out and non-producer users', async () => {
  session.mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect(
    (
      await PATCH(
        new Request('https://show.test', { method: 'PATCH' }),
        context,
      )
    ).status,
  ).toBe(401);
  expect(
    (await POST(new Request('https://show.test', { method: 'POST' }), context))
      .status,
  ).toBe(401);
  expect(
    (
      await asset(new Request('https://show.test'), {
        params: Promise.resolve({ hash, videoId: id }),
      })
    ).status,
  ).toBe(401);
  session.mockResolvedValue('user_other');
  expect((await GET()).status).toBe(403);
});
test('approval saves on the server and stale writes return conflict', async () => {
  expect((await GET()).status).toBe(200);
  const request = () =>
    new Request('https://show.test', {
      body: JSON.stringify({ action: 'approve', revision: 0, versionId: hash }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
  expect((await PATCH(request(), context)).status).toBe(200);
  expect(currentThumbnail((await getThumbnailItem(id))!).review.status).toBe(
    'approved',
  );
  expect((await PATCH(request(), context)).status).toBe(409);
});
test('a reopened thumbnail can be decided again and a stale reopen conflicts', async () => {
  const patch = (action: string, revision: number) =>
    PATCH(
      new Request('https://show.test', {
        body: JSON.stringify({ action, revision, versionId: hash }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      context,
    );
  expect((await patch('approve', 0)).status).toBe(200);
  expect((await patch('reopen', 1)).status).toBe(200);
  expect(currentThumbnail((await getThumbnailItem(id))!).review.status).toBe(
    'pending',
  );
  expect((await patch('reopen', 1)).status).toBe(409);
  expect((await patch('approve', 2)).status).toBe(200);
});
test('a title edit survives approval, keeps the review and refuses stale or bad input', async () => {
  const request = (body: unknown) =>
    new Request('https://show.test', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
  const approve = { action: 'approve', revision: 0, versionId: hash };
  expect((await PATCH(request(approve), context)).status).toBe(200);
  const edit = { action: 'title', revision: 1, title: '  Claw on Discord  ' };
  expect((await PATCH(request(edit), context)).status).toBe(200);
  const saved = (await getThumbnailItem(id))!;
  expect(saved.title).toBe('Claw on Discord');
  expect(saved.revision).toBe(2);
  expect(currentThumbnail(saved).review.status).toBe('approved');
  expect(
    (await PATCH(request({ ...edit, title: 'Stale' }), context)).status,
  ).toBe(409);
  for (const title of ['   ', 'x'.repeat(101)])
    expect(
      (await PATCH(request({ ...edit, revision: 2, title }), context)).status,
    ).toBe(400);
  expect((await getThumbnailItem(id))!.title).toBe('Claw on Discord');
});

test('a bad imported review cannot partially save earlier decisions', async () => {
  const body = {
    appId: 'shipshitshow-thumbnail-review',
    catalogueId: '2026-11-04',
    decisions: [
      { assetHash: hash, id, revision: 'r1', status: 'approved' },
      { assetHash: hash, id: 'unknown', revision: 'r1', status: 'approved' },
    ],
    schemaVersion: 1,
  };
  const response = await importReview(
    new Request('https://show.test', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }),
  );
  expect(response.status).toBe(400);
  expect(currentThumbnail((await getThumbnailItem(id))!).review.status).toBe(
    'pending',
  );
});
test('a variation is composed and persisted without changing approved history', async () => {
  const approve = new Request('https://show.test', {
    body: JSON.stringify({ action: 'approve', revision: 0, versionId: hash }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });
  await PATCH(approve, context);
  const source = await sharp({
    create: { background: '#333333', channels: 3, height: 360, width: 640 },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set(
    'artwork',
    new File([new Uint8Array(source)], 'source.png', { type: 'image/png' }),
  );
  form.set('revision', '1');
  form.set('prompt', 'One purple Discord symbol.');
  const response = await POST(
    new Request('https://show.test', { body: form, method: 'POST' }),
    context,
  );
  expect(response.status).toBe(201);
  const item = (await getThumbnailItem(id))!;
  expect(item.versions.length).toBe(2);
  expect(item.versions[0]?.review.status).toBe('approved');
  expect(currentThumbnail(item).review.status).toBe('pending');
  const download = await asset(new Request('https://show.test?download=1'), {
    params: Promise.resolve({ hash: item.currentVersionId, videoId: id }),
  });
  expect(download.status).toBe(200);
  expect(download.headers.get('Content-Type')).toBe('image/jpeg');
  expect(download.headers.get('Content-Disposition')).toContain(id);
});

test('a stale export cannot overwrite newer feedback on the same artwork', async () => {
  async function revise(feedback: string, revision: number) {
    return PATCH(
      new Request('https://show.test', {
        body: JSON.stringify({
          action: 'revise',
          feedback,
          revision,
          versionId: hash,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      context,
    );
  }
  expect((await revise('Keep Discord purple.', 0)).status).toBe(200);
  const snapshot: unknown = await (await exportReview()).json();
  expect((await revise('Make the claw bigger.', 1)).status).toBe(200);
  const response = await importReview(
    new Request('https://show.test', {
      body: JSON.stringify(snapshot),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }),
  );
  expect(response.status).toBe(409);
  const review = currentThumbnail((await getThumbnailItem(id))!).review;
  expect(review.status).toBe('revise');
  if (review.status === 'revise')
    expect(review.feedback).toBe('Make the claw bigger.');
});

test('catalogue import verifies assets and preserves existing approved decisions', async () => {
  await PATCH(
    new Request('https://show.test', {
      body: JSON.stringify({ action: 'approve', revision: 0, versionId: hash }),
      method: 'PATCH',
    }),
    context,
  );
  const data = await sharp({
    create: { background: '#333333', channels: 3, height: 1080, width: 1920 },
  })
    .jpeg()
    .toBuffer();
  const assetHash = createHash('sha256').update(data).digest('hex');
  const fresh: ThumbnailItem = {
    ...fixture(),
    currentVersionId: assetHash,
    id: 'ashs_xXPwE8',
    pairIds: [id],
    versions: [{ ...fixture().versions[0]!, assetHash, id: assetHash }],
  };
  const request = () =>
    new Request('https://show.test', {
      body: JSON.stringify({
        catalogueId: 'shipshitshow-thumbnails',
        importedAt: 'now',
        items: [fixture(), fresh],
        schemaVersion: 1,
      }),
      method: 'POST',
    });
  expect((await importCatalogue(request())).status).toBe(400);
  expect(await getThumbnailItem(fresh.id)).toBeNull();
  await uploadThumbnailAsset(fresh.id, assetHash, data);
  expect((await importCatalogue(request())).status).toBe(200);
  expect(currentThumbnail((await getThumbnailItem(id))!).review.status).toBe(
    'approved',
  );
  expect((await getThumbnailItem(fresh.id))?.versions[0]?.assetHash).toBe(
    assetHash,
  );
  expect((await importCatalogue(request())).status).toBe(200);
});
