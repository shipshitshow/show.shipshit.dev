# Library

Producer-only app at /library/*, with Library in the rail. There is no /library overview page; the rail opens Thumbnails. One place to browse what the show makes and reuses.

| Path | What it holds | Source |
| --- | --- | --- |
| /library/assets | Logos, people, products, branding and style references used as thumbnail render inputs | Local lab folder (`THUMBNAIL_LAB_DIR/resources`). Never committed or uploaded; add-buttons are hidden on deployments |
| /library/artifacts | Timelines and tweet slideshows made for livestreams | `src/lib/artifacts/registry.ts`, public pages at /artifacts |
| /library/thumbnails | Review of every thumbnail and cover (the former Thumbnail Lab) | Thumbnail Lab catalogue |
| /library/titles | Live titles against the one-line rule, with drafts (the former Titles Lab) | Titles snapshot in Redis |
| /library/covers | 9:16 artwork for Shorts | Same catalogue, items whose format is `short` |

Covers are not a separate store. A Short cover is a thumbnail item with `format: 'short'`, so it shares versions, approval and the revision flow with every other thumbnail and differs only in spec (9:16, red asterisk centred at x940/y405, per `vault/brand/placement.md`). The library splits the catalogue into two views; the Thumbnail Lab stays the place to review, approve and upload. YouTube accepts a custom Short cover only from the phone app, so covers are downloaded from here and uploaded from there.

The old /labs pages are deleted, with no redirects.
