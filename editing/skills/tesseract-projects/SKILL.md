---
name: tesseract-projects
description: Organize this local Tesseract workspace, initialize media projects, preserve versions, and promote verified bundles to stable final paths.
---

# Consistent media projects

Read editing/README.md and the target project's project.json before changing its layout. Use scripts/workspace.py from the editing/ directory of the primary checkout; do not initialize an existing project again.

## Folder contract

Every project has raws, assets, outputs, versions and final. Originals and full-source transcripts go in raws. Reusable audio, keyframes, supplied references and briefs go in assets. Work renders, review samples and retained diagnostics go in outputs; processing data belongs in outputs/work. Save meaningful delivery snapshots under versions/vNNN. Keep current delivery filenames fixed: final/video.mp4, final/project.tsrct, final/transcript.{txt,md,srt,vtt}, final/cuts.{csv,md}, final/description-context.md and final/audio-treatment.md as applicable.

Create no empty fake deliverables. A design proposal can use outputs/images and have an empty final. Generated thumbnails stay in the show's dated Desktop archive; list them in external_artifacts rather than copying them into this workspace.

Create a new project atomically:

```sh
python3 scripts/workspace.py init 261006-recap --kind recap
```

Inspect and route existing sources before moving them. Record moves, update loose-file references and confirm native projects retain packaged resources. Never alter original media or edit .tsrct ZIP contents. Case-only folder renames on macOS need an intermediate name. Keep existing virtualenv paths working; existing .tesseract-work links are compatibility pointers to outputs/work.

## Delivery and versions

Author and review inside outputs. Write outputs/manifest.json after verification:

```json
{
  "schema_version": 1,
  "revision": "v004",
  "status": "ready",
  "artifacts": {
    "video": "outputs/video.mp4",
    "project": "outputs/project.tsrct",
    "transcript_srt": "outputs/transcript.srt",
    "cuts_csv": "outputs/cuts.csv"
  },
  "checks": {"video_decode": "passed", "dimensions": [1920, 1080]},
  "limitations": ["Audio audition unavailable in this run."]
}
```

Include only artifacts that exist. Artifact paths are relative to the project; external_artifacts contains absolute paths to external files. Record the actual dimensions, review results and limitations. Never mark review checks passed merely to enable promotion. Ready means ready for the declared handoff with its disclosed limits; exported does not imply subjective approval.

Promote locally with python3 scripts/workspace.py promote <project>. It copies independent snapshot files and switches final to the reviewed bundle. Do not write directly into a final file or overwrite a versions snapshot. Use a new revision if a snapshot already exists. For interrupted promotion, inspect .delivery-* and .previous-final before retrying; preserve the last complete bundle.

Run python3 scripts/workspace.py audit after structural changes. It checks paths and portable resource presence, not complete media integrity or editorial quality. Run ffprobe and appropriate native CLI/media checks separately. Return an absolute link to the stable final/video.mp4 and the matching project.
