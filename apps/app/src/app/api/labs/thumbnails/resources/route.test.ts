import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { producerSession } from '@/lib/producer-session';
import { GET as resource } from './[category]/[file]/route';
import { GET, POST } from './route';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
let directory: string;
let session: ReturnType<typeof spyOn<typeof producerSession, 'getUserId'>>;
const saved = {
  PRODUCER_CLERK_USER_IDS: process.env.PRODUCER_CLERK_USER_IDS,
  THUMBNAIL_LAB_DIR: process.env.THUMBNAIL_LAB_DIR,
  VERCEL: process.env.VERCEL,
};
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'thumbnail-resources-api-'));
  delete process.env.VERCEL;
  process.env.THUMBNAIL_LAB_DIR = directory;
  process.env.PRODUCER_CLERK_USER_IDS = 'user_lab';
  session = spyOn(producerSession, 'getUserId').mockResolvedValue('user_lab');
});
afterEach(async () => {
  session.mockRestore();
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { force: true, recursive: true });
});
const url = 'http://localhost/api/labs/thumbnails/resources';
function upload(body: Uint8Array, name = 'jane.png', category = 'people') {
  const form = new FormData();
  form.set('category', category);
  form.set('file', new File([body.slice()], name));
  return new Request(url, { body: form, method: 'POST' });
}
const context = (category: string, file: string) => ({
  params: Promise.resolve({ category, file }),
});

test('resources are denied to signed-out and non-producer users', async () => {
  for (const user of [null, 'user_other']) {
    session.mockResolvedValue(user);
    const expected = user ? 403 : 401;
    expect((await GET()).status).toBe(expected);
    expect((await POST(upload(PNG))).status).toBe(expected);
    expect(
      (await resource(new Request(url), context('logos', 'a.png'))).status,
    ).toBe(expected);
  }
});
test('an upload is listed and served back', async () => {
  const created = await POST(upload(PNG));
  expect(created.status).toBe(201);
  const body = await (await GET()).json();
  expect(body.resources).toHaveLength(1);
  expect(body.resources[0].label).toBe('Jane');
  const served = await resource(
    new Request(url),
    context('people', 'jane.png'),
  );
  expect(served.status).toBe(200);
  expect(served.headers.get('Content-Type')).toBe('image/png');
  expect(served.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG);
});
test('a non-image upload is rejected', async () => {
  const response = await POST(upload(new TextEncoder().encode('<html>')));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain('PNG, JPEG or WebP');
  expect((await (await GET()).json()).resources).toEqual([]);
});
test('an oversized request is refused before it is read', async () => {
  const response = await POST(
    new Request(url, {
      body: 'x',
      headers: { 'content-length': String(9 * 1024 * 1024) },
      method: 'POST',
    }),
  );
  expect(response.status).toBe(413);
});
test('SVG resources are served inert', async () => {
  const folder = path.join(directory, 'resources', 'brand');
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'mark.svg'), '<svg/>');
  const served = await resource(new Request(url), context('brand', 'mark.svg'));
  expect(served.headers.get('Content-Type')).toBe('image/svg+xml');
  expect(served.headers.get('Content-Security-Policy')).toContain('sandbox');
});
test('bad paths and missing files answer without leaking anything', async () => {
  const bad = await resource(new Request(url), context('..', 'items.png'));
  expect(bad.status).toBe(400);
  const traversal = await resource(
    new Request(url),
    context('logos', '../a.png'),
  );
  expect(traversal.status).toBe(400);
  const missing = await resource(
    new Request(url),
    context('logos', 'gone.png'),
  );
  expect(missing.status).toBe(404);
  expect(await missing.text()).not.toContain(directory);
});
