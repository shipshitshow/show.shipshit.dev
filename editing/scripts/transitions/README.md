# Pixel transitions

`pixel.py` renders the show's opening and cut-to-cut transition in code: numpy, Pillow and ffmpeg, no Adobe tool, no assets to download. Both work at any size and frame rate, so the same command serves the 16:9 recap and the 9:16 Shorts. No sound effect, no text, no title or chapter card (vault edit rules, 3 and 19 Nov).

The look follows the reference Vincent sent on 24 Nov 2026 (a branded wallpaper frame that breaks into irregular pixel chunks with thin red edges). It is a style match, built from our own tokens: charcoal ground, white crosshair grid and thin outline boxes, red `#E83B3B` hairlines, optionally the standalone red asterisk. `wall.py` draws the frame and the chunk mask.

```bash
# opening: wallpaper holds 0.2 s, then breaks (from the top right on 9:16, from the right on 16:9) into the footage (audio delayed by the hold)
python3 editing/scripts/transitions/pixel.py open SHOT.mp4 -o out.mp4 [--style wall] [--hold 0.2] [--dur 0.5] [--direction right|topright] [--no-mark]
# cut: the last dur/2 of A and the first dur/2 of B, centred on the join (timeline length unchanged)
python3 editing/scripts/transitions/pixel.py cut A.mp4 B.mp4 -o out.mp4 [--style chunks|chunks-direct] [--dur 0.36]
# only the transition clip (video only), to splice into an existing timeline
python3 editing/scripts/transitions/pixel.py cut A.mp4 B.mp4 -o seg.mp4 --segment-only
python3 -m unittest discover -s editing/scripts/transitions -p 'test_*.py'
```

## Styles

| Command | Style | What it does |
|---|---|---|
| `open` | `wall` (default) | wallpaper frame, then irregular chunks open onto the footage. `--no-mark` drops the asterisk, `--direction right\|left\|top\|bottom\|center\|topright` sets where the break starts |
| `cut` | `chunks` (default) | the outgoing shot breaks into wallpaper chunks that re-form as the next shot, the break travelling right to left |
| `cut` | `chunks-direct` | shot to shot in chunks, with no wallpaper between |
| `open` / `cut` | `resolve`, `grid`, `scan` / `dissolve`, `sweep`, `mosaic` | the first round: the footage itself crumbles into mosaic pixels, no wallpaper |

Chunk size is the same fraction of the short side on every format (about 28 across it), so 16:9 and 9:16 look alike. `--cell` overrides it. The output is deterministic for a given `--seed`.

## Audio and timing

- `cut` keeps the timeline length. Each outgoing chunk that has not changed yet holds the last frame of A (at most dur/2), and each incoming chunk holds the first frame of B, which the wallpaper band hides. The audio is a hard cut with 15 ms fades, never inside the transition.
- `open --style wall` adds the hold in front of the footage: the picture starts at the hold and the audio is delayed by the same time (silence first, then the first word). Pass `--hold 0` for a break that starts at once.
- `--segment-only` writes video only. For `open` the clip is hold + reveal long and replaces nothing: put it in front of the footage minus its first reveal seconds, and delay the audio and music bed by the hold.

## Status

Written 24 Nov 2026. Previews were rendered on short clips of 540p previews, nobody has listened (there is no sound to hear) and the 1080p60 render time and a full recap run have not been measured. Vault `brand/editing.md` still says "hard cuts only, the red slash is the one exception": the owner has not changed that rule yet, so a recap runner keeps the slash until he does.
