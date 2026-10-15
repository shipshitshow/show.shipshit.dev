# Editing workspace

Local editing, audio, transcripts, graphics and delivery for Ship Sh!t Show,
edited in Tesseract. This was the standalone `~/www/tesseract` workspace until
October 2026; it now lives here so show data and edits share one repository.

## What is tracked

This repository is public. Git tracks only the workspace contract: this README,
`AGENTS.md`, `scripts/workspace.py` and `skills/`. Everything else under
`editing/` is ignored by an allowlist in the root `.gitignore`: raw footage,
renders, native projects, transcripts, manifests, host photos, brand concept
boards and recovery archives. Never force-add files from `editing/`, and keep
the allowlist when changing `.gitignore`.

Media exists only in the primary checkout, at
`~/www/shipshitshow/show.shipshit.dev/editing`. Worktrees contain the tracked
contract but no media, so run edits and `workspace.py` from the primary
checkout. Historical work scripts, manifests and the `260929` `audio-env`
virtualenv still contain absolute `~/www/tesseract/...` paths from before the
merge; treat them as records, not runnable entry points.

## Layout

```text
editing/
  projects/<project>/   one folder per edit; nested slugs are allowed
  raws/                 inbox for footage not yet assigned to a project
  assets/               shared original host photos (pfps/) and logos
  outputs/              workspace-level audits and migration records
  _archive-recovery/    recovered downloads and transcripts, kept for reference
```

Every project uses the same layout and delivery filenames:

```text
projects/<project>/
  project.json          status, current revision and artifact paths
  README.md             editorial intent and review notes when useful
  raws/                 original source media and source transcripts
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
need a video or editable project. Projects are named by recording date
(`261013/video`, `261013/shorts/<slug>`); exploratory work lives under
`projects/_labs/`.

Generated YouTube thumbnails stay in the show's dated Desktop library
(`~/Desktop/thumbnails/<YYMM>/<YYMMDD>/`); `final/manifest.json` records their
paths as `external_artifacts`. Always refresh a face from the originals in
`assets/pfps/`, never from a previously generated face.

## Commands

Run from `editing/` in the primary checkout. A bare `audit` checks every folder
that holds a `project.json`.

```sh
python3 scripts/workspace.py init 261020/video --kind recap
python3 scripts/workspace.py audit
python3 scripts/workspace.py audit --project 261013/video
python3 scripts/workspace.py promote 261020/video
```

Promotion requires `outputs/video.mp4`, `outputs/project.tsrct`, a new revision
such as `v004`, and an `outputs/manifest.json` with `status: "ready"`. It
snapshots the new bundle, preserves the previous final revision and switches
`final` locally. It does not upload or publish anything.

The audit verifies layout, listed artifacts, external thumbnail paths, project
document digests and packaged resource sizes. It does not prove full decoding,
asset content digests, subjective audio quality or editorial correctness.

## Skills

- [Project organization and versioning](skills/tesseract-projects/SKILL.md)
- [Livestream recap, chapters and transcripts](skills/tesseract-recap/SKILL.md)
- [Dialogue cleanup and quiet music](skills/tesseract-dialogue/SKILL.md)
- [Recap thumbnails and host likeness](skills/tesseract-thumbnails/SKILL.md)

These are the workspace's operational skills. The root `skills/recap`,
`dialogue`, `library` and `thumbnails` are the public, channel-generic versions
synced from `shipshitshow/skills`. `.agents/skills/tesseract-*` links here; edit
the files in `editing/skills/`.
