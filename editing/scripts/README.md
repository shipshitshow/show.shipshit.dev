# Editing scripts: what is tracked, what exists elsewhere

Only a small part of the edit pipeline lives in this repository (the repo is public; media and project files stay in `~/content`, see `../README.md`).

## Tracked here

| Path | What it is |
|---|---|
| `workspace.py` | resolves the content/labs roots; runs from any checkout |
| `shorts/` | Shorts build scripts (own README) |
| `matte/` | host matte: Apple Vision person segmentation (`vmatte.swift`) plus `matte_post.py` (own README) |

## What exists for the 261111 episode (not tracked)

The 261111 episode was built by one-off scripts in its work folder, `~/content/brands/shipshitshow/projects/2026-11-11_261111/out/video/outputs/work/`. They are not copied here: nearly all hard-code that episode's absolute paths (raw file, project folder, a per-session scratch folder for chunks, matte and test renders) and its editorial decisions. Treat the folder as the record of how 261111 was made. Everything below was read on 2026-11-13; "episode-agnostic" means the logic would work on another episode once its paths and inputs are parameterised, not that it already does.

Pipeline order: ASR, cuts, plan, audio, captions, render, EDL. Versions v1 to v4 are earlier iterations; `*_final` and `*_v4` are the last ones.

| Script(s) | Verdict | Why |
|---|---|---|
| `matte_post.py` | **agnostic** (now tracked in `matte/`) | takes input and layout as arguments; only the lower-third boxes are 261111's |
| `build_audio_v4.py` (earlier `build_audio*.py`) | **nearly agnostic** | the mastering chain is generic: highpass 80 Hz, light `afftdn`, fixed gain to -14 LUFS, limiter at -1 dBTP, end fade, noise-floor check; but the project path, scratch path and the stinger whoosh count (4) are hard-coded and it reads `stage_audio_v4` |
| `build_final.py` (renderer) | **nearly agnostic** | generic shot renderer: plate, b-roll/mascot overlays, matted hosts, foreground overlays, from a plan JSON; hard-codes the scratch and `vmatte` binary paths, 30 fps, the X-layout crop, and imports the raw path and encoder spec from `build_v1.py` |
| `build_edl_final.py` | **nearly agnostic** | writes EDL csv/json from the plan JSON; project path and the chapter names list are 261111's |
| `asr_chunks.py` | **nearly agnostic** | 24 s whisper-cli chunker; total duration (508.2 s) hard-coded |
| `asr_v3.py`, `env_v3.py` | **helpers** | verbatim-leaning whisper text and RMS envelope for a source span; the raw path is hard-coded, the functions take times |
| `build_srt_final.py` | **episode-specific** | builds captions from this episode's word list, plan JSONs and ASR name fixes |
| `plan_final.py` (earlier `plan_v1` to `plan_v4`) | **episode-specific** | the edit itself as code: x-layout ranges, inserts, b-roll and mascot timings, end-screen source time, six chapters; the structure (pieces to plan JSON) is reusable, the content is not |
| `cuts_v1.py` to `cuts_v4.py`, `stage_audio*.py` | **episode-specific** | the cut list (source timestamps and the reasons) and the audio assembly that follows it |
| `build_v1.py` to `build_v4.py` | **superseded** | earlier renderers; `build_final.py` replaced them |
| `mascot_pos*.py`, `mascot_sheet.py`, `review_page.py` | **episode-specific** | review and placement helpers for this episode's overlays |
| `gen_subscribe.py`, `lift_subscribe*.py` | **one-off assets** | a placeholder subscribe pill, and a pill lifted from a previous recap video; the lifted pill sits in the project assets and is reused as is |

**Chapter split:** there is no standalone chapter-split script. Chapters are segment boundaries in the plan (`seg_starts` in `plan_final.py`), the chapter names are a list in `build_edl_final.py`, and the stingers/whoosh at each chapter start come from the same plan. Cutting an episode into individually edited chapters is not implemented as a tool; the 261111 edit was one timeline with chapter markers.

## If you rebuild this for another episode

1. Start from `matte/` (already generic) and the generic parts of `build_final.py`, `build_audio_v4.py`, `build_edl_final.py`.
2. Replace the hard-coded paths with `workspace.py` roots (`SHIPSHITSHOW_CONTENT_ROOT`); do not commit absolute home paths or media.
3. Write the plan (cuts, layout ranges, overlays) as data for the new episode rather than editing `plan_final.py`.
