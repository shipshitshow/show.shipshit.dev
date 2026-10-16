> Historical implementation record. Current visual rules and tokens are maintained in [the brand contract](../../branding.md); do not reuse this document’s old palette as an active default.

# /trends Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/trends` page that aggregates trending AI content from HN, Reddit, YouTube, and X into a two-panel UI where you select interesting trends, deep-dive for more context, and push selected topics to the livestream Kanban.

**Architecture:** Server-side aggregation via two API routes (`/api/trends` and `/api/trends/search`). Each fetches all four sources in parallel, normalizes to a shared `TrendItem` type, and caches for 5 minutes. The client is a two-panel layout — left for the feed with source tabs and multi-select, right for deep-dive results. Selected trends can be pushed to the existing `/data/livestream/` markdown file system.

**Tech Stack:** Next.js App Router, Tailwind CSS (existing design system), YouTube Data API v3 (existing OAuth), HN Algolia API, Reddit JSON API, X API v2 with Nitter RSS fallback, `date-fns`, `clsx`.

**Spec:** `docs/superpowers/specs/2026-04-07-trends-page-design.md`

---

## File Structure

```
src/lib/trends-types.ts              — TrendItem, TrendsResponse, TrendsSearchResponse types
src/lib/trends/hackernews.ts         — HN Algolia API: fetch front page + search
src/lib/trends/reddit.ts             — Reddit JSON API: fetch hot + search
src/lib/trends/youtube.ts            — YouTube Data API: fetch trending + search
src/lib/trends/x.ts                  — X API v2 primary, Nitter RSS fallback: fetch trending + search
src/lib/trends/normalize.ts          — Source-specific response → TrendItem normalization
src/app/api/trends/route.ts          — GET /api/trends — aggregated feed
src/app/api/trends/search/route.ts   — GET /api/trends/search?q= — deep-dive search
src/app/trends/page.tsx              — Page wrapper (server component, header + nav)
src/components/trends/TrendsClient.tsx   — Main client component (state, fetching, two-panel layout)
src/components/trends/TrendCard.tsx      — Individual trend card with checkbox
src/components/trends/TrendFilters.tsx   — Source filter tabs
src/components/trends/DeepDivePanel.tsx  — Right panel with search results
src/components/trends/TrendActionBar.tsx — Bottom bar: Go Deeper + Add to Livestream
```

Existing files to modify:
```
src/app/page.tsx:22-26          — Add "Trends" link to nav
src/app/livestream/page.tsx:72-76  — Add "Trends" link to nav
src/app/review/page.tsx            — Add "Trends" link to nav
src/app/api/livestream/route.ts    — Add POST handler for creating topics
```

---

### Task 1: Types

**Files:**
- Create: `src/lib/trends-types.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/lib/trends-types.ts

export type TrendSource = "hackernews" | "reddit" | "youtube" | "x";

export interface TrendItem {
  id: string;
  title: string;
  url: string;
  source: TrendSource;
  score: number;
  commentCount: number;
  timestamp: string;
  summary?: string;
  subreddit?: string;
  author?: string;
  thumbnail?: string;
}

export interface TrendsResponse {
  items: TrendItem[];
  fetchedAt: string;
  sources: Record<TrendSource, "ok" | "error">;
}

export interface TrendsSearchResponse {
  items: TrendItem[];
  query: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trends-types.ts
git commit -m "feat(trends): add TrendItem types"
```

---

### Task 2: HN Source Fetcher

**Files:**
- Create: `src/lib/trends/hackernews.ts`

- [ ] **Step 1: Create HN fetcher**

The HN Algolia API returns `{ hits: [{ objectID, title, url, points, num_comments, created_at, author, story_text }] }`.

```ts
// src/lib/trends/hackernews.ts

import type { TrendItem } from "@/lib/trends-types";

const HN_FRONT_PAGE = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30";
const HN_SEARCH = "https://hn.algolia.com/api/v1/search";

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  created_at: string;
  author: string;
  story_text: string | null;
}

function toTrendItem(hit: HNHit): TrendItem {
  return {
    id: `hn-${hit.objectID}`,
    title: hit.title,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    source: "hackernews",
    score: hit.points,
    commentCount: hit.num_comments,
    timestamp: hit.created_at,
    summary: hit.story_text?.slice(0, 200) || undefined,
    author: hit.author,
  };
}

export async function fetchHNTrending(): Promise<TrendItem[]> {
  const res = await fetch(HN_FRONT_PAGE);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);
  const data = await res.json();
  return (data.hits as HNHit[]).map(toTrendItem);
}

export async function searchHN(query: string): Promise<TrendItem[]> {
  const url = `${HN_SEARCH}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN search error: ${res.status}`);
  const data = await res.json();
  return (data.hits as HNHit[]).map(toTrendItem);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trends/hackernews.ts
git commit -m "feat(trends): add HN Algolia fetcher"
```

---

### Task 3: Reddit Source Fetcher

**Files:**
- Create: `src/lib/trends/reddit.ts`

- [ ] **Step 1: Create Reddit fetcher**

Reddit's public JSON API returns `{ data: { children: [{ data: { id, title, url, score, num_comments, created_utc, author, selftext, subreddit, thumbnail, permalink } }] } }`.

```ts
// src/lib/trends/reddit.ts

import type { TrendItem } from "@/lib/trends-types";

const SUBREDDITS = ["artificial", "LocalLLaMA", "machinelearning", "singularity"];
const REDDIT_BASE = "https://www.reddit.com";

interface RedditPost {
  id: string;
  title: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
  author: string;
  selftext: string;
  subreddit: string;
  thumbnail: string;
  permalink: string;
}

function toTrendItem(post: RedditPost): TrendItem {
  return {
    id: `reddit-${post.id}`,
    title: post.title,
    url: post.url.startsWith("/") ? `${REDDIT_BASE}${post.url}` : post.url,
    source: "reddit",
    score: post.score,
    commentCount: post.num_comments,
    timestamp: new Date(post.created_utc * 1000).toISOString(),
    summary: post.selftext?.slice(0, 200) || undefined,
    author: post.author,
    subreddit: post.subreddit,
    thumbnail: post.thumbnail?.startsWith("http") ? post.thumbnail : undefined,
  };
}

async function fetchSubreddit(subreddit: string): Promise<RedditPost[]> {
  const res = await fetch(`${REDDIT_BASE}/r/${subreddit}/hot.json?limit=15`, {
    headers: { "User-Agent": "ShipShitShow/1.0" },
  });
  if (!res.ok) throw new Error(`Reddit API error for r/${subreddit}: ${res.status}`);
  const data = await res.json();
  return data.data.children.map((c: { data: RedditPost }) => c.data);
}

export async function fetchRedditTrending(): Promise<TrendItem[]> {
  const results = await Promise.allSettled(SUBREDDITS.map(fetchSubreddit));
  const posts: RedditPost[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") posts.push(...r.value);
  }
  // Deduplicate by post ID (cross-posted items)
  const seen = new Set<string>();
  const unique = posts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  return unique.map(toTrendItem);
}

export async function searchReddit(query: string): Promise<TrendItem[]> {
  const sub = SUBREDDITS.join("+");
  const url = `${REDDIT_BASE}/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=week&limit=20`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ShipShitShow/1.0" },
  });
  if (!res.ok) throw new Error(`Reddit search error: ${res.status}`);
  const data = await res.json();
  return data.data.children.map((c: { data: RedditPost }) => toTrendItem(c.data));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trends/reddit.ts
git commit -m "feat(trends): add Reddit JSON fetcher"
```

---

### Task 4: YouTube Source Fetcher

**Files:**
- Create: `src/lib/trends/youtube.ts`

- [ ] **Step 1: Create YouTube fetcher**

Reuses the existing OAuth token infrastructure from `src/lib/youtube/token.ts`. Falls back gracefully if no credentials are configured (returns empty array, same pattern as `/api/report`).

```ts
// src/lib/trends/youtube.ts

import type { TrendItem } from "@/lib/trends-types";
import { hasYouTubeCredentials, getAccessToken, getChannelConfigs } from "@/lib/youtube/token";

const YT_API = "https://www.googleapis.com/youtube/v3";

interface YTVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
    thumbnails: { medium?: { url: string } };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

function toTrendItem(video: YTVideo): TrendItem {
  return {
    id: `yt-${video.id}`,
    title: video.snippet.title,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    source: "youtube",
    score: Number.parseInt(video.statistics.viewCount, 10) || 0,
    commentCount: Number.parseInt(video.statistics.commentCount, 10) || 0,
    timestamp: video.snippet.publishedAt,
    summary: video.snippet.description?.slice(0, 200) || undefined,
    author: video.snippet.channelTitle,
    thumbnail: video.snippet.thumbnails?.medium?.url,
  };
}

export async function fetchYouTubeTrending(): Promise<TrendItem[]> {
  if (!hasYouTubeCredentials()) return [];

  const configs = getChannelConfigs();
  if (configs.length === 0) return [];

  const token = await getAccessToken(configs[0]);

  const res = await fetch(
    `${YT_API}/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=28&maxResults=20&regionCode=US`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  return (data.items as YTVideo[]).map(toTrendItem);
}

export async function searchYouTube(query: string): Promise<TrendItem[]> {
  if (!hasYouTubeCredentials()) return [];

  const configs = getChannelConfigs();
  if (configs.length === 0) return [];

  const token = await getAccessToken(configs[0]);

  // Step 1: search for video IDs
  const searchRes = await fetch(
    `${YT_API}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=28&maxResults=15&order=relevance`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) throw new Error(`YouTube search error: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const videoIds = searchData.items.map((item: { id: { videoId: string } }) => item.id.videoId);

  if (videoIds.length === 0) return [];

  // Step 2: get full video details with statistics
  const detailRes = await fetch(
    `${YT_API}/videos?part=snippet,statistics&id=${videoIds.join(",")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!detailRes.ok) throw new Error(`YouTube detail error: ${detailRes.status}`);
  const detailData = await detailRes.json();
  return (detailData.items as YTVideo[]).map(toTrendItem);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trends/youtube.ts
git commit -m "feat(trends): add YouTube trending fetcher"
```

---

### Task 5: X Source Fetcher

**Files:**
- Create: `src/lib/trends/x.ts`

- [ ] **Step 1: Create X fetcher**

Uses X API v2 as primary. Falls back to empty array if no `X_BEARER_TOKEN` env var is set. The Nitter RSS fallback is a stretch goal — for v1, we degrade gracefully.

```ts
// src/lib/trends/x.ts

import type { TrendItem } from "@/lib/trends-types";

const X_API = "https://api.twitter.com/2";

interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface XUser {
  id: string;
  username: string;
  name: string;
}

function toTrendItem(tweet: XTweet, userMap: Map<string, XUser>): TrendItem {
  const user = userMap.get(tweet.author_id);
  const engagement = tweet.public_metrics.like_count + tweet.public_metrics.retweet_count + tweet.public_metrics.quote_count;
  return {
    id: `x-${tweet.id}`,
    title: tweet.text.slice(0, 280),
    url: user ? `https://x.com/${user.username}/status/${tweet.id}` : `https://x.com/i/status/${tweet.id}`,
    source: "x",
    score: engagement,
    commentCount: tweet.public_metrics.reply_count,
    timestamp: tweet.created_at,
    author: user?.name || user?.username,
  };
}

function hasXCredentials(): boolean {
  return !!process.env.X_BEARER_TOKEN;
}

export async function fetchXTrending(): Promise<TrendItem[]> {
  if (!hasXCredentials()) return [];

  const token = process.env.X_BEARER_TOKEN;
  // Search for popular AI tweets from the last 24h
  const query = "(AI OR LLM OR GPT OR Claude OR \"machine learning\" OR \"open source AI\") -is:retweet lang:en";
  const url = `${X_API}/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=25&sort_order=relevancy&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`X API error: ${res.status}`);
  const data = await res.json();

  const userMap = new Map<string, XUser>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      userMap.set(user.id, user);
    }
  }

  return (data.data as XTweet[] || []).map((tweet) => toTrendItem(tweet, userMap));
}

export async function searchX(query: string): Promise<TrendItem[]> {
  if (!hasXCredentials()) return [];

  const token = process.env.X_BEARER_TOKEN;
  const fullQuery = `(${query}) -is:retweet lang:en`;
  const url = `${X_API}/tweets/search/recent?query=${encodeURIComponent(fullQuery)}&max_results=20&sort_order=relevancy&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`X search error: ${res.status}`);
  const data = await res.json();

  const userMap = new Map<string, XUser>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      userMap.set(user.id, user);
    }
  }

  return (data.data as XTweet[] || []).map((tweet) => toTrendItem(tweet, userMap));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/trends/x.ts
git commit -m "feat(trends): add X API v2 fetcher with graceful fallback"
```

---

### Task 6: Trends API Route — Main Feed

**Files:**
- Create: `src/app/api/trends/route.ts`

- [ ] **Step 1: Create the aggregated trends endpoint**

```ts
// src/app/api/trends/route.ts

import { NextResponse } from "next/server";
import type { TrendItem, TrendSource, TrendsResponse } from "@/lib/trends-types";
import { fetchHNTrending } from "@/lib/trends/hackernews";
import { fetchRedditTrending } from "@/lib/trends/reddit";
import { fetchYouTubeTrending } from "@/lib/trends/youtube";
import { fetchXTrending } from "@/lib/trends/x";

type Fetcher = () => Promise<TrendItem[]>;

const FETCHERS: [TrendSource, Fetcher][] = [
  ["hackernews", fetchHNTrending],
  ["reddit", fetchRedditTrending],
  ["youtube", fetchYouTubeTrending],
  ["x", fetchXTrending],
];

export async function GET() {
  const sources: Record<TrendSource, "ok" | "error"> = {
    hackernews: "error",
    reddit: "error",
    youtube: "error",
    x: "error",
  };

  const results = await Promise.allSettled(
    FETCHERS.map(async ([source, fetcher]) => {
      const items = await fetcher();
      sources[source] = "ok";
      return items;
    })
  );

  const items: TrendItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  // Sort by timestamp descending (newest first)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const response: TrendsResponse = {
    items,
    fetchedAt: new Date().toISOString(),
    sources,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/trends/route.ts
git commit -m "feat(trends): add aggregated /api/trends endpoint"
```

---

### Task 7: Trends API Route — Deep-Dive Search

**Files:**
- Create: `src/app/api/trends/search/route.ts`

- [ ] **Step 1: Create the search endpoint**

```ts
// src/app/api/trends/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { TrendItem, TrendsSearchResponse } from "@/lib/trends-types";
import { searchHN } from "@/lib/trends/hackernews";
import { searchReddit } from "@/lib/trends/reddit";
import { searchYouTube } from "@/lib/trends/youtube";
import { searchX } from "@/lib/trends/x";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const results = await Promise.allSettled([
    searchHN(query),
    searchReddit(query),
    searchYouTube(query),
    searchX(query),
  ]);

  const items: TrendItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  // Sort by score descending (most relevant/popular first)
  items.sort((a, b) => b.score - a.score);

  const response: TrendsSearchResponse = { items, query };

  return NextResponse.json(response);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/trends/search/route.ts
git commit -m "feat(trends): add /api/trends/search deep-dive endpoint"
```

---

### Task 8: Livestream POST Handler

**Files:**
- Modify: `src/app/api/livestream/route.ts`

- [ ] **Step 1: Add POST handler to existing livestream route**

Add this function after the existing `GET` export in `src/app/api/livestream/route.ts`:

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const { title, slug, source, date, content } = body as {
    title: string;
    slug: string;
    source: string;
    date: string;
    content: string;
  };

  const dir = path.join(DATA_DIR, date);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Determine next topic number
  const existing = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const nextNum = existing.length + 1;
  const padded = String(nextNum).padStart(2, "0");
  const fileName = `topic-${padded}-${slug}.md`;

  const markdown = `---
title: "${title}"
slug: "${slug}"
source: "${source}"
status: "backlog"
date: "${date}"
thumbnail_prompt: null
---

${content}

## Generated Content
`;

  fs.writeFileSync(path.join(dir, fileName), markdown, "utf-8");

  return NextResponse.json({ fileName, slug, status: "backlog" }, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/livestream/route.ts
git commit -m "feat(livestream): add POST handler for creating topics from trends"
```

---

### Task 9: TrendCard Component

**Files:**
- Create: `src/components/trends/TrendCard.tsx`

- [ ] **Step 1: Create the trend card component**

Follows the existing card pattern from `TopicCard.tsx` — `rounded-xl border border-surface-border bg-surface-card`. Source badge colors match the existing `SOURCE_COLORS` in TopicCard.

```tsx
// src/components/trends/TrendCard.tsx

"use client";

import { formatDistanceToNow } from "date-fns";
import type { TrendItem, TrendSource } from "@/lib/trends-types";

const SOURCE_COLORS: Record<TrendSource, string> = {
  hackernews: "bg-orange-500/20 text-orange-400",
  reddit: "bg-orange-600/20 text-orange-300",
  youtube: "bg-red-500/20 text-red-400",
  x: "bg-blue-400/20 text-blue-400",
};

const SOURCE_LABELS: Record<TrendSource, string> = {
  hackernews: "HN",
  reddit: "Reddit",
  youtube: "YouTube",
  x: "X",
};

interface TrendCardProps {
  item: TrendItem;
  selected: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
  onAddToLivestream?: (item: TrendItem) => void;
}

export function TrendCard({ item, selected, onToggle, compact, onAddToLivestream }: TrendCardProps) {
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });

  return (
    <div
      className={`bg-surface-card border rounded-xl ${compact ? "p-3" : "p-4"} transition-colors cursor-pointer ${
        selected ? "border-accent-red" : "border-surface-border hover:border-accent-red/40"
      }`}
      onClick={() => onToggle(item.id)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {!compact && (
          <div className="pt-0.5">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                selected
                  ? "bg-accent-red border-accent-red"
                  : "border-surface-border"
              }`}
            >
              {selected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Source badge + timestamp */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${SOURCE_COLORS[item.source]}`}>
              {SOURCE_LABELS[item.source]}
            </span>
            {item.subreddit && (
              <span className="text-[10px] font-mono text-text-muted">r/{item.subreddit}</span>
            )}
            <span className="text-[10px] text-text-muted ml-auto">{timeAgo}</span>
          </div>

          {/* Title */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-text-primary hover:text-accent-red transition-colors leading-tight block"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </a>

          {/* Summary */}
          {item.summary && !compact && (
            <p className="text-xs text-text-secondary leading-relaxed mt-1.5 line-clamp-2">
              {item.summary}
            </p>
          )}

          {/* Metrics row */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted font-mono">
            <span>{item.score.toLocaleString()} {item.source === "youtube" ? "views" : "pts"}</span>
            <span>{item.commentCount.toLocaleString()} comments</span>
            {item.author && <span className="ml-auto">by {item.author}</span>}
          </div>

          {/* Compact mode: add to livestream button */}
          {compact && onAddToLivestream && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToLivestream(item);
              }}
              className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors mt-2"
            >
              + Livestream
            </button>
          )}
        </div>

        {/* YouTube thumbnail */}
        {item.thumbnail && !compact && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-24 h-16 rounded-lg object-cover shrink-0"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trends/TrendCard.tsx
git commit -m "feat(trends): add TrendCard component"
```

---

### Task 10: TrendFilters Component

**Files:**
- Create: `src/components/trends/TrendFilters.tsx`

- [ ] **Step 1: Create source filter tabs**

```tsx
// src/components/trends/TrendFilters.tsx

"use client";

import type { TrendSource } from "@/lib/trends-types";

type FilterValue = "all" | TrendSource;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "hackernews", label: "HN" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
];

interface TrendFiltersProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

export function TrendFilters({ active, onChange, counts }: TrendFiltersProps) {
  return (
    <div className="flex gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
            active === f.value
              ? "bg-accent-red/10 text-accent-red"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {f.label}
          <span className="ml-1 opacity-60">{counts[f.value]}</span>
        </button>
      ))}
    </div>
  );
}

export type { FilterValue };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trends/TrendFilters.tsx
git commit -m "feat(trends): add TrendFilters source tabs"
```

---

### Task 11: DeepDivePanel Component

**Files:**
- Create: `src/components/trends/DeepDivePanel.tsx`

- [ ] **Step 1: Create the right panel**

```tsx
// src/components/trends/DeepDivePanel.tsx

"use client";

import type { TrendItem, TrendSource } from "@/lib/trends-types";
import { TrendCard } from "./TrendCard";

const SOURCE_ORDER: TrendSource[] = ["hackernews", "reddit", "youtube", "x"];
const SOURCE_LABELS: Record<TrendSource, string> = {
  hackernews: "Hacker News",
  reddit: "Reddit",
  youtube: "YouTube",
  x: "X",
};

interface DeepDivePanelProps {
  items: TrendItem[];
  loading: boolean;
  query: string | null;
  onAddToLivestream: (item: TrendItem) => void;
}

export function DeepDivePanel({ items, loading, query, onAddToLivestream }: DeepDivePanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-text-muted font-mono mb-3">Searching for "{query}"...</div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-surface-card border border-surface-border rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <div className="text-3xl mb-3 opacity-30">🔍</div>
        <p className="text-sm text-text-muted">Select trends and hit Go Deeper</p>
        <p className="text-xs text-text-muted mt-1">Related content will appear here</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <p className="text-sm text-text-muted">No results for "{query}"</p>
      </div>
    );
  }

  // Group by source
  const grouped = new Map<TrendSource, TrendItem[]>();
  for (const item of items) {
    const list = grouped.get(item.source) || [];
    list.push(item);
    grouped.set(item.source, list);
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-text-muted font-mono">
        Deep dive: "{query}" — {items.length} results
      </div>
      {SOURCE_ORDER.filter((s) => grouped.has(s)).map((source) => (
        <div key={source}>
          <h4 className="text-xs font-medium text-text-secondary uppercase tracking-widest mb-2">
            {SOURCE_LABELS[source]}
          </h4>
          <div className="space-y-2">
            {grouped.get(source)!.map((item) => (
              <TrendCard
                key={item.id}
                item={item}
                selected={false}
                onToggle={() => {}}
                compact
                onAddToLivestream={onAddToLivestream}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trends/DeepDivePanel.tsx
git commit -m "feat(trends): add DeepDivePanel component"
```

---

### Task 12: TrendActionBar Component

**Files:**
- Create: `src/components/trends/TrendActionBar.tsx`

- [ ] **Step 1: Create the bottom action bar**

```tsx
// src/components/trends/TrendActionBar.tsx

"use client";

interface TrendActionBarProps {
  selectedCount: number;
  onGoDeeper: () => void;
  onAddToLivestream: () => void;
  deepDiveLoading: boolean;
  addingToLivestream: boolean;
}

export function TrendActionBar({
  selectedCount,
  onGoDeeper,
  onAddToLivestream,
  deepDiveLoading,
  addingToLivestream,
}: TrendActionBarProps) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
      <button
        onClick={onGoDeeper}
        disabled={selectedCount === 0 || deepDiveLoading}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-surface-elevated border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent-red/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {deepDiveLoading ? "Searching..." : "Go Deeper"}
      </button>
      <button
        onClick={onAddToLivestream}
        disabled={selectedCount === 0 || addingToLivestream}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {addingToLivestream ? "Adding..." : `Add to Livestream (${selectedCount})`}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trends/TrendActionBar.tsx
git commit -m "feat(trends): add TrendActionBar component"
```

---

### Task 13: TrendsClient — Main Client Component

**Files:**
- Create: `src/components/trends/TrendsClient.tsx`

- [ ] **Step 1: Create the main client component**

This orchestrates everything: fetching, filtering, selection, deep-dive, and add-to-livestream.

```tsx
// src/components/trends/TrendsClient.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TrendItem, TrendsResponse, TrendsSearchResponse, TrendSource } from "@/lib/trends-types";
import { TrendCard } from "./TrendCard";
import { TrendFilters, type FilterValue } from "./TrendFilters";
import { DeepDivePanel } from "./DeepDivePanel";
import { TrendActionBar } from "./TrendActionBar";

// Stop words to filter out when extracting keywords from titles
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "out", "off", "over",
  "under", "again", "further", "then", "once", "here", "there", "when",
  "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "because", "but", "and",
  "or", "if", "while", "about", "up", "its", "it", "this", "that",
  "these", "those", "i", "me", "my", "we", "our", "you", "your", "he",
  "him", "his", "she", "her", "they", "them", "their", "what", "which",
  "who", "whom", "new", "like", "get", "got", "also",
]);

function extractKeywords(titles: string[]): string {
  const wordFreq = new Map<string, number>();
  for (const title of titles) {
    const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    for (const word of words) {
      if (word.length < 3 || STOP_WORDS.has(word)) continue;
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
    .join(" ");
}

export function TrendsClient() {
  const [items, setItems] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<FilterValue>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deepDiveItems, setDeepDiveItems] = useState<TrendItem[]>([]);
  const [deepDiveQuery, setDeepDiveQuery] = useState<string | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [addingToLivestream, setAddingToLivestream] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trends");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: TrendsResponse = await res.json();
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trends");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const filteredItems = useMemo(() => {
    if (sourceFilter === "all") return items;
    return items.filter((item) => item.source === sourceFilter);
  }, [items, sourceFilter]);

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { all: items.length, hackernews: 0, reddit: 0, youtube: 0, x: 0 };
    for (const item of items) c[item.source]++;
    return c;
  }, [items]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGoDeeper() {
    const selectedTitles = items.filter((i) => selectedIds.has(i.id)).map((i) => i.title);
    const query = extractKeywords(selectedTitles);
    if (!query) return;

    setDeepDiveLoading(true);
    setDeepDiveQuery(query);
    try {
      const res = await fetch(`/api/trends/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`Search error ${res.status}`);
      const data: TrendsSearchResponse = await res.json();
      // Filter out items already in the main feed
      const mainIds = new Set(items.map((i) => i.id));
      setDeepDiveItems(data.items.filter((i) => !mainIds.has(i.id)));
    } catch {
      setDeepDiveItems([]);
    } finally {
      setDeepDiveLoading(false);
    }
  }

  async function addToLivestream(trendsToAdd: TrendItem[]) {
    setAddingToLivestream(true);
    const date = new Date().toISOString().slice(0, 10);
    const sourceMap: Record<TrendSource, string> = {
      hackernews: "HN",
      reddit: "Reddit",
      youtube: "YouTube",
      x: "X",
    };

    try {
      for (const item of trendsToAdd) {
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60);

        const content = `## Source\n\n- [${sourceMap[item.source]}](${item.url}) — ${item.score.toLocaleString()} ${item.source === "youtube" ? "views" : "points"}, ${item.commentCount.toLocaleString()} comments\n\n## Summary\n\n${item.summary || item.title}`;

        await fetch("/api/livestream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            slug,
            source: sourceMap[item.source],
            date,
            content,
          }),
        });

        setAddedIds((prev) => new Set([...prev, item.id]));
      }
    } finally {
      setAddingToLivestream(false);
    }
  }

  function handleAddSelectedToLivestream() {
    const selected = items.filter((i) => selectedIds.has(i.id) && !addedIds.has(i.id));
    if (selected.length > 0) addToLivestream(selected);
  }

  function handleAddSingleToLivestream(item: TrendItem) {
    if (!addedIds.has(item.id)) addToLivestream([item]);
  }

  function handleRefresh() {
    setSelectedIds(new Set());
    setDeepDiveItems([]);
    setDeepDiveQuery(null);
    fetchTrends();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-accent-red text-4xl">⚠</div>
        <p className="text-text-secondary text-sm">{error}</p>
        <button
          onClick={handleRefresh}
          className="text-xs px-4 py-2 bg-surface-card border border-surface-border rounded-lg hover:border-accent-red transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)]">
      {/* Left Panel — Trend Feed */}
      <div className="w-full lg:w-3/5 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <TrendFilters active={sourceFilter} onChange={setSourceFilter} counts={counts} />
          <button
            onClick={handleRefresh}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-surface-card border border-surface-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bg-surface-card border border-surface-border rounded-xl h-24 animate-pulse" />
            ))
          ) : (
            filteredItems.map((item) => (
              <TrendCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={toggleSelection}
              />
            ))
          )}
        </div>

        <TrendActionBar
          selectedCount={selectedIds.size}
          onGoDeeper={handleGoDeeper}
          onAddToLivestream={handleAddSelectedToLivestream}
          deepDiveLoading={deepDiveLoading}
          addingToLivestream={addingToLivestream}
        />
      </div>

      {/* Right Panel — Deep Dive */}
      <div className="w-full lg:w-2/5 overflow-y-auto lg:border-l border-surface-border lg:pl-6">
        <DeepDivePanel
          items={deepDiveItems}
          loading={deepDiveLoading}
          query={deepDiveQuery}
          onAddToLivestream={handleAddSingleToLivestream}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trends/TrendsClient.tsx
git commit -m "feat(trends): add TrendsClient orchestration component"
```

---

### Task 14: Trends Page

**Files:**
- Create: `src/app/trends/page.tsx`

- [ ] **Step 1: Create the page wrapper**

Follows the exact same pattern as `src/app/page.tsx` and `src/app/livestream/page.tsx` — header with logo, nav, and page subtitle.

```tsx
// src/app/trends/page.tsx

import Link from "next/link";
import { TrendsClient } from "@/components/trends/TrendsClient";

export default function TrendsPage() {
  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <header className="border-b border-surface-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-red flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81z" />
              <path d="M9.75 15.02V8.98L15.5 12l-5.75 3.02z" fill="#ff2d20" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary leading-none">Ship Shit Show</h1>
            <p className="text-xs text-text-muted mt-0.5">Trends</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-xs text-text-secondary">
          <Link href="/" className="hover:text-text-primary transition-colors">Analytics</Link>
          <Link href="/review" className="hover:text-text-primary transition-colors">Unpublished</Link>
          <Link href="/livestream" className="hover:text-text-primary transition-colors">Livestream</Link>
          <span className="text-text-primary font-medium">Trends</span>
        </nav>
      </header>

      <main className="px-6 py-6">
        <TrendsClient />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/trends/page.tsx
git commit -m "feat(trends): add /trends page"
```

---

### Task 15: Add Trends Link to All Nav Bars

**Files:**
- Modify: `src/app/page.tsx:22-26`
- Modify: `src/app/livestream/page.tsx:72-76`
- Modify: `src/app/review/page.tsx` (find nav section)

- [ ] **Step 1: Update Analytics page nav**

In `src/app/page.tsx`, find the nav section (line 22-26) and add the Trends link:

```tsx
// Replace the nav block at lines 22-26
<nav className="flex items-center gap-4 text-xs text-text-secondary">
  <span className="text-text-primary font-medium">Analytics</span>
  <Link href="/review" className="hover:text-text-primary transition-colors">Unpublished</Link>
  <Link href="/livestream" className="hover:text-text-primary transition-colors">Livestream</Link>
  <Link href="/trends" className="hover:text-text-primary transition-colors">Trends</Link>
</nav>
```

- [ ] **Step 2: Update Livestream page nav**

In `src/app/livestream/page.tsx`, find the nav section (line 72-76) and add the Trends link:

```tsx
// Replace the nav block at lines 72-76
<nav className="flex items-center gap-4 text-xs text-text-secondary">
  <Link href="/" className="hover:text-text-primary transition-colors">Analytics</Link>
  <Link href="/review" className="hover:text-text-primary transition-colors">Unpublished</Link>
  <span className="text-text-primary font-medium">Livestream</span>
  <Link href="/trends" className="hover:text-text-primary transition-colors">Trends</Link>
</nav>
```

- [ ] **Step 3: Update Review page nav**

In `src/app/review/page.tsx`, find the nav section and add the Trends link. The pattern is the same — add after the Livestream link:

```tsx
<Link href="/trends" className="hover:text-text-primary transition-colors">Trends</Link>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/livestream/page.tsx src/app/review/page.tsx
git commit -m "feat(nav): add Trends link to all page navigations"
```

---

### Task 16: Verification

- [ ] **Step 1: Run the dev server and verify**

```bash
bun run dev
```

- [ ] **Step 2: Manual verification checklist**

1. Navigate to `http://localhost:3000/trends` — page loads with skeleton then trend cards
2. Source filter tabs work — clicking HN/Reddit/YouTube/X filters the list
3. Clicking cards toggles selection (red border + checkbox)
4. "Go Deeper" button becomes enabled when items are selected
5. Click "Go Deeper" — right panel populates with search results grouped by source
6. "Add to Livestream" button works — creates markdown files in `data/livestream/`
7. Navigate to `/livestream` — new topics appear in backlog column
8. All nav links work from every page (Analytics, Unpublished, Livestream, Trends)
9. Error state shows retry button if API fails
10. Empty state shows in right panel when nothing is selected

- [ ] **Step 3: Check for TypeScript errors**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Final commit if any fixes needed**
