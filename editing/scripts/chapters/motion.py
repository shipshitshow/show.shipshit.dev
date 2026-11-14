"""Motion layer for the chapter runner: pure logic, standard library only (Pillow is used lazily for pop text).

A chapter in chapters.json may carry an optional "motion" list. Four kinds of item, all declarative:

  broll    video or image over the hosts: "mode": "cutaway" (full frame) or "overlay" (a "box" on the plate)
  mascot   sprite or alpha video in a corner, sliding in and out (hard edges, no alpha fade)
  layout   switch the plate to a named layout for a window (hard cut in, hard cut out)
  pop      short text emphasis, white or red, timed from a spoken keyword or an explicit time

Times are SOURCE seconds (or MM:SS), the same clock as "start", "end" and "drop". They are mapped to the
chapter clock through the kept segments, so a time inside a dropped span or outside the chapter is an error.
Audio is never touched: the hosts' audio (the J/L split included) plays under every item.

This module has no ffmpeg dependency, so the validation and the filter-graph generation are unit-tested
(test_motion.py). run_chapters.py wires it in; a chapter without "motion" renders exactly as before.

Brand rules enforced here come from the vault page brand/editing.md and brand/placement.md (see README.md):
hard cuts only (no fades, no dissolves), no zoom on people, hosts on screen at least 80% of the runtime,
calm pacing, and nothing over the hosts' faces, the asterisk box or the lower-third band.
"""
from __future__ import annotations

import math
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

MOTION_VERSION = 1          # part of the video cache key of a chapter that has motion; never of one without
W, H = 1920, 1080           # design coordinates: every rect in chapters.json is in 1920x1080 pixels
FPS = 60
SAFE = (96, 96, 1824, 984)  # 5% margin on every edge (brand/placement.md)
ASTERISK = (1680, 96, 1824, 240)   # end-screen asterisk box, kept clear (brand/placement.md)
LOWER_BAND = (0, 918, 1920, 1080)  # name lower-thirds and the caption zone at the bottom of the plate
MIN_WINDOW_S = 0.5          # no cuts under about 0.5 s (brand/editing.md, calm cutting)
MERGE_S = 2.0               # cuts closer than 2 s are merged (brand/editing.md)
HOSTS_SHARE_MIN = 0.80      # hosts on screen at least 80% of the runtime (brand/editing.md)
POP_MIN_S = 1.2             # a pop stays up at least this long (word end or this, whichever is later)
POP_ANIM_S = 0.18           # pop scale-in: 70% to 100%, ease-out, then a hard cut away
MASCOT_ANIM_S = 0.25        # mascot slide in / out
RED = (232, 59, 59)         # brand red #E83B3B
WHITE = (255, 255, 255)
KINDS = ("broll", "mascot", "layout", "pop")
OVERLAY_KINDS = ("mascot", "pop", "broll")
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
EPS = 1e-6

# Named layouts live in chapters.json under "layouts" (nothing is built in: the crops belong to the recording).
# {"crop": [x, y, w, h], "owner_approved": true, "faces": [...]} scales a 16:9 crop up to the frame (a closeup);
# {"two_up": [[x, y, w, h], [x, y, w, h]], "faces": [...]} joins two 8:9 crops side by side.
# "faces" are [x, y, w, h] in the output frame while that layout shows; overlays are checked against them.
BUILTIN_LAYOUTS: dict = {}

Rect = tuple  # (x0, y0, x1, y1) in design pixels


@dataclass
class Ctx:
    """Everything the parser needs from the project. The callables keep this module free of file and ffmpeg access."""
    segs: list                      # kept (source_start, source_end) pieces of the chapter
    base_dir: Path                  # relative asset paths resolve against this
    layouts: dict = field(default_factory=dict)
    base_layout: str = "wide"
    words: Callable[[], list] | None = None          # word timings [{"w","s","e"}] in source seconds
    exists: Callable[[Path], bool] = Path.exists
    asset_size: Callable[[Path], tuple | None] | None = None   # (w, h) of an image or video
    asset_dur: Callable[[Path], float | None] | None = None    # seconds of a video, None for an image


@dataclass
class Item:
    kind: str
    idx: int
    sa: float                       # source window
    sb: float
    a: float = 0.0                  # chapter window, snapped to the 60 fps grid
    b: float = 0.0
    spec: dict = field(default_factory=dict)
    asset: Path | None = None       # file to read (for a pop: the rendered text PNG, set by the runner)
    rect: Rect | None = None        # on-screen box in design pixels; None for a full-frame item
    mode: str = ""                  # broll: cutaway | overlay
    layout: str = ""                # layout: name
    text: str = ""                  # pop
    color: str = "white"            # pop
    size: int = 72                  # pop font size in design pixels
    corner: str = ""                # mascot
    enter: float = 0.0              # mascot slide in / out, seconds
    exit: float = 0.0
    seek: float = 0.0               # start offset inside a video asset
    label: str = ""

    @property
    def is_image(self) -> bool:
        return self.asset is not None and self.asset.suffix.lower() in IMAGE_EXT


# --- small helpers ----------------------------------------------------------------------------------------
def time_value(v) -> float:
    """Seconds as a number, or 'MM:SS' / 'H:MM:SS(.fff)'. Raises ValueError."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    if isinstance(v, str) and re.fullmatch(r"(\d+:)?\d+:\d+(\.\d+)?", v):
        t = 0.0
        for part in v.split(":"):
            t = t * 60 + float(part)
        return t
    raise ValueError(f"bad time {v!r} (use seconds or MM:SS)")


def snap(t: float) -> float:
    """Nearest frame on the 60 fps grid, so an overlay window starts and ends on a whole frame."""
    return round(t * FPS) / FPS


def xyxy(r, what: str) -> Rect:
    """[x, y, w, h] -> (x0, y0, x1, y1). Raises ValueError."""
    if not (isinstance(r, (list, tuple)) and len(r) == 4 and all(isinstance(n, (int, float)) and not isinstance(n, bool) for n in r)):
        raise ValueError(f"{what} must be [x, y, w, h] in 1920x1080 pixels")
    x, y, w, h = r
    if w <= 0 or h <= 0:
        raise ValueError(f"{what} needs a positive width and height")
    return (x, y, x + w, y + h)


def intersects(a: Rect, b: Rect) -> bool:
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def inside(a: Rect, outer: Rect) -> bool:
    return a[0] >= outer[0] and a[1] >= outer[1] and a[2] <= outer[2] and a[3] <= outer[3]


def overlap_s(a: Item, b: Item) -> bool:
    return a.a < b.b - EPS and b.a < a.b - EPS


def fmt_s(t: float) -> str:
    return f"{int(t // 60)}:{t % 60:05.2f}"


def norm_word(w: str) -> str:
    return re.sub(r"[^a-z0-9']+", "", w.lower())


def find_phrase(words: list, phrase: str, near: float | None, lo: float, hi: float) -> list:
    """Every (start, end) in source seconds where the phrase is spoken inside lo..hi, nearest to `near` first."""
    toks = [t for t in (norm_word(x) for x in phrase.split()) if t]
    if not toks:
        return []
    hits = []
    for i in range(len(words) - len(toks) + 1):
        if all(norm_word(str(words[i + j].get("w", ""))) == toks[j] for j in range(len(toks))):
            s, e = float(words[i]["s"]), float(words[i + len(toks) - 1]["e"])
            if lo - EPS <= s and e <= hi + EPS:
                hits.append((s, e))
    if near is not None:
        hits.sort(key=lambda h: abs(h[0] - near))
    return hits


def locate(segs: list, sa: float, sb: float) -> tuple[float | None, float | None, str]:
    """Map a source window to chapter time through the kept segments. (a, b, '') or (None, None, reason)."""
    acc = 0.0
    for s, e in segs:
        if s - EPS <= sa and sb <= e + EPS:
            return acc + (sa - s), acc + (sb - s), ""
        acc += e - s
    if not any(s - EPS <= sa <= e + EPS for s, e in segs):
        return None, None, f"starts at {sa:g} s, outside the kept part of the chapter (before start, after end, or in a dropped span)"
    return None, None, f"{sa:g}..{sb:g} s crosses a cut or the chapter end: keep each item inside one uncut stretch"


# --- pop text: measured and rendered with Pillow when it is there ------------------------------------------
_FONTS = [os.environ.get("MOTION_FONT"), "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
          "/Library/Fonts/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]


def _pop_geometry(px: float) -> tuple[int, int, int]:
    """(stroke, shadow offset, padding) for a font size in pixels."""
    return max(2, round(px * 0.06)), max(2, round(px * 0.05)), max(4, round(px * 0.12))


def _font(px: float):
    from PIL import ImageFont
    for f in _FONTS:
        if f and Path(f).exists():
            return ImageFont.truetype(f, max(1, round(px)))
    return ImageFont.load_default()


def pop_metrics(text: str, size: int) -> tuple[int, int]:
    """Width and height in design pixels of the pop image for a text at a font size."""
    stroke, shadow, pad = _pop_geometry(size)
    try:
        from PIL import Image, ImageDraw
        box = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), text, font=_font(size), stroke_width=stroke)
        return box[2] - box[0] + 2 * pad + shadow, box[3] - box[1] + 2 * pad + shadow
    except Exception:  # no Pillow (CI): a conservative estimate for bold sans text
        return round(0.62 * size * len(text)) + 2 * pad + shadow, round(1.2 * size) + 2 * pad + shadow


def render_pop_png(text: str, color: str, size: int, scale: float, out: Path) -> None:
    """The pop as a transparent PNG at output resolution (size x scale pixels): brand white or red, dark stroke."""
    from PIL import Image, ImageDraw
    px = size * scale
    stroke, shadow, pad = _pop_geometry(px)
    font = _font(px)
    box = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), text, font=font, stroke_width=stroke)
    w, h = box[2] - box[0] + 2 * pad + shadow, box[3] - box[1] + 2 * pad + shadow
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    org = (pad - box[0], pad - box[1])
    d.text((org[0] + shadow, org[1] + shadow), text, font=font, fill=(0, 0, 0, 150), stroke_width=stroke, stroke_fill=(0, 0, 0, 150))
    d.text(org, text, font=font, fill=(*(RED if color == "red" else WHITE), 255), stroke_width=stroke, stroke_fill=(20, 12, 12, 255))
    img.save(out)


# --- layouts ----------------------------------------------------------------------------------------------
def layout_def(ctx: Ctx, name: str) -> dict | None:
    if name == ctx.base_layout:
        return ctx.layouts.get(name, {})
    return ctx.layouts.get(name) or BUILTIN_LAYOUTS.get(name)


def layout_kind(d: dict) -> str:
    return "closeup" if "crop" in d else "two-up" if "two_up" in d else "base"


def _check_layout_def(name: str, d: dict, errors: list, warns: list) -> None:
    kind = layout_kind(d)
    try:
        if kind == "closeup":
            c = xyxy(d["crop"], f"layout {name!r} crop")
            if not inside(c, (0, 0, W, H)):
                errors.append(f"layout {name!r}: crop leaves the frame")
            if abs((c[2] - c[0]) / (c[3] - c[1]) - W / H) > 0.01 * W / H:
                errors.append(f"layout {name!r}: crop must be 16:9 so nothing is stretched")
            if not d.get("owner_approved"):
                errors.append(f"layout {name!r}: a closeup crop scales a host up, which brand/editing.md forbids "
                              f"(no zoom on people); set \"owner_approved\": true on the layout once the owner has accepted it")
            else:
                warns.append(f"layout {name!r}: closeup crop at {W / (c[2] - c[0]):.2f}x on a host, accepted by the owner "
                             f"(brand/editing.md: no zoom on people)")
        elif kind == "two-up":
            if not (isinstance(d["two_up"], list) and len(d["two_up"]) == 2):
                errors.append(f"layout {name!r}: two_up needs exactly two crops")
                return
            for k, r in enumerate(d["two_up"]):
                c = xyxy(r, f"layout {name!r} two_up[{k}]")
                if not inside(c, (0, 0, W, H)):
                    errors.append(f"layout {name!r}: two_up[{k}] leaves the frame")
                if abs((c[2] - c[0]) / (c[3] - c[1]) - (W / 2) / H) > 0.01 * (W / 2) / H:
                    errors.append(f"layout {name!r}: two_up[{k}] must be 8:9 so nothing is stretched")
            zoomed = [r for r in d["two_up"] if isinstance(r, list) and len(r) == 4 and r[2] < W / 2 - 1]
            if zoomed and not d.get("owner_approved"):
                errors.append(f"layout {name!r}: a two_up crop narrower than half the frame scales a host up, which "
                              f"brand/editing.md forbids (no zoom on people); use full half-frame crops or set "
                              f"\"owner_approved\": true once the owner has accepted it")
        if "faces" in d:
            for k, r in enumerate(d["faces"]):
                xyxy(r, f"layout {name!r} faces[{k}]")
    except ValueError as e:
        errors.append(str(e))


# --- parse ------------------------------------------------------------------------------------------------
def build(raw, ctx: Ctx) -> tuple[list[Item], list[str], list[str]]:
    """Parse and validate a chapter's motion list. Returns (items, errors, warnings); items are time-ordered."""
    errors: list[str] = []
    warns: list[str] = []
    items: list[Item] = []
    if raw is None:
        return items, errors, warns
    if not isinstance(raw, list):
        return items, ["motion must be a list"], warns
    for i, spec in enumerate(raw):
        tag = f"motion[{i}]"
        msgs: list[str] = []
        it = _parse_item(i, spec, ctx, msgs, warns)
        errors += [f"{tag}: {m}" for m in msgs]
        if it:
            items.append(it)
    if not errors:
        check(items, ctx, errors, warns)
    items.sort(key=lambda x: (x.a, x.idx))
    return items, list(dict.fromkeys(errors)), list(dict.fromkeys(warns))


def _asset(spec: dict, ctx: Ctx, errors: list) -> Path | None:
    raw = spec.get("asset")
    if not isinstance(raw, str) or not raw:
        errors.append("needs an \"asset\" path")
        return None
    p = Path(raw).expanduser()
    p = p if p.is_absolute() else ctx.base_dir / p
    if not ctx.exists(p):
        errors.append(f"missing asset file: {raw}")
        return None
    return p


def _parse_item(i: int, spec, ctx: Ctx, errors: list, warns: list) -> Item | None:
    if not isinstance(spec, dict):
        errors.append("must be an object")
        return None
    kind = spec.get("type")
    if kind not in KINDS:
        errors.append(f"type {kind!r} must be one of {', '.join(KINDS)}")
        return None
    n0 = len(errors)
    text, color, size = "", "white", 72
    # window, in source seconds
    try:
        if kind == "pop" and "keyword" in spec and "at" not in spec:
            if ctx.words is None:
                errors.append("a keyword pop needs a \"words\" file in chapters.json (or an explicit \"at\")")
                return None
            near = time_value(spec["near"]) if "near" in spec else None
            lo, hi = ctx.segs[0][0], ctx.segs[-1][1]
            hits = find_phrase(ctx.words(), str(spec["keyword"]), near, lo, hi)
            if not hits:
                errors.append(f"keyword {spec['keyword']!r} is not spoken inside the chapter (check \"words\" and \"near\")")
                return None
            if len(hits) > 1 and near is None:
                warns.append(f"motion[{i}]: keyword {spec['keyword']!r} is spoken {len(hits)} times; using the first (add \"near\")")
            sa, e = hits[0]
            sb = sa + time_value(spec["dur"]) if "dur" in spec else max(e, sa + POP_MIN_S)
        else:
            if "at" not in spec or not ("dur" in spec or "end" in spec):
                errors.append("needs \"at\" and \"dur\" (or \"end\")")
                return None
            sa = time_value(spec["at"])
            sb = time_value(spec["end"]) if "end" in spec else sa + time_value(spec["dur"])
    except ValueError as e:
        errors.append(str(e))
        return None
    if sb - sa < MIN_WINDOW_S - EPS:
        errors.append(f"window {sb - sa:.2f} s is under {MIN_WINDOW_S} s (calm cutting)")
        return None
    a, b, why = locate(ctx.segs, sa, sb)
    if a is None:
        errors.append(why)
        return None
    a, b = snap(a), snap(b)
    it = Item(kind=kind, idx=i, sa=sa, sb=sb, a=a, b=b, spec=dict(spec))
    try:
        if kind == "layout":
            _layout_item(it, spec, ctx, errors, warns)
        elif kind == "broll":
            _broll_item(it, spec, ctx, errors, warns)
        elif kind == "mascot":
            _mascot_item(it, spec, ctx, errors, warns)
        else:
            _pop_item(it, spec, ctx, errors, warns)
    except ValueError as e:
        errors.append(str(e))
    return None if len(errors) > n0 else it


def _layout_item(it: Item, spec: dict, ctx: Ctx, errors: list, warns: list) -> None:
    name = str(spec.get("layout", ""))
    d = layout_def(ctx, name)
    if d is None:
        known = sorted({ctx.base_layout, *ctx.layouts, *BUILTIN_LAYOUTS})
        errors.append(f"layout {name!r} is not defined (known: {', '.join(known)})")
        return
    it.layout = name
    it.spec["_def"] = d
    if name != ctx.base_layout:
        _check_layout_def(name, d, errors, warns)
    it.label = name


def _broll_item(it: Item, spec: dict, ctx: Ctx, errors: list, warns: list) -> None:
    it.asset = _asset(spec, ctx, errors)
    it.mode = spec.get("mode", "cutaway")
    if it.mode not in ("cutaway", "overlay"):
        errors.append("mode must be \"cutaway\" or \"overlay\"")
        return
    it.seek = time_value(spec.get("from", 0))
    if it.mode == "overlay":
        if "box" not in spec:
            errors.append("an overlay needs a \"box\": [x, y, w, h] in 1920x1080 pixels, away from the hosts' faces")
            return
        it.rect = xyxy(spec["box"], "box")
    if it.asset and ctx.asset_dur and not it.is_image:
        d = ctx.asset_dur(it.asset)
        if d is not None and d - it.seek < it.b - it.a - 0.05:
            warns.append(f"motion[{it.idx}]: b-roll is {d - it.seek:.1f} s but the window is {it.b - it.a:.1f} s; the hosts show again after it ends")
    it.label = f"{it.mode} {Path(str(spec.get('asset', ''))).name}"


def _mascot_item(it: Item, spec: dict, ctx: Ctx, errors: list, warns: list) -> None:
    it.asset = _asset(spec, ctx, errors)
    it.corner = spec.get("corner", "bl")
    if it.corner not in ("tl", "tr", "bl", "br"):
        errors.append("corner must be tl, tr, bl or br")
        return
    it.enter, it.exit = float(spec.get("enter", MASCOT_ANIM_S)), float(spec.get("exit", MASCOT_ANIM_S))
    if it.enter + it.exit > it.b - it.a + EPS:
        errors.append("the slide in and out do not fit in the window")
        return
    it.seek = time_value(spec.get("from", 0))
    margin = float(spec.get("margin", SAFE[0]))
    mw = float(spec.get("width", 230))
    size = ctx.asset_size(it.asset) if (it.asset and ctx.asset_size) else None
    if size is None:
        if it.asset:
            errors.append("cannot read the mascot asset's size")
        return
    mh = mw * size[1] / size[0]
    x0 = margin if it.corner in ("tl", "bl") else W - margin - mw
    y0 = SAFE[1] if it.corner in ("tl", "tr") else LOWER_BAND[1] - mh
    it.rect = (x0, y0, x0 + mw, y0 + mh)
    it.label = f"{it.corner} {Path(str(spec.get('asset', ''))).name}"


def _pop_item(it: Item, spec: dict, ctx: Ctx, errors: list, warns: list) -> None:
    it.text = str(spec.get("text") or spec.get("keyword") or "")
    if not it.text.strip():
        errors.append("needs \"text\" (or a \"keyword\")")
        return
    it.color = spec.get("color", "white")
    if it.color not in ("white", "red"):
        errors.append("color must be \"white\" or \"red\" (brand colours)")
        return
    it.size = int(spec.get("size", 72))
    cx, cy = spec.get("center", [W / 2, 300])
    tw, th = pop_metrics(it.text, it.size)
    it.rect = (cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2)
    it.label = f"{it.color} {it.text!r}" + (f" on {spec['keyword']!r}" if "keyword" in spec else "")


# --- validation of the whole timeline ---------------------------------------------------------------------
def check(items: list[Item], ctx: Ctx, errors: list, warns: list) -> None:
    dur = sum(e - s for s, e in ctx.segs)
    lay = sorted((x for x in items if x.kind == "layout"), key=lambda x: x.a)
    for k, it in enumerate(lay):
        if it.layout == ctx.base_layout:
            warns.append(f"motion[{it.idx}]: layout {it.layout!r} is the plate itself, so this item changes nothing")
        if it.b - it.a < MERGE_S:
            warns.append(f"motion[{it.idx}]: layout window {it.b - it.a:.1f} s is under {MERGE_S:g} s (calm cutting: merge short cuts)")
        if k:
            gap = it.a - lay[k - 1].b
            if gap < -EPS:
                errors.append(f"motion[{it.idx}]: layout windows overlap motion[{lay[k - 1].idx}] ({fmt_s(it.a)} chapter time)")
            elif 0 < gap < MIN_WINDOW_S:
                errors.append(f"motion[{it.idx}]: only {gap:.2f} s back on the plate between two layouts (under {MIN_WINDOW_S} s)")
            elif MIN_WINDOW_S <= gap < MERGE_S and gap > 0:
                warns.append(f"motion[{it.idx}]: {gap:.1f} s back on the plate between two layouts (under {MERGE_S:g} s: merge)")
    for kind in ("broll", "mascot", "pop"):
        same = sorted((x for x in items if x.kind == kind), key=lambda x: x.a)
        for p, q in zip(same, same[1:]):
            if overlap_s(p, q):
                errors.append(f"motion[{q.idx}]: {kind} windows overlap motion[{p.idx}] ({fmt_s(q.a)} chapter time)")
    cut = [x for x in items if x.kind == "broll" and x.mode == "cutaway"]
    for c in cut:
        for o in items:
            if o is not c and overlap_s(c, o):
                errors.append(f"motion[{o.idx}]: runs over the cutaway motion[{c.idx}], which covers the whole frame")
    for p, q in zip(cut, cut[1:]):
        if 0 <= q.a - p.b < MERGE_S:
            warns.append(f"motion[{q.idx}]: cutaway {q.a - p.b:.1f} s after the previous one (calm cutting: no cutaway churn)")
    if cut and sum(c.b - c.a for c in cut) > (1 - HOSTS_SHARE_MIN) * dur:
        warns.append(f"cutaways cover {sum(c.b - c.a for c in cut) / dur:.0%} of the chapter; the hosts must be on screen at least {HOSTS_SHARE_MIN:.0%}")
    boxes = [x for x in items if x.rect is not None]
    for it in boxes:
        r = it.rect
        if not inside(r, SAFE):
            errors.append(f"motion[{it.idx}]: {it.kind} box {_fmt_rect(r)} leaves the 5% safe margin {_fmt_rect(SAFE)}")
        if intersects(r, ASTERISK):
            errors.append(f"motion[{it.idx}]: {it.kind} box {_fmt_rect(r)} covers the asterisk box {_fmt_rect(ASTERISK)}")
        if intersects(r, LOWER_BAND):
            errors.append(f"motion[{it.idx}]: {it.kind} box {_fmt_rect(r)} reaches the lower-third / caption band (y >= {LOWER_BAND[1]})")
        names = {ctx.base_layout} | {x.layout for x in lay if overlap_s(x, it)}
        for nm in sorted(names):
            d = layout_def(ctx, nm) or {}
            if "faces" not in d:
                warns.append(f"layout {nm!r} has no \"faces\" rects, so overlays over it are not checked against the hosts' faces")
                continue
            for f in d["faces"]:
                try:
                    fr = xyxy(f, f"layout {nm!r} face")
                except ValueError:
                    continue
                if intersects(r, fr):
                    errors.append(f"motion[{it.idx}]: {it.kind} box {_fmt_rect(r)} covers a host's face {_fmt_rect(fr)} in layout {nm!r}")
    for p, q in ((p, q) for k, p in enumerate(boxes) for q in boxes[k + 1:]):
        if p.kind != q.kind and overlap_s(p, q) and intersects(p.rect, q.rect):
            errors.append(f"motion[{q.idx}]: {q.kind} box covers motion[{p.idx}] ({p.kind}) at the same time")


def _fmt_rect(r: Rect) -> str:
    return f"[{r[0]:g},{r[1]:g},{r[2]:g},{r[3]:g}]"


def describe(items: list[Item]) -> list[str]:
    """One row per item: source window, chapter window, kind, detail."""
    return [f"{x.kind:<7} src {fmt_s(x.sa)}-{fmt_s(x.sb)}  chapter {fmt_s(x.a)}-{fmt_s(x.b)}  {x.label}"
            + (f"  box {_fmt_rect(x.rect)}" if x.rect else "") for x in items]


# --- cache key --------------------------------------------------------------------------------------------
def key_payload(base: dict, items: list[Item], stat_key: Callable) -> dict:
    """The video cache key payload. With no motion it is `base` itself, so a chapter without motion keeps its
    key (and its rendered bytes); with motion, every item's resolved settings and asset file state enter it."""
    if not items:
        return base
    sig = []
    for x in items:
        spec = {k: v for k, v in x.spec.items() if k != "_def"}
        sig.append({"k": x.kind, "a": round(x.a, 4), "b": round(x.b, 4), "spec": spec, "rect": x.rect,
                    "def": x.spec.get("_def"), "asset": stat_key(x.asset) if x.asset and x.kind != "pop" else None})
    return {**base, "motion": {"v": MOTION_VERSION, "items": sig}}


# --- ffmpeg filter graph ----------------------------------------------------------------------------------
def base_parts(segs: list, a0: float, h: int, fps: int) -> tuple[list[str], list[str]]:
    """The plate: one trimmed, scaled piece per kept segment. Shared by the plain and the motion path."""
    parts, labels = [], []
    for k, (s, e) in enumerate(segs):
        parts.append(f"[0:v]trim={s - a0:.4f}:{e - a0:.4f},setpts=PTS-STARTPTS,fps={fps},"
                     f"scale=-2:{h}:flags=lanczos,setsar=1,format=yuv420p[v{k}]")
        labels.append(f"[v{k}]")
    return parts, labels


def concat_part(labels: list[str], out: str) -> str:
    return f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[{out}]"


def _ev(n: float) -> str:
    return f"{n:.4f}".rstrip("0").rstrip(".")


def _even(v: float) -> int:
    return max(2, 2 * round(v / 2))


def _window(it: Item) -> str:
    return f"gte(t,{_ev(it.a)})*lt(t,{_ev(it.b)})"


def _ease_in(t0: float, d: float) -> str:
    """1 - (1-p)^3 with p = clip((t - t0) / d, 0, 1): ease-out from 0 to 1."""
    return f"(1-pow(1-clip((t-{_ev(t0)})/{_ev(d)},0,1),3))"


def input_args(it: Item, fps: int) -> list:
    """ffmpeg input options for one asset. Looped stills and clipped videos are bounded, so no input outlives the window."""
    d = f"{it.b - it.a + 0.5:.4f}"
    if it.is_image or it.kind == "pop":
        return ["-loop", "1", "-framerate", str(fps), "-t", d, "-i", it.asset]
    return (["-ss", f"{it.seek:.4f}"] if it.seek else []) + ["-t", d, "-i", it.asset]


def motion_parts(segs: list, a0: float, h: int, fps: int, items: list[Item]) -> tuple[list[list], list[str]]:
    """(extra ffmpeg inputs, filter parts). Input 0 is the source; the graph ends in [v] like the plain graph.
    Layer order: plate, layouts, b-roll, mascot, pop. Every overlay is gated by `enable`, so frames outside the
    windows are the plate's own, untouched."""
    k = h / H
    wo = _even(W * k)
    parts, labels = base_parts(segs, a0, h, fps)
    parts.append(concat_part(labels, "base"))
    inputs: list[list] = []
    cur, n = "base", 0

    def overlay(top: str, args: str) -> None:
        nonlocal cur, n
        n += 1
        parts.append(f"[{cur}][{top}]overlay={args}[o{n}]")
        cur = f"o{n}"

    def add_input(it: Item) -> int:
        inputs.append(input_args(it, fps))
        return len(inputs)  # input 0 is the source

    by_layout: dict[str, list[Item]] = {}
    for it in items:
        if it.kind == "layout" and layout_kind(it.spec["_def"]) != "base":
            by_layout.setdefault(it.layout, []).append(it)
    for j, (name, its) in enumerate(by_layout.items()):
        d, ls = its[0].spec["_def"], []
        for q, (s, e) in enumerate(segs):
            head = f"[0:v]trim={s - a0:.4f}:{e - a0:.4f},setpts=PTS-STARTPTS,fps={fps}"
            if layout_kind(d) == "closeup":
                x0, y0, x1, y1 = xyxy(d["crop"], "crop")
                parts.append(f"{head},crop={_ev(x1 - x0)}:{_ev(y1 - y0)}:{_ev(x0)}:{_ev(y0)},"
                             f"scale={wo}:{h}:flags=lanczos,setsar=1,format=yuv420p[l{j}s{q}]")
            else:
                (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = (xyxy(r, "two_up") for r in d["two_up"])
                parts.append(f"{head},split=2[l{j}a{q}][l{j}b{q}]")
                parts.append(f"[l{j}a{q}]crop={_ev(ax1 - ax0)}:{_ev(ay1 - ay0)}:{_ev(ax0)}:{_ev(ay0)},scale={wo // 2}:{h}:flags=lanczos[l{j}c{q}]")
                parts.append(f"[l{j}b{q}]crop={_ev(bx1 - bx0)}:{_ev(by1 - by0)}:{_ev(bx0)}:{_ev(by0)},scale={wo // 2}:{h}:flags=lanczos[l{j}d{q}]")
                parts.append(f"[l{j}c{q}][l{j}d{q}]hstack=inputs=2,setsar=1,format=yuv420p[l{j}s{q}]")
            ls.append(f"[l{j}s{q}]")
        parts.append(concat_part(ls, f"lay{j}"))
        overlay(f"lay{j}", f"0:0:enable='{'+'.join(_window(x) for x in its)}':eof_action=pass")
    for j, it in enumerate(x for x in items if x.kind == "broll"):
        i = add_input(it)
        if it.mode == "cutaway":
            bw, bh, ox, oy = wo, h, 0, 0
        else:
            bw, bh = _even((it.rect[2] - it.rect[0]) * k), _even((it.rect[3] - it.rect[1]) * k)
            ox, oy = round(it.rect[0] * k), round(it.rect[1] * k)
        parts.append(f"[{i}:v]scale={bw}:{bh}:force_original_aspect_ratio=increase:flags=lanczos,crop={bw}:{bh},"
                     f"setsar=1,format=yuv420p,fps={fps},setpts=PTS-STARTPTS+{_ev(it.a)}/TB[b{j}]")
        overlay(f"b{j}", f"{ox}:{oy}:enable='{_window(it)}':eof_action=pass")
    for j, it in enumerate(x for x in items if x.kind == "mascot"):
        i = add_input(it)
        mw, mh = _even((it.rect[2] - it.rect[0]) * k), _even((it.rect[3] - it.rect[1]) * k)
        xf, yf = round(it.rect[0] * k), round(it.rect[1] * k)
        parts.append(f"[{i}:v]format=rgba,scale={mw}:{mh}:flags=lanczos,format=yuva420p,fps={fps},"
                     f"setpts=PTS-STARTPTS+{_ev(it.a)}/TB[m{j}]")
        # slide in from, and out to, the nearest side edge: x = rest +/- travel * (remaining in + done out)
        left = it.corner in ("tl", "bl")
        travel = xf + mw if left else wo - xf
        rem_in = f"pow(1-clip((t-{_ev(it.a)})/{_ev(it.enter)},0,1),3)" if it.enter else "0"
        out = _ease_in(it.b - it.exit, it.exit) if it.exit else "0"
        sign = "-" if left else "+"
        x = f"{xf}{sign}{travel}*({rem_in}+{out})" if (it.enter or it.exit) else f"{xf}"
        overlay(f"m{j}", f"x='{x}':y={yf}:enable='{_window(it)}':eof_action=pass")
    for j, it in enumerate(x for x in items if x.kind == "pop"):
        i = add_input(it)
        cx, cy = round((it.rect[0] + it.rect[2]) / 2 * k), round((it.rect[1] + it.rect[3]) / 2 * k)
        e = _ease_in(it.a, POP_ANIM_S)
        parts.append(f"[{i}:v]format=rgba,setpts=PTS-STARTPTS+{_ev(it.a)}/TB,"
                     f"scale=w='trunc(iw*(0.7+0.3*{e})/2)*2':h='trunc(ih*(0.7+0.3*{e})/2)*2':eval=frame:flags=bicubic,format=yuva420p[p{j}]")
        overlay(f"p{j}", f"x='{cx}-overlay_w/2':y='{cy}-overlay_h/2':enable='{_window(it)}':eof_action=pass")
    if cur == "base":
        parts.append("[base]null[v]")
    else:
        parts[-1] = parts[-1][:-len(f"[{cur}]")] + "[v]"
    return inputs, parts
