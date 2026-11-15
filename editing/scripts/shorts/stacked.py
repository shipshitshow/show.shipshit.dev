#!/usr/bin/env python3
"""Build one Short (pre-loudnorm) in the stacked two-host layout.

Locked layout (vault brand/editing.md, mirrored in docs/show-prep/edit-style.md): a 9:16 frame split into two
equal panels, both hosts always visible, one above the other (Vincent on top, Mitchell below). Karaoke word
captions sit on the seam between the panels: white uppercase Arial Bold, the spoken word in #E83B3B. No title
text, no cam zooms, no b-roll. The red asterisk sits top-right (120 px, centred x820 / y460, inside the graphics safe box). Hard cuts with
18 ms audio fades at the joins. Loudness is applied afterwards by finalize.py, same as build.py.

Reads the same short.json as build.py (source, segs, tail, fadein0, chunks, optional crops) and the capsw.json that
align.py writes, so the Short is cut and timed exactly like a single-host one. Per-seg `layout`, `tile`, `splits`
and the `broll` list are ignored here. Panel crops come from `crops.S` (see README.md).

Usage:
  stacked.py <slug> --episode $SHIPSHITSHOW_CONTENT_ROOT/projects/<date>_<YYMMDD> [--still T] [--out FILE] [--work DIR]
             [--config FILE] [--source FILE] [--font TTF] [--chrome PATH]
Writes <short>/outputs/work/video-prenorm.mp4 (or --out); with --still, a single frame to <work>/still.png.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C
from common import AAC, CANVAS, UNSHARP, X264

# ---- Locked layout values (docs/show-prep/edit-style.md). Change them there first. ----------------
PANEL_W, PANEL_H = CANVAS[0], CANVAS[1] // 2     # two 1080x960 panels
SEAM_Y = PANEL_H                                  # captions are centred on the seam, y960 (inside the Shorts safe zone, y288-1248)
# Default crops for the 1920x1080 two-shot recording (Vincent left half, Mitchell right half), measured on the
# 11 Nov 2026 raw. A 960x853 window scales to a panel at 1.125x (no zoom in the edit). The name labels sit at the
# bottom of the cam (below ~y985), so a window must end above that. Override per episode in short.json "crops.S".
DEFAULT_CROPS = {"w": 960, "h": 853, "V": [0, 0], "M": [960, 100]}   # V / M are [x0, y0]
LABEL_Y = 985
ASPECT_TOL = 0.01                                 # crop aspect may differ from the panel's by 1%
RED_NAME, WHITE_NAME = "red", "white"


# ---- Pure logic (no PIL / ffmpeg; covered by test_stacked.py) -------------------------------------------
def crop_spec(cfg, src_size=(1920, 1080)):
    """Merge `cfg["crops"]["S"]` over the defaults and validate against the source size.
    Returns {"w", "h", "V": [x, y], "M": [x, y]}; raises ValueError on a window that cannot be cut."""
    spec = {**DEFAULT_CROPS, **(cfg.get("crops") or {}).get("S", {})}
    w, h = spec["w"], spec["h"]
    if not (isinstance(w, int) and isinstance(h, int) and w > 0 and h > 0):
        raise ValueError(f"crop size must be positive integers, got {w}x{h}")
    if abs(w / h - PANEL_W / PANEL_H) / (PANEL_W / PANEL_H) > ASPECT_TOL:
        raise ValueError(f"crop {w}x{h} is not the panel aspect {PANEL_W}:{PANEL_H} (+-{ASPECT_TOL:.0%})")
    for host in ("V", "M"):
        x, y = spec[host]
        if x < 0 or y < 0 or x + w > src_size[0] or y + h > src_size[1]:
            raise ValueError(f"crop {host} [{x}, {y}] {w}x{h} falls outside the {src_size[0]}x{src_size[1]} source")
    return spec


def label_warnings(spec):
    """Hosts whose window reaches the name-label strip at the bottom of the cam."""
    return [h for h in ("V", "M") if spec[h][1] + spec["h"] > LABEL_Y]


def seam_caption_box(cap_h):
    """(top, bottom) of a caption line centred on the seam; the same padding build.cap_words uses."""
    return SEAM_Y - cap_h / 2 - 4, SEAM_Y + cap_h / 2 + 4


def karaoke_spans(ws, end):
    """[(start, end, word_index)] for one caption chunk: word k is red from its start until the next word starts
    (the last one until the chunk's end). `ws` is align.py's [[word, start], ...]."""
    starts = [st for _, st in ws] + [end]
    return [(starts[k], starts[k + 1], k) for k in range(len(ws))]


def caption_state(capw, t):
    """(chunk_index, word_index) shown at clip second `t`, or None when no caption is up.
    `capw` is capsw.json: [[a, b, text, [[word, start], ...]], ...]."""
    for ci, (_, b, _, ws) in enumerate(capw):
        for s, e, k in karaoke_spans(ws, b):
            if s <= t < e:
                return ci, k
    return None


def word_colors(text, k):
    """[(TOKEN, "red" | "white")]: the caption text uppercased, only word `k` red."""
    return [(tok, RED_NAME if i == k else WHITE_NAME) for i, tok in enumerate(text.upper().split())]


def layout_warnings(runs, segs):
    """Seg ranges (source seconds) that overlap a run of the cam that is not the two-shot ('S').
    `runs` is out/grade/layouts.json "runs"; returns [(a, b, layout)] to warn about."""
    bad = []
    for s in segs:
        for r in runs:
            if r["layout"] != "S" and r["start_s"] < s["b"] and r["end_s"] > s["a"]:
                bad.append((max(s["a"], r["start_s"]), min(s["b"], r["end_s"]), r["layout"]))
    return bad


def piece_filter(i, spec):
    """Filter text for piece i: input [i:v] -> both host windows, scaled to panels and stacked -> [l{i}]."""
    w, h = spec["w"], spec["h"]
    parts = [f"[{i}:v]split=2[sv{i}][sm{i}]"]
    for tag, host in (("v", "V"), ("m", "M")):
        x, y = spec[host]
        parts.append(f"[s{tag}{i}]crop={w}:{h}:{x}:{y},scale={PANEL_W}:{PANEL_H}:flags=lanczos,{UNSHARP}[p{tag}{i}]")
    parts.append(f"[pv{i}][pm{i}]vstack=inputs=2,setsar=1[l{i}]")
    return ";".join(parts) + ";"


def probe_size(ffprobe, src):
    out = subprocess.run([ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                          "-of", "csv=p=0", str(src)], check=True, capture_output=True, text=True).stdout.strip()
    w, h = out.split(",")
    return int(w), int(h)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--episode", required=True, help="episode dir, e.g. $SHIPSHITSHOW_CONTENT_ROOT/projects/2026-11-11_261111")
    ap.add_argument("--config", help="short.json (default <episode>/out/shorts/<slug>/short.json)")
    ap.add_argument("--work", help="work dir holding capsw.json (default <short>/outputs/work/tmp_v3c)")
    ap.add_argument("--out", help="pre-loudnorm mp4 (default <short>/outputs/work/video-prenorm.mp4)")
    ap.add_argument("--source", help="override the source video")
    ap.add_argument("--font", default=None)
    ap.add_argument("--chrome", help="headless Chromium for the asterisk (or $CHROME)")
    ap.add_argument("--still", metavar="T", help="write a single frame at clip second T to <work>/still.png")
    args = ap.parse_args()

    try:
        import build as B   # needs Pillow; kept out of the pure helpers above
    except ImportError as e:
        C.die(f"{e}: stacked.py needs Pillow (use a Python that has it, see README.md)")

    cfg, episode, sdir = C.load_short(args.episode, args.slug, args.config)
    ff, fp = C.find_bin("ffmpeg"), C.find_bin("ffprobe")
    src = C.source_path(cfg, episode, args.source)
    work = Path(args.work) if args.work else C.default_work(sdir)
    work.mkdir(parents=True, exist_ok=True)
    tmp = str(work)
    out = args.out or str(sdir / "outputs" / "work" / "video-prenorm.mp4")
    font = args.font or B.CAPFONT

    try:
        spec = crop_spec(cfg, probe_size(fp, src))
    except ValueError as e:
        C.die(str(e))
    for host in label_warnings(spec):
        print(f"warning: the {host} window reaches the name labels (y>{LABEL_Y}); lower its y or h", file=sys.stderr)
    runs_path = episode / "out" / "grade" / "layouts.json"
    if runs_path.exists():
        for a, b, lay in layout_warnings(json.loads(runs_path.read_text())["runs"], cfg["segs"]):
            print(f"warning: source {a:.1f}-{b:.1f}s is layout {lay!r}, not the two-shot; check the stills", file=sys.stderr)
    ignored = [k for k in ("broll",) if cfg.get(k)] + (["per-seg layout/tile"] if any(
        s.get("layout") or s.get("tile") or s.get("splits") for s in cfg["segs"]) else [])
    if ignored:
        print(f"note: ignored for the stacked layout: {', '.join(ignored)}", file=sys.stderr)

    B.overlay(f"{tmp}/ov.png", B.red_asterisk_png(work, args.chrome))
    capw_path = work / "capsw.json"
    if not capw_path.exists():
        C.die(f"{capw_path} missing: run align.py first")
    capw = json.loads(capw_path.read_text())
    C.warn_long_chunks([t for _, _, t, _ in capw])
    capinfo = []
    for k, (a, b, t, ws) in enumerate(capw):
        cap_h, _, _, paths = B.cap_words(f"{tmp}/cap{k}", t, [w for w, _ in ws], font, cy=SEAM_Y)
        for (s, e, j) in karaoke_spans(ws, b):
            capinfo.append((s, e, paths[j]))

    segs = cfg["segs"]
    nseg = len(segs)
    inputs, fc, vin, ain = [], "", "", ""
    for i, s in enumerate(segs):
        d = s["b"] - s["a"]
        inputs += ["-ss", f"{s['a']:.3f}", "-t", f"{d:.3f}", "-i", str(src)]
        fc += piece_filter(i, spec)
        vin += f"[l{i}]"
        af = C.audio_fades(i, i, d, nseg, cfg.get("fadein0"))
        fc += f"[{i}:a]{','.join(af) if af else 'anull'}[au{i}];"
        ain += f"[au{i}]"
    inputs += ["-i", f"{tmp}/ov.png"]
    ovi = nseg
    capi = []
    for (_, _, p) in capinfo:
        inputs += ["-i", p]
        capi.append(nseg + 1 + len(capi))
    fc += f"{vin}concat=n={nseg}:v=1:a=0[vc];{ain}concat=n={nseg}:v=0:a=1[ac]"
    pad = cfg.get("tail", 0.0)
    VC, AC = "vc", "ac"
    if pad > 0:   # hold the last frame / pad the audio; the last caption stays up through it
        fc += f";[vc]tpad=stop_mode=clone:stop_duration={pad}[vct];[ac]apad=pad_dur={pad}[act]"
        VC, AC = "vct", "act"
        a_, b_, p_ = capinfo[-1]
        capinfo[-1] = (a_, b_ + pad, p_)
    fc += f";[{VC}][{ovi}:v]overlay=0:0[o0]"
    last = "o0"
    for k, (a, b, _) in enumerate(capinfo):
        fc += f";[{last}][{capi[k]}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[o{k + 1}]"
        last = f"o{k + 1}"

    if args.still is not None:
        still = f"{tmp}/still.png"
        subprocess.run([ff, "-y", "-v", "error"] + inputs + ["-filter_complex", fc, "-map", f"[{last}]", "-ss", args.still,
                        "-frames:v", "1", still, "-map", f"[{AC}]", "-t", "0.1", "-f", "null", "-"], check=True)
        st = caption_state(capw, float(args.still))
        shown = " ".join(f"[{t}]" if c == RED_NAME else t for t, c in word_colors(capw[st[0]][2], st[1])) if st else "(none)"
        print(still, "caption:", shown)
        return
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([ff, "-y", "-v", "error"] + inputs + ["-filter_complex", fc, "-map", f"[{last}]", "-map", f"[{AC}]",
                    *X264, *AAC, "-movflags", "+faststart", out], check=True)
    print(out, len(capw), "captions")


if __name__ == "__main__":
    main()
