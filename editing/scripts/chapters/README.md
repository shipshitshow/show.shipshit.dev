# Chapter runner

`run_chapters.py` cuts a recap one chapter at a time, so the owner can review and fix a chapter on its own (Gate 2b in the vault page `brand/editing.md`), and joins the approved chapters into the full recap. It replaces the per-episode plan script for the simple case. Contract and code only: no media, no absolute paths. Run it on the Mac Studio.

```bash
python3 editing/scripts/chapters/run_chapters.py plan    <episode>             # validate, print durations and status
python3 editing/scripts/chapters/run_chapters.py chapter <episode> 2           # render chapter 2 (only if its inputs changed)
python3 editing/scripts/chapters/run_chapters.py all     <episode>             # render every changed chapter
python3 editing/scripts/chapters/run_chapters.py stitch  <episode> [--draft]   # join chapters + outro
```

`<episode>` is the episode folder or its id (`<YYMMDD>`, resolved by `workspace.py`). `--height 720` (default, review copy) or `--height 1080`. `--force` re-renders even when nothing changed. `plan --vault <path to brand/editing.md>` warns if the vault page no longer contains the rule numbers copied into `RULES` at the top of the script.

## Input: `<episode>/chapters.json`

Next to `episode.json`:

```json
{
  "schema_version": 1,
  "source": "raw/261111.mp4",
  "outro": { "ss": 2494.5, "dur": 12 },
  "caption_fixes": { "vibe edit": "vibe-edit" },
  "chapters": [
    { "id": "intro", "title": "Intro", "start": "0:32", "end": "1:12", "notes": "" },
    { "id": "vibe-editing", "title": "Vibe editing", "start": "1:12", "end": "1:52", "drop": [["1:30", "1:34"]], "denoise": false, "approved": false }
  ]
}
```

- Times are **source** seconds or `MM:SS` / `H:MM:SS`. `source` defaults to `raw/<episode id>.mp4`.
- `drop` removes a span from inside the chapter (a cut); `outro` is the goodbye in the source (`ss`, `dur`, optional `src`).
- `approved` flips to `true` after the owner approves the chapter. `stitch` refuses anything unapproved unless `--draft`.
- `title`, `notes` and `approved` are not part of the cache key; editing them never triggers a re-render.

## Output

In `<episode>/out/chapters/`: `NN-<id>-<h>p.mp4` per chapter, a `.srt` beside it, and `.work/` (intermediates, loudness and hash record). `stitch` writes `<episode>/out/recap[-draft]-<h>p.mp4` plus `.srt`, and a report in `.work/`. Every render still goes to the thread as a playable copy under 90 MB; the script warns above that.

A chapter is re-rendered only when its inputs change: the source file, its segments, the denoise flag, the music file, the chapter's start position in the recap (the music bed offset), the rule values and the script version. Changing one chapter's length shifts the later chapters' music offset, so those redo audio and captions (seconds) but not video.

## What each chapter gets (rules from `brand/editing.md`)

- Plate: the raw frame as is, 60 fps, 720p/1080p, SAR 1:1, bt709 tv range.
- Dialog: 15 ms fades at every cut, high-pass 80 Hz, optional `afftdn` (`"denoise": true`).
- Voice chain on the clean dialog (owner, 14 Nov 2026): the level is measured and brought to -19 LUFS, then `acompressor` (ratio 3, threshold 3 dB above that level, attack 10 ms, release 150 ms, knee 4, no makeup gain), then `deesser` at intensity 0.5. The level step comes first because the de-esser and the compressor threshold depend on the absolute level, so the chain acts the same on every recording. These are tool defaults, not edit rules. Checked by meter on three stretches of the 11 Nov 2026 livestream at the master level, not auditioned: loudness range from about 6 to about 4.7 LU, loudest sibilant frame 2 to 6 dB lower. The de-esser is deliberately mild; listen before raising it. The music bed level follows the processed dialog.
- Music: "On The Flip", seamlessly looped, ducked under speech, about 28 dB under the voices, 0.5 s fade-in on the first chapter only; the bed is positioned by the chapter's place in the recap so it is continuous across chapters.
- Master: two-pass `loudnorm` to -14.5 LUFS, true peak limited to -1.5 dBTP. Measured values are written to the meta file and flagged when off.
- Captions: whisper `small.en` on the clean dialog, ASR name fixes (Claude, Claude Code, Grok, PHP, Cloudflare, Ship Sh\*t Show, plus `caption_fixes`); every applied fix is in the meta file.

`stitch` joins the chapter clips and the outro (built with `_assets/outro/src/build_outro.py`) with one filter graph. At each chapter boundary it overlays `_assets/transitions/stinger-standard.mov` so its full-frame swap (frame 10) lands on the boundary, and mixes its whoosh. The outro joins with a hard cut. The output gets a -1.5 dBTP limiter.

## Not in v1 (use the per-episode scripts for these)

- Matte, b-roll and mascot layers (the host matte in `../matte/` is only needed with background overlays).
- J/L split edits, and the music lift under the goodbye and end screen.
- An independent caption-sync check (captions come from the clip's own audio, and the joined SRT is shifted by clip length, not re-transcribed). A product name split across two cues is not fixed.
- Whisper output here has no punctuation or capitalisation beyond the name fixes.
- Per-chapter masters are not re-normalised across the stitch (the joined recap reads about 0.5 LU under the chapter target).
- The whoosh level (peak -19 dBFS) and the duck settings are starting values carried from 261111, not confirmed.
- Nobody has listened to any output.
