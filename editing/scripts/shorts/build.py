#!/usr/bin/env python3
"""Build one Short (pre-loudnorm) in the locked v3c/v3d template.

Ported from 261103/shorts/_work v3d (build_v3d.py), 5 Nov 2026, and made episode-agnostic:
everything episode-specific lives in <episode>/shorts/<slug>/short.json (see README.md).

Template (docs/show-prep/edit-style.md): full-bleed 9:16 static cam crop (no zoom, no blurred
background), red canonical asterisk top-right, white uppercase Arial Bold captions at y~1480 with
the spoken word in red, nothing below y1570, 2-3 s 9:16 b-roll cutaways, hard cuts with 18 ms audio
fades at the joins. Loudness is applied afterwards by finalize.py.

Usage:
  build.py <slug> --episode editing/projects/<YYMMDD> [--still T] [--out FILE] [--work DIR]
           [--config FILE] [--source FILE] [--assets DIR] [--font TTF] [--chrome PATH]
Reads <work>/capsw.json (written by align.py). Writes <short>/outputs/work/video-prenorm.mp4.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C

# ---- Locked template values (docs/show-prep/edit-style.md). Change them there first. ----------
CANVAS = (1080, 1920)
RED = (232, 59, 59, 255)                 # #E83B3B, brand red
AST = dict(cx=940, cy=290, size=120)     # red asterisk (vault asterisk-red.svg), centred x940/y290, 120 px
CAPFONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"   # Arial Bold, uppercase
CAP_H = 62                               # target cap height, px at 1080 wide (fallbacks below)
CAP_H_FALLBACKS = (58, 54, 50)
CAP_MAX_W = 940                          # caption width limit
CAP_CY = 1480                            # caption vertical centre
CAP_FLOOR = 1570                         # nothing below this (YouTube Shorts UI zone)
CAP_STROKE = (20, 12, 12, 255)           # 3 px dark outline
CAP_SHADOW = (0, 0, 0, 110)              # soft drop shadow, offset (+3, +4)
AUDIO_FADE = 0.018                       # s, at hard-cut joins only
FPS = 30
X264 = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", str(FPS)]
AAC = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
UNSHARP = "unsharp=5:5:0.6:5:5:0.0"
# Default speaker crops on the 1920x1080 cam recording; override per episode in short.json "crops".
CROPS_A = dict(w=259, h=460, tiles={"vincent": [115, 0], "mitchell": [70, 540]})   # [x0, y0]
CROPS_B = dict(w=579, h=1030, speakers={"V": 211, "M": 1091})                       # x0 (two-up)


def red_asterisk_png(work, chrome=None, px=768):
    out = Path(work) / f"asterisk-red-{px}.png"
    return C.rasterise_svg(C.ASTERISK_RED_SVG, px, out, chrome)


def overlay(path, asterisk_png):
    im = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    s = AST["size"]
    a = Image.open(asterisk_png).convert("RGBA").resize((s, s), Image.LANCZOS)
    im.alpha_composite(a, (AST["cx"] - s // 2, AST["cy"] - s // 2))
    im.save(path)


def cap_words(prefix, text, words, font_path):
    """One transparent 1080x1920 PNG per spoken word of a chunk: the chunk in white, that word in red.
    Returns (cap_h, top, bottom, [png paths])."""
    text = text.upper()
    for cap_h in (CAP_H, *CAP_H_FALLBACKS):
        size = round(cap_h / 0.716)
        f = ImageFont.truetype(font_path, size)
        w = f.getlength(text)
        if w <= CAP_MAX_W:
            break
    assert w <= CAP_MAX_W, (text, w)
    hb = f.getbbox("H")
    y = CAP_CY - (hb[1] + hb[3]) / 2
    x0 = (CANVAS[0] - w) / 2
    toks = text.split()
    assert len(toks) == len(words), (text, words)
    xs = [x0 + f.getlength(" ".join(toks[:i]) + (" " if i else "")) for i in range(len(toks))]
    paths = []
    for k in range(len(toks)):
        im = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.text((x0 + 3, y + 4), text, font=f, fill=CAP_SHADOW, stroke_width=3, stroke_fill=CAP_SHADOW)
        for j, t in enumerate(toks):
            d.text((xs[j], y), t, font=f, fill=RED if j == k else (255, 255, 255, 255),
                   stroke_width=3, stroke_fill=CAP_STROKE)
        p = f"{prefix}_{k}.png"
        im.save(p)
        paths.append(p)
    return cap_h, CAP_CY - cap_h / 2 - 4, CAP_CY + cap_h / 2 + 4, paths


def broll_clip(ff, tmp, assets, name, cx, dur):
    """Full-frame 9:16 crop of a 16:9 illustration around cx, slow 5% push-in; returns the mp4 path."""
    im = Image.open(Path(assets) / f"{name}.png").convert("RGB")
    W, H = im.size
    cw = round(H * 9 / 16)
    x0 = max(0, min(W - cw, round(cx - cw / 2)))
    im = im.crop((x0, 0, x0 + cw, H)).resize((2160, 3840), Image.LANCZOS)
    png = f"{tmp}/br_{name}.png"
    im.save(png)
    out = f"{tmp}/br_{name}.mp4"
    n = round(dur * FPS) + 2
    subprocess.run([ff, "-y", "-v", "error", "-i", png, "-vf",
                    f"zoompan=z='1+0.05*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s=1080x1920:fps={FPS},format=yuv420p",
                    "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-t", f"{dur:.3f}", out], check=True)
    return out


def speaker_at(cfg, clip_t):
    for a, b, spk in cfg.get("speaker_turns", []):
        if a <= clip_t + 1e-6 < b:
            return spk
    return cfg.get("default_speaker", "M")


def make_pieces(cfg, crops_a, crops_b):
    """Split segs into (src_a, src_b, layout, crop, first_seg_idx|None, last_seg_idx|None).
    Layout A: crop = tile [x0, y0]. Layout B (two-up): crop = speaker x0, split at seg 'splits'."""
    segs = cfg["segs"]
    pieces = []
    for si, s in enumerate(segs):
        a, b = s["a"], s["b"]
        if s.get("layout", "A") == "B":
            pts = [a] + [t for t in s.get("splits", []) if a < t < b] + [b]
            cuts = [(x, y, crops_b["speakers"][speaker_at(cfg, C.clip_time(segs, x))]) for x, y in zip(pts, pts[1:])]
            layout = "B"
        else:
            cuts = [(a, b, crops_a["tiles"][s["tile"]])]
            layout = "A"
        for ci, (x, y, c) in enumerate(cuts):
            pieces.append((x, y, layout, c, si if ci == 0 else None, si if ci == len(cuts) - 1 else None))
    return pieces


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--episode", required=True, help="episode dir, e.g. editing/projects/261103")
    ap.add_argument("--config", help="short.json (default <episode>/shorts/<slug>/short.json)")
    ap.add_argument("--work", help="work dir holding capsw.json (default <short>/outputs/work/tmp_v3c)")
    ap.add_argument("--out", help="pre-loudnorm mp4 (default <short>/outputs/work/video-prenorm.mp4)")
    ap.add_argument("--source", help="override the source video")
    ap.add_argument("--assets", help="b-roll PNG dir (default <episode>/video/assets)")
    ap.add_argument("--font", default=CAPFONT)
    ap.add_argument("--chrome", help="headless Chromium for the asterisk (or $CHROME)")
    ap.add_argument("--still", metavar="T", help="write a single frame at clip second T to <work>/still.png")
    args = ap.parse_args()

    cfg, episode, sdir = C.load_short(args.episode, args.slug, args.config)
    ff = C.find_bin("ffmpeg")
    src = C.source_path(cfg, episode, args.source)
    work = Path(args.work) if args.work else C.default_work(sdir)
    work.mkdir(parents=True, exist_ok=True)
    tmp = str(work)
    out = args.out or str(sdir / "outputs" / "work" / "video-prenorm.mp4")
    assets = args.assets or str(episode / "video" / "assets")
    crops_a = {**CROPS_A, **cfg.get("crops", {}).get("A", {})}
    crops_b = {**CROPS_B, **cfg.get("crops", {}).get("B", {})}

    overlay(f"{tmp}/ov.png", red_asterisk_png(work, args.chrome))
    capw_path = work / "capsw.json"
    if not capw_path.exists():
        C.die(f"{capw_path} missing: run align.py first")
    capw = json.loads(capw_path.read_text())
    capinfo, caps = [], []
    for k, (a, b, t, ws) in enumerate(capw):
        _, _, bot, paths = cap_words(f"{tmp}/cap{k}", t, [w for w, _ in ws], args.font)
        assert bot <= CAP_FLOOR, (t, bot)
        starts = [st for _, st in ws] + [b]
        for j, p in enumerate(paths):
            capinfo.append((starts[j], starts[j + 1], p))
        caps.append((a, b, t))
    br = [(r["a"], r["b"], broll_clip(ff, tmp, assets, r["asset"], r["cx"], r["b"] - r["a"]))
          for r in cfg.get("broll", [])]

    pieces = make_pieces(cfg, crops_a, crops_b)
    nseg = len(cfg["segs"])
    n = len(pieces)
    inputs, fc, vin, ain = [], "", "", ""
    for i, (a, b, layout, c, first, last) in enumerate(pieces):
        inputs += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(src)]
        if layout == "B":
            cw, ch = crops_b["w"], crops_b["h"]
            fc += f"[{i}:v]crop={cw}:{ch}:{c}:0,scale=1080:1920:flags=lanczos,{UNSHARP}[l{i}];"
        else:
            cw, ch = crops_a["w"], crops_a["h"]
            fc += f"[{i}:v]crop={cw}:{ch}:{c[0]}:{c[1]},scale=1080:1920:flags=lanczos,{UNSHARP}[l{i}];"
        vin += f"[l{i}]"
        d = b - a
        af = []
        if first is not None and first > 0:
            af.append(f"afade=t=in:st=0:d={AUDIO_FADE}")
        if first == 0 and cfg.get("fadein0"):
            af.append(f"afade=t=in:st=0:d={cfg['fadein0']}")
        if last is not None and last < nseg - 1:
            af.append(f"afade=t=out:st={d - AUDIO_FADE:.3f}:d={AUDIO_FADE}")
        fc += f"[{i}:a]{','.join(af) if af else 'anull'}[au{i}];"
        ain += f"[au{i}]"
    ii = n
    inputs += ["-i", f"{tmp}/ov.png"]
    ovi = ii
    ii += 1
    capi = []
    for (_, _, p) in capinfo:
        inputs += ["-i", p]
        capi.append(ii)
        ii += 1
    bri = []
    for (_, _, p) in br:
        inputs += ["-i", p]
        bri.append(ii)
        ii += 1
    fc += f"{vin}concat=n={n}:v=1:a=0[vc];{ain}concat=n={n}:v=0:a=1[ac]"
    pad = cfg.get("tail", 0.0)
    VC, AC = "vc", "ac"
    if pad > 0:   # hold the last frame / pad the audio; the last caption stays up through it
        fc += f";[vc]tpad=stop_mode=clone:stop_duration={pad}[vct];[ac]apad=pad_dur={pad}[act]"
        VC, AC = "vct", "act"
        a_, b_, p_ = capinfo[-1]
        capinfo[-1] = (a_, b_ + pad, p_)
    last = VC
    for k, (a, b, _) in enumerate(br):   # b-roll first, then asterisk + captions on top
        fc += (f";[{bri[k]}:v]setpts=PTS+{a:.3f}/TB[b{k}];"
               f"[{last}][b{k}]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})':eof_action=pass[bo{k}]")
        last = f"bo{k}"
    fc += f";[{last}][{ovi}:v]overlay=0:0[o0]"
    last = "o0"
    for k, (a, b, _) in enumerate(capinfo):
        fc += f";[{last}][{capi[k]}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[o{k + 1}]"
        last = f"o{k + 1}"
    if args.still is not None:
        still = f"{tmp}/still.png"
        subprocess.run([ff, "-y", "-v", "error"] + inputs + ["-filter_complex", fc, "-map", f"[{last}]", "-ss", args.still,
                        "-frames:v", "1", still, "-map", f"[{AC}]", "-t", "0.1", "-f", "null", "-"], check=True)
        print(still)
        return
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([ff, "-y", "-v", "error"] + inputs + ["-filter_complex", fc, "-map", f"[{last}]", "-map", f"[{AC}]",
                    *X264, *AAC, "-movflags", "+faststart", out], check=True)
    print(out, len(caps), "captions")
    json.dump([(round(a, 2), round(b, 2), t) for (a, b, t) in caps], open(f"{tmp}/caps_used.json", "w"))


if __name__ == "__main__":
    main()
