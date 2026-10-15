# Show branding

The maintained source is [the vault brand kit](https://github.com/shipshitshow/vault/tree/master/brand). It owns the identity, working tokens, inventory and production rules. Read it before creating a thumbnail, caption style, overlay, slate, cover or show-related web page.

| Job | Canonical reference |
| --- | --- |
| Name, mark, color, typography, photos | [Identity](https://github.com/shipshitshow/vault/blob/master/brand/identity.md) |
| Thumbnail, avatar, banner, cover, social, app page | [Applications](https://github.com/shipshitshow/vault/blob/master/brand/applications.md) |
| Captions, motion, broadcast layouts | [Editing](https://github.com/shipshitshow/vault/blob/master/brand/editing.md) |
| Select a file | [Inventory](https://github.com/shipshitshow/vault/blob/master/brand/inventory.json) |
| Export, status, approval and handoff | [Production](https://github.com/shipshitshow/vault/blob/master/brand/production.md) |

Full name: **Ship Sh!t Show**. Compact mark: **`SH*W`**, one horizontal line. Current direction uses broad readable lettering, black/white foundations, restrained red, approved host photography and modest repeated signatures. The red/black square JPG is a working asset; face-containing concept boards remain private and are excluded from the public kit. Exact tokens, type and application layouts still need production review.

Only the guides and standalone logo are authorized for this public kit. Private boards, original photographs, recordings and native editing projects remain in the established media library. Copy only required authorized assets and record kit revision, logo hash, actual fonts and approved deviations with the edit. Do not introduce machine-specific paths in public handoff.

## Keep adapters current

Public production skills own their canonical `profiles/shipshitshow.md` and synchronize standalone bundles through `scripts/sync-profiles.py`. This repository adapts those contracts:

```bash
python3 scripts/sync-content-skills.py --source /path/to/shipshitshow-skills
python3 scripts/sync-content-skills.py --source /path/to/shipshitshow-skills --check
```

The first command refreshes `skills/` and `skills/content-skills.lock.json`; the second checks drift. Use the permitted verification host for checks. Update the vault source and public profile first; do not hand-edit generated profile copies or create another palette here.

This documentation does not recolor the app, change an existing stinger, deploy the web mockups or update live channel artwork.
