# Dead-air and filler trimming

`trim.py` reads a transcript with word timings and the source media, finds dead air and filler words, and writes a cut list (EDL) plus an audit report. Dry-run is the default; `--apply` also renders the trimmed audio or video to a new file. It is step 1 of the edit automation: a first pass for the owner's rough-cut review (vault `brand/editing.md`, step 5 "filler removed, cuts on word boundaries"), not a replacement for it. Stdlib Python plus ffmpeg (an `ffmpeg-full` build is found like `shorts/common.py` does). Nobody listens to the output when the script runs: check the report, then listen to every join before using a cut.

```bash
python3 editing/scripts/trim/trim.py <words.json> <media> --episode <episode>             # report + EDL only, to <episode>/out/trim/
python3 editing/scripts/trim/trim.py <words.json> <media> --out DIR --start 120 --end 300  # a slice, any output folder
python3 editing/scripts/trim/trim.py <words.json> <media> --out DIR --apply                # also render DIR/<stem>.trim-v1.<wav|mp4>
python3 -m unittest discover -s editing/scripts/trim -p 'test_*.py'                         # tests (also run in CI)
```

`<words.json>` is whisper.cpp `-oj` output run with `-ml 1 -sow` (the same file `shorts/align.py` reads), or a list of `{w, s, e}` / `[s, e, text]`. A phrase-level transcript is rejected. `<media>` is any audio or video ffmpeg can read.

## Outputs

Both are named `<media stem>.trim-<version>.*` (`--version`, default `v1`). The script never overwrites the source, never writes inside a `final` folder, never replaces existing media, and refuses to replace an EDL or report unless `--overwrite` is given.

| File | Contents |
|---|---|
| `*.edl.json` | schema `shipshitshow.trim-edl/1`: tool and version, source (file, size, mtime, duration, fps), transcript hash, range, every threshold used, `cuts[]` (id, source start/end in seconds, duration, position in the trimmed output, reason codes, removed words, the words before and after, edge energy), `keep[]` (keep ranges in source time with their output offset), `refused[]`, totals by reason, and after `--apply` a `render` block with expected and actual duration |
| `*.report.md` | the same audit in a table: every cut with timestamp, duration, reason and surrounding words, the refused list, the thresholds, and the calm-cutting notes |

Later steps (cut audit, revisions log) read `keep[]` and `cuts[]`; `reasons` are stable codes: `dead-air`, `filler`, `filler-phrase`, `flagged-filler`. A cut with two codes is a filler inside dead air.

## What it cuts

| Kind | Rule | Default |
|---|---|---|
| Dead air | a quiet run of at least `--min-silence`; the cut leaves `--breath` of pause (half each side of the join) | 0.6 s, breath 0.25 s |
| Fillers | whole-word match, elongations collapse (`umm`, `uhh`, `hmm` match) | um, uh, er, ah, hmm (`--fillers`, `--no-fillers`) |
| Filler phrases | `--phrases "you know,i mean"` | off; a single risky word (`like`, `so`, `right`, ...) is refused here |
| Flagged fillers | `--flags FILE`: JSON list of word indexes or `{ "t": 83.4, "text": "like" }` | off; this is how "like" is cut, one occurrence at a time |

Other knobs: `--min-cut` (0.15 s, shorter cuts are dropped), `--snap` (0.06 s), `--noise` (dB, or `auto`), `--start/--end`, `--fps`, `--audio-only`, `--no-dead-air`.

## How it places cuts

Whisper stretches a word over the silence after it, so word ends are late and word gaps lie. The audio decides:

1. One ffmpeg pass gives a 5 ms RMS envelope (`astats`). The quiet threshold is the room's own floor (10th percentile of frame energy) plus 12 dB, clamped to -45..-32 dB, so steady background noise (fan, hiss) counts as silence (`--noise` overrides).
2. Dead air is a quiet run over `--min-silence`. Each cut edge moves to the lowest-energy frame boundary within `--snap` s of the target and keeps at least 38 ms of quiet to the nearest speech, so a cut never lands inside a word.
3. A filler is cut at its own burst of energy, padded into the quiet on both sides. It needs quiet on both sides: a filler that runs straight into the next word cannot be separated by timing alone.
4. Overlapping cuts merge (a filler inside dead air is one cut). With video, edges snap to the frame grid so audio and video stay the same length.
5. Every join gets the repo's 18 ms audio fade (`shorts/common.py` `AUDIO_FADE`).

**Never clip a word.** Before a cut is kept, it is checked against the transcript and the envelope. It is refused, listed under "Refused" and left in the audio when it would remove speech energy that belongs to another word (`clips-word`), when a transcript word inside it has no energy so the script cannot tell what it is (`silent-word`), or for a filler: its burst has no energy (`no-energy`), is fused with speech (`fused-with-speech`) or has no quiet gap beside it (`no-quiet-edge`, `no-quiet-frame`); `keep-too-short` covers a sliver of speech left between two cuts. Refusals are the safe outcome; a person decides them.

**Calm cutting.** The rulebook says no micro-cuts under about 0.5 s and cuts closer than 2 s apart are merged. With the default 0.6 s threshold and 0.25 s breath, a dead-air cut is 0.35 s or more, so many cuts fall under 0.5 s. The report lists them as a warning and does not change them: raise `--min-silence` (0.8 with the default breath gives cuts of 0.55 s or more) to follow the rule strictly.

## Apply mode

`--apply` renders with `atrim`/`trim` pieces joined by `concat` from a filter script, libx264 CRF 16 yuv420p plus AAC 192k 48 kHz for video, 16-bit wav for audio-only sources. It then probes the result and records expected vs actual duration in the EDL (`render.ok`, exit code 1 if they differ by more than 0.1 s). Render into a scratch or `out/trim/` folder, then take it through the normal grade and audio steps; the trim is not a final.

## Known limits

- Fillers are only as findable as the transcript: whisper often drops "um"/"uh" or fuses them into the next word, and the script cannot cut what it cannot separate (it reports a refusal). A sample of 3 minutes of real talk had 2 filler tokens and both were refused as fused with neighbouring speech.
- Steady noise is handled; a passing car, music or a laugh that is louder than the floor is treated as speech and left alone.
- Single-pass analysis loads the whole envelope in memory (about 200 frames per second of audio): fine for an episode, use `--start/--end` for very long files.
- Variable-frame-rate video is cut on its nominal grid and warned about; check lip sync after an apply.
