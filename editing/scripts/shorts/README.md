# Shorts pipeline

Episode-agnostic scripts for the Shorts template: the stacked two-host layout (`stacked.py`, current) and the older 261103 single-speaker layout (`build.py`). The edit rules are in the [vault edit rules](https://github.com/shipshitshow/vault/blob/master/brand/editing.md), which now describe the stacked two-host layout; build values are in `docs/show-prep/edit-style.md`.
Ported from the 261103 `shorts/_work` v3d scripts (5 Nov 2026). Nothing here is tied to one
episode: everything episode-specific lives in `<episode>/out/shorts/<slug>/short.json` (episode = `~/content/brands/shipshitshow/projects/<date>_<YYMMDD>`, see `editing/README.md`).

| Script | Does |
| --- | --- |
| `align.py` | `--prep`: cut the Short's audio, run whisper, print numbered words. Then: map your caption chunks to word times and snap them to real pauses → `capsw.json`. |
| `stacked.py` | Stacked two-host 9:16 (Vincent above Mitchell, both always visible), karaoke captions on the seam, the red asterisk, hard cuts → `video-prenorm.mp4`. No title text, no zoom, no b-roll. |
| `build.py` | Older 261103 layout: crop the cam to one full-bleed speaker, add b-roll, the red asterisk and per-word captions → `video-prenorm.mp4`. |
| `finalize.py` | Voice chain (high-pass, level, compress, de-ess), then two-pass loudnorm (video copied) → `final/video.mp4`. Refuses to overwrite. |
| `common.py` | Shared helpers (not run directly). |

## Requirements (the edit machine)

- ffmpeg **full** build (`/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`, or set `$FFMPEG` / `$FFPROBE`).
- A Python with **Pillow**. Use `PY=/usr/local/bin/python3`; the default `python3` on that machine has no Pillow.
- `whisper-cli` on `PATH` and the model `~/.cache/whisper/ggml-small.en.bin` (`--model` to change).
- Headless Chromium for the asterisk (found in the Playwright cache; `--chrome PATH` or `$CHROME` to override),
  or `rsvg-convert` / ImageMagick as a fallback.
- Over non-interactive SSH, put Homebrew on the path first: `export PATH=/opt/homebrew/bin:$PATH`.

## Per-episode commands

Run from the repo root. `EP` is the episode folder, `SLUG` the Short's folder name (`NN-slug`).

```bash
export PATH=/opt/homebrew/bin:$PATH
PY=/usr/local/bin/python3
EP=${SHIPSHITSHOW_CONTENT_ROOT:-~/content/brands/shipshitshow}/projects/<date>_<YYMMDD>
SLUG=01-your-short
S=editing/scripts/shorts

# 0. write $EP/out/shorts/$SLUG/short.json with "source" and "segs" (schema below); leave "chunks" out for now
# 1. cut the audio, transcribe, print the numbered words
$PY $S/align.py $SLUG --episode $EP --prep
# 2. add "chunks" to short.json from those numbers, then time them to the audio
$PY $S/align.py $SLUG --episode $EP
# 3. quick still to check framing, captions and the asterisk (written to the work dir)
$PY $S/stacked.py $SLUG --episode $EP --still 5        # stacked two-host; use build.py for the 261103 single-speaker layout
# 4. full render, then loudness
$PY $S/stacked.py $SLUG --episode $EP
$PY $S/finalize.py $SLUG --episode $EP
```

`stacked.py` takes the same `short.json` and `capsw.json` as `build.py` and ignores per-seg `layout` / `tile` / `splits`
and `broll`. It warns when a seg falls outside a two-shot run of `$EP/out/grade/layouts.json` (check the stills then).
Tests: `python3 -m unittest discover -s editing/scripts/shorts` (CI runs them through `bun test` in `apps/app`).

Defaults: work dir `<short>/outputs/work/tmp_v3c`, pre-loudnorm render `<short>/outputs/work/video-prenorm.mp4`,
final `<short>/final/video.mp4`. B-roll PNGs are read from `$EP/out/video/assets/<asset>.png`. Override with
`--work`, `--out`, `--assets`, `--source`, `--config`. To rebuild without touching existing output, point
`--out` at `/tmp` (finalize refuses to overwrite `final/video.mp4`).

If whisper mistimes a word, correct it and re-run step 2:
`--fixes fixes.json` with `{"W": {"12": [3.40, 3.62]}}` (1-based word number, clip seconds).

## short.json

```json
{
  "source": "raw/<YYMMDD>.mp4",
  "segs": [
    {"a": 897.66, "b": 906.85, "layout": "A", "tile": "mitchell"},
    {"a": 907.45, "b": 915.07, "layout": "A", "tile": "mitchell"}
  ],
  "tail": 0.0,
  "chunks": [["WORDS IN THE CAPTION", [1, 2, 3, 4]]],
  "broll": [{"asset": "image-name", "a": 4.54, "b": 7.04, "cx": 712}]
}
```

- `source`: cam recording, relative to the episode folder.
- `segs`: source-second ranges, joined with hard cuts (18 ms audio fades at the joins).
  - `layout "A"` (default): one speaker, `tile` is `vincent` or `mitchell`.
  - `layout "B"`: two-up; `splits` lists source seconds where the crop moves, `speaker_turns`
    (`[[clip_start, clip_end, "V"|"M"], ...]`, clip seconds) and `default_speaker` say who is on at each point.
- `tail`: seconds to hold the last frame and pad the audio after the last word.
- `fadein0`: optional audio fade-in (s) at the very start, for a clip that opens mid-word.
- `chunks`: caption lines as `[text, [word numbers]]`; the numbers come from `align.py --prep`.
  Word count must match. Keep lines short enough to stay under 940 px.
- `broll`: cutaways in **clip** seconds; `asset` is a 16:9 PNG, `cx` the horizontal centre of the 9:16 crop in that PNG.
- `crops` (optional): per-episode override of the cam crops, `{"A": {"tiles": {...}}, "B": {"speakers": {...}}, "S": {...}}`.
  `A` / `B` defaults are the 261103 crops for the 1920×1080 cam (see `CROPS_A` / `CROPS_B` in `build.py`).
  `S` is the stacked layout: `{"w": 960, "h": 853, "V": [x, y], "M": [x, y]}`, one window per host (V on top, M below),
  each scaled to a 1080×960 panel; keys you leave out keep the defaults (`DEFAULT_CROPS` in `stacked.py`, measured on the
  1920×1080 two-shot of 11 Nov 2026: V at 0,0, M at 960,100). `w:h` must match 1080:960 within 1%, the window must sit
  inside the source, and it should end above y985, where the name labels start (a warning prints otherwise).

## Template values

Constants at the top of the scripts, from `docs/show-prep/edit-style.md`; change them in the style doc first.

- Red asterisk (`asterisk-red.svg`, `apps/app/public/brand/`): 120 px, centred at x940 / y290.
- Captions: Arial Bold, uppercase, cap height ~62 px, white with the spoken word in `#E83B3B`, nothing below y1570
  (YouTube Shorts UI zone). Centred on the seam (y960) in `stacked.py`, at y1480 in `build.py`.
- Stacked layout: two 1080×960 panels, SAR 1:1 / DAR 9:16, no title text, no zoom.
- Audio: voice chain, then `loudnorm I=-14 TP=-1.5 LRA=11`, two-pass, then AAC 192k / 48 kHz.
- Voice chain (added 14 Nov 2026; tool defaults, not an owner decision, the same values as the chapter runner): high-pass 80 Hz, level
  measured and brought to -19 LUFS, `acompressor` (ratio 3, threshold 3 dB above that level, attack 10 ms,
  release 150 ms, knee 4, no makeup gain), `deesser` at intensity 0.5. The level step comes first because the
  de-esser and the compressor threshold depend on the absolute level. A Short's audio is the voice only, so the
  chain runs on the whole track. Checked by meter on one 60 s stretch of the 11 Nov 2026 livestream, not
  auditioned: loudness range 5.5 to 4.4 LU, loudest sibilant frame 3 dB lower, true peak after AAC from +0.3 to
  -1.2 dBTP. The de-esser is deliberately mild; listen before raising it.
- Video: x264 crf16, 30 fps, yuv420p, `+faststart`.

## Notes

- Per-Short crops: the defaults are the v3d crops. The 261103 Short 01 `final/video.mp4` used a slightly different
  Mitchell tile (x 114, y 540 instead of 70, 540), so reproducing it needs
  `"crops": {"A": {"tiles": {"mitchell": [114, 540]}}}` in its `short.json`. Use `build.py ... --still 5` to check framing
  before a full render.
- Caption size steps down from cap height 62 to 58 / 54 / 50 until the line fits 940 px. A line such as
  "THEY'RE NOT GETTING" lands on 58 here. The 261103 Short 01 final shows it about 7% narrower (an earlier revision
  of the script), so a rebuild of that Short has slightly larger captions.

- Every render is deterministic given `short.json`, `capsw.json` and the source; keep `short.json` with the episode.
- The scripts never upload anything.
