# Thumbnail Lab

Producer-only workspace at /labs/thumbnails, with Labs in app navigation. It covers the channel's imported video and livestream catalogue, approvals, revision requests, version history, live/recap comparisons, JPEG downloads and new variation uploads.

## Storage and access

All app pages and API handlers require producer access. Thumbnail review metadata and prompts use the existing producer storage adapter: namespaced Redis on deployments and a private, ignored local file in development. Writes compare item revisions atomically; stale imports and simultaneous reviews cannot overwrite newer decisions. A review export can be imported from the previous HTML workflow. App exports also carry the saved item revision, so stale feedback cannot overwrite a newer decision on the same artwork.

Image files use the existing CDN at cdn.shipshit.dev under shipshitshow/thumbnails/VIDEO_ID/SHA256.jpg. Images on the CDN are public by explicit owner choice; review notes, prompts and approvals stay private in the database. Object URLs are immutable, and existing versions are never overwritten.

New uploads accept unbranded 16:9 JPEG, PNG or WebP artwork under 4 MB. The server composites a six-arm asterisk in a 144×144 viewport at x1704/y72 on 1920×1080: white for video, #E83B3B for live. The resulting JPEG must be under 2 MB. Initial imports preserve the exact existing JPEG bytes and signatures.

## Runtime configuration

The existing Redis configuration is reused. CDN uploads require THUMBNAIL_LAB_S3_ACCESS_KEY_ID and THUMBNAIL_LAB_S3_SECRET_ACCESS_KEY, scoped to the existing CDN bucket. No secrets belong in Git. Region and bucket identity are explicit in the server asset adapter.

Development uses THUMBNAIL_LAB_DIR for private metadata and local assets. THUMBNAIL_LAB_USE_CDN opts development imports into CDN uploads. Without writable storage, saves are disabled; upload errors do not hide unsaved cards.

## Import

The wall accepts a private catalogue JSON or a previous review export through Import catalogue / review. Catalogue imports verify that every referenced image exists on the fixed CDN prefix before atomically inserting missing videos. Existing records and approvals are preserved on retry. Keep catalogue JSON private: it includes generation prompts and review history.

Run the app's thumbnail-lab:import command with --source pointing to a review artifact folder. It validates IDs, dimensions, JPEG limits and asset hashes before a --commit import. Preview reports counts without writes. Commit uploads immutable image files and atomically inserts only missing catalogue records; existing app decisions are preserved on retry. Set the intended producer backend and namespace explicitly.

## Review

Approve or request revision removes the card from To review only after the database confirms the write. Approved versions are immutable. Adding a variation creates a pending version while retaining approved history. History is read only; the current draft can be reviewed. Revision requests save feedback and a prepared generation prompt, which can be copied or exported. The app does not claim an image is generating until a new version is actually uploaded. No action publishes to YouTube, changes channel metadata or deletes experiments.

## Source cache

Reference originals live in the ignored editing/sources/thumbnails folder, with a manifest recording primary URL, retrieval date, content hash, role and transformations. Check the manifest and file hash before fetching an asset again. Company identities and product identities are distinct: Anthropic's company monogram is for company comparisons; the Claude sunburst is for Claude products/models. Do not silently substitute one for the other.
