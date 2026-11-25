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

# ---- Locked encode values shared by build.py and stacked.py (docs/show-prep/edit-style.md) ----
CANVAS = (1080, 1920)
AUDIO_FADE = 0.018                       # s, at hard-cut joins only
FPS = 30
X264 = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", str(FPS)]
AAC = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
UNSHARP = "unsharp=5:5:0.6:5:5:0.0"
CAP_MAX_WORDS = 3                        # words per caption chunk (big, readable; see brand/editing.md)

REPO = Path(__file__).resolve().parents[3]
ASTERISK_RED_SVG = REPO / "apps" / "app" / "public" / "brand" / "asterisk-red.svg"


def long_chunks(texts, max_words=CAP_MAX_WORDS):
    """Caption chunk texts with more than `max_words` words, as (text, word count). Pure; callers WARN, never fail."""
    return [(t, len(t.split())) for t in texts if len(t.split()) > max_words]


def warn_long_chunks(texts, max_words=CAP_MAX_WORDS):
    for t, n in long_chunks(texts, max_words):
        print(f"WARN: caption chunk has {n} words (max {max_words}): {t!r}", file=sys.stderr)


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


def source_path(cfg, episode, override=None, graded=False):
    """The recording a Short is cut from, and one line on stderr saying which file it is.

    Default is the raw named by short.json's "source". The colour-corrected copy (<stem>.graded<suffix>, from
    grade/grade.py) is used only when asked for: `graded=True` (the --graded flag) or "source_graded": true in
    short.json. `override` (--source) wins over both. A stale or missing graded copy is an error, never a silent
    fall-back to the raw."""
    raw = Path(episode) / cfg["source"]
    if override:
        p, why = Path(override), "--source"
    elif graded or cfg.get("source_graded"):
        p = workspace.graded_source(raw)
        if p == raw:
            die(f"graded source requested but no current {raw.stem}.graded{raw.suffix} next to {raw}")
        why = "graded"
    else:
        p, why = raw, "raw"
    if not p.exists():
        die(f"source video not found: {p}")
    print(f"source: {p} ({why})", file=sys.stderr)
    return p


def audio_fades(first, last, dur, nseg, fadein0=None):
    """afade filters for one piece of a hard-cut edit. `first`/`last` are the seg index when the piece starts/ends
    a seg (else None); 18 ms fades only at joins between segs, plus an optional opening fade (`fadein0`)."""
    af = []
    if first is not None and first > 0:
        af.append(f"afade=t=in:st=0:d={AUDIO_FADE}")
    if first == 0 and fadein0:
        af.append(f"afade=t=in:st=0:d={fadein0}")
    if last is not None and last < nseg - 1:
        af.append(f"afade=t=out:st={dur - AUDIO_FADE:.3f}:d={AUDIO_FADE}")
    return af


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
