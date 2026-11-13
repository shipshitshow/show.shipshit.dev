# Host matte (Apple Vision person segmentation)

Cuts the two hosts out of the two-shot plate so b-roll and mascots can sit *behind* them (layer order: plate, b-roll, matted hosts, foreground overlays). Used for 261111 `final`.

Two steps:

1. `vmatte.swift`: Apple Vision `VNGeneratePersonSegmentationRequest` (`.accurate`) on every frame of a clip. Writes raw gray8 masks.
2. `matte_post.py`: turns those masks into a clean 1920x1080 matte (smoothing, edge choke, feather).

## Provenance

`vmatte.swift` was **recovered verbatim from a session transcript**, not rewritten. It was first written into an ephemeral session scratch folder; on 2026-11-13 neither that source nor the compiled binary existed anywhere on the Studio (checked the scratch folder, the project work folder, `~/content` and `~/www/shipshitshow`), so the transcript copy is the only source. `matte_post.py` is a copy of the 261111 work-folder script, unchanged.

## Build (macOS only)

```bash
cd editing/scripts/matte
swiftc -O vmatte.swift -o vmatte   # do not commit the binary; it is git-ignored
```

Needs the Xcode command line tools (AVFoundation + Vision). It compiles with deprecation warnings on macOS 27 (`startReading`, `copyNextSampleBuffer`); they are warnings only. Verified 2026-11-13 on the Mac Studio.

## Use

```bash
./vmatte <in.mp4> <out.raw>
/usr/local/bin/python3 matte_post.py <out.raw> <S|X> > host-matte.gray   # 1920x1080 gray8, one frame after another
```

| | |
|---|---|
| `vmatte` input | any video AVFoundation can decode (decoded to BGRA, frame by frame) |
| `vmatte` output | `<out.raw>`: `n` frames of gray8, each `w*h` bytes, at the model's native mask size (not the video size); `<out.raw>.json`: `{"w":..,"h":..,"n":..}` |
| `matte_post.py` output | gray8 on stdout, 1920x1080, one frame after another; pipe it into ffmpeg as `-f rawvideo -pix_fmt gray -s 1920x1080 -r <fps>`, then use it as the alpha (`alphamerge`) of the plate. 261111 wrote it to an `ffv1` file first |
| `matte_post.py` args | layout `S` (two-shot) or `X` (screen-share layout of two stacked cam tiles); picks which name lower-third boxes are forced opaque |

`matte_post.py` needs `numpy` and `Pillow` (the Studio's `/usr/local/bin/python3` has them; the default `python3` did not).

## What `matte_post.py` does

Resize to 1920x1080 (bilinear), temporal EMA (K=0.55, kills flicker), contrast stretch (0.2..0.8 to 0..1), 1 px erode (no halo), ~1.5 px Gaussian feather, then force the burned-in name lower-thirds opaque so they stay above the motion.

## Known limits

- **macOS only**; Vision has no Linux/Windows equivalent.
- **Mask resolution is the model's, not the video's.** A 1920x1080 input produced 2016x1512 masks in a smoke test on the Studio; `matte_post.py` resizes them to 1920x1080 (it reads the sizes from the JSON sidecar, so it does not assume them).
- **X layout:** the cam tiles are 480x540 each, upscaled 2x to 960x1080 before matting. 261111 ran the matte on the plate *after* that upscale, so edges are as soft as the upscale. Matting the raw 480x540 tile and upscaling the matte is untested.
- Vision keeps temporal state on a single reused request; the tool does that (one request across the clip), so process a clip in one run, not frame ranges in separate runs, or the first frames of each run have no history.
- `LABELS` in `matte_post.py` are fixed pixel boxes for the 261111 lower-thirds (two layouts, 1920x1080). Another episode with different lower-third positions needs those boxes changed.
- It cuts out *anyone* Vision sees as a person, including people appearing inside a screen share. Fine for the two-shot, wrong if a person appears in a screen recording that should stay in the plate.
- Smoke test only: the 2026-11-13 test ran on a synthetic clip with no people. It proves it builds and runs and that the byte counts line up (15 frames in, 15 x 1920x1080 out), not matte quality. Quality was judged on the real 261111 footage.
