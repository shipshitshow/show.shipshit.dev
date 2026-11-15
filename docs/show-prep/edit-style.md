# Edit style: build values

The edit rules (layout, pacing, opening, ending, motion, audio, Shorts and
covers) live in one place: the
[vault edit rules](https://github.com/shipshitshow/vault/blob/master/brand/editing.md).
If this page and that page disagree, the vault page wins. This page holds only
the build values and script names the vault page does not carry. Change a rule
in the vault page, not here.

Selection rules for which takes become Shorts stay in
[the editorial format](editorial-format.md) and the product marketing context.

## Shorts build values (9:16, 1080x1920)

Scripts are tracked in `editing/scripts/shorts/`: `align.py` for caption timing,
`stacked.py` for the stacked two-host render (the current layout), `build.py` for
the older 261103 single-speaker render, `finalize.py` for loudness (see its
README). Reuse them instead of re-deriving values. Which scripts exist and which
261111 build scripts live only in the content tree is in `editing/scripts/README.md`.

Status of the scripts: `stacked.py` renders the layout the vault page describes
(approved 261111 Short 01 v2): two 1080x960 panels, Vincent above Mitchell, hard
cuts, karaoke captions on the seam, the red asterisk, no title text and no cam
zoom. Default panel crops from the 261111 raw (1920x1080 two-shot): a 960x853
window per host, Vincent at x0 y0, Mitchell at x960 y100, scaled 1.125x; the name
labels start near y985, so a window ends above that. Per-episode override in
`short.json` (`crops.S`). It does not place b-roll or mascot beats; those and the
Related video link are separate steps. Caption, loudness and timing values below
apply to both layouts.

**Captions**
- Bold uppercase Arial Bold, at most 3 words (and about 19 characters) per chunk. `align.py` and `stacked.py` WARN on a longer chunk.
- Cap height about 62 px. Drop to 58 or 54 px only when a chunk would not fit.
- Shorts UI safe zone (1080x1920): captions stay inside x48–888, y288–1248, at most about 780 px wide and centred on
  x468 (the middle of that range), so nothing sits under the right rail or the title block.
- Thin dark outline (about 3 px) and a soft shadow, no box.
- Word timing: whisper `small.en` on the Short's own audio, snapped to real
  pauses with ffmpeg `silencedetect` (−32 dB, ≥0.2 s), so captions drop out when
  nobody speaks. The highlight steps word by word inside a chunk. The timing is
  heuristic: a person still checks it by ear.
- Caption position follows the vault Shorts layout (middle seam): `stacked.py`
  centres the line on y960 (inside the zone). The full-frame build in `build.py` puts
  the line at y1056 (55% down), moved up from y1480 on 15 Nov 2026.

**Overlays (asterisk, b-roll, mascot)**
- Graphics safe box x48–888, y400–1248 (below the header and chips, left of the right rail).
  The red asterisk is centred at x820 / y460 at 120 px; it was x940 / y290, under the chips
  and clipped by the right edge on a phone.
- Animations (b-roll, mascots, pops) are made natively for each format from the next episode
  (week of 22 Nov 2026): a 9:16 version inside the Shorts safe box and a 16:9 version for the
  long video, never a shrunken 16:9 clip in a Short. The published 261111 Shorts are not rebuilt.

**B-roll sizing**
- Crop or generate b-roll for 9:16 with the subject centred. A 16:9 crop that
  misses the subject is rejected; if the subject does not survive a vertical
  crop, generate a native 9:16 image. Real screen captures stay still.

**Loudness**
- Two-pass loudnorm: I=−14, TP=−1.5, LRA=11. After AAC encoding the 261103 Shorts
  measured −14.1 to −14.5 LUFS and −1.3 to −1.4 dBTP.
- Voice chain before the loudnorm, in the chapter runner and in `finalize.py`
  (added 14 Nov 2026; tool defaults, not an owner decision): the voice is
  measured and brought to −19 LUFS, then
  compressed (ratio 3, threshold 3 dB above that level, attack 10 ms, release
  150 ms, knee 4) and de-essed (ffmpeg `deesser`, intensity 0.5). The level step
  comes first so both act the same on every recording. `finalize.py` also adds
  the 80 Hz high-pass that Shorts did not have. Tool defaults, picked by meter
  on the 11 Nov 2026 livestream and not auditioned.

**Files**
- Each Short's `final/` folder keeps only `video.mp4`, `title.txt` and
  `description.txt` (plus `HOLD.txt` when a guest claim is held, with the reason
  in it). Move samples, older renders and work files to the Trash; never `rm`.
- Reference render and media root: `~/content/brands/shipshitshow` (media is
  gitignored).

**Cover stamp**
- `bun run thumbnail:stamp --format shorts` stamps the red asterisk at the
  placement-table spot (vault placement table).

## Recap build values (16:9)

- 16:9 safe zone (owner, 14 Nov 2026; the rule is in the vault's
  `brand/placement.md`): text, captions and readable UI stay inside a 5% margin
  on every edge (96 px at 1920×1080) and clear of the asterisk box (x1680–1824,
  y96–240) wherever the mark appears. Full-frame b-roll may fill the frame; its
  subject stays inside the margin.
- Chapters, gates, transitions, outro and the matte are in the vault page;
  scripts are in `editing/scripts/` (`matte/` for the host matte, `chapters/` for
  the chapter-by-chapter runner).
