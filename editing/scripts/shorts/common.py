"""Shared helpers for the Shorts pipeline (align.py, build.py, finalize.py).

Ported from the 261103/shorts/_work v3d scripts, 5 Nov 2026. The locked template
the three scripts implement is documented in docs/show-prep/edit-style.md.
"""
import glob
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import workspace  # noqa: E402  (shared content-root helpers)

REPO = Path(__file__).resolve().parents[3]
ASTERISK_RED_SVG = REPO / "apps" / "app" / "public" / "brand" / "asterisk-red.svg"


def die(msg):
    sys.exit(f"error: {msg}")


def find_bin(name, override=None):
    """Explicit path, then $FFMPEG / $FFPROBE, then the full Homebrew ffmpeg build, then PATH."""
    for cand in (override, os.environ.get(name.upper()), f"/opt/homebrew/opt/ffmpeg-full/bin/{name}"):
        if cand and os.path.exists(cand):
            return cand
    return shutil.which(name) or die(f"{name} not found (set ${name.upper()})")


def load_short(episode, slug, config=None):
    """Returns (cfg, episode_dir, short_dir). Config defaults to <short>/short.json."""
    episode = Path(episode).resolve()
    short_dir = episode / "out" / "shorts" / slug
    cfg_path = Path(config) if config else short_dir / "short.json"
    if not cfg_path.exists():
        die(f"{cfg_path} not found (see editing/scripts/shorts/README.md)")
    cfg = json.loads(cfg_path.read_text())
    if not cfg.get("segs"):
        die(f"{cfg_path}: 'segs' is required")
    return cfg, episode, short_dir


def default_work(short_dir):
    return Path(short_dir) / "outputs" / "work" / "tmp_v3c"


def source_path(cfg, episode, override=None):
    # the config names the recording; its colour-corrected copy is used when current (--source bypasses this)
    p = Path(override) if override else workspace.graded_source(Path(episode) / cfg["source"])
    if not p.exists():
        die(f"source video not found: {p}")
    return p


def clip_time(segs, t):
    """Source second -> second of the cut Short."""
    acc = 0.0
    for s in segs:
        if s["a"] - 1e-6 <= t <= s["b"] + 1e-6:
            return acc + (t - s["a"])
        acc += s["b"] - s["a"]
    raise ValueError(t)


def find_chrome(override=None):
    for cand in (override, os.environ.get("CHROME")):
        if cand and os.path.exists(cand):
            return cand
    home = Path.home()
    for pat in (home / "Library/Caches/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell",
                home / ".cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell"):
        hits = sorted(glob.glob(str(pat)))
        if hits:
            return hits[-1]
    return shutil.which("chromium") or shutil.which("google-chrome")


def rasterise_svg(svg, px, out, chrome=None):
    """Rasterise an SVG to a transparent PNG (cached at `out`). Headless Chromium first
    (what the 261103 renders used), then rsvg-convert / ImageMagick."""
    out = Path(out)
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    browser = find_chrome(chrome)
    if browser:
        html = out.with_suffix(".html")
        html.write_text(
            f'<html><body style="margin:0;background:transparent">'
            f'<img src="file://{svg}" width="{px}" height="{px}" style="display:block"></body></html>')
        subprocess.run([browser, "--no-sandbox", "--hide-scrollbars", "--default-background-color=00000000",
                        f"--window-size={px},{px}", f"--screenshot={out}", f"file://{html}"],
                       check=True, capture_output=True)
        html.unlink()
        return out
    if shutil.which("rsvg-convert"):
        subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), "-b", "none", "-o", str(out), str(svg)], check=True)
        return out
    magick = shutil.which("magick")
    if magick:
        subprocess.run([magick, "-background", "none", "-density", "384", str(svg),
                        "-resize", f"{px}x{px}", str(out)], check=True)
        return out
    die("no SVG rasteriser found: pass --chrome PATH (headless Chromium) or install rsvg-convert")
