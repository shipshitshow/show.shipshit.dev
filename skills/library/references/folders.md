# Local media library contract

Map an existing workspace first. New libraries organize by recorded episode: the
recording is stored once, and every deliverable cut from it is its own project.

```text
assets/                         shared licensed logos, host photos, music
raws/                           inbox for footage not yet assigned to an episode
_labs/<slug>/                   branding and motion experiments (projects)
projects/<YYMMDD>/              one recorded episode, keyed by recording date
  episode.json                  episode identity, source and published IDs, links
  raws/                         original recording and raw transcript/captions
  video/                        long-form edit (recap) project
  shorts/<NN-slug>/             one project per Short
```

Every project (`video/`, each Short, each lab) has the same folders:

```text
<project>/
  project.json                  id, kind, status, current revision, artifacts
  raws/                         deliverable-only sources; usually empty
  assets/                       project-specific media and treatment recipes
  outputs/                      current working project/export
    previews/                   review-only renders
    work/                       disposable intermediate files
  versions/vNNN/                meaningful snapshots
  final/                        approved native project/export, transcript, captions,
                                cuts, description context, audio treatment, manifest
```

`episode.json` records stable episode identity independently of folder or display names: recording date, source livestream ID, published long-form and Short IDs, recording and transcript paths, and links to the channel's prep notes when they exist. Deliverables read the recording from the episode's `raws/` rather than copying it. A Short is published on its own schedule, so it keeps its own versions and final; a portrait export can sit beside a `landscape/` variant in the same final.

Each manifest identifies the native project and final export, media references/hashes, tools/versions, treatment recipes and checks with dates. Preserve existing supported schemas; this guide does not replace the installed plugin's format.

Define work versus final explicitly. A technical render is not an approved final. Record playback, listening and source-meaning review independently. Preserve a replacement trail for a revised final. Use snapshots for milestones rather than every trivial adjustment; retain originals and reviewed finals. Version deletion requires a reviewed retention decision, never an automatic folder cleanup.

Public Git holds text, source/edited captions, manifests without private paths, cut maps and links. Recordings, bundled `.tsrct` archives and large exports stay in the media library. Shared assets carry provenance/rights and are referenced rather than duplicated unnecessarily.
