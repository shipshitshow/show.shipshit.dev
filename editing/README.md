# Editing workspace

Local editing, audio, transcripts, graphics and delivery for Ship Sh*t Show,
edited in Tesseract. This was the standalone `~/www/tesseract` workspace until
October 2026; it now lives here so show data and edits share one repository.

## What is tracked

This repository is public. Git tracks only the workspace contract: this README,
`AGENTS.md`, `scripts/workspace.py` and `scripts/shorts/`. Everything else under
`editing/` is ignored by an allowlist in the root `.gitignore`. Never force-add
media or project files from `editing/`, and keep the allowlist when changing
`.gitignore`.

## Where the media lives

Media is not in this repository. It lives in the brand's content tree, outside
any checkout:

```text
~/content/brands/shipshitshow/     # the media root (override: SHIPSHITSHOW_CONTENT_ROOT)
~/content/_labs/shipshitshow/      # experiments (override: SHIPSHITSHOW_LABS_ROOT)
```

Because `workspace.py` resolves these from the environment, it runs from any
checkout or worktree of this repository, not only a primary one. Set
`SHIPSHITSHOW_CONTENT_ROOT` to point it elsewhere (another machine, a test
fixture). `workspace.py --help` prints the roots currently in effect. The media
root has its own `README.md` with the layout and the old-to-new path map.

Not yet moved and still under `editing/` in the original checkout: `outputs/`
(shorts covers and audits), `thumbnail-masters/`, `sources/`, `assets/thumbnails/`
and the thumbnail scripts, which `docs/thumbnail-lab.md` and
`docs/thumbnail-sources.md` describe. Historical work scripts and `work/` JSON
inside moved projects still contain absolute paths from earlier layouts
(`~/www/tesseract/...`, the old `editing/` tree); treat them as records.

## Layout

One folder per recorded episode, named `<YYYY-MM-DD>_<YYMMDD>`. The recording is
stored once per episode; every deliverable cut from it is its own project under
`out/`. Project ids in commands stay `<YYMMDD>/video`, `<YYMMDD>/shorts/<slug>`
and `_labs/<slug>`; the script maps them to folders.

```text
~/content/brands/shipshitshow/
  README.md             layout and the old-to-new path map
  projects/<YYYY-MM-DD>_<YYMMDD>/
    episode.json        episode identity and links to the rest of the show data
    project.md          hand-off notes for the episode
    raw/                stream recording and full-source transcript, stored once
    out/video/          long-form edit (recap) project
    out/shorts/<NN-slug>/   one project per short
    out/shorts/_archive-*/  superseded collection material, not a project
    prompts/            generation prompts and briefs, when kept
  _assets/              shared originals: profile/ (host photos), logo/, banner/,
                        fonts/, music/, docs/, references/
  _archive/             recovered downloads and transcripts, kept for reference
~/content/_labs/shipshitshow/<slug>/   branding, motion and design experiments
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
  "recording": "raw/261013.mp4",
  "youtube": {"livestream": "M1EEEl4M6-4", "video": null, "shorts": {}},
  "transcripts": ["raw/transcript.vtt"]
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
                        in the episode's raw/)
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
`_assets/profile/` in the media root, never from a previously generated face.

## Commands

Run from `editing/` in any checkout; the media root comes from
`SHIPSHITSHOW_CONTENT_ROOT` (default `~/content/brands/shipshitshow`). `init`
creates the episode (`episode.json`, `raw/`, `out/`) on first use and infers the kind (`recap` for
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
