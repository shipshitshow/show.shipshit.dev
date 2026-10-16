# Show branding

The maintained source is [the vault brand kit](https://github.com/shipshitshow/vault/tree/master/brand). It owns the identity, working tokens, inventory and production rules. Read it before creating a thumbnail, caption style, overlay, slate, cover or show-related web page.

| Job | Canonical reference |
| --- | --- |
| Name, mark, color, typography, photos | [Identity](https://github.com/shipshitshow/vault/blob/master/brand/identity.md) |
| Thumbnail, avatar, banner, cover, social, app page | [Applications](https://github.com/shipshitshow/vault/blob/master/brand/applications.md) |
| Captions, motion, broadcast layouts | [Editing](https://github.com/shipshitshow/vault/blob/master/brand/editing.md) |
| Select a file | [Inventory](https://github.com/shipshitshow/vault/blob/master/brand/inventory.json) |
| Export, status, approval and handoff | [Production](https://github.com/shipshitshow/vault/blob/master/brand/production.md) |

Full name: **Ship Sh!t Show**. Baseline: **Think AI**, without a colon or trailing punctuation. The compact mark is the six-arm asterisk, superseding `SH*W` lettering. The validated 16 October 2026 direction uses charcoal #0D0D0D, white #FFFFFF, restrained red #E83B3B, compact bold typography and natural-color hosts against monochrome backgrounds. Main channel: black asterisk on red; clips: white asterisk on charcoal.

The deployed application is `apps/app`; `apps/web` is a retired stub. Its public homepage is dark by default, including browser-native controls and authentication surfaces. Space Grotesk is the homepage font. The horizontal full-name wordmark, favicon and social card reuse the same exact mark. Episode titles, dates and images come from the public episode library; do not reproduce placeholder analytics or metadata from concept boards.

Video signatures are white on dark (black on light); livestream signatures are red. Use the identical 96px mark viewport at x1136/y576 on a 1280x720 canvas: bottom and right insets of 48px. Scale all coordinates uniformly. No dots, waves, box or font-glyph substitutes. Website card signatures use the same proportional placement. When a published thumbnail gains its own baked-in signature, do not add a second one in the website presentation.

`BrandMark` is the application silhouette (three identical 20x88 bars in a 96px viewport at 0/60/120 degrees). Never use a static portrait/vector layout instead of requested imagegen thumbnail artwork; exact logos and signature overlays are production layers. Main topic logos retain official colors while image backdrops remain B&W/charcoal.

The show uses red as its primary action/identity color; the commercial shipshit.dev site uses black and white. Shared typography and the asterisk connect them without giving both brands the same primary palette.

The homepage uses purpose-made website artwork at its native 3:2 aspect ratio, with no transform-based enlargement of the YouTube banner. Only the finished website JPG is packaged in `apps/app/public/brand/`. The high-resolution generation source, original portraits, character sheets and face-containing working boards remain private. Generating a web deliverable does not authorize publishing reference material or boards. Do not replace the image with another enlarged channel-art crop. The website composes the copy and portrait on a shared grid, with CSS edge gradients blending the studio background into charcoal. Keep the faces and shoulders clear; on mobile, place the full-width portrait below the copy.

Only the guides and standalone logo are authorized for this public kit. Private boards, original photographs, recordings and native editing projects remain in the established media library. Copy only required authorized assets and record kit revision, logo hash, actual fonts and approved deviations with the edit. Do not introduce machine-specific paths in public handoff.

## Keep adapters current

Public production skills own their canonical `profiles/shipshitshow.md` and synchronize standalone bundles through `scripts/sync-profiles.py`. This repository adapts those contracts:

```bash
python3 scripts/sync-content-skills.py --source /path/to/shipshitshow-skills
python3 scripts/sync-content-skills.py --source /path/to/shipshitshow-skills --check
```

The first command refreshes `skills/` and `skills/content-skills.lock.json`; the second checks drift. Use the permitted verification host for checks. Update the vault source and public profile first; do not hand-edit generated profile copies or create another palette here.

The homepage rollout implements the validated identity in the live app. It does not change existing stingers or publish new artwork to the YouTube account. The shared commercial/show family has distinct wordmarks; shipshit.dev owns its commercial offers and the show links there for build enquiries.
