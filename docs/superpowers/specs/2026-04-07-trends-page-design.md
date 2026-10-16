> Historical implementation record. Current visual rules and tokens are maintained in [the brand contract](../../branding.md); do not reuse this document’s old palette as an active default.

# /trends Page — Design Spec

## Context

The Ship Shit Show livestream dashboard needs a way to discover trending topics across YouTube, X, Reddit, and Hacker News — specifically AI-related content. Currently, topic discovery is manual. This page creates a pipeline: **discover trends → select interesting ones → deep-dive for more context → push to livestream Kanban** for stream prep.

## Data Model

```ts
interface TrendItem {
  id: string                // source-specific unique ID
  title: string             // headline/post title
  url: string               // link to original
  source: "hackernews" | "reddit" | "youtube" | "x"
  score: number             // upvotes/likes/views — normalized per source
  commentCount: number
  timestamp: string         // ISO date
  summary?: string          // snippet/description if available
  subreddit?: string        // reddit-specific
  author?: string
  thumbnail?: string        // youtube-specific
}

interface TrendsResponse {
  items: TrendItem[]
  fetchedAt: string         // ISO timestamp of when data was fetched
}

interface TrendsSearchResponse {
  items: TrendItem[]
  query: string
}
```

## API Endpoints

### `GET /api/trends` — Main Feed

Fetches trending content from all four sources in parallel, normalizes to `TrendItem[]`, returns combined feed sorted by recency.

**Sources:**

| Source | API | Auth | Details |
|--------|-----|------|---------|
| Hacker News | `hn.algolia.com/api/v1/search?tags=front_page` | None | Free Algolia-powered API, returns front page stories |
| Reddit | `reddit.com/r/{subreddits}/hot.json` | None | Public JSON endpoint, no auth for read-only. Subreddits: `artificial`, `LocalLLaMA`, `machinelearning`, `singularity` |
| YouTube | YouTube Data API v3 `/videos?chart=mostPopular&videoCategoryId=28` | OAuth (existing) | Uses existing YouTube OAuth setup. Category 28 = Science & Technology |
| X (Twitter) | X API v2 (primary), Nitter RSS (fallback) | API key | Use X API as primary source. Fall back to Nitter RSS if rate-limited or unavailable |

**Caching:** `Cache-Control: s-maxage=300, stale-while-revalidate=60` (5-minute server cache, matching existing `/api/report` pattern).

**Error handling:** If one source fails, return results from the others. Include a `sources` field in the response indicating which sources succeeded/failed.

Updated response shape:

```ts
interface TrendsResponse {
  items: TrendItem[]
  fetchedAt: string
  sources: {
    hackernews: "ok" | "error"
    reddit: "ok" | "error"
    youtube: "ok" | "error"
    x: "ok" | "error"
  }
}
```

### `GET /api/trends/search?q={topic}` — Deep-Dive Search

Takes topic keywords from selected trends, searches all sources for related content.

**Sources:**

| Source | Search API |
|--------|-----------|
| Hacker News | `hn.algolia.com/api/v1/search?query={topic}` |
| Reddit | `reddit.com/r/{subreddits}/search.json?q={topic}&sort=relevance&t=week` |
| YouTube | YouTube Data API v3 `/search?q={topic}&type=video&videoCategoryId=28` |
| X | X API v2 search (primary), skip on fallback |

Returns `TrendsSearchResponse` with same `TrendItem[]` shape.

## UI Layout

### Page Structure

Two-panel layout at `/trends`. Added to the main navigation alongside Analytics / Unpublished / Livestream.

```
+------------------------------------------------------------------+
| [Logo] Ship Shit Show    Analytics  Unpublished  Livestream  Trends |
+------------------------------------------------------------------+
|                          |                                        |
|   TREND FEED (60%)       |   DEEP DIVE (40%)                     |
|                          |                                        |
|   [All] [HN] [Reddit]   |   "Select trends and hit              |
|   [YouTube] [X]          |    Go Deeper"                         |
|                          |                                        |
|   [ ] HN  Title...       |   --- after search ---                |
|       42pts  12 comments |                                        |
|       2h ago             |   Related from HN:                    |
|                          |     Card...                            |
|   [x] Reddit  Title...  |     Card...                            |
|       1.2k  89 comments  |                                        |
|       3h ago             |   Related from Reddit:                |
|                          |     Card...                            |
|   [ ] YT  Title...      |                                        |
|       12k views          |   Related from YouTube:               |
|       5h ago             |     Card...                            |
|                          |                                        |
+------------------------------------------------------------------+
|   [Go Deeper]  [Add to Livestream (2)]              [Refresh]    |
+------------------------------------------------------------------+
```

### Left Panel — Trend Feed (60% width)

- **Source filter tabs** at top: All | HN | Reddit | YouTube | X (client-side filtering of fetched data)
- **Trend cards** — `rounded-xl border border-surface-border bg-surface-card` (existing pattern):
  - Checkbox on the left for multi-select
  - Source icon + colored badge:
    - HN: `#ff6600` (orange)
    - Reddit: `#ff4500` (orangered)
    - YouTube: `#ff2d20` (accent red — matches brand)
    - X: `#a0a0a0` (text-secondary gray)
  - Title (bold, clickable — opens original URL in new tab)
  - Score + comment count + relative timestamp (`date-fns` formatDistanceToNow)
  - Summary snippet (truncated to 2 lines) if available
  - Subreddit badge for Reddit items
- **Selected state**: `border-accent-red` highlight on selected cards
- **Scrollable**: Left panel scrolls independently

### Right Panel — Deep Dive (40% width)

- **Empty state**: Centered text "Select trends and hit Go Deeper" with muted styling
- **After search**: Results grouped by source with section headers
  - Same compact card format as left panel (no checkbox)
  - Each card has an individual "Add to Livestream" button (small, icon-style)
- **Scrollable**: Right panel scrolls independently

### Bottom Action Bar

Fixed at bottom of the left panel:
- **"Go Deeper" button** — disabled until at least one trend is selected. Triggers `/api/trends/search` with keywords extracted from selected trend titles
- **"Add to Livestream (N)" button** — disabled until selections made. Shows count of selected items. Pushes selected trends to Kanban
- **Refresh button** — re-fetches `/api/trends`, clears selections and deep-dive results

### Loading States

- Initial load: `animate-pulse` skeleton cards (same pattern as DashboardClient)
- Deep-dive loading: skeleton in right panel while search runs
- Source failure: subtle banner at top indicating which source(s) failed

### Responsive Behavior

- Desktop (>1024px): Two-panel side-by-side
- Tablet/Mobile (<1024px): Single column — feed on top, deep-dive below (collapsible)

## Livestream Integration

### "Add to Livestream" Flow

When clicking "Add to Livestream":

1. For each selected trend, create a markdown file in `/data/livestream/{today's date}/`
2. File format follows existing pattern:

```markdown
---
title: "{trend title}"
slug: "{slugified-title}"
source: "{HN|Reddit|YouTube|X}"
status: "backlog"
date: "{YYYY-MM-DD}"
thumbnail_prompt: null
---

## Source

- [{source}]({original URL}) — {score} points, {commentCount} comments

## Summary

{trend summary or first 200 chars of content}

## Related (from deep-dive)

{If deep-dive was performed, list related links found}
```

3. Uses existing POST to `/api/livestream` endpoint (or creates a new POST handler if only PATCH exists)
4. Shows toast notification: "Added {N} topic(s) to Livestream" with a link to `/livestream`
5. Selected items get a visual indicator showing they've been added (checkmark badge, disabled re-add)

## Component Structure

```
src/app/trends/page.tsx            — Page wrapper (server component, nav + layout)
src/components/trends/
  TrendsClient.tsx                  — Main client component (state, fetching, layout)
  TrendCard.tsx                     — Individual trend item card
  TrendFilters.tsx                  — Source filter tabs
  DeepDivePanel.tsx                 — Right panel with search results
  TrendActionBar.tsx                — Bottom bar with Go Deeper + Add to Livestream
```

## Tech Notes

- All client-side state via `useState` (matching existing patterns — no state management lib)
- `date-fns` for relative timestamps (already a dependency)
- `clsx` for conditional classes (already a dependency)
- Keyword extraction for deep-dive: take selected trend titles, strip common stop words (the, a, is, etc.), extract the top 3-5 most frequent remaining words across selections, join as the search query string
- No new dependencies required
