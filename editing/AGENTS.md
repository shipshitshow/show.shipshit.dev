# Editing workspace

Read `README.md` before reorganizing or starting an edit. Media lives only in the
primary checkout's `editing/` and is ignored by Git; this repository is public, so
never force-add anything here beyond the tracked contract.

Use these skills when the request matches:

| Request | Skill |
| --- | --- |
| Create/organize a project, version or locate a delivery | `skills/tesseract-projects/SKILL.md` |
| Edit a livestream, remove fillers, extract transcripts or list preview cuts | `skills/tesseract-recap/SKILL.md` |
| Denoise, dereverb, repair clicks, mix quiet music or improve dialogue | `skills/tesseract-dialogue/SKILL.md` |
| Create/revise recap thumbnails, host likeness or channel branding | `skills/tesseract-thumbnails/SKILL.md` |

Preserve original media in `raws`. Save the current working bundle in `outputs`,
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

Follow the show's canonical Desktop thumbnail archive. Use original host photos
for identity, current channel examples for style, and exact supplied brand marks.
Do not propagate face degradation through repeated generations.
