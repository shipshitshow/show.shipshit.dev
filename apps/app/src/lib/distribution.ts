import type { EpisodeDistribution } from '@shipshitshow/types';

export interface DistributionSummary {
  published: number;
  skipped: number;
  pending: number;
  /** Plan slots that are not optional — the bar an episode is measured against. */
  required: number;
  requiredPublished: number;
}

export function normalizeDistributionUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function isValidDistributionUrl(value: string): boolean {
  return normalizeDistributionUrl(value) !== null;
}

export function summarizeDistribution(
  distribution: EpisodeDistribution,
): DistributionSummary {
  return distribution.assets.reduce<DistributionSummary>(
    (summary, asset) => {
      if (asset.status === 'published') summary.published += 1;
      if (asset.status === 'skipped') summary.skipped += 1;
      if (asset.status === 'pending') summary.pending += 1;

      if (!asset.isOptional) {
        summary.required += 1;
        if (asset.status === 'published') summary.requiredPublished += 1;
      }

      return summary;
    },
    {
      pending: 0,
      published: 0,
      required: 0,
      requiredPublished: 0,
      skipped: 0,
    },
  );
}
