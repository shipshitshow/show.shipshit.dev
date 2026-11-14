# Privacy and on-screen text sweep

`sweep.py` finds frames that show something that must not go out: keys, tokens, `.env` lines, emails, phone numbers, card or IBAN numbers, URLs with secrets, home-directory paths, and private names from your own denylist. It samples frames, OCRs them and writes a report. It never edits video, and it never prints or stores a full secret.

Why it exists: the audit lists "Automated privacy and text sweep before upload" as a new check to add (flag frames with readable personal data, keys or third-party names in screen shares before upload). Run it on the final master, review the flagged ranges by eye, fix what is real, then re-run on the fixed file.

## Run

```bash
python3 editing/scripts/privacy/sweep.py 261111 \
  --denylist ~/private/denylist.txt --allowlist ~/private/allowlist.txt \
  --interval 1 --blur
```

`video` is a file, an episode folder or an episode id (resolved like the other editing scripts, via `workspace.py`). Useful flags: `--start/--end` (scan a slice), `--interval` (seconds between frames, default 1), `--scene-threshold` (extra frames at scene changes, `0` disables), `--engine auto|vision|tesseract`, `--min-severity`, `--keep-frames`, `--out`.

Output goes to `<episode>/out/privacy/` (or beside the video), never into this repository; `sweep.py` refuses an `--out` inside the repo, because the frames contain the pixels it flags.

| File | Contents |
|---|---|
| `privacy-report.json` | per hit: `time`, `frame`, `category`, `severity`, `rule`, `preview` (first 3 characters plus length), pixel `box` `[x, y, w, h]`, OCR `confidence`; plus `ranges` and `blur_regions` |
| `privacy-report.md` | the same, readable, with the merged time ranges to review first |
| `frames/` | only frames that have hits (all frames with `--keep-frames`) |
| `privacy-blur.filter`, `privacy-blur.csv` | with `--blur` only |

## Config files

Both are plain text, one entry per line, `#` comments, passed by path. Committed `*.example.txt` files hold generic placeholders only; keep the real lists outside the repo.

- Denylist: private repo, client and internal host names. Whole-word, case-insensitive; `re:` prefix for a regex.
- Allowlist: public values to ignore (domains, `@domain`, exact emails, path prefixes, `re:`). The allowlist beats the denylist.

## Blur (never applied for you)

`--blur` writes an ffmpeg `filter_complex` and an EDL-style CSV of the flagged boxes. Apply it yourself, on the final master only:

```bash
ffmpeg -i final.mp4 -filter_complex "$(cat privacy-blur.filter)" -map "[vout]" -map 0:a -c:a copy blurred.mp4
```

Boxes are OCR token boxes, padded by `--blur-pad` pixels, and boxes that overlap across consecutive samples are merged into one region (so scrolling text gives one tall region). Regions are deliberately generous: a region can cover a neighbouring clean token and, when different hits sit at the same position in consecutive scenes, stay on a few seconds longer than the text. Always review the blurred result and re-run the sweep on it.

## OCR engine

Apple Vision through `vocr.swift` (compiled on first use with `swiftc -O` into `$XDG_CACHE_HOME/shipshitshow/vocr`, same approach as `../matte/`); falls back to `tesseract` when Vision is unavailable. macOS only for Vision.

## Tests

```bash
python3 -m unittest discover -s editing/scripts/privacy -p 'test_*.py'
```

Covers the pure logic (matchers, redaction, validators, deny/allow lists, range and box merging, blur filter). Test secrets are assembled at runtime from fragments so no secret-looking literal sits in the repository. CI runs them.

## Known gaps

- Detection is regex on OCR text. A secret that OCR misreads, or that is split across two OCR lines, is missed; recall on real positives is only proven on a synthetic clip, not on real footage.
- `long_secret` (hex of 32 or more characters except the 40-character git id, and high-entropy base64-like strings) is low severity and can be noisy; use `--min-severity medium` to hide it.
- Phone and email heuristics are untested on real positives.
- No frame de-duplication: a full 30 minute episode at `--interval 1` takes several minutes.
- Only visible text is checked: no audio, no metadata, no text in thumbnails or captions you have not rendered yet.
- Reports and frames hold the flagged pixels; keep them outside the repo and delete them when done.
