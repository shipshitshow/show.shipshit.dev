# Show branding

The maintained source is [the vault brand kit](https://github.com/shipshitshow/vault/tree/master/brand). It owns the identity, working tokens, inventory and production rules. Read it before creating a thumbnail, caption style, overlay, slate, cover or show-related web page.

| Job | Canonical reference |
| --- | --- |
| Name, mark, color, typography, photos | [Identity](https://github.com/shipshitshow/vault/blob/master/brand/identity.md) |
| Thumbnail, avatar, banner, cover, social, app page | [Applications](https://github.com/shipshitshow/vault/blob/master/brand/applications.md) |
| Captions, motion, broadcast layouts | [Editing](https://github.com/shipshitshow/vault/blob/master/brand/editing.md) |
| Select a file | [Inventory](https://github.com/shipshitshow/vault/blob/master/brand/inventory.json) |
| Export, status, approval and handoff | [Production](https://github.com/shipshitshow/vault/blob/master/brand/production.md) |

Full name: **Ship Sh!t Show**. Baseline: **Think AI**, without a colon or trailing punctuation. The compact mark is the six-arm asterisk, replacing earlier lettering experiments. The validated 16 October 2026 direction uses charcoal #0D0D0D, white #FFFFFF, restrained red #E83B3B, compact bold typography and natural-color hosts against monochrome backgrounds. Main channel: black asterisk on red; clips: white asterisk on charcoal.

The deployed application is `apps/app`; `apps/web` is a retired stub. Its public homepage is dark by default, including browser-native controls and authentication surfaces. Space Grotesk is bundled once in the shared UI package for public, authentication, producer and desktop typography. Topic-card rendering loads the same Regular/Bold files. Font files and the OFL license are pinned to the [upstream source](https://github.com/floriankarsten/space-grotesk/tree/03507d024a01282884232081fc6011c09ff4e849); hashes live in `packages/ui/src/fonts/manifest.json`. Builds and image rendering do not download fonts at runtime. The horizontal full-name wordmark, favicon and social card reuse the same exact mark. Episode titles, dates and images come from the public episode library; do not reproduce placeholder analytics or metadata from concept boards.

Video signatures are white on dark (black on light); livestream signatures are red. Use the identical 96px mark viewport at x1136/y576 on a 1280x720 canvas: bottom and right insets of 48px. Scale all coordinates uniformly. No dots, waves, box or font-glyph substitutes. Website card signatures use the same proportional placement. When a published thumbnail gains its own baked-in signature, do not add a second one in the website presentation.

After saving a signed thumbnail in YouTube Studio, add its video ID to `apps/app/src/lib/data/branded-thumbnails.json`. The homepage skips its presentation overlay for those published IDs and retains the fallback signature for older artwork. Register only saved uploads, not concepts or pending test variants. If an upload later loses its baked-in signature, remove its ID in the same handoff.

YouTube can show viewers a title or thumbnail experiment variant while the public API/feed returns the default. Check the experiment in Studio before treating that difference as a synchronization defect. Preserve active tests during a branding rollout; back up completed results before an explicitly approved replacement that deletes their history.

`BrandMark` is the application silhouette (three identical 20x88 bars in a 96px viewport at 0/60/120 degrees). Never use a static portrait/vector layout instead of requested imagegen thumbnail artwork; exact logos and signature overlays are production layers. Main topic logos retain official colors while image backdrops remain B&W/charcoal.

The show uses red as its primary action/identity color; the commercial shipshit.dev site uses black and white. The asterisk and compact typographic hierarchy connect them. The show uses Space Grotesk; the commercial site retains its approved Inter Tight headings, Inter body and JetBrains Mono utility type.

The homepage uses purpose-made website artwork at its native 3:2 aspect ratio, with no transform-based enlargement of the YouTube banner. Only finished website and social-card exports are packaged in `apps/app/public/brand/`. The high-resolution generation source, original portraits, character sheets and face-containing working boards remain private. Generating a web deliverable does not authorize publishing reference material or boards. Do not replace the image with another enlarged channel-art crop. The website composes the copy and portrait on a shared grid, with CSS edge gradients blending the studio background into charcoal. Keep the faces and shoulders clear; on mobile, place the full-width portrait below the copy.

Only the guides and standalone logo are authorized for this public kit. Private boards, original photographs, recordings and native editing projects remain in the established media library. Copy only required authorized assets and record kit revision, logo hash, actual fonts and approved deviations with the edit. Do not introduce machine-specific paths in public handoff.

The default Open Graph and Twitter card is the selected host-led “Think AI” artwork at `/brand/show-og-2026-10-16.jpg`, exported at 1200×630. It has no top-left wordmark and retains the red bottom-right asterisk. Both metadata formats use the versioned asset URL; `/api/og` redirects to it for older consumers. Topic-specific cards keep their existing source-grounded metadata.

## Shared web design source

`packages/ui/src/brand-tokens.json` is the synchronized snapshot of the vault contract (kit version 2026-10-16; the canonical token file is linked above). `scripts/sync-brand.py --source <vault-checkout>` updates it and generates `packages/ui/src/theme.css`. Consumers use semantic Tailwind/CSS tokens; server-only integrations use `@shipshitshow/ui/brand`. The shared `BrandMark` reads the same geometry, and the homepage imports the shared palette rather than redefining it. Producer-shell surfaces, chart defaults, terminal identity, action contrast and topic social cards use those same applicable tokens. Vendor and semantic status colors remain independent.

Run `bun run brand:check` on the permitted verification host or CI. It rejects generated token/theme drift, former brand reds, white-on-red primary action styles, a parallel homepage/shell palette and obsolete bundled profile rules. Color/text contrast is covered by a contract test. Update the canonical source and adapters in the same delivery when changing identity. Do not remove a guard to pass a local exception.

The retired `apps/web` homepage redirects to the live show site and is not a second brand definition. App branding belongs to the shared asterisk component, not a YouTube-shaped placeholder.

## Keep adapters current

Public production skills own their canonical `profiles/shipshitshow.md` and synchronize standalone bundles through `scripts/sync-profiles.py`. This repository adapts those contracts:

```bash
python3 scripts/sync-content-skills.py --source /path/to/shipshitshow-skills
python3 scripts/sync-content-skills.py --source /path/to/shipshitshow-skills --check
```

The first command refreshes `skills/` and `skills/content-skills.lock.json`; the second checks drift. Use the permitted verification host for checks. Update the vault source and public profile first; do not hand-edit generated profile copies or create another palette here.

The homepage rollout implements the validated identity in the live app. It does not change existing stingers or publish new artwork to the YouTube account. The shared commercial/show family has distinct wordmarks; shipshit.dev owns its commercial offers and the show links there for build enquiries.
## Surface coverage for future changes

| Surface | Shared source | Required check |
| --- | --- | --- |
| Public home and topic pages | Shared CSS theme, root font, `BrandMark` | Desktop/mobile layout, no duplicate signatures, native portrait ratio |
| Sign-in, access-denied, OAuth, missing-page and route-error screens | Root theme, `BrandPageShell` and app-scoped Clerk adapter | Dark fields, readable primary button, visible focus; producer gate retained; branded recovery links |
| Studio, analytics, research, topics, livestream/video details, comments, socials, leads and partnerships | Production shell, shared UI buttons/inputs/selects, semantic tokens | Navigation/deep-link behavior, shared surfaces/type, status/vendor colors preserved |
| Main/clip analytics and charts | Red main series, white clip series, shared muted/border tokens | Axis/tooltips readable; series labels remain meaningful |
| Public topic social cards and default metadata | Shared colors/fonts/mark; approved default image | 1200×630 output, source visibility, bounded source/footer text, OG/Twitter agreement |
| Desktop shell and terminal | Same UI theme, fonts and mark; utility monospace | Build/typecheck, focus, application title; desktop release packaging remains separate |
| Retired marketing app | Redirect to live show | No independent palette or old homepage copy |
| Content skills and agent context | Canonical profile and synchronized adapters | No obsolete active logo, placement or privacy instructions |

Historical specifications retain a visible superseded-design notice. A canonical brand change updates source tokens, generated adapters, applicable tests and this surface matrix together. Automated source checks do not replace a signed-in visual walkthrough of private data; report any unavailable authenticated coverage explicitly.

The auth adapter uses the supported [Clerk appearance variables](https://clerk.com/docs/js-frontend/guides/customizing-clerk/appearance-prop/variables), logo options and app-scoped labels. Shared provider dashboard names/logos must not leak into the show UI; account-wide configuration is separate.
