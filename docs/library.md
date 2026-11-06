# Library

Producer-only section at /library, with Library in app navigation. One place to browse what the show makes and reuses.

| Path | What it holds | Source |
| --- | --- | --- |
| /library/assets | Logos, people, products, branding and style references used as thumbnail render inputs | Local lab folder (`THUMBNAIL_LAB_DIR/resources`). Never committed or uploaded; add-buttons are hidden on deployments |
| /library/artifacts | Timelines and tweet slideshows made for livestreams | `src/lib/artifacts/registry.ts`, public pages at /artifacts |
| /library/thumbnails | 16:9 artwork for videos and livestreams | Thumbnail Lab catalogue (items whose format is `video` or `live`) |
| /library/covers | 9:16 artwork for Shorts | Same catalogue, items whose format is `short` |

Covers are not a separate store. A Short cover is a thumbnail item with `format: 'short'`, so it shares versions, approval and the revision flow with every other thumbnail and differs only in spec (9:16, red asterisk centred at x940/y290, per `vault/brand/placement.md`). The library splits the catalogue into two views; the Thumbnail Lab stays the place to review, approve and upload. YouTube accepts a custom Short cover only from the phone app, so covers are downloaded from here and uploaded from there.

/labs/thumbnails/resources redirects to /library/assets.
