# Editing workspace

Local editing, audio, transcripts, graphics and delivery for Ship Sh!t Show,
edited in Tesseract. This was the standalone `~/www/tesseract` workspace until
October 2026; it now lives here so show data and edits share one repository.

## What is tracked

This repository is public. Git tracks only the workspace contract: this README,
`AGENTS.md` and `scripts/workspace.py`. Everything else under
`editing/` is ignored by an allowlist in the root `.gitignore`: raw footage,
renders, native projects, transcripts, manifests, host photos, brand concept
boards and recovery archives. Never force-add files from `editing/`, and keep
the allowlist when changing `.gitignore`.

Media exists only in the primary checkout, at
`~/www/shipshitshow/show.shipshit.dev/editing`. Worktrees contain the tracked
contract but no media, so run edits and `workspace.py` from the primary
checkout. Historical work scripts and `work/` JSON still contain absolute
`~/www/tesseract/...` paths from before the merge; treat them as records.
Manifest `external_artifacts` were rewritten to the current locations.

## Layout

One folder per recorded episode, keyed by recording date. The recording is
stored once per episode; every deliverable cut from it is its own project.

```text
editing/
  projects/<YYMMDD>/
    episode.json        episode identity and links to the rest of the show data
    raws/               stream recording and full-source transcript, stored once
    video/              long-form edit (recap) project
    shorts/<NN-slug>/   one project per short
    shorts/_archive-*/  superseded collection material, not a project
  _labs/<slug>/         branding, motion and design experiments (projects)
  assets/               shared original host photos (pfps/) and logos
  raws/                 inbox for footage not yet assigned to an episode
  outputs/              workspace audits, migration records (legacy/)
  _archive-recovery/    recovered downloads and transcripts, kept for reference
```

`episode.json` links an episode to the rest of the show by its date key.
Repository paths are relative to the repository root; `recording` and
`transcripts` may also be relative to the episode:

```json
{
  "schema_version": 1,
  "id": "261013",
  "recording_date": "2026-10-13",
  "show_data": "apps/app/data/livestream/2026-10-13",
  "recording": "raws/261013.mp4",
  "youtube": {"livestream": "M1EEEl4M6-4", "video": null, "shorts": {}},
  "transcripts": ["raws/transcript.vtt"]
}
```

Fill in `youtube.video` and `youtube.shorts.<slug>` when a deliverable is
published. Every project (`video/`, each short, each lab) uses the same layout
and delivery filenames:

```text
<project>/
  project.json          id, kind, status, current revision and artifact paths
  README.md             editorial intent and review notes when useful
  raws/                 deliverable-only sources (often empty; the recording is
                        in the episode's raws/)
  assets/               reusable audio, references, keyframes and briefs
  outputs/
    video.mp4           current working render, when present
    project.tsrct       current working editable project, when present
    manifest.json       working bundle and readiness
    previews/           filmstrips, comparison samples and review stills
    work/               edit plans, JSON, processing scripts and diagnostics
  versions/v001/        independent snapshots; same delivery filenames
  final/
    video.mp4           current delivered render; no version suffix
    project.tsrct       matching portable editable project
    transcript.txt      also .md, .srt and .vtt for spoken videos
    cuts.csv            source/edit timestamp mapping; also cuts.md
    description-context.md
    audio-treatment.md  processing recipe and actual review limitations
    manifest.json       revision, artifacts, checks and external thumbnail paths
```

`outputs` is the working area. `final` contains only the current delivery. The
revision number belongs in the manifest and `versions/vNNN`, never in the
current delivery basename. Empty `final` folders are intentional for unfinished
projects. Design projects put image proposals under `outputs/images` and do not
need a video or editable project. A short's portrait export is its main
`video.mp4`; a landscape variant lives in `landscape/` beside it.

Generated YouTube thumbnails stay in the show's dated Desktop library
(`~/Desktop/thumbnails/<YYMM>/<YYMMDD>/`); `final/manifest.json` records their
paths as `external_artifacts`. Always refresh a face from the originals in
`assets/pfps/`, never from a previously generated face.

## Commands

Run from `editing/` in the primary checkout. `init` creates the episode
(`episode.json`, `raws/`) on first use and infers the kind (`recap` for
`video`, `short` for shorts, `design` for labs). A bare `audit` checks every
episode and project.

```sh
python3 scripts/workspace.py init 261020/video
python3 scripts/workspace.py init 261020/shorts/01-hook-name
python3 scripts/workspace.py init _labs/new-board --kind branding
python3 scripts/workspace.py audit
python3 scripts/workspace.py audit --project 261013/video
python3 scripts/workspace.py promote 261020/shorts/01-hook-name
```

Promotion requires `outputs/video.mp4`, `outputs/project.tsrct`, a new revision
such as `v004`, and an `outputs/manifest.json` with `status: "ready"`. It
snapshots the new bundle, preserves the previous final revision and switches
`final` locally. It does not upload or publish anything.

The audit verifies episode links (show data, recording, transcripts), layout,
listed artifacts, external paths, project document digests and packaged resource
sizes. It does not prove full decoding,
asset content digests, subjective audio quality or editorial correctness.

## Skills

Use the repository's synced editing skills; they are the canonical versions from
`shipshitshow/skills` (see `scripts/sync-content-skills.py`):

| Request | Skill |
| --- | --- |
| Create/organize a project, version or locate a delivery | `skills/library` |
| Edit a livestream into a recap, cuts, transcripts and chapters | `skills/recap` |
| Denoise, dereverb, repair clicks, mix quiet music | `skills/dialogue` |
| Illustrations, motion graphics and overlays on a recording | `skills/overlays` |
| Thumbnail concepts and revisions | `skills/thumbnails` |

They replaced the original `tesseract-projects`, `tesseract-recap`,
`tesseract-dialogue` and `tesseract-thumbnails` workspace skills. Rules specific
to this machine and workspace live in `AGENTS.md`.
