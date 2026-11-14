# Dual render

`dual.py` takes one finished master and writes two copies that share the same audio and the same quality: a clean YouTube copy with no captions, and an X/LinkedIn copy with the captions burned in. It is step 6 of the edit automation, after the package check (`../package/`). Stdlib Python plus ffmpeg (an `ffmpeg-full` build with libass is found like `shorts/common.py` does). Pillow is needed to fit the captions and is imported only then.

Nobody listens to the output when the script runs. Loudness is measured, not heard: listen to both copies before posting.

```bash
python3 editing/scripts/render/dual.py MASTER --captions FILE --out DIR [--profile landscape|stacked|full] [--caption-offset S]
python3 editing/scripts/render/dual.py --episode <dir|YYMMDD>      # master out/video/final/video-final.mp4 and its .srt
python3 editing/scripts/render/dual.py MASTER --captions FILE --out DIR --dry-run   # print the ffmpeg commands, write nothing
python3 -m unittest discover -s editing/scripts/render -p 'test_*.py'               # tests (also run in CI)
```

`--name` sets the file stem (default the master's), `--no-verify` skips the video hash and loudness re-measure, `--caption-offset S` adds seconds to every caption time (use `-300` when the master is a slice that starts at 300 s of the episode; captions outside the slice are dropped). It refuses to overwrite existing outputs.

## Outputs

| File | What it is |
|---|---|
| `<name>-youtube.mp4` | video stream copied from the master (no re-encode, no captions), the shared audio, `+faststart` |
| `<name>-x.mp4` | video re-encoded once (libx264 crf 16, preset medium, yuv420p, source size, frame rate and colour tags, no downscale and no size cap) with the captions burned in, the same audio stream, `+faststart` |
| `<name>-captions.ass` | the caption file the X copy was burned from |
| `<name>-audio.m4a` | the shared audio, only when it had to be normalised |
| `dual-report.json` | what was done and measured: caption extent and violations, loudness before and after for both files, video hash check, durations. `../package/check.py` reads its caption `extent` |

## Audio

One encode, muxed into both files, so the two copies cannot differ in sound. The target is the Shorts one: -14 LUFS integrated, true peak at most -1.5 dBTP (the same `finalize.py` measurement the Shorts use).

- Master already on target (integrated within 0.5 LU of -14, true peak at or below -1.45): its audio is copied unchanged.
- Otherwise: two-pass `loudnorm` (linear), `alimiter` with a -2.0 dB ceiling (the true peak lands under -1.5 after the AAC encode; a -1.5 ceiling measured -1.43), resample to 48 kHz, AAC 256k.

## Captions

Input formats, detected from the file: whisper.cpp `-oj` (word level, `-ml 1 -sow`), `words.json` (`[[word, start, end], ...]`), a Shorts `capsw.json` (`[[a, b, text, [[word, start], ...]], ...]`), or an SRT.

- With word timing: karaoke, white with the active word red.
- With an SRT: phrase times only, so plain white. There is no way to invent word timing from it.
- Style follows the Shorts: Arial Bold, uppercase, 3 px dark outline, soft shadow, at most 6 words or 32 characters per line, a new line after a 0.35 s pause. Rendered with the libass `ass` filter; the font size is the Shorts cap height converted to the ASS cell (cap height 48 gives a 48 px cap measured on the render).
- Zone: `../package/safezone.py`, the same definition the package check uses. Every chunk is measured, stepped down through the Shorts cap heights (48, 44, 40, 36), then split in two, until it fits; anything that still does not fit, or leaves the zone, makes the run exit 1 and is listed in the report.
- The profile defaults by orientation (landscape for a 16:9 master, the stacked Shorts layout otherwise).

## Verified and not

Checked by measurement on a 30 s slice of the 261111 master: the clean copy's video stream hash equals the master's; both copies measure the same loudness; the burned captions' cap height and centre match the zone, and stills show captions in the middle band clear of faces and name labels, with none in the clean copy. Not checked: audio by ear, X and LinkedIn's own upload limits and re-encoding, `stacked` and `full` renders (their commands are dry-run only), and word-level accuracy of a real whisper file (the karaoke path was exercised with synthetic word timing).

## Files

| File | What it is |
|---|---|
| `dual.py` | caption parsing and fitting, the ASS file, the audio decision, the ffmpeg commands and the CLI |
| `test_dual.py` | unit tests, stdlib only (Pillow measuring is injected), no media |
