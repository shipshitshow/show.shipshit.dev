# Ship Shit Show — Monorepo Architecture

last_verified: 2026-10-03

## Layout

Turborepo monorepo with Bun workspaces.

### Apps
- `apps/app` (@shipshitshow/app) — Public site and producer dashboard. Next.js 16, port 3001. Deployed to show.shipshit.dev via Vercel. `/` is public. `/sign-in` is the canonical Clerk entry on show.shipshit.dev; `/login` redirects there. Producer Home is `/studio`, with `/analytics`, `/livestreams`, `/socials`, `/partnerships` and `/research` as app paths. Public-library reads and producer authorization are separate concerns; producer capability enforcement is tracked in GitHub #54.
- `apps/web` (@shipshitshow/web) — Retired marketing stub. Next.js 16, port 3000. Not the public host.
- `apps/desktop` (@shipshitshow/desktop) — Local show management. Electron + Vite + React 19. Local-only, no deployment.

### Packages
- `packages/types` (@shipshitshow/types) — Shared TypeScript types. Zero runtime deps. No build step.
- `packages/ui` (@shipshitshow/ui) — Shared React components (Button, Select, Textarea) + Tailwind v4 theme tokens + cn() utility.

### Skills
- `skills/` (root) — Show-specific runtime skills: talking points, YouTube metadata/chapters, clip extraction, intro hooks, LinkedIn pipeline, and editing (recap, dialogue, library, overlays; synced from `shipshitshow/skills`).
- `.agents/skills/` — Dev workflow skills. Symlinked from `.claude/skills` and `.codex/skills`.

### Data
- `apps/app/data/livestream/` — Topic seed markdown per date (repo files, read-only in production).
- `apps/app/data/transcripts/` — YouTube video transcripts (VTT + cleaned text).
- Producer-edited data (prod topics and overrides, drawings, distribution, LinkedIn metrics, X posts, leads) lives in the Upstash Redis attached to the Vercel project (`KV_REST_API_URL`/`KV_REST_API_TOKEN`, Free plan; quota exhaustion makes writes return 503). Keys are `sss:{VERCEL_ENV}:v1:*`; backend selection is `lib/producer-storage.ts`, helpers `lib/redis-storage.ts`. Read order: repo seed, then Redis overlay. Topic overlay: per-date hash `topic-overlay-fields:{date}` with `topic:{slug}` and `override:{slug}` fields, each written with HSET + SADD to `topic-overlay-dates` in one MULTI/EXEC; the legacy whole-date string `topic-overlay:{date}` is still read (hash fields win) but never written. In dev, writes go to files unless `PRODUCER_STORAGE=redis`. `bun run storage:export --namespace production` is the read-only export; rollback is a code revert (data stays in Redis, the public site falls back to the repo seeds). No Blob store is attached to the project; Blob is used only by the show-prep draft CLI.
- OAuth tokens and `yt-cache:*` stay on `@vercel/kv` unchanged.

### Key env vars
- `DATA_DIR` — Override for livestream data directory (fallback: `process.cwd()/data/livestream`)
- `TOKEN_FILE_PATH` — Override for YouTube token file path
- Analytics is currently served by `apps/app/src/app/api/report/route.ts` with YouTube/social adapters. The old external analytics/pipeline localhost configuration does not describe the inspected app source.
- Historical social ingestion and dedicated partner persistence remain pending design/implementation; do not provision infrastructure from old notes.
