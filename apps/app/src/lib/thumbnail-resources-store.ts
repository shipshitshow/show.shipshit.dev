import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getProducerStorageBackend } from './producer-storage';
import { readRedisJson, redisKey } from './redis-storage';
import { assetDirectory } from './thumbnail-lab-assets';
import {
  isPublishedResource,
  isResourceCategory,
  isResourceFile,
  labelFromFile,
  type PublishedResource,
  publishedResourceUrl,
  RESOURCE_CATEGORIES,
  RESOURCE_MAX_BYTES,
  type ResourceCategory,
  resourceUrl,
  safeSource,
  sniffImage,
  type ThumbnailResource,
} from './thumbnail-resources';

function resourceDirectory() {
  return path.join(assetDirectory(), 'resources');
}
function isMissing(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}
async function readManifest(): Promise<ThumbnailResource[]> {
  const raw = await readFile(
    path.join(resourceDirectory(), 'manifest.json'),
    'utf8',
  ).catch((error) => {
    if (isMissing(error)) return '[]';
    throw error;
  });
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Invalid resource manifest.');
  return parsed.flatMap((entry) => {
    const { category, file, label, note, source } = entry ?? {};
    if (!isResourceCategory(category) || typeof label !== 'string') return [];
    if (file !== undefined && !isResourceFile(file)) return [];
    return [
      {
        category,
        label,
        ...(file ? { file } : {}),
        ...(typeof note === 'string' ? { note } : {}),
        ...(safeSource(source) ? { source } : {}),
      },
    ];
  });
}
async function filesIn(category: ResourceCategory): Promise<string[]> {
  const names = await readdir(path.join(resourceDirectory(), category)).catch(
    (error) => {
      if (isMissing(error)) return [] as string[];
      throw error;
    },
  );
  return names.filter(isResourceFile).sort();
}
/** The production manifest: every asset pushed to the CDN from a local lab. */
export const publishedResourcesKey = () => redisKey('thumbnail-resources');

async function listPublishedResources(): Promise<ThumbnailResource[]> {
  const raw = await readRedisJson<unknown>(publishedResourcesKey());
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isPublishedResource)
    .map(({ ext, hash, ...entry }: PublishedResource) => ({
      ...entry,
      url: publishedResourceUrl(hash, ext),
    }));
}

/** Production reads the CDN manifest in Redis; a local lab reads its folder. */
export async function listThumbnailResources(): Promise<ThumbnailResource[]> {
  const backend = getProducerStorageBackend();
  if (backend === 'filesystem') return listLocalThumbnailResources();
  return backend === 'redis' ? listPublishedResources() : [];
}

export async function listLocalThumbnailResources(): Promise<
  ThumbnailResource[]
> {
  const manifest = await readManifest();
  const resources: ThumbnailResource[] = [];
  for (const category of RESOURCE_CATEGORIES) {
    const onDisk = await filesIn(category);
    const named = manifest.filter((entry) => entry.category === category);
    for (const entry of named) {
      const present = entry.file && onDisk.includes(entry.file);
      const { file: _file, ...rest } = entry;
      resources.push(
        present && entry.file
          ? { ...entry, url: resourceUrl(category, entry.file) }
          : rest,
      );
    }
    const known = new Set(named.map((entry) => entry.file));
    for (const file of onDisk) {
      if (known.has(file)) continue;
      resources.push({
        category,
        file,
        label: labelFromFile(file),
        url: resourceUrl(category, file),
      });
    }
  }
  return resources;
}
export function localResourcePath(category: ResourceCategory, file: string) {
  return path.join(resourceDirectory(), category, file);
}
export async function readThumbnailResource(
  category: string,
  file: string,
): Promise<Buffer> {
  if (!isResourceCategory(category) || !isResourceFile(file))
    throw new Error('Invalid resource.');
  return readFile(path.join(resourceDirectory(), category, file));
}
function slug(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'resource'
  );
}
async function claimFile(
  directory: string,
  base: string,
  extension: string,
  bytes: Uint8Array,
): Promise<string> {
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const file = `${base}${attempt === 1 ? '' : `-${attempt}`}.${extension}`;
    try {
      await writeFile(path.join(directory, file), bytes, { flag: 'wx' });
      return file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Too many resources share that name.');
}
export async function addThumbnailResource({
  bytes,
  category,
  filename,
  label,
}: {
  bytes: Uint8Array;
  category: string;
  filename: string;
  label?: string;
}): Promise<ThumbnailResource> {
  if (process.env.VERCEL)
    throw new Error('Resources can only be added on a local lab.');
  if (!isResourceCategory(category)) throw new Error('Invalid resource.');
  if (bytes.length === 0 || bytes.length > RESOURCE_MAX_BYTES)
    throw new Error('Resources must be under 8 MB.');
  const kind = sniffImage(bytes);
  if (!kind) throw new Error('Resources must be PNG, JPEG or WebP images.');
  const directory = path.join(resourceDirectory(), category);
  await mkdir(directory, { recursive: true });
  const file = await claimFile(
    directory,
    slug(filename),
    kind === 'jpeg' ? 'jpg' : kind,
    bytes,
  );
  const entry: ThumbnailResource = {
    category,
    file,
    label: label?.trim() || labelFromFile(file),
  };
  const manifest = await readManifest();
  const temporary = path.join(
    resourceDirectory(),
    `.manifest.${randomUUID()}.tmp`,
  );
  await writeFile(
    temporary,
    `${JSON.stringify([...manifest, entry], null, 2)}\n`,
  );
  await rename(temporary, path.join(resourceDirectory(), 'manifest.json'));
  return { ...entry, url: resourceUrl(category, file) };
}
