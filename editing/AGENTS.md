# Editing workspace

Read `README.md` before reorganizing or starting an edit. Media lives outside the
repository, in `~/content/brands/shipshitshow` (override with
`SHIPSHITSHOW_CONTENT_ROOT`); this repository is public, so never force-add media
or project files under `editing/` beyond the tracked contract.

Use the synced skills in the repository's `skills/`: `library` for folders and
versions, `recap` for edits, `dialogue` for audio, `overlays` for graphics and
`thumbnails` for packaging. `README.md` maps requests to them. Organize projects
with `scripts/workspace.py`, which works from any checkout or worktree.

Work per episode: `projects/<YYYY-MM-DD>_<YYMMDD>/` in the media root holds
`episode.json`, the recording in `raw/`, the long-form edit in `out/video/` and
one project per short in `out/shorts/<NN-slug>/`. Create deliverables with
`scripts/workspace.py init`; never copy the recording into a deliverable. Record published YouTube IDs in
`episode.json`.

Preserve original media in the episode's `raw/` (or a project's `raws/`). Save the current working bundle in `outputs`,
deliver at stable `final/video.mp4` and `final/project.tsrct`, and keep meaningful
snapshots in `versions/vNNN`. Keep temporary working data in `outputs/work`; avoid
new loose renders, transcripts and numbered exports at a project's root.

Use Tesseract for native editing; do not use Premiere unless Vincent explicitly
changes that choice. Preserve portable `.tsrct` archives through CLI operations,
never by editing their ZIP contents. Do not send footage to external services or
run paid generation as a side effect of organizing it.

Record completed checks and material limitations in the delivery manifest. An
export, waveform, ASR result or loudness meter is not proof that audio was heard.
Do not claim auditioning, studio sound or complete crackle removal without actual
listening. Keep the recorded model verdict tied to its recording date.

Thumbnails: save selected 1920x1080 JPG/PNG siblings and prompts in
`~/Desktop/thumbnails/<YYMM>/<YYMMDD>/` and list them in the project's
`final/manifest.json` `external_artifacts`. Use the originals in `_assets/profile/` in the media root
for host identity and rebuild a degraded face from the original, never from a
previous generation. Recaps use one host plus a logo/result and a short headline,
not the two-host livestream template.
