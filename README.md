# Ship Shit Show — Monorepo

Turborepo (Bun workspaces) for the Ship Shit Show — a YouTube livestream/channel
about AI tools for indie devs. The public site and producer dashboard live in
one Next.js app, plus a local Electron control app, shared packages, and
show-runtime skills.

GitHub: https://github.com/shipshitshow/show.shipshit.dev

The public home is https://show.shipshit.dev. Producer sign-in is
https://show.shipshit.dev/sign-in; protected pages use that same route.
The legacy `/login` URL redirects to `/sign-in`.

The home separates edited videos from full livestreams using YouTube video
metadata, including actual stream start times for completed replays. Only
public uploads from the main channel are shown. If the connected channel's
metadata API is unavailable, `apps/app/src/lib/data/public-episodes.json`
provides a dated snapshot of uploads verified public in the vault catalog.
New RSS IDs wait for format metadata; their titles are never used to guess
whether they were livestreams. Refresh the snapshot from verified public
catalog entries when publishing episodes while YouTube OAuth is disconnected.

## Apps

| App | Package | Stack | Port | Deploy |
| --- | --- | --- | --- | --- |
| `apps/app` | `@shipshitshow/app` | Next.js 16 | 3001 | show.shipshit.dev (Vercel) |
| `apps/web` | `@shipshitshow/web` | Next.js 16 | 3000 | retired stub, not the public host |
| `apps/desktop` | `@shipshitshow/desktop` | Electron + Vite + React 19 | — | local only |

`apps/app` is the producer dashboard: YouTube analytics (Data + Analytics APIs),
comment triage with AI-drafted replies, livestream topic prep/kanban, and trend
discovery. Auth is Clerk. Tokens, caches and every producer-edited record (topic
overlays, drawings, distribution, LinkedIn/X metrics, leads) live in the attached
Upstash Redis in production; in dev they are files under `apps/app/data`. Topic
seeds and transcripts stay in the repo. `bun run storage:export --namespace
production` prints the Redis data as JSON (read-only).

## Packages

- `packages/types` (`@shipshitshow/types`) — shared TypeScript types, no runtime deps.
- `packages/ui` (`@shipshitshow/ui`) — shared React components + Tailwind v4 theme tokens + `cn()`.
- `packages/talking-points` (`@shipshitshow/talking-points`) — trend/topic discovery used by the dashboard and desktop app.

## Setup

```bash
bun install
cp apps/app/.env.example apps/app/.env.local   # fill in the values you need
bun run dev            # all apps via turbo
bun run dev:app        # producer dashboard only (http://localhost:3001)
bun run dev:web        # marketing site only (http://localhost:3000)
bun run dev:desktop    # electron app only
```

Common checks:

```bash
bun run lint           # biome check
bun run check:types    # tsc across workspaces
bun run build          # turbo build
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + build on every push/PR;
`secret-scan.yml` runs gitleaks.

## YouTube auth

The dashboard uses OAuth (scopes `youtube.force-ssl` + `yt-analytics.readonly`)
per channel (`main`, `clips`). Reconnect in-app at `/auth/youtube`, or mint a
refresh token locally with `bun scripts/youtube-auth.ts` and store it as
`YOUTUBE_REFRESH_TOKEN_MAIN` / `_CLIPS`.

Production reauth requires the prod callback
(`https://show.shipshit.dev/api/auth/youtube/callback`) to be registered as an
Authorized redirect URI in the Google Cloud Console OAuth client, and
`YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` (plus `OAUTH_STATE_SECRET`) set in
Vercel. See `apps/app/.env.example` for the full variable list.

## Data & content

- `apps/app/data/livestream/YYYY-MM-DD/` — per-date topic markdown (stream prep).
- `apps/app/data/transcripts/` — VTT + cleaned transcripts.
- `apps/app/data/youtube/channel-inventory.json` — cached channel video inventory.
- Refresh inventory + backfill transcripts: `bun scripts/refresh-youtube-inventory.ts` (see `--help`).

## Skills

- `skills/` — show-runtime skills (talking points, live cues, YouTube metadata/chapters, clip extraction, intro hooks).
- `.agents/skills/` — dev-workflow skills, managed by `./scripts/skills.sh` against `github.com/shipshitshow/skills`.
  Also contains a discovery link to the repo-owned live cue skill in `skills/`.

For a glanceable on-air timeline, source links and speaking cues, run
`$cues` from this repo. It saves a `live-cues.md` companion beside
the selected episode's topic notes. During the show, use prompts such as
`$cues next; we're 35 minutes in, demos covered` or
`$cues skip the demo; 12 minutes left`.
The repo-local skill is linked into `.agents/skills/` for Codex and Claude discovery.
In Claude Code, invoke `/cues` instead of the Codex `$` form.
