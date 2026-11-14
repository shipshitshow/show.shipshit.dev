# Package check

`check.py` checks the release package of an episode before upload: the title, the tweet, the five Shorts, the three thumbnails and the burned-caption safe zones. It is step 5 of the edit automation (after the cut audit, `../cutaudit/`). It reports; it never edits, renders or uploads. Stdlib Python; `ffprobe` only with `--probe`.

Nobody watches or listens to anything when it runs. It reads names, lengths, text and (with `--probe`) durations and sizes. A PASS means the package meets the written rules, not that the title is good or the tweet reads well.

```bash
python3 editing/scripts/package/check.py --package package.json [--episode <dir>] [--out DIR] [--probe] [--strict]
python3 editing/scripts/package/check.py --episode <dir> --probe        # title and Shorts from <dir>/upload-plan.json only
python3 -m unittest discover -s editing/scripts/package -p 'test_*.py'  # tests (also run in CI)
```

Output: `package-check.json` and `package-check.md` (PASS / WARN / FAIL per check, each with the rule it cites) in `--out`, by default next to the package file, else `<episode>/out/package/`. Exit code 1 if any check FAILs (`--strict` also fails on WARN), 0 otherwise. Relative paths in the package resolve against `--episode`, else the package file's folder.

## Input: `package.json`

```json
{
  "episode": "261111",
  "title": "Video Editing Is DEAD, And Claude Killed It",
  "episode_link": "https://youtu.be/<id>",
  "tweet": { "text": "Cut a 10 minute episode with one prompt. #videoediting", "first_reply": "Full episode: https://youtu.be/<id>?utm_source=x&utm_medium=social" },
  "shorts": [
    { "id": "01", "title": "...", "file": "shorts/01.mp4", "duration_s": 58.2, "layout": "stacked", "captions": { "cap_h": 48, "cy": 960, "width": 900 } }
  ],
  "thumbnails": ["thumbs/a.png", "thumbs/b.png", "thumbs/c.png"],
  "x_copy": { "file": "out/dual/video-final-x.mp4", "report": "out/dual/dual-report.json" }
}
```

Every field is optional; what is missing is reported (FAIL for a missing title or tweet, WARN for a missing optional detail), not guessed.

- `shorts[].layout` is `stacked` (default) or `full`. `captions` is either a declared `{cap_h, cy, width}` or a measured `{extent: [x0, y0, x1, y1]}`.
- `x_copy.report` is the `dual-report.json` written by `../render/dual.py`; its measured caption `extent` is checked against the landscape zone, so a PASS there is measured on the burned file's caption layout, not declared.
- `--episode` with no package reads only `upload-plan.json` (the `main` item's title and the `short` items). It does not use anything else from that file.

## Rules checked and where they come from

| Check | Rule | Source |
|---|---|---|
| Title | about 45 characters at most (WARN to 50, FAIL above), Title Case, no `[LIVE]` | vault `brand/editing.md`; `skills/metadata` aims for 40 or fewer |
| Tweet | present; the episode link is not in the tweet; the first reply holds one link, with UTM parameters; 0 to 2 niche hashtags, never `#ai`; no announcement opener (take first) | vault `brand/editing.md` tweet standard; `skills/x` |
| Tweet length | WARN over 240 characters, FAIL over 280 | `skills/x` and X's own limit (the vault sets none) |
| Shorts | five; each has a title (YouTube's 100 character limit), a file, a duration of 45 to 90 s (WARN outside) | vault `brand/editing.md` |
| Shorts captions | inside the locked Shorts caption zone | `shorts/stacked.py`, `shorts/build.py` (read through `safezone.py`, not copied) |
| Thumbnails | three, files present | vault audit `2026-11-14/editing-automation-audit.md`, gap 5 |
| X/LinkedIn copy | file present, full size (1920x1080 with `--probe`), burned captions inside the landscape zone | vault `brand/editing.md` |

The link-in-reply rule is the vault's, so a link in the tweet body FAILs here even where an owner brief may say the tweet "carries the link". Check the vault page if that looks wrong.

## Where the rules say nothing

Written to `package-check.json` as `unspecified` and not turned into rules:

- A title shorter than 40 characters passes; the vault only sets an upper bound.
- Tweet length has no vault rule; 240 and 280 come from `skills/x` and X.
- Title Case for the Shorts titles is not specified, so it is not checked.
- Three thumbnails is an audit gap, not a vault rule, so another count WARNs. Thumbnail content and pixel size are not checked; the check only counts files.
- The X/LinkedIn copy caption style and zone are an open gap in `brand/editing.md`. `safezone.py` holds a house default measured on the 261111 two-shot (faces end at about y650, name labels from y920, caption centred on y872, 96 px margin, the 16:9 asterisk box). It is a starting value, not a vault rule, and a different framing needs a different profile.

## Files

| File | What it is |
|---|---|
| `check.py` | the checks, the report and the CLI |
| `safezone.py` | the caption safe zones (`landscape`, `stacked`, `full`); shared with `../render/dual.py` so the render and the check cannot disagree |
| `test_check.py` | unit tests, stdlib only, no media |
