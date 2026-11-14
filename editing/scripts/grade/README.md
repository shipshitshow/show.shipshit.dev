# Automatic colour correction (measured per recording)

`grade.py` corrects the host cameras of a livestream recording before the recap
and the Shorts are cut. There is no fixed look and no per-episode settings file:
every recording is measured and corrected from its own footage (owner, 14 Nov
2026). A host whose skin already reads inside the bands is left alone.

The recording is one 1920x1080 composite, so the tool works per layout and per
host box, and never touches the shared screen, the frames between layouts or
the audio.

Four steps, chained by `run`:

1. **layouts** reads every frame at quarter size and labels it two-shot,
   screen share or other, from the hard edges between the boxes.
2. **solve** samples each host's box in both layouts, measures the skin, and
   works out one correction per host that brings it onto the targets.
3. **render** applies each correction to that host's boxes only, switched by
   frame number at the layout boundaries, and writes a corrected copy next to
   the untouched original.
4. **measure** reads the corrected copy again and prints the same table, so
   the result is a number and not a guess.

## Use

```bash
PY=/usr/local/bin/python3   # needs numpy; ffmpeg and ffprobe on PATH or in Homebrew

$PY editing/scripts/grade/grade.py run <YYMMDD>          # everything, once per recording
$PY editing/scripts/grade/grade.py layouts <YYMMDD>      # layout scan only
$PY editing/scripts/grade/grade.py measure <YYMMDD>      # skin table of the recording
$PY editing/scripts/grade/grade.py measure <YYMMDD> --graded
$PY editing/scripts/grade/grade.py solve <YYMMDD>        # write the corrections, render nothing
$PY editing/scripts/grade/grade.py render <YYMMDD>       # render from the saved corrections
```

`<YYMMDD>` is an episode id or an episode folder. `--source PATH` uses another
recording than `raw/<id>.mp4`, `--samples N` changes the frames measured per
layout (12), `--crf N` the encode quality (16), `--force` replaces a corrected
file made from another source or correction.

| Output | |
|---|---|
| `raw/<id>.graded.mp4` | the corrected recording: same timeline, audio copied, original untouched |
| `out/grade/layouts.json` | the layout of every frame as runs, with frame totals |
| `out/grade/look.json` | the measured skin per host before and after, and the correction chosen |
| `out/grade/render.json` | what the corrected file was made from (source, quality, corrections) |
| `out/grade/measure-graded.json` | the skin table of the corrected file |

`render` is skipped when the corrected file already matches the source and the
corrections. After a run, look at one two-shot frame and one screen-share frame
before cutting.

## How the builders pick it up

`workspace.graded_source()` returns the corrected sibling of a recording when
it exists and is not older than the recording. The chapter runner and the
Shorts scripts resolve their source through it, so both use the corrected copy
with no flag. A corrected file older than the recording is ignored with a note
on stderr. To cut from the uncorrected recording, remove the corrected file, or
pass `--source` to the Shorts scripts. The chapter cache is keyed on the source
file, so switching invalidates cached chapter renders by itself.

## What it measures and changes

- **Layouts.** Three edge strengths per frame: the split between the two
  hosts, the split between the two host tiles, and the left edge of the shared
  screen. A frame is two-shot or screen share only when its edges are clearly
  there; anything else (intro, transitions, full-screen cards) is "other" and
  stays ungraded. Runs shorter than 15 frames count as transitions.
- **Skin.** A fixed skin-chroma mask over the top three quarters of a host box
  gives the median skin colour. Two numbers are read from it: luma (0..255,
  bt709) for exposure and red/green for colour cast.
- **Targets.** Skin luma band 100 to 150, target 120. Skin red/green band 1.28
  to 1.50, target 1.42. These are tool defaults, not edit rules.
- **Exposure.** One gamma on all channels, rendered as curve points. A lift
  keeps the blacks pinned so shadow noise is not raised with the face. Limits
  0.45 to 1.8; past them the lighting is beyond what a grade should do.
- **Colour.** Only if red/green is still outside its band after the exposure
  fix: one midtone balance from red towards cyan (or back), limit 0.3. No
  automatic saturation change.
- **Host match.** The run flags a luma ratio above 1.4 or a red/green
  difference above 0.15 between the hosts. It is a flag, not a correction: the
  hosts' skin tones differ for real.

## Result on the 11 Nov 2026 livestream

Measured by the tool on the full recording (41 min 47 s, 75,199 frames):

- Layout scan: 18 runs. Two-shot 25,320 frames, screen share 47,980, other
  1,899 left ungraded. About 6 minutes.
- Vincent before: skin luma 68.6, red/green 1.58 (dark and red). Corrected
  with an exposure curve only; no colour balance was needed. After, on the
  full corrected file: luma 120.9, red/green 1.29.
- Mitchell: luma 139.3, red/green 1.34, inside both bands, left alone.
- Host gap after: luma ratio 1.15, red/green difference 0.06, no flag.
- Render of the whole recording: about 9 minutes, about 4.8 times faster than
  real time. The corrected file is about as large as the original.

On a 35 s excerpt the correction switched on and off on the exact frame at
each layout boundary, and the other host's side differed only by encode noise.

## Known limits

- **Skin, not white balance.** No neutral reference is in frame, so the tool
  balances on skin. A host with an unusual skin tone or heavy coloured light
  can land outside the bands for honest reasons; read the table.
- **One colour axis.** The colour fix moves red against cyan only. A green or
  magenta cast is not corrected.
- **Fixed skin mask.** A face that is very far off may not register as skin at
  all. That host is then left alone and the table says no skin was found, so
  read the table. The run stops only if skin disappears once a correction is
  applied.
- **Band edges.** Vincent's two-shot samples alone read red/green 1.27 after
  the fix, a hair under the band, while both layouts together read 1.29. One
  correction per host is a compromise across layouts.
- **Two layouts.** Only the two-shot and the screen share are graded, at fixed
  box positions for a 1920x1080 composite. A new layout needs its boxes added.
- **One more encode.** The corrected copy is a re-encode at crf 16, so every
  cut made from it is one generation further from the original.
- **Checked by meter and stills.** The result was measured and spot-checked on
  stills and two short clips, not watched end to end.
