'use client';

import type {
  XEpisodeMetrics,
  XEpisodePost,
  XEpisodePostInput,
  XMetricsEntryMode,
  XPostMetrics,
} from '@shipshitshow/types';
import { Button, Input } from '@shipshitshow/ui';
import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { parseJsonResponse } from '@/lib/parse-json-response';
import { isStorageUnavailableResponse } from '@/lib/storage-capability';
import { ReadOnlyStorageNotice } from './ReadOnlyStorageNotice';

const METRIC_FIELDS = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'likes', label: 'Likes' },
  { key: 'replies', label: 'Replies' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'bookmarks', label: 'Bookmarks' },
] as const satisfies ReadonlyArray<{ key: keyof XPostMetrics; label: string }>;

const ENTRY_MODE_LABEL: Record<XMetricsEntryMode, string> = {
  api: 'API',
  manual: 'Manual',
  mixed: 'API + manual',
};

type MetricDraft = Record<keyof XPostMetrics, string>;

interface PostDraft {
  url: string;
  metrics: MetricDraft;
}

function toMetricDraft(metrics: XPostMetrics | null): MetricDraft {
  const draft = {} as MetricDraft;
  for (const { key } of METRIC_FIELDS) {
    const value = metrics?.[key] ?? null;
    draft[key] = value === null ? '' : String(value);
  }
  return draft;
}

function toDrafts(posts: XEpisodePost[]): Record<string, PostDraft> {
  const drafts: Record<string, PostDraft> = {};
  for (const post of posts) {
    drafts[post.id] = {
      metrics: toMetricDraft(post.manual_metrics),
      url: post.url ?? '',
    };
  }
  return drafts;
}

/** Empty stays empty; anything else must be a whole, non-negative count. */
function parseMetricInput(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  return Number(trimmed);
}

function toPostInputs(
  posts: XEpisodePost[],
  drafts: Record<string, PostDraft>,
): XEpisodePostInput[] | null {
  const inputs: XEpisodePostInput[] = [];

  for (const post of posts) {
    const draft = drafts[post.id];
    if (!draft) continue;

    const manual = {} as XPostMetrics;
    for (const { key } of METRIC_FIELDS) {
      const parsed = parseMetricInput(draft.metrics[key]);
      if (parsed === 'invalid') return null;
      manual[key] = parsed;
    }

    inputs.push({
      id: post.id,
      manual_metrics: manual,
      url: draft.url.trim() || null,
    });
  }

  return inputs;
}

function formatMetric(value: number | null): string {
  return value === null ? '—' : formatNumber(value);
}

function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString();
}

function EntryModeBadge({ mode }: { mode: XMetricsEntryMode | null }) {
  const label = mode ? ENTRY_MODE_LABEL[mode] : 'Not tracked';
  const tone =
    mode === 'api'
      ? 'border-accent-red/30 bg-accent-red/10 text-text-primary'
      : mode
        ? 'border-surface-border bg-surface-elevated/60 text-text-secondary'
        : 'border-dashed border-surface-border text-text-muted';

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone}`}
    >
      {label}
    </span>
  );
}

export function StreamXPostsPanel({
  initialMetrics,
  isWritable,
  slug,
}: {
  initialMetrics: XEpisodeMetrics;
  isWritable: boolean;
  slug: string;
}) {
  const [hasWritableStorage, setHasWritableStorage] = useState(isWritable);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [drafts, setDrafts] = useState(() => toDrafts(initialMetrics.posts));
  const [pending, setPending] = useState<'refresh' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const endpoint = `/api/livestreams/${encodeURIComponent(slug)}/x-posts`;

  function applyMetrics(next: XEpisodeMetrics) {
    setMetrics(next);
    setDrafts(toDrafts(next.posts));
  }

  async function handleRefresh() {
    setPending('refresh');
    setError(null);

    try {
      const res = await fetch(`${endpoint}?refresh=true`);
      const next = await parseJsonResponse<XEpisodeMetrics>(res);
      if (!res.ok) throw new Error('Could not refresh metrics from X.');
      applyMetrics(next);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not refresh metrics.',
      );
    } finally {
      setPending(null);
    }
  }

  async function handleSave() {
    const posts = toPostInputs(metrics.posts, drafts);
    if (!posts) {
      setError(
        'Metrics must be whole numbers. Leave a field blank if unknown.',
      );
      return;
    }

    setPending('save');
    setError(null);

    try {
      const res = await fetch(endpoint, {
        body: JSON.stringify({ posts }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });
      const next = await parseJsonResponse<XEpisodeMetrics>(res);
      if (isStorageUnavailableResponse(next)) {
        setHasWritableStorage(false);
        return;
      }
      if (!res.ok) throw new Error('Could not save X posts.');
      applyMetrics(next);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save X posts.',
      );
    } finally {
      setPending(null);
    }
  }

  function updateDraft(id: string, patch: Partial<PostDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function updateMetricDraft(
    id: string,
    key: keyof XPostMetrics,
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        metrics: { ...current[id].metrics, [key]: value },
      },
    }));
  }

  const apiNotice = !metrics.api.configured
    ? 'X_BEARER_TOKEN is not set — enter metrics by hand below.'
    : metrics.api.error;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
              X Author Posts
            </p>
            <EntryModeBadge mode={metrics.entry_mode} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleRefresh}
              disabled={pending !== null || !metrics.api.configured}
            >
              {pending === 'refresh' ? 'Refreshing…' : 'Refresh from X'}
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={handleSave}
              disabled={!hasWritableStorage || pending !== null}
            >
              {pending === 'save' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-surface-border sm:grid-cols-4">
          {[
            {
              label: 'Impressions',
              value: formatMetric(metrics.totals.impressions),
            },
            {
              label: 'Engagements',
              value: formatMetric(metrics.totals.engagements),
            },
            {
              label: 'Posts tracked',
              value: String(metrics.totals.posts_tracked),
            },
            {
              label: 'With metrics',
              value: String(metrics.totals.posts_with_metrics),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-card px-4 py-3">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                {stat.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-text-primary">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {!hasWritableStorage ? (
        <ReadOnlyStorageNotice subject="X post URLs and metrics" />
      ) : null}

      {apiNotice ? (
        <p className="rounded-xl border border-dashed border-surface-border bg-surface-card/40 px-4 py-3 text-sm text-text-muted">
          {apiNotice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-accent-red/30 bg-accent-red/5 px-4 py-3 text-sm text-text-primary">
          {error}
        </p>
      ) : null}

      {metrics.posts.map((post, index) => {
        const draft = drafts[post.id];
        if (!draft) return null;

        const fetchedAt = formatTimestamp(post.api_fetched_at);
        const enteredAt = formatTimestamp(post.manual_entered_at);

        return (
          <section
            key={post.id}
            className="space-y-3 rounded-xl border border-surface-border bg-surface-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Post {index + 1}
                </h3>
                <EntryModeBadge mode={post.entry_mode} />
              </div>
              <p className="text-[11px] text-text-muted">
                {fetchedAt ? `Fetched ${fetchedAt}` : null}
                {fetchedAt && enteredAt ? ' · ' : null}
                {enteredAt ? `Entered ${enteredAt}` : null}
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
                Post URL
              </span>
              <Input
                disabled={!hasWritableStorage}
                value={draft.url}
                onChange={(event) =>
                  updateDraft(post.id, { url: event.target.value })
                }
                placeholder="https://x.com/shipshitdev/status/…"
                inputMode="url"
              />
            </label>

            {post.error ? (
              <p className="text-sm text-accent-red">{post.error}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METRIC_FIELDS.map(({ key, label }) => {
                const resolved = post.metrics?.[key] ?? null;
                const fromApi = (post.api_metrics?.[key] ?? null) !== null;

                return (
                  <label key={key} className="block space-y-1">
                    <span className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
                      {label}
                      <span className="normal-case tracking-normal">
                        {formatMetric(resolved)}
                        {fromApi ? ' · api' : null}
                      </span>
                    </span>
                    <Input
                      disabled={!hasWritableStorage}
                      value={draft.metrics[key]}
                      onChange={(event) =>
                        updateMetricDraft(post.id, key, event.target.value)
                      }
                      placeholder={fromApi ? 'API value in use' : 'Manual'}
                      inputMode="numeric"
                    />
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      {savedAt ? (
        <p className="text-[11px] text-text-muted">Saved at {savedAt}.</p>
      ) : null}
    </div>
  );
}
