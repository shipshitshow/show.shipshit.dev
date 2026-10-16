'use client';

import type {
  DistributionAssetStatus,
  DistributionAssetType,
  EpisodeDistribution,
  EpisodeDistributionAsset,
  EpisodeDistributionResponse,
} from '@shipshitshow/types';
import {
  DISTRIBUTION_ASSET_STATUSES,
  DISTRIBUTION_PLAN,
  isDistributionAssetStatus,
  isErrorResponse,
} from '@shipshitshow/types';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shipshitshow/ui';
import { ExternalLink } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  isValidDistributionUrl,
  summarizeDistribution,
} from '@/lib/distribution';
import { parseJsonResponse } from '@/lib/parse-json-response';
import { isStorageUnavailableResponse } from '@/lib/storage-capability';
import { ReadOnlyStorageNotice } from './ReadOnlyStorageNotice';

const STATUS_LABELS: Record<DistributionAssetStatus, string> = {
  pending: 'Pending',
  published: 'Published',
  skipped: 'Skipped',
};

const STATUS_BADGES: Record<DistributionAssetStatus, string> = {
  pending: 'border-surface-border bg-surface-elevated text-text-muted',
  published: 'border-green-500/20 bg-green-500/10 text-green-400',
  skipped: 'border-surface-border/60 bg-surface-border/20 text-text-muted/70',
};

interface AssetGroup {
  type: DistributionAssetType;
  label: string;
  isOptional: boolean;
  assets: EpisodeDistributionAsset[];
}

function groupAssets(assets: EpisodeDistributionAsset[]): AssetGroup[] {
  const groups = new Map<DistributionAssetType, AssetGroup>();

  for (const asset of assets) {
    const plan = DISTRIBUTION_PLAN.find((entry) => entry.type === asset.type);
    const existing = groups.get(asset.type);
    if (existing) {
      existing.assets.push(asset);
      continue;
    }

    groups.set(asset.type, {
      assets: [asset],
      isOptional: asset.isOptional,
      label: plan?.label ?? asset.type,
      type: asset.type,
    });
  }

  return Array.from(groups.values());
}

export function StreamDistributionPanel({
  date,
  initialDistribution,
  isWritable,
}: {
  date: string;
  initialDistribution: EpisodeDistribution;
  isWritable: boolean;
}) {
  const [hasWritableStorage, setHasWritableStorage] = useState(isWritable);
  const [distribution, setDistribution] = useState(initialDistribution);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [savingAssetId, setSavingAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeDistribution(distribution),
    [distribution],
  );
  const groups = useMemo(
    () => groupAssets(distribution.assets),
    [distribution],
  );

  const saveAsset = useCallback(
    async (
      assetId: string,
      update: { status?: DistributionAssetStatus; url?: string | null },
    ) => {
      setSavingAssetId(assetId);
      setError(null);

      try {
        const res = await fetch(
          `/api/distribution/${encodeURIComponent(date)}`,
          {
            body: JSON.stringify({ assetId, ...update }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          },
        );
        const data = await parseJsonResponse<EpisodeDistributionResponse>(res);

        if (isStorageUnavailableResponse(data)) {
          setHasWritableStorage(false);
          return;
        }

        if (!res.ok) {
          setError(isErrorResponse(data) ? data.error : 'Failed to save asset');
          return;
        }

        setDistribution(data.distribution);
        setUrlDrafts((prev) => {
          const next = { ...prev };
          delete next[assetId];
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save asset');
      } finally {
        setSavingAssetId(null);
      }
    },
    [date],
  );

  const commitUrl = useCallback(
    (asset: EpisodeDistributionAsset) => {
      const draft = urlDrafts[asset.id];
      if (draft === undefined) return;

      const trimmed = draft.trim();
      if (trimmed === (asset.url ?? '')) return;

      if (trimmed !== '' && !isValidDistributionUrl(trimmed)) {
        setError(`${asset.label} needs a valid http(s) URL`);
        return;
      }

      void saveAsset(asset.id, { url: trimmed === '' ? null : trimmed });
    },
    [saveAsset, urlDrafts],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {summary.requiredPublished}/{summary.required} core assets published
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {summary.published} published · {summary.pending} pending ·{' '}
            {summary.skipped} skipped
          </p>
        </div>
        {distribution.updatedAt ? (
          <p className="text-xs text-text-muted">
            Updated {new Date(distribution.updatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {!hasWritableStorage ? (
        <ReadOnlyStorageNotice subject="checklist changes" />
      ) : null}

      {error ? (
        <p className="rounded-xl border border-accent-red/20 bg-accent-red/5 px-5 py-3 text-xs text-text-primary">
          {error}
        </p>
      ) : null}

      {groups.map((group) => {
        const publishedInGroup = group.assets.filter(
          (asset) => asset.status === 'published',
        ).length;

        return (
          <article
            key={group.type}
            className="overflow-hidden rounded-xl border border-surface-border bg-surface-card"
          >
            <header className="flex items-center justify-between gap-3 border-b border-surface-border px-6 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
                {group.label}
                {group.isOptional ? (
                  <span className="ml-2 rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-text-muted/70">
                    optional
                  </span>
                ) : null}
              </h3>
              <span className="text-xs text-text-muted">
                {publishedInGroup}/{group.assets.length}
              </span>
            </header>

            <div className="divide-y divide-surface-border">
              {group.assets.map((asset) => {
                const draft = urlDrafts[asset.id] ?? asset.url ?? '';
                const isSaving = savingAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3 md:w-56">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${STATUS_BADGES[asset.status]}`}
                      >
                        {STATUS_LABELS[asset.status]}
                      </span>
                      <span className="truncate text-sm text-text-primary">
                        {asset.label}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="Published URL"
                        aria-label={`${asset.label} published URL`}
                        disabled={!hasWritableStorage || isSaving}
                        value={draft}
                        onChange={(event) =>
                          setUrlDrafts((prev) => ({
                            ...prev,
                            [asset.id]: event.target.value,
                          }))
                        }
                        onBlur={() => commitUrl(asset)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      {asset.url ? (
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          aria-label={`Open ${asset.label}`}
                        >
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                      ) : null}
                    </div>

                    <Select
                      value={asset.status}
                      disabled={!hasWritableStorage || isSaving}
                      onValueChange={(value) => {
                        if (!isDistributionAssetStatus(value)) return;
                        void saveAsset(asset.id, { status: value });
                      }}
                    >
                      <SelectTrigger
                        className="md:w-36"
                        aria-label={`${asset.label} status`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTION_ASSET_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
