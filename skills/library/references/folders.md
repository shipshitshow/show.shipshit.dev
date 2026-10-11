# Local media library contract

Map an existing workspace first. New projects may use:

```text
assets/                         shared licensed logos, host photos, music
projects/<YYMMDD[-slug]>/
  project.json                  source identity, dates, derivative IDs
  raws/                         original recording and raw transcript/captions
  assets/audio/                 episode-specific media and treatment recipes
  outputs/                      current working project/export
    previews/                   review-only renders
    work/                       disposable intermediate files
    shorts/
      working/<slug>/           current portrait and optional landscape edit
      versions/vNNN/<slug>/     milestone snapshots
      final/<slug>/             approved media, captions, transcript, copy, cuts, manifest
  versions/vNNN/                meaningful long-form snapshots
  final/                        approved native project/export, transcript, captions,
                                cuts, description context, audio treatment, manifest
_labs/                          branding and motion experiments
```

`project.json` records stable episode identity, source IDs, recording date and published derivative IDs, independently of folder/display names. Each manifest identifies the native project and final export, media references/hashes, tools/versions, treatment recipes and checks with dates. Preserve existing supported schemas; this guide does not replace the installed plugin's format.

Define work versus final explicitly. A technical render is not an approved final. Record playback, listening and source-meaning review independently. Preserve a replacement trail for a revised final. Use snapshots for milestones rather than every trivial adjustment; retain originals and reviewed finals. Version deletion requires a reviewed retention decision, never an automatic folder cleanup.

Public Git holds text, source/edited captions, manifests without private paths, cut maps and links. Recordings, bundled `.tsrct` archives and large exports stay in the media library. Shared assets carry provenance/rights and are referenced rather than duplicated unnecessarily.
