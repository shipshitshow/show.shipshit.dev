#!/usr/bin/env python3
"""Colour-correct the livestream recording per host box, before the recap and the Shorts are cut.

usage: grade.py run     <episode> [--source PATH] [--samples N] [--crf N] [--force]
       grade.py layouts <episode> [--source PATH]
       grade.py measure <episode> [--source PATH] [--graded] [--samples N]
       grade.py solve   <episode> [--source PATH] [--samples N]
       grade.py render  <episode> [--source PATH] [--crf N] [--force]

<episode> is an episode id (261111) or an episode folder. There is no fixed look: every recording is corrected
from its own footage. The recording is one 1920x1080 composite, so the tool finds which layout is on screen for
every frame (layouts), measures each host's skin exposure and colour (measure), works out per host the
correction that brings their skin onto the targets, leaving a host who is already inside the bands alone
(solve), then applies it to the host boxes only and writes raw/<id>.graded.mp4 next to the untouched original
(render). run does all of it and measures the result again. See README.md next to this file.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from fractions import Fraction
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import workspace  # noqa: E402  (shared content-root and episode lookup)

W, H = 1920, 1080                  # the host boxes below are defined for this frame size only
SCAN_W, SCAN_H, CHUNK = 480, 270, 64  # layouts decodes every frame at quarter size, gray, 64 frames at a time

# Host boxes per layout in source pixels: (w, h, x, y). V = Vincent, M = Mitchell. Every value is even.
LAYOUTS = {
    "S": {"V": (960, 1080, 0, 0), "M": (960, 1080, 960, 0)},   # two-shot: one host per half
    "X": {"V": (466, 524, 14, 16), "M": (480, 540, 0, 540)},   # screen share: host tiles stacked on the left
}
# Layout detection: mean absolute gray step (0..255) across a layout edge, measured on the quarter-size frame.
SEAM_ON, SEAM_OFF, SHARE_ON = 60, 20, 40
MIN_RUN = 15                       # frames; a shorter S or X run is a transition and stays ungraded
EDGE_TRIM = 15                     # frames skipped at each end of a run when sampling (dissolves)
SAMPLES = 12                       # frames measured per layout
MIN_SKIN = 0.02                    # a sample with less skin than this share of the box is skipped
GAP_LUMA_RATIO, GAP_RG = 1.4, 0.15  # tool defaults for "the hosts do not match"; not owner rules
# Automatic correction, judged on the skin measure below (luma 0..255, r/g of the median skin colour). A host
# inside both bands is left alone; a host outside one is brought to the targets. Tool defaults, not owner rules.
LUMA_BAND, LUMA_TARGET, LUMA_TOL = (100, 150), 120, 2
RG_BAND, RG_TARGET, RG_TOL = (1.28, 1.50), 1.42, 0.015
G_MIN, G_MAX = 0.45, 1.8           # gamma limits; past them the lighting is beyond what a grade should do
K_MAX, K_PROBE = 0.3, 0.04         # colorbalance midtone limit and first search step
HOSTS = ("V", "M")
CURVES = re.compile(r"[0-9./ ]+")
BALANCE = re.compile(r"[a-z]{2}=-?[0-9.]+(:[a-z]{2}=-?[0-9.]+)*")


def die(msg: str) -> None:
    sys.exit(f"error: {msg}")


def find_bin(name: str) -> str:
    for cand in (os.environ.get(name.upper()), f"/opt/homebrew/opt/ffmpeg-full/bin/{name}"):
        if cand and os.path.exists(cand):
            return cand
    return shutil.which(name) or die(f"{name} not found (set ${name.upper()})")


FFMPEG, FFPROBE = find_bin("ffmpeg"), find_bin("ffprobe")


def run(cmd: list, **kw) -> subprocess.CompletedProcess:
    p = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if p.returncode:
        die(f"{Path(str(cmd[0])).name} failed ({p.returncode}):\n{p.stderr[-1500:]}")
    return p


def ffm(*args) -> subprocess.CompletedProcess:
    return run([FFMPEG, "-hide_banner", "-nostdin", "-y", "-v", "error", *args])


def stat_key(path: Path) -> list:
    s = path.stat()
    return [path.name, s.st_size, int(s.st_mtime)]


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


class Episode:
    def __init__(self, arg: str, source: str | None = None):
        p = Path(arg).expanduser()
        try:
            self.dir = p.resolve() if p.is_dir() else workspace.episode_dir(arg)
        except ValueError as e:
            die(str(e))
        ep = self.dir / "episode.json"
        self.id = json.loads(ep.read_text()).get("id") if ep.exists() else self.dir.name.split("_")[-1]
        self.source = Path(source).expanduser() if source else self.dir / "raw" / f"{self.id}.mp4"
        self.graded = self.source.with_name(f"{self.source.stem}.graded{self.source.suffix}")
        self.out = self.dir / "out" / "grade"
        if not self.source.exists():
            die(f"source video not found: {self.source}")

    def probe(self, path: Path) -> dict:
        s = json.loads(run([FFPROBE, "-v", "error", "-select_streams", "v:0", "-of", "json", "-show_entries",
                            "stream=width,height,r_frame_rate,nb_frames", path]).stdout)["streams"][0]
        if (s["width"], s["height"]) != (W, H):
            die(f"{path.name} is {s['width']}x{s['height']}; the layout boxes are defined for {W}x{H}")
        return s

    def layouts(self, strict: bool = True) -> dict:
        path = self.out / "layouts.json"
        if not path.exists():
            die(f"{path} not found; run: grade.py layouts {self.id}")
        lay = json.loads(path.read_text())
        if lay["source"] != stat_key(self.source):
            msg = f"layouts.json was not made from this {self.source.name}; rerun: grade.py layouts {self.id}"
            die(msg) if strict else print(f"warning: {msg}", file=sys.stderr)
        return lay


# ---------------------------------------------------------------- layouts

def scan(src: Path) -> np.ndarray:
    """Three seam strengths per frame: two-shot split (x=960), tile split (y=540, left), share edge (x=480)."""
    hw = ["-hwaccel", "videotoolbox"] if sys.platform == "darwin" else []
    size, feats, n, t0 = SCAN_W * SCAN_H, [], 0, time.time()
    with tempfile.TemporaryFile() as err:
        p = subprocess.Popen([FFMPEG, "-hide_banner", "-nostdin", "-v", "error", *hw, "-i", str(src), "-an", "-vf",
                              f"scale={SCAN_W}:{SCAN_H}:flags=area,format=gray", "-fps_mode", "passthrough",
                              "-f", "rawvideo", "-"], stdout=subprocess.PIPE, stderr=err, bufsize=size * CHUNK)
        while True:
            buf = p.stdout.read(size * CHUNK)
            k = len(buf) // size
            if not k:
                break
            g = np.frombuffer(buf, np.uint8, k * size).reshape(k, SCAN_H, SCAN_W).astype(np.int16)
            feats.append(np.stack([np.abs(g[:, 20:250, 239] - g[:, 20:250, 240]).mean(axis=1),
                                   np.abs(g[:, 134, 4:118] - g[:, 135, 4:118]).mean(axis=1),
                                   np.abs(g[:, 10:200, 119] - g[:, 10:200, 120]).mean(axis=1)], axis=1))
            if (n + k) // 3000 != n // 3000:
                print(f"  {n + k} frames, {time.time() - t0:.0f} s", file=sys.stderr)
            n += k
        if p.wait():
            err.seek(0)
            die(f"ffmpeg failed while scanning:\n{err.read().decode(errors='replace')[-1500:]}")
    if not n:
        die(f"no video frames decoded from {src.name}")
    return np.concatenate(feats)


def classify(f: np.ndarray) -> np.ndarray:
    lab = np.full(len(f), "O")
    lab[(f[:, 0] > SEAM_ON) & (f[:, 1] < SEAM_OFF)] = "S"
    lab[(f[:, 1] > SEAM_ON) & (f[:, 2] > SHARE_ON)] = "X"
    return lab


def runs_of(lab: np.ndarray) -> list[list]:
    """Run-length encode the labels; S or X runs shorter than MIN_RUN become O; equal neighbours merge."""
    bounds = [0, *(np.flatnonzero(lab[1:] != lab[:-1]) + 1).tolist(), len(lab)]
    merged: list[list] = []
    for a, b in zip(bounds, bounds[1:]):
        label = str(lab[a]) if lab[a] == "O" or b - a >= MIN_RUN else "O"
        if merged and merged[-1][0] == label:
            merged[-1][2] = b
        else:
            merged.append([label, a, b])
    return merged


def cmd_layouts(ep: Episode, args) -> None:
    info = ep.probe(ep.source)
    fps = Fraction(info["r_frame_rate"])
    print(f"scanning {ep.source.name} (every frame, a few minutes)", file=sys.stderr)
    lab = classify(scan(ep.source))
    if info.get("nb_frames") and int(info["nb_frames"]) != len(lab):
        print(f"warning: decoded {len(lab)} frames, container says {info['nb_frames']}", file=sys.stderr)
    runs = [{"layout": l, "start": a, "end": b, "start_s": round(float(a / fps), 3), "end_s": round(float(b / fps), 3)}
            for l, a, b in runs_of(lab)]
    totals = {l: sum(r["end"] - r["start"] for r in runs if r["layout"] == l) for l in ("S", "X", "O")}
    write_json(ep.out / "layouts.json", {"source": stat_key(ep.source), "fps": float(fps), "frames": len(lab),
                                         "runs": runs, "totals": totals})
    for r in runs:
        print(f"{r['layout']}  {r['start_s']:9.2f} - {r['end_s']:9.2f}  {r['end'] - r['start']:6d} frames")
    print(f"{len(runs)} runs; frames: two-shot (S) {totals['S']}, screen share (X) {totals['X']}, "
          f"other, left ungraded (O) {totals['O']}")
    print(f"wrote {ep.out / 'layouts.json'}")


# ---------------------------------------------------------------- measure

def grab(src: Path, t: float) -> np.ndarray:
    p = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-v", "error", "-ss", f"{t:.4f}", "-i", str(src),
                        "-frames:v", "1", "-vf", "scale=in_color_matrix=bt709:in_range=tv,format=rgb24",
                        "-f", "rawvideo", "-"], capture_output=True)
    if p.returncode or len(p.stdout) != W * H * 3:
        die(f"could not read a frame at {t:.2f} s from {src.name}:\n{p.stderr.decode(errors='replace')[-800:]}")
    return np.frombuffer(p.stdout, np.uint8).reshape(H, W, 3)


def skin_stats(rgb: np.ndarray, box: tuple) -> dict | None:
    """Median skin colour in the top three quarters of a host box, by a fixed skin-chroma mask (no face detector)."""
    w, h, x, y = box
    c = rgb[y:y + int(h * 0.75), x:x + w].astype(np.float32)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    cb, cr = 128 + (b - luma) / 1.8556, 128 + (r - luma) / 1.5748
    m = (cr > 138) & (cr < 180) & (cb > 95) & (cb < 125) & (luma > 25) & (r > g) & (g > b * 0.9)
    if m.mean() < MIN_SKIN:
        return None
    med = np.median(c[m], axis=0)
    return {"skin": float(m.mean()), "rgb": [float(v) for v in med], "luma": float(np.median(luma[m])),
            "rg": float(med[0] / med[1])}


def sample_frames(runs: list, layout: str, count: int) -> list[int]:
    spans = [(r["start"] + EDGE_TRIM, r["end"] - EDGE_TRIM) for r in runs
             if r["layout"] == layout and r["end"] - r["start"] > 2 * EDGE_TRIM]
    total, out = sum(b - a for a, b in spans), set()
    for k in range(count if total else 0):
        pos = int((k + 0.5) * total / count)
        for a, b in spans:
            if pos < b - a:
                out.add(a + pos)
                break
            pos -= b - a
    return sorted(out)


def summarise(samples: list[dict]) -> dict | None:
    if not samples:
        return None
    med = lambda key: round(float(np.median([s[key] for s in samples])), 3)  # noqa: E731
    return {"samples": len(samples), "skin": med("skin"), "luma": med("luma"), "rg": med("rg"),
            "rgb": [round(float(v), 1) for v in np.median([s["rgb"] for s in samples], axis=0)]}


def sample_hosts(src: Path, lay: dict, count: int, crops: bool = False) -> tuple[dict, dict]:
    """Skin stats per layout and host from evenly spread frames; with crops, also the host boxes that showed skin."""
    stats = {layout: {host: [] for host in HOSTS} for layout in LAYOUTS}
    pix = {host: {} for host in HOSTS}
    for layout, boxes in LAYOUTS.items():
        for i in sample_frames(lay["runs"], layout, count):
            rgb = grab(src, (i + 0.5) / lay["fps"])
            for host, (w, h, x, y) in boxes.items():
                s = skin_stats(rgb, (w, h, x, y))
                if s:
                    stats[layout][host].append(s)
                    if crops:
                        pix[host].setdefault(layout, []).append(rgb[y:y + h, x:x + w])
    return stats, {host: {layout: np.stack(v) for layout, v in d.items()} for host, d in pix.items()}


def cmd_measure(ep: Episode, args) -> None:
    lay = ep.layouts(strict=False)
    src = ep.graded if args.graded else ep.source
    if not src.exists():
        die(f"{src} not found; run: grade.py render {ep.id}")
    ep.probe(src)
    stats, _ = sample_hosts(src, lay, args.samples)
    per = {layout: {host: summarise(v) for host, v in row.items()} for layout, row in stats.items()}
    allhost = {host: [s for layout in LAYOUTS for s in stats[layout][host]] for host in HOSTS}
    overall = {host: summarise(v) for host, v in allhost.items()}
    print(f"{src.name}: median skin per host (sRGB 0..255, luma bt709)")
    print("layout host  samples  skin%    R     G     B    luma   r/g")
    for name, row in [*per.items(), ("all", overall)]:
        for host, s in row.items():
            if s:
                r, g, b = s["rgb"]
                print(f"{name:6} {host:5} {s['samples']:7d} {s['skin'] * 100:6.1f} {r:5.0f} {g:5.0f} {b:5.0f} "
                      f"{s['luma']:6.1f} {s['rg']:5.2f}")
            else:
                print(f"{name:6} {host:5}       0   (no skin found)")
    gap = None
    if overall["V"] and overall["M"]:
        lo, hi = sorted((overall["V"]["luma"], overall["M"]["luma"]))
        gap = {"luma_ratio": round(hi / max(lo, 1), 2), "rg_diff": round(abs(overall["V"]["rg"] - overall["M"]["rg"]), 2)}
        gap["flag"] = gap["luma_ratio"] > GAP_LUMA_RATIO or gap["rg_diff"] > GAP_RG
        print(f"host gap: luma ratio {gap['luma_ratio']} (flag above {GAP_LUMA_RATIO}), "
              f"r/g difference {gap['rg_diff']} (flag above {GAP_RG}): {'MISMATCH' if gap['flag'] else 'ok'}")
    out = ep.out / ("measure-graded.json" if args.graded else "measure.json")
    write_json(out, {"file": stat_key(src), "layouts": per, "all": overall, "gap": gap})
    print(f"wrote {out}")


# ---------------------------------------------------------------- solve

def in_band(s: dict) -> bool:
    return LUMA_BAND[0] <= s["luma"] <= LUMA_BAND[1] and RG_BAND[0] <= s["rg"] <= RG_BAND[1]


def make_look(g: float, k: float) -> dict:
    """g is a gamma on all channels (a lift keeps the blacks pinned, so shadow noise is not raised with the
    face); k moves the midtones from red towards cyan (negative: the other way)."""
    look = {}
    if g != 1:
        pts = [(0, 0.0)] + ([(0.05, 0.05)] if g < 1 else []) + [(x, x ** g) for x in (0.2, 0.35, 0.55, 0.75)] + [(1, 1.0)]
        look["curves"] = " ".join(f"{x:g}/{y:.3f}" for x, y in pts)
    if k:
        look["colorbalance"] = f"rm={-k:.3f}:gm={k / 4:.3f}:bm={0.75 * k:.3f}"
    return look


def apply_look(frames: np.ndarray, look: dict) -> np.ndarray:
    """Run sampled host boxes (n, h, w, 3 RGB) through the same filter chain render uses."""
    n, h, w, _ = frames.shape
    vf = f"scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,{look_chain(look)}," \
         "scale=in_color_matrix=bt709:in_range=tv,format=rgb24"
    p = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                        "-s", f"{w}x{h}", "-i", "-", "-vf", vf, "-fps_mode", "passthrough", "-f", "rawvideo", "-"],
                       input=frames.tobytes(), capture_output=True)
    if p.returncode or len(p.stdout) != frames.size:
        die(f"could not test a look:\n{p.stderr.decode(errors='replace')[-800:]}")
    return np.frombuffer(p.stdout, np.uint8).reshape(n, h, w, 3)


def host_skin(crops: dict, look: dict) -> dict:
    stats = []
    for frames in crops.values():
        for f in (apply_look(frames, look) if look else frames):
            stats.append(skin_stats(f, (f.shape[1], f.shape[0], 0, 0)))
    return summarise([s for s in stats if s]) or die("the skin mask finds no skin once the look is applied")


def solve_host(crops: dict, base: dict) -> tuple[dict, dict]:
    """Closed loop on the sampled host boxes: a gamma puts skin luma on target, then a red/cyan balance puts
    skin r/g on target if it is still outside its band, then the gamma is touched up for what the balance moved."""
    g, k, now = 1.0, 0.0, base
    fix_luma = not LUMA_BAND[0] <= base["luma"] <= LUMA_BAND[1]
    fix_rg = False
    for _ in range(3):
        for _ in range(6 if fix_luma else 0):
            if abs(now["luma"] - LUMA_TARGET) <= LUMA_TOL:
                break
            g = min(max(g * math.log(LUMA_TARGET / 255) / math.log(now["luma"] / 255), G_MIN), G_MAX)
            now = host_skin(crops, make_look(g, k))
        fix_rg = fix_rg or not RG_BAND[0] <= now["rg"] <= RG_BAND[1]
        if not fix_rg or abs(now["rg"] - RG_TARGET) <= RG_TOL:
            break
        k0, rg0 = k, now["rg"]
        k = min(max(k + (K_PROBE if rg0 > RG_TARGET else -K_PROBE), -K_MAX), K_MAX)
        now = host_skin(crops, make_look(g, k))
        for _ in range(5):                                   # secant search on the balance
            if abs(now["rg"] - RG_TARGET) <= RG_TOL or now["rg"] == rg0:
                break
            k1 = min(max(k + (RG_TARGET - now["rg"]) * (k - k0) / (now["rg"] - rg0), -K_MAX), K_MAX)
            k0, rg0, k = k, now["rg"], k1
            now = host_skin(crops, make_look(g, k))
    return make_look(g, k), now


def cmd_solve(ep: Episode, args) -> None:
    lay = ep.layouts()
    ep.probe(ep.source)
    stats, crops = sample_hosts(ep.source, lay, args.samples, crops=True)
    looks, hosts = {}, {}
    print(f"{ep.source.name}: look per host from this recording's own skin measure "
          f"(luma target {LUMA_TARGET}, band {LUMA_BAND[0]}-{LUMA_BAND[1]}; "
          f"r/g target {RG_TARGET}, band {RG_BAND[0]}-{RG_BAND[1]})")
    for host in HOSTS:
        base = summarise([s for layout in LAYOUTS for s in stats[layout][host]])
        if not base:
            hosts[host] = {"action": "no skin found; left alone"}
        elif in_band(base):
            hosts[host] = {"before": base, "action": "inside the bands; left alone"}
        else:
            look, after = solve_host(crops[host], base)
            looks[host] = look
            hosts[host] = {"before": base, "after": after,
                           "action": "corrected" if in_band(after) else "corrected to the limit; still outside the bands"}
        h = hosts[host]
        for key in ("before", "after"):
            if key in h:
                print(f"  {host} {key:6} luma {h[key]['luma']:6.1f}  r/g {h[key]['rg']:.2f}  ({h[key]['samples']} samples)")
        print(f"  {host} {h['action']}" + "".join(f"\n      {name}={val}" for name, val in looks.get(host, {}).items()))
    out = ep.out / "look.json"
    write_json(out, {"source": stat_key(ep.source),
                     "targets": {"luma": [LUMA_BAND[0], LUMA_TARGET, LUMA_BAND[1]], "rg": [RG_BAND[0], RG_TARGET, RG_BAND[1]]},
                     "hosts": hosts, "looks": looks})
    print(f"wrote {out}")


# ---------------------------------------------------------------- render

def load_looks(path: Path) -> dict:
    """The looks solve wrote. The file can be edited by hand; solve overwrites it."""
    if not path.exists():
        die(f"{path} not found; run: grade.py solve <episode>")
    looks = json.loads(path.read_text()).get("looks") or {}
    for host, look in looks.items():
        if host not in HOSTS or not isinstance(look, dict) or set(look) - {"curves", "colorbalance", "saturation"}:
            die(f"look.json: looks.{host} must be V or M with only curves, colorbalance, saturation")
        if "curves" in look and not CURVES.fullmatch(str(look["curves"])):
            die(f"look.json: looks.{host}.curves must be points like '0/0 0.5/0.6 1/1'")
        if "colorbalance" in look and not BALANCE.fullmatch(str(look["colorbalance"])):
            die(f"look.json: looks.{host}.colorbalance must look like 'rm=-0.08:gm=0.02:bm=0.06'")
        sat = look.get("saturation", 1)
        if isinstance(sat, bool) or not isinstance(sat, (int, float)) or not 0 <= sat <= 2:
            die(f"look.json: looks.{host}.saturation must be a number from 0 to 2")
        if not (look.get("curves") or look.get("colorbalance") or sat != 1):
            die(f"look.json: looks.{host} changes nothing")
    return looks


def look_chain(look: dict) -> str:
    """curves and colorbalance run in RGB; eq (saturation) only exists in YUV, so it runs after the way back."""
    rgb = ([f"curves=interp=pchip:all='{look['curves']}'"] if look.get("curves") else []) + \
          ([f"colorbalance={look['colorbalance']}"] if look.get("colorbalance") else [])
    chain = ["scale=in_color_matrix=bt709:in_range=tv,format=gbrp", *rgb,
             "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"] if rgb else []
    if look.get("saturation", 1) != 1:
        chain.append(f"eq=saturation={look['saturation']}")
    return ",".join(chain)


def graph(looks: dict, runs: list) -> str:
    """One crop -> look -> overlay branch per (layout, host), switched on by frame number for that layout's runs."""
    branches = []
    for layout, boxes in LAYOUTS.items():
        when = "+".join(f"between(n,{r['start']},{r['end'] - 1})" for r in runs if r["layout"] == layout)
        branches += [(boxes[host], look_chain(looks[host]), when) for host in boxes if host in looks and when]
    if not branches:
        die("nothing to grade: no two-shot or screen-share run for the hosts in look.json")
    fc = [f"[0:v]split={len(branches) + 1}[o0]" + "".join(f"[c{i}]" for i in range(len(branches)))]
    for i, ((w, h, x, y), chain, when) in enumerate(branches):
        last = "[v]" if i == len(branches) - 1 else f"[o{i + 1}]"
        fc.append(f"[c{i}]crop={w}:{h}:{x}:{y},{chain}[g{i}];[o{i}][g{i}]overlay={x}:{y}:enable='{when}'{last}")
    return ";".join(fc)


def cmd_render(ep: Episode, args, replace: bool = False) -> bool:
    looks, lay = load_looks(ep.out / "look.json"), ep.layouts()
    if not looks:
        print("look.json corrects no host; nothing to render")
        return False
    ep.probe(ep.source)
    meta = ep.out / "render.json"
    want = {"source": stat_key(ep.source), "crf": args.crf, "looks": looks}
    if ep.graded.exists() and not args.force:
        done = json.loads(meta.read_text()) if meta.exists() else {}
        if done.get("output") == stat_key(ep.graded) and all(done.get(key) == val for key, val in want.items()):
            print(f"{ep.graded.name} is up to date")
            return True
        if not replace:
            die(f"{ep.graded} exists and was made from another source or look (use --force to replace it)")
    part = ep.graded.with_name(f"{ep.source.stem}.graded.part{ep.source.suffix}")
    print(f"rendering {ep.graded.name} (whole recording, crf {args.crf})", file=sys.stderr)
    t0 = time.time()
    ffm("-i", ep.source, "-filter_complex", graph(looks, lay["runs"]), "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-crf", args.crf, "-preset", "medium", "-g", "60", "-pix_fmt", "yuv420p",
        "-fps_mode", "passthrough", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-color_range", "tv", "-c:a", "copy", "-movflags", "+faststart", part)
    part.replace(ep.graded)
    write_json(meta, {**want, "output": stat_key(ep.graded), "seconds": round(time.time() - t0),
                      "graded_frames": {layout: lay["totals"][layout] for layout in LAYOUTS},
                      "ungraded_frames": lay["totals"]["O"]})
    print(f"wrote {ep.graded} in {time.time() - t0:.0f} s; the original is untouched")
    return True


def cmd_run(ep: Episode, args) -> None:
    path = ep.out / "layouts.json"
    if not path.exists() or json.loads(path.read_text())["source"] != stat_key(ep.source):
        cmd_layouts(ep, args)
    cmd_solve(ep, args)
    if cmd_render(ep, args, replace=True):
        args.graded = True
        cmd_measure(ep, args)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    cmds = {"run": cmd_run, "layouts": cmd_layouts, "measure": cmd_measure, "solve": cmd_solve, "render": cmd_render}
    for name, fn in cmds.items():
        sp = sub.add_parser(name)
        sp.add_argument("episode", help="episode id (261111) or episode folder")
        sp.add_argument("--source", help="recording to use instead of raw/<id>.mp4")
        sp.set_defaults(fn=fn)
        if name == "measure":
            sp.add_argument("--graded", action="store_true", help="measure raw/<id>.graded.mp4 instead of the original")
        if name in ("run", "measure", "solve"):
            sp.add_argument("--samples", type=int, default=SAMPLES, help="frames measured per layout")
        if name in ("run", "render"):
            sp.add_argument("--crf", type=int, default=16)
            sp.add_argument("--force", action="store_true", help="render again even when the graded file is up to date")
    args = ap.parse_args()
    args.fn(Episode(args.episode, args.source), args)


if __name__ == "__main__":
    main()
