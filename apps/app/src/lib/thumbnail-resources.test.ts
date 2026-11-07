import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type RedisLike, setRedisClientForTests } from './redis-storage';
import {
  isPublishedResource,
  isResourceFile,
  labelFromFile,
  publishedResourceUrl,
  safeSource,
  sniffImage,
} from './thumbnail-resources';
import {
  addThumbnailResource,
  listThumbnailResources,
  readThumbnailResource,
} from './thumbnail-resources-store';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]);
const WEBP = new TextEncoder().encode('RIFF....WEBPVP8 ');
let directory: string;
const saved = {
  THUMBNAIL_LAB_DIR: process.env.THUMBNAIL_LAB_DIR,
  VERCEL: process.env.VERCEL,
};
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'thumbnail-resources-'));
  process.env.THUMBNAIL_LAB_DIR = directory;
  delete process.env.VERCEL;
});
afterEach(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(directory, { force: true, recursive: true });
});
async function seed(category: string, file: string, manifest?: unknown) {
  const folder = path.join(directory, 'resources', category);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, file), PNG);
  if (manifest !== undefined)
    await writeFile(
      path.join(directory, 'resources', 'manifest.json'),
      JSON.stringify(manifest),
    );
}

test('file names cannot leave their category folder', () => {
  expect(isResourceFile('openai.png')).toBe(true);
  expect(isResourceFile('asterisk-red.svg')).toBe(true);
  for (const bad of ['../items.json', 'a/b.png', '.env.png', 'x.html', 'x'])
    expect(isResourceFile(bad)).toBe(false);
});
test('images are recognised by their bytes, not their names', () => {
  expect(sniffImage(PNG)).toBe('png');
  expect(sniffImage(JPEG)).toBe('jpeg');
  expect(sniffImage(WEBP)).toBe('webp');
  expect(sniffImage(new TextEncoder().encode('<svg onload="x">'))).toBeNull();
});
test('labels come from file names and sources must be web links', () => {
  expect(labelFromFile('grok-bot_v2.png')).toBe('Grok bot v2');
  expect(safeSource('https://x.ai/bot')).toBe('https://x.ai/bot');
  expect(safeSource('javascript:alert(1)')).toBeUndefined();
  expect(safeSource('nope')).toBeUndefined();
});
test('an empty library lists nothing', async () => {
  expect(await listThumbnailResources()).toEqual([]);
});
test('files dropped into a folder appear without a manifest entry', async () => {
  await seed('people', 'jane-doe.jpg', [
    { category: 'logos', file: 'gone.png', label: 'Gone', note: 'Lost.' },
    { category: 'logos', label: 'Placeholder' },
    { category: 'nope', label: 'Dropped' },
    { category: 'people', file: '../evil.png', label: 'Dropped too' },
  ]);
  const resources = await listThumbnailResources();
  expect(resources.map((resource) => resource.label)).toEqual([
    'Gone',
    'Placeholder',
    'Jane doe',
  ]);
  expect(resources[0].url).toBeUndefined();
  expect(resources[0].file).toBeUndefined();
  expect(resources[2].url).toBe(
    '/api/labs/thumbnails/resources/people/jane-doe.jpg',
  );
});
test('adding keeps both files when names collide and records them', async () => {
  const first = await addThumbnailResource({
    bytes: PNG,
    category: 'people',
    filename: 'Jane Doe!.png',
    label: 'Jane',
  });
  const second = await addThumbnailResource({
    bytes: JPEG,
    category: 'people',
    filename: 'jane doe.jpg',
  });
  const third = await addThumbnailResource({
    bytes: PNG,
    category: 'people',
    filename: 'jane doe.png',
  });
  expect([first.file, second.file, third.file]).toEqual([
    'jane-doe.png',
    'jane-doe.jpg',
    'jane-doe-2.png',
  ]);
  const manifest = JSON.parse(
    await readFile(path.join(directory, 'resources', 'manifest.json'), 'utf8'),
  );
  expect(manifest).toHaveLength(3);
  expect(manifest[0].label).toBe('Jane');
  expect(await readThumbnailResource('people', 'jane-doe.png')).toEqual(
    Buffer.from(PNG),
  );
});
test('adding refuses bad input and hosted environments', async () => {
  const add = (over: Partial<Parameters<typeof addThumbnailResource>[0]>) =>
    addThumbnailResource({
      bytes: PNG,
      category: 'logos',
      filename: 'a.png',
      ...over,
    });
  await expect(add({ bytes: new Uint8Array() })).rejects.toThrow('under 8 MB');
  await expect(
    add({ bytes: new Uint8Array(8 * 1024 * 1024 + 1) }),
  ).rejects.toThrow('under 8 MB');
  await expect(
    add({ bytes: new TextEncoder().encode('<svg/>'), filename: 'a.svg' }),
  ).rejects.toThrow('PNG, JPEG or WebP');
  await expect(add({ category: '../..' })).rejects.toThrow('Invalid resource');
  process.env.VERCEL = '1';
  await expect(add({})).rejects.toThrow('local lab');
});
test('reading refuses traversal', async () => {
  await expect(readThumbnailResource('..', 'items.png')).rejects.toThrow(
    'Invalid resource',
  );
  await expect(readThumbnailResource('logos', '../x.png')).rejects.toThrow(
    'Invalid resource',
  );
});

describe('published resources (production manifest)', () => {
  const hash = 'a'.repeat(64);
  test('accepts a CDN entry and builds its URL', () => {
    expect(
      isPublishedResource({
        category: 'people',
        ext: 'jpg',
        hash,
        label: 'Sam Altman',
      }),
    ).toBe(true);
    expect(publishedResourceUrl(hash, 'png')).toBe(
      `https://cdn.shipshit.dev/shipshitshow/resources/${hash}.png`,
    );
  });
  test('refuses a bad hash, extension, category or source', () => {
    for (const entry of [
      { category: 'people', ext: 'jpg', hash: 'abc', label: 'x' },
      { category: 'people', ext: 'gif', hash, label: 'x' },
      { category: 'hosts', ext: 'jpg', hash, label: 'x' },
      {
        category: 'logos',
        ext: 'svg',
        hash,
        label: 'x',
        source: 'javascript:alert(1)',
      },
    ])
      expect(isPublishedResource(entry)).toBe(false);
  });
});

test('production lists the CDN manifest from Redis, never the local folder', async () => {
  const hash = 'b'.repeat(64);
  const saved = { ...process.env };
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'production';
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'token';
  const store: Record<string, unknown> = {
    'sss:production:v1:thumbnail-resources': [
      { category: 'logos', ext: 'svg', hash, label: 'Anthropic' },
      { category: 'logos', ext: 'exe', hash, label: 'Bad' },
    ],
  };
  setRedisClientForTests({
    get: async (key: string) => store[key] ?? null,
  } as unknown as RedisLike);
  try {
    expect(await listThumbnailResources()).toEqual([
      {
        category: 'logos',
        label: 'Anthropic',
        url: publishedResourceUrl(hash, 'svg'),
      },
    ]);
  } finally {
    setRedisClientForTests(null);
    for (const key of [
      'VERCEL',
      'VERCEL_ENV',
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN',
    ])
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
  }
});
