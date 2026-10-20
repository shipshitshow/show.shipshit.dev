import type { XApiAvailability, XPostMetrics } from '@shipshitshow/types';

/**
 * X post metrics via the app-only bearer token already used for trends.
 *
 * Tier notes (verified 2026-08-10 against docs.x.com): the X API is now
 * pay-per-usage — no Free/Basic tier, Basic retired and Pro closed to new
 * signups. Post reads cost $0.005 each, capped at 2M reads per billing cycle,
 * and identical resources requested inside the same UTC day are charged once.
 * `GET /2/tweets` allows 3,500 requests / 15 min per app and 100 ids per
 * request, so one batched refresh per episode per UTC day costs 3 reads
 * (~$0.015). That fits comfortably, but pay-per-usage needs purchased credits:
 * when the account has none the call fails with 401/403/429 and the caller
 * falls back to manual entry rather than inventing numbers.
 */
const X_API = 'https://api.x.com/2';

/** `GET /2/tweets` accepts at most 100 ids per request. */
const MAX_IDS_PER_REQUEST = 100;

const STATUS_URL_PATTERN =
  /(?:twitter|x)\.com\/(?:#!\/)?(?:i\/web\/|i\/)?[A-Za-z0-9_]*\/?status(?:es)?\/(\d{1,20})/i;

interface XPublicMetrics {
  bookmark_count?: number;
  impression_count?: number;
  like_count?: number;
  quote_count?: number;
  reply_count?: number;
  /** Current schema field. */
  repost_count?: number;
  /** Legacy field name still returned by some responses. */
  retweet_count?: number;
}

interface XPostLookupResponse {
  data?: Array<{ id: string; public_metrics?: XPublicMetrics }>;
  detail?: string;
  errors?: Array<{ detail?: string; resource_id?: string; value?: string }>;
  title?: string;
}

export interface XMetricsLookup {
  availability: XApiAvailability;
  /** Per-status-id metrics for posts the API returned. */
  metrics: Map<string, XPostMetrics>;
  /** Per-status-id failures (deleted post, protected account, …). */
  postErrors: Map<string, string>;
}

export function hasXCredentials(): boolean {
  return Boolean(process.env.X_BEARER_TOKEN?.trim());
}

/**
 * Pull the numeric status id out of a post URL. Handles the `x.com`,
 * `twitter.com`, and `x.com/i/web/status/…` shapes, with or without trailing
 * segments (`/photo/1`) or query strings.
 */
export function parseXStatusId(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (/^\d{1,20}$/.test(trimmed)) return trimmed;

  return trimmed.match(STATUS_URL_PATTERN)?.[1] ?? null;
}

function toNumberOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toPostMetrics(metrics: XPublicMetrics | undefined): XPostMetrics {
  return {
    bookmarks: toNumberOrNull(metrics?.bookmark_count),
    impressions: toNumberOrNull(metrics?.impression_count),
    likes: toNumberOrNull(metrics?.like_count),
    quotes: toNumberOrNull(metrics?.quote_count),
    replies: toNumberOrNull(metrics?.reply_count),
    reposts: toNumberOrNull(metrics?.repost_count ?? metrics?.retweet_count),
  };
}

function describeHttpFailure(
  status: number,
  body: XPostLookupResponse,
): string {
  const detail = body.detail || body.title;

  if (status === 401) {
    return 'X rejected the bearer token (401). Check X_BEARER_TOKEN, or enter metrics manually.';
  }
  if (status === 403) {
    return 'X denied the request (403) — the project likely lacks post-read access or credits. Enter metrics manually.';
  }
  if (status === 429) {
    return 'X rate limit or monthly post-read cap reached (429). Enter metrics manually or retry later.';
  }

  return detail ? `X API error ${status}: ${detail}` : `X API error ${status}.`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchBatch(
  statusIds: string[],
  token: string,
  lookup: XMetricsLookup,
): Promise<void> {
  const params = new URLSearchParams({
    ids: statusIds.join(','),
    'tweet.fields': 'public_metrics,created_at',
  });

  const res = await fetch(`${X_API}/tweets?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = (await res.json().catch(() => ({}))) as XPostLookupResponse;

  if (!res.ok) {
    throw new Error(describeHttpFailure(res.status, body));
  }

  for (const post of body.data ?? []) {
    lookup.metrics.set(post.id, toPostMetrics(post.public_metrics));
  }

  for (const error of body.errors ?? []) {
    const id = error.resource_id || error.value;
    if (id && !lookup.metrics.has(id)) {
      lookup.postErrors.set(id, error.detail || 'Post not available on X.');
    }
  }
}

/**
 * Look up public metrics for the given status ids. Never throws: transport and
 * entitlement failures come back on `availability` so callers can degrade to
 * manual entry instead of showing fabricated numbers.
 */
export async function fetchXPostMetrics(
  statusIds: string[],
): Promise<XMetricsLookup> {
  const lookup: XMetricsLookup = {
    availability: {
      configured: hasXCredentials(),
      error: null,
      reachable: false,
    },
    metrics: new Map(),
    postErrors: new Map(),
  };

  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) {
    lookup.availability.error =
      'X_BEARER_TOKEN is not set — metrics must be entered manually.';
    return lookup;
  }

  const uniqueIds = Array.from(new Set(statusIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    lookup.availability.reachable = true;
    return lookup;
  }

  try {
    for (const batch of chunk(uniqueIds, MAX_IDS_PER_REQUEST)) {
      await fetchBatch(batch, token, lookup);
    }
    lookup.availability.reachable = true;
  } catch (error) {
    lookup.availability.error =
      error instanceof Error ? error.message : 'Unknown X API error.';
  }

  return lookup;
}
