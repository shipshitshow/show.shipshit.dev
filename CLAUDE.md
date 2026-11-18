# Ship Sh*t Show — Monorepo

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

## React effects
- Do not add `useEffect`. A ratchet (`bun run check:effects`, `scripts/ratchets/use-effect-audit.ts`) counts `use_effect` and `async_effect_without_abort` per non-test file under `apps/` and `packages/`, against `scripts/ratchets/baselines/use-effect-audit.json`. A new file or a higher count fails; a lower count fails until you prune with `bun run check:effects --write` (which refuses to raise anything).
- An async effect (`await`, `.then` or `fetch` in the callback) must mention `AbortController`, `AbortSignal` or `signal`. A `cancelled` flag does not count.
- Instead of an effect, use derived state in render, the event handler that caused the work, the existing data-fetching hook, or a `key` to reset state. Keep effects for subscribing to systems outside React.
- Escape hatch, on the line directly above the call, reason required: `// use-effect-audit: ignore <reason>`.
- CI also runs `bun run check:baselines origin/<base>` on pull requests: a ratchet baseline may never grow against its base branch. Register new ratchet baselines in `scripts/ratchets/baselines-not-grown.ts`.

## Editing
- `docs/show-prep/weekly-pipeline.md` — the one-page weekly run from topic to private upload, with Vincent's sign-off points.
- `docs/show-prep/transcript-editing.md` — the Library > Edits page: highlight-to-cut transcript editing, the stutter and "like" action, the pushed word-level format and the cuts the recut script reads.
- `docs/show-prep/thumbnails.md` — the thumbnail and Shorts cover template, production rules and where masters live.
- Edit rules (single source): github.com/shipshitshow/vault `brand/editing.md`. `docs/show-prep/edit-style.md` holds only build values and script names.
- `editing/` — Tesseract media workspace (projects, raws, renders). Media is not in the repo: it lives in `~/content/brands/shipshitshow` (see `editing/README.md`).
- `editing/scripts/README.md` — which edit scripts are tracked (shorts, host matte) and which 261111 build scripts exist only in the content tree, episode-agnostic vs episode-specific.

## Skills
- `skills/` — show-specific runtime skills (prep, cues, hooks, clips, chapters, metadata, linkedin, x, thumbnails, coach, growth-review, plus recap, dialogue, library, overlays for editing)
- `.agents/skills/` — show skill discovery links and dev skills (debug, refactor, review); symlinked to .claude/skills and .codex/skills
- `scripts/skills.sh` — skill installer (pulls from github.com/shipshitshow/skills)
