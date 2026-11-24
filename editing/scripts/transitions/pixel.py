#!/usr/bin/env python3
"""Pixel transitions: a cut-to-cut pixel disintegration and a pixel-resolve opening, 16:9 and 9:16.

Both effects work on the real picture, in code, with no sound and no text. Needs numpy, Pillow and ffmpeg.
Deterministic: the same inputs and seed give the same frames.

Brand style (`wall`, `chunks`): a charcoal wallpaper frame (cloudy texture, crosshair grid, thin outline boxes,
red hairlines, optionally the red asterisk) breaks into irregular blocky chunks with thin red and white edges
and the footage shows through. `chunks` does the same between two shots: the outgoing shot breaks into
wallpaper blocks that re-form as the next shot. The older mosaic styles (`dissolve`, `sweep`, `mosaic` for cuts;
`resolve`, `grid`, `scan` for openings) crumble the footage itself and use no wallpaper.

  python3 pixel.py cut  A.mp4 B.mp4 -o out.mp4 [--style dissolve|sweep|mosaic] [--dur 0.5]
  python3 pixel.py cut  A.mp4 B.mp4 -o seg.mp4 --segment-only     # just the transition clip (video only)
  python3 pixel.py open IN.mp4 -o out.mp4 [--style resolve|grid|scan] [--dur 0.7]
  python3 pixel.py open IN.mp4 -o seg.mp4 --segment-only          # just the opening clip (video only)

`cut` is centred on the join and keeps the timeline length: it uses the last dur/2 of A and the first dur/2
of B, so the cut map and the audio stay in sync. While a block still shows the outgoing (or already shows the
incoming) shot, that shot holds its last (first) frame for at most dur/2. Audio is a hard cut with 15 ms
fades, never a sound effect. `open` leaves the audio alone, so the first word starts with the picture.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wall as W  # noqa: E402

CHARCOAL = (20, 20, 20)       # surface_elevated #141414 (vault tokens.json)
RED = (232, 59, 59)           # accent_red #E83B3B
WHITE = (255, 255, 255)
CUT_STYLES = ("chunks", "chunks-direct", "dissolve", "sweep", "mosaic")
OPEN_STYLES = ("wall", "resolve", "grid", "scan")
AUDIO_FADE = 0.015            # s, click guard at the audio join (same as the chapter runner)
LEVELS = 5                    # mosaic levels: sharp plus four chunk sizes up to one block


# ---------------------------------------------------------------- pure helpers (unit tested)

def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def cell_size(width: int, height: int) -> int:
    """Block edge in px: the same fraction of the short side on every format (about 22 blocks across it)."""
    return max(8, int(round(min(width, height) / 22 / 2)) * 2)


def grid_dims(width: int, height: int, cell: int) -> tuple[int, int]:
    return -(-height // cell), -(-width // cell)          # rows, cols (ceil)


def block_values(style: str, width: int, height: int, cell: int, seed: int = 261124) -> np.ndarray:
    """Per-block start order v in [0, 1]: a block starts changing when the eased progress passes v."""
    rows, cols = grid_dims(width, height, cell)
    rng = np.random.default_rng(seed)
    noise = rng.random((rows, cols))
    yy, xx = np.mgrid[0:rows, 0:cols]
    fx, fy = xx / max(cols - 1, 1), yy / max(rows - 1, 1)
    if style in ("dissolve", "resolve"):
        v = noise                                               # pure scatter
    elif style in ("sweep",):
        v = 0.72 * (0.62 * fx + 0.38 * fy) + 0.28 * noise       # diagonal wave front, scattered edge
    elif style == "mosaic":
        v = 0.12 * noise + 0.0 * fx                             # nearly every block moves together
    elif style == "grid":
        v = 0.55 * noise + 0.45 * (1 - np.hypot(fx - 0.5, fy - 0.5) / 0.72)   # blooms from the centre
    elif style == "scan":
        v = 0.8 * fy + 0.2 * noise                              # top to bottom
    else:
        raise ValueError(f"unknown style {style!r}")
    v = (v - v.min()) / max(v.max() - v.min(), 1e-9)
    return v


def block_phase(p: float, v: np.ndarray, width: float = 0.38) -> np.ndarray:
    """Phase q of each block in [0, 1] at eased progress p in [0, 1]; q=0 not started, q=1 done."""
    return np.clip((p * (1 + width) - v) / width, 0.0, 1.0)


def mosaic_sizes(cell: int) -> list[int]:
    """Mosaic edge for each level: 1 (sharp) up to a whole block."""
    return [1, max(2, cell // 8), max(3, cell // 4), max(4, cell // 2), cell]


def level_for(q: np.ndarray, peak: float = 1.0) -> np.ndarray:
    """Mosaic level for a block phase on the cut: sharp at 0 and 1, chunkiest at 0.5."""
    return np.rint(np.sin(np.pi * q) ** 0.8 * (LEVELS - 1) * peak).astype(np.int32)


def open_level_for(q: np.ndarray) -> np.ndarray:
    """Mosaic level on the opening: chunkiest at q=0, sharp at q=1."""
    return np.rint((1 - smoothstep(q)) ** 0.9 * (LEVELS - 1)).astype(np.int32)


def seg_frames(dur: float, fps: float) -> int:
    return max(2, int(round(dur * fps)))


# ---------------------------------------------------------------- picture ops

def mosaic(frame: np.ndarray, size: int, cell: int) -> np.ndarray:
    """Block-average mosaic of `size` px, aligned to the grid origin (frame already padded to cells)."""
    if size <= 1:
        return frame
    h, w, c = frame.shape
    hh, ww = h - h % size, w - w % size
    small = frame[:hh, :ww].reshape(hh // size, size, ww // size, size, c).mean(axis=(1, 3))
    out = np.repeat(np.repeat(small, size, axis=0), size, axis=1)
    if hh != h or ww != w:
        out = np.pad(out, ((0, h - hh), (0, w - ww), (0, 0)), mode="edge")
    return out


def pad_to_cells(frame: np.ndarray, cell: int) -> np.ndarray:
    h, w = frame.shape[:2]
    ph, pw = -h % cell, -w % cell
    return np.pad(frame, ((0, ph), (0, pw), (0, 0)), mode="edge") if (ph or pw) else frame


def mosaic_stack(frame: np.ndarray, cell: int, needed: set[int]) -> list[np.ndarray | None]:
    sizes = mosaic_sizes(cell)
    return [mosaic(frame, sizes[i], cell) if i in needed else None for i in range(LEVELS)]


def gather(stack: list[np.ndarray | None], level_px: np.ndarray) -> np.ndarray:
    out = None
    for i, layer in enumerate(stack):
        if layer is None:
            continue
        if out is None:
            out = np.zeros_like(layer)
        m = level_px == i
        out[m] = layer[m]
    return out


def upsample(block_map: np.ndarray, cell: int, h: int, w: int) -> np.ndarray:
    return np.repeat(np.repeat(block_map, cell, axis=0), cell, axis=1)[:h, :w]


def micro_jitter(rows: int, cols: int, cell: int, seed: int) -> np.ndarray:
    """Per-pixel random offset in about [-0.09, 0.09]: sub-blocks of cell/4 flip at slightly different times."""
    sub = max(2, cell // 4)
    rng = np.random.default_rng(seed + 7)
    j = rng.random((-(-rows * cell // sub), -(-cols * cell // sub)))
    return (np.repeat(np.repeat(j, sub, axis=0), sub, axis=1)[: rows * cell, : cols * cell] - 0.5) * 0.18


def tint(img: np.ndarray, mask: np.ndarray, colour: tuple[int, int, int], amount: float) -> None:
    img[mask] = img[mask] * (1 - amount) + np.array(colour, np.float32) * amount


# ---------------------------------------------------------------- the two effects

def cut_frame(a: np.ndarray, b: np.ndarray, p: float, v: np.ndarray, cell: int, style: str,
              accent: str, seed: int) -> np.ndarray:
    """One frame of the cut: a is the outgoing shot, b the incoming one, p the eased progress."""
    h, w = a.shape[:2]
    a, b = pad_to_cells(a, cell), pad_to_cells(b, cell)
    H, W = a.shape[:2]
    rows, cols = H // cell, W // cell
    q = block_phase(p, v)
    lvl = level_for(q, peak=1.0 if style != "mosaic" else 0.9)
    q_px = upsample(q, cell, H, W)
    lv_px = upsample(lvl, cell, H, W)
    jit = micro_jitter(rows, cols, cell, seed)[:H, :W]
    use_b = (q_px + jit) >= 0.5
    needed = set(np.unique(lv_px).tolist())
    sa, sb = mosaic_stack(a, cell, needed), mosaic_stack(b, cell, needed)
    pa, pb = gather(sa, lv_px), gather(sb, lv_px)
    out = np.where(use_b[..., None], pb, pa).astype(np.float32)
    if accent != "none":
        colour = RED if accent == "red" else WHITE
        rng = np.random.default_rng(seed + 11)
        fleck = rng.random((rows * 4, cols * 4)) < 0.16
        fleck_px = np.repeat(np.repeat(fleck, max(1, cell // 4), axis=0), max(1, cell // 4), axis=1)[:H, :W]
        edge = (np.abs(q_px - 0.5) < 0.16) & (q_px > 0) & (q_px < 1)
        tint(out, edge & fleck_px, colour, 0.62)
    return np.clip(out, 0, 255).astype(np.uint8)[:h, :w]


def open_frame(f: np.ndarray, p: float, v: np.ndarray, cell: int, style: str, accent: str,
               seed: int) -> np.ndarray:
    """One frame of the opening: f is the first shot's live frame, p the eased progress."""
    h, w = f.shape[:2]
    f = pad_to_cells(f, cell)
    H, W = f.shape[:2]
    rows, cols = H // cell, W // cell
    q = block_phase(p, v, width=0.5)
    lvl = open_level_for(q)
    q_px = upsample(q, cell, H, W)
    lv_px = upsample(lvl, cell, H, W)
    stack = mosaic_stack(f, cell, set(np.unique(lv_px).tolist()))
    pic = gather(stack, lv_px).astype(np.float32)
    alpha = smoothstep(q_px / 0.35)[..., None]
    base = np.array(CHARCOAL, np.float32)
    out = base * (1 - alpha) + pic * alpha
    rng = np.random.default_rng(seed + 11)
    if style == "grid":
        # thin technical grid on the block edges that fades once a block has resolved
        edge = np.zeros((H, W), bool)
        edge[::cell, :] = True
        edge[:, ::cell] = True
        line = edge & (q_px > 0) & (q_px < 0.8)
        tint(out, line, WHITE, 0.16)
    if accent != "none":
        colour = RED if accent == "red" else WHITE
        sub = max(1, cell // 4)
        fleck = rng.random((rows * 4, cols * 4)) < (0.14 if style != "scan" else 0.2)
        fleck_px = np.repeat(np.repeat(fleck, sub, axis=0), sub, axis=1)[:H, :W]
        band = (q_px > 0.02) & (q_px < 0.3)
        tint(out, band & fleck_px, colour, 0.7)
    return np.clip(out, 0, 255).astype(np.uint8)[:h, :w]


def edge_px(h: int) -> int:
    return max(2, int(round(h / 540)))


def chunk_cut_frame(a, b, wallpaper, field, p, frame, cell, with_wall, seed):
    """Outgoing shot a breaks into wallpaper chunks that re-form as b. Without the wall, a flips straight to b."""
    h, w = a.shape[:2]
    gap = 0.2 if with_wall else 0.0
    rng = np.random.default_rng(seed + 100 + frame // 2)
    amp = 0.05 * float(np.sin(np.pi * min(max(p, 0.0), 1.0)))
    jit = (rng.random(field.shape) - 0.5) * 2 * amp
    f = field + jit
    ta = p * (1 + gap) * 1.0
    tb = ta - gap * 1.0
    open_a = W.to_px(f < ta, cell, h, w)                    # a is gone here (wall or b)
    open_b = W.to_px(f < tb, cell, h, w) if with_wall else open_a
    out = np.where(open_a[..., None], wallpaper.astype(np.float32), a.astype(np.float32))
    out = np.where(open_b[..., None], b.astype(np.float32), out)
    footage = (~open_a) | open_b                          # pixels showing a picture, not the wall
    if with_wall:
        W.paint_edges(out, footage, edge_px(h))
    else:
        W.paint_edges(out, open_b, edge_px(h))
    return np.clip(out, 0, 255).astype(np.uint8)


def chunk_open_frame(foot, wallpaper, field, p, frame, cell, seed):
    h, w = foot.shape[:2]
    opened = W.to_px(W.reveal_mask(field, p, frame, seed), cell, h, w)
    out = np.where(opened[..., None], foot.astype(np.float32), wallpaper.astype(np.float32))
    W.paint_edges(out, opened, edge_px(h))
    return np.clip(out, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- ffmpeg plumbing

def probe(path: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate,duration:format=duration", "-of", "json", str(path)],
                       capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    s = j["streams"][0]
    n, d = (s["r_frame_rate"].split("/") + ["1"])[:2]
    dur = float(s.get("duration") or j["format"]["duration"])
    return {"w": int(s["width"]), "h": int(s["height"]), "fps": float(n) / float(d), "dur": dur,
            "fps_str": s["r_frame_rate"]}


def has_audio(path: Path) -> bool:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index",
                        "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return bool(r.stdout.strip())


def read_frames(path: Path, start: float, n: int, w: int, h: int, fps: float) -> list[np.ndarray]:
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{max(start, 0):.4f}", "-i", str(path), "-vf",
           f"scale={w}:{h}:flags=lanczos,fps={fps}", "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    fs = w * h * 3
    frames = [np.frombuffer(raw[i * fs:(i + 1) * fs], np.uint8).reshape(h, w, 3) for i in range(len(raw) // fs)]
    if not frames:
        raise SystemExit(f"no frames read from {path} at {start:.2f}s")
    while len(frames) < n:
        frames.append(frames[-1])
    return frames


def write_segment(frames: list[np.ndarray], out: Path, w: int, h: int, fps_str: str) -> None:
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", fps_str,
           "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(np.ascontiguousarray(f).tobytes())
    p.stdin.close()
    if p.wait():
        raise SystemExit("ffmpeg failed while encoding the segment")


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"{' '.join(cmd[:3])} ... failed:\n{r.stderr[-1500:]}")


# ---------------------------------------------------------------- commands

def make_cut_segment(a: Path, b: Path, style: str, dur: float, accent: str, seed: int, cell_px: int | None,
                     mark: bool = False, direction: str = "right"):
    pa = probe(a)
    w, h, fps = pa["w"], pa["h"], pa["fps"]
    n = seg_frames(dur, fps)
    nh = n // 2
    chunk = style.startswith("chunks")
    cell = cell_px or (W.cell_for(w, h) if chunk else cell_size(w, h))
    a_tail = read_frames(a, pa["dur"] - nh / fps, nh, w, h, fps)
    b_head = read_frames(b, 0, n - nh, w, h, fps)
    v = block_values(style, w, h, cell, seed) if not chunk else None
    wallpaper = W.wallpaper(w, h, seed, mark=mark) if chunk else None
    field = W.chunk_field(w, h, cell, direction, seed) if chunk else None
    frames = []
    for i in range(n):
        x = (i + 0.5) / n
        fa = a_tail[i] if i < nh else a_tail[-1]
        fb = b_head[i - nh] if i >= nh else b_head[0]
        if chunk:
            p = float(0.5 * x + 0.5 * smoothstep(x))
            frames.append(chunk_cut_frame(fa, fb, wallpaper, field, p, i, cell, style == "chunks", seed))
        else:
            frames.append(cut_frame(fa, fb, float(smoothstep(x)), v, cell, style, accent, seed))
    return frames, w, h, pa["fps_str"], nh / fps, (n - nh) / fps, pa


def cmd_cut(args) -> None:
    a, b, out = Path(args.a), Path(args.b), Path(args.out)
    accent = args.accent or ("red" if args.style == "sweep" else "none")
    dur = args.dur or (0.6 if args.style.startswith("chunks") else 0.5)
    args.dur = dur
    frames, w, h, fps_str, head_s, tail_s, pa = make_cut_segment(
        a, b, args.style, dur, accent, args.seed, args.cell, mark=args.mark, direction=args.direction)
    if args.segment_only:
        write_segment(frames, out, w, h, fps_str)
        print(f"wrote {out}: {len(frames)} frames, centred on the join (uses the last {head_s:.3f}s of A and "
              f"the first {tail_s:.3f}s of B)")
        return
    with tempfile.TemporaryDirectory() as td:
        seg = Path(td) / "seg.mp4"
        write_segment(frames, seg, w, h, fps_str)
        ad = probe(a)["dur"]
        aud = has_audio(a) and has_audio(b)
        fc = (f"[0:v]trim=0:{ad - head_s:.4f},setpts=PTS-STARTPTS,fps={fps_str},scale={w}:{h},setsar=1[va];"
              f"[1:v]setpts=PTS-STARTPTS,fps={fps_str},scale={w}:{h},setsar=1[vs];"
              f"[2:v]trim=start={tail_s:.4f},setpts=PTS-STARTPTS,fps={fps_str},scale={w}:{h},setsar=1[vb];"
              f"[va][vs][vb]concat=n=3:v=1:a=0[v]")
        maps = ["-map", "[v]"]
        if aud:
            f = AUDIO_FADE
            fc += (f";[0:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=out:st={ad - f:.4f}:d={f}[aa];"
                   f"[2:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d={f}[ab];"
                   f"[aa][ab]concat=n=2:v=0:a=1[a]")
            maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
        run(["ffmpeg", "-y", "-v", "error", "-i", str(a), "-i", str(seg), "-i", str(b), "-filter_complex", fc,
             *maps, "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf), "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", str(out)])
    print(f"wrote {out}: style {args.style}, accent {accent}, {args.dur}s centred on the join")


def cmd_open(args) -> None:
    src, out = Path(args.input), Path(args.out)
    chunk = args.style == "wall"
    accent = args.accent or ("red" if args.style in ("grid", "scan") else "none")
    pi = probe(src)
    w, h, fps = pi["w"], pi["h"], pi["fps"]
    dur = args.dur or (0.8 if chunk else 0.7)
    n = seg_frames(dur, fps)
    hold_n = int(round(args.hold * fps)) if chunk else 0
    live = read_frames(src, 0, n, w, h, fps)
    if chunk:
        cell = args.cell or W.cell_for(w, h)
        wallpaper = W.wallpaper(w, h, args.seed, mark=args.mark)
        field = W.chunk_field(w, h, cell, args.direction, args.seed)
        frames = [wallpaper] * hold_n
        for i in range(n):
            x = (i + 0.5) / n
            p = float(0.5 * x + 0.5 * smoothstep(x))
            frames.append(chunk_open_frame(live[i], wallpaper, field, p, i, cell, args.seed))
    else:
        cell = args.cell or cell_size(w, h)
        v = block_values(args.style, w, h, cell, args.seed)
        frames = [open_frame(live[i], float(smoothstep((i + 0.5) / n)), v, cell, args.style, accent, args.seed)
                  for i in range(n)]
    hold_s = hold_n / fps
    if args.segment_only:
        with tempfile.TemporaryDirectory():
            write_segment(frames, out, w, h, pi["fps_str"])
        note = (f"starts with {hold_s:.3f}s of wallpaper, then the footage from its first frame: delay the audio "
                f"by {hold_s:.3f}s") if hold_n else "keep the audio"
        print(f"wrote {out}: {len(frames)} frames; replaces the first {n / fps:.3f}s of the picture ({note})")
        return
    d = n / fps
    with tempfile.TemporaryDirectory() as td:
        seg = Path(td) / "seg.mp4"
        write_segment(frames, seg, w, h, pi["fps_str"])
        fc = (f"[0:v]setpts=PTS-STARTPTS,fps={pi['fps_str']},scale={w}:{h},setsar=1[vs];"
              f"[1:v]trim=start={d:.4f},setpts=PTS-STARTPTS,fps={pi['fps_str']},scale={w}:{h},setsar=1[vb];"
              f"[vs][vb]concat=n=2:v=1:a=0[v]")
        maps = ["-map", "[v]"]
        if has_audio(src):
            if hold_n:
                ms = int(round(hold_s * 1000))
                fc += f";[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms}[a]"
                maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
            else:
                maps += ["-map", "1:a", "-c:a", "copy"]
        run(["ffmpeg", "-y", "-v", "error", "-i", str(seg), "-i", str(src), "-filter_complex", fc, *maps,
             "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf), "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", str(out)])
    print(f"wrote {out}: style {args.style}, {hold_s:.2f}s wallpaper hold + {d:.2f}s reveal")


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cut", help="pixel disintegration between two clips")
    c.add_argument("a"), c.add_argument("b")
    c.add_argument("--style", choices=CUT_STYLES, default="chunks")
    c.add_argument("--dur", type=float, help="total seconds, centred on the join (default 0.6 chunks, 0.5 mosaic styles)")
    o = sub.add_parser("open", help="pixel-resolve opening")
    o.add_argument("input")
    o.add_argument("--style", choices=OPEN_STYLES, default="wall")
    o.add_argument("--dur", type=float, help="reveal seconds (default 0.8 wall, 0.7 others)")
    o.add_argument("--hold", type=float, default=0.35, help="wall style: seconds of wallpaper before the break (0 = none)")
    for s in (c, o):
        s.add_argument("-o", "--out", required=True)
        s.add_argument("--accent", choices=("none", "red", "white"), help="flecks on the edge (brand colours only)")
        s.add_argument("--cell", type=int, help="block size in px (default: auto, same look on 16:9 and 9:16)")
        s.add_argument("--seed", type=int, default=261124)
        s.add_argument("--direction", choices=("right", "left", "top", "bottom", "center"),
                       help="wall/chunks styles: where the break starts (default right for the opening, left for cuts)")
        s.add_argument("--mark", dest="mark", action="store_true", default=None, help="red asterisk on the wallpaper")
        s.add_argument("--no-mark", dest="mark", action="store_false")
        s.add_argument("--crf", type=int, default=16)
        s.add_argument("--segment-only", action="store_true", help="write only the transition clip, no audio")
    args = ap.parse_args(argv)
    if args.direction is None:
        args.direction = "right" if args.cmd == "open" else "left"
    if args.mark is None:
        args.mark = args.cmd == "open"          # the mark shows on the opening frame, the cut band stays plain
    {"cut": cmd_cut, "open": cmd_open}[args.cmd](args)


if __name__ == "__main__":
    main()
