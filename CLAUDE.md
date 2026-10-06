# Ship Shit Show — Monorepo

@.agents/memory/product-marketing-context.md
@.agents/memory/architecture.md

## Apps
- `apps/app` — public site and producer dashboard (Next.js 16, port 3001, deployed to show.shipshit.dev)
- `apps/web` — retired marketing stub (Next.js 16, port 3000). Do not deploy it.
- `apps/desktop` — local show management (Electron + Vite, local-only, no deployment)

## Packages
- `packages/types` (@shipshitshow/types) — shared TypeScript types, no runtime deps
- `packages/ui` (@shipshitshow/ui) — shared React components + Tailwind theme tokens + cn()

## Dev Commands
```bash
bun run dev           # all apps via turbo
bun run dev:app       # producer dashboard only
bun run dev:web       # landing page only
bun run dev:desktop   # electron app only
bun run check:types   # typecheck all packages
bun run test          # bun test across packages
bun run lint          # biome check
```

## Skills
- `skills/` — show-specific runtime skills (prep, cues, hooks, clips, chapters, metadata, linkedin, x, thumbnails)
- `.agents/skills/` — show skill discovery links and dev skills (debug, refactor, review); symlinked to .claude/skills and .codex/skills
- `scripts/skills.sh` — skill installer (pulls from github.com/shipshitshow/skills)
