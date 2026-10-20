import fs from 'node:fs';
import path from 'node:path';
import type {
  DistributionAssetStatus,
  DistributionAssetType,
  EpisodeDistribution,
  EpisodeDistributionAsset,
  EpisodeDistributionAssetUpdate,
} from '@shipshitshow/types';
import {
  DISTRIBUTION_PLAN,
  isDistributionAssetStatus,
  isDistributionAssetType,
} from '@shipshitshow/types';
import {
  createWritableStorageError,
  getProducerStorageBackend,
} from '@/lib/producer-storage';
import {
  readRedisJson,
  readRedisJsonMany,
  redisKey,
  writeRedisJson,
} from '@/lib/redis-storage';

const DATA_DIR =
  process.env.DATA_DIR || path.join(process.cwd(), 'data', 'livestream');
const DISTRIBUTION_FILE_NAME = 'distribution.json';

/**
 * Persisted shape. Only the producer-owned fields are stored — labels,
 * platform and optionality are re-derived from `DISTRIBUTION_PLAN` on read so
 * plan copy changes apply to every saved episode.
 */
interface StoredDistributionAsset {
  id: string;
  type: DistributionAssetType;
  status: DistributionAssetStatus;
  url: string | null;
  publishedAt: string | null;
}

interface StoredEpisodeDistribution {
  assets: StoredDistributionAsset[];
  updatedAt: string;
}

function getDistributionKey(date: string): string {
  return redisKey('distribution', date);
}

function getDistributionFilePath(date: string): string {
  return path.join(DATA_DIR, date, DISTRIBUTION_FILE_NAME);
}

function buildAssetId(type: DistributionAssetType, slot: number): string {
  return `${type}-${slot}`;
}

function isStoredDistributionAsset(
  value: unknown,
): value is StoredDistributionAsset {
  if (typeof value !== 'object' || value === null) return false;

  const asset = value as Partial<StoredDistributionAsset>;
  return (
    typeof asset.id === 'string' &&
    isDistributionAssetType(asset.type) &&
    isDistributionAssetStatus(asset.status) &&
    (asset.url === null || typeof asset.url === 'string') &&
    (asset.publishedAt === null || typeof asset.publishedAt === 'string')
  );
}

function parseStored(value: unknown): StoredEpisodeDistribution | null {
  if (typeof value !== 'object' || value === null) return null;

  const stored = value as Partial<StoredEpisodeDistribution>;
  if (!Array.isArray(stored.assets)) return null;

  return {
    assets: stored.assets.filter(isStoredDistributionAsset),
    updatedAt:
      typeof stored.updatedAt === 'string'
        ? stored.updatedAt
        : new Date(0).toISOString(),
  };
}

function readFilesystemDistribution(
  date: string,
): StoredEpisodeDistribution | null {
  const filePath = getDistributionFilePath(date);
  if (!fs.existsSync(filePath)) return null;

  try {
    return parseStored(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  } catch {
    return null;
  }
}

/** The Redis record wins; the repo file is the fallback, then empty. */
async function readStoredDistribution(
  date: string,
  strict = false,
): Promise<StoredEpisodeDistribution | null> {
  if (getProducerStorageBackend() === 'redis') {
    const stored = parseStored(
      await readRedisJson<unknown>(getDistributionKey(date), { strict }),
    );
    if (stored) return stored;
  }

  return readFilesystemDistribution(date);
}

async function writeStoredDistribution(
  date: string,
  stored: StoredEpisodeDistribution,
): Promise<void> {
  const backend = getProducerStorageBackend();
  if (backend === 'read-only') {
    throw createWritableStorageError();
  }

  if (backend === 'filesystem') {
    const filePath = getDistributionFilePath(date);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(stored, null, 2)}\n`, 'utf-8');
    return;
  }

  await writeRedisJson(getDistributionKey(date), stored);
}

function buildPlanAssets(): StoredDistributionAsset[] {
  return DISTRIBUTION_PLAN.flatMap((plan) =>
    Array.from({ length: plan.slotCount }, (_unused, index) => ({
      id: buildAssetId(plan.type, index + 1),
      publishedAt: null,
      status: 'pending' as DistributionAssetStatus,
      type: plan.type,
      url: null,
    })),
  );
}

function toEpisodeAsset(
  stored: StoredDistributionAsset,
  slot: number,
  slotCount: number,
): EpisodeDistributionAsset {
  const plan = DISTRIBUTION_PLAN.find((entry) => entry.type === stored.type);

  return {
    id: stored.id,
    isOptional: plan?.isOptional ?? true,
    label:
      slotCount > 1
        ? `${plan?.label ?? stored.type} ${slot}`
        : (plan?.label ?? stored.type),
    platform: plan?.platform ?? 'web',
    publishedAt: stored.publishedAt,
    status: stored.status,
    type: stored.type,
    url: stored.url,
  };
}

/**
 * Merge the current plan with what is stored. Plan slots always appear (so a
 * new asset type shows up on old episodes as pending) and stored assets the
 * plan no longer defines are kept, because their URLs are already joined
 * against by downstream metric rollups.
 */
function mergeWithPlan(
  stored: StoredEpisodeDistribution | null,
): StoredDistributionAsset[] {
  const storedById = new Map(
    (stored?.assets ?? []).map((asset) => [asset.id, asset]),
  );
  const planAssets = buildPlanAssets();
  const planIds = new Set(planAssets.map((asset) => asset.id));

  const merged = planAssets.map((asset) => storedById.get(asset.id) ?? asset);
  const extras = (stored?.assets ?? []).filter(
    (asset) => !planIds.has(asset.id),
  );

  return [...merged, ...extras];
}

function toEpisodeDistribution(
  date: string,
  assets: StoredDistributionAsset[],
  updatedAt: string | null,
): EpisodeDistribution {
  const slotCounts = new Map<DistributionAssetType, number>();
  for (const asset of assets) {
    slotCounts.set(asset.type, (slotCounts.get(asset.type) ?? 0) + 1);
  }

  const slotByType = new Map<DistributionAssetType, number>();

  return {
    assets: assets.map((asset) => {
      const slot = (slotByType.get(asset.type) ?? 0) + 1;
      slotByType.set(asset.type, slot);
      return toEpisodeAsset(asset, slot, slotCounts.get(asset.type) ?? 1);
    }),
    date,
    updatedAt,
  };
}

/**
 * Read only an existing checklist. Unlike `getEpisodeDistribution`, this
 * returns null when an episode has never been saved so analytics can distinguish
 * "no checklist" from a checklist whose assets are still pending.
 */
export async function readEpisodeDistribution(
  date: string,
): Promise<EpisodeDistribution | null> {
  const stored = await readStoredDistribution(date);
  return stored
    ? toEpisodeDistribution(date, mergeWithPlan(stored), stored.updatedAt)
    : null;
}

export async function readEpisodeDistributions(
  dates: string[],
): Promise<Map<string, EpisodeDistribution>> {
  const redisRecords =
    getProducerStorageBackend() === 'redis'
      ? await readRedisJsonMany<unknown>(dates.map(getDistributionKey))
      : [];

  const entries = dates.map((date, index) => {
    const stored =
      parseStored(redisRecords[index] ?? null) ??
      readFilesystemDistribution(date);
    return [
      date,
      stored
        ? toEpisodeDistribution(date, mergeWithPlan(stored), stored.updatedAt)
        : null,
    ] as const;
  });

  return new Map(
    entries.filter(
      (entry): entry is readonly [string, EpisodeDistribution] =>
        entry[1] !== null,
    ),
  );
}

export async function getEpisodeDistribution(
  date: string,
): Promise<EpisodeDistribution> {
  const stored = await readStoredDistribution(date);
  return toEpisodeDistribution(
    date,
    mergeWithPlan(stored),
    stored?.updatedAt ?? null,
  );
}

function applyAssetUpdate(
  asset: StoredDistributionAsset,
  update: EpisodeDistributionAssetUpdate,
  now: string,
): StoredDistributionAsset {
  const next: StoredDistributionAsset = { ...asset };

  if (update.url !== undefined) {
    next.url = update.url;
  }

  if (update.status !== undefined) {
    next.status = update.status;
  }

  // The publish timestamp is derived, never client-supplied: stamp it on the
  // transition into `published` and drop it when the asset leaves that state.
  if (next.status === 'published') {
    next.publishedAt = asset.publishedAt ?? now;
  } else {
    next.publishedAt = null;
  }

  return next;
}

export async function saveEpisodeDistributionAsset(
  date: string,
  assetId: string,
  update: EpisodeDistributionAssetUpdate,
): Promise<EpisodeDistribution | null> {
  if (getProducerStorageBackend() === 'read-only') {
    throw createWritableStorageError();
  }

  const stored = await readStoredDistribution(date, true);
  const assets = mergeWithPlan(stored);
  const index = assets.findIndex((asset) => asset.id === assetId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  assets[index] = applyAssetUpdate(assets[index], update, now);

  const nextStored: StoredEpisodeDistribution = { assets, updatedAt: now };
  await writeStoredDistribution(date, nextStored);

  return toEpisodeDistribution(date, assets, now);
}
