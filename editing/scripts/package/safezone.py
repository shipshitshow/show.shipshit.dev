"""Caption safe zones, one definition shared by package/check.py (the release-package check) and render/dual.py
(the burned-caption render), so the check and the render can never disagree.

Three profiles:
  stacked    1080x1920 two-host Shorts layout: caption line centred on the seam (shorts/stacked.py SEAM_Y).
  full       1080x1920 full-bleed Short (shorts/build.py): caption at y1480, nothing below y1570.
  landscape  1920x1080 episode / X copy: caption in the lower band, above the host name labels and below the faces.

The Shorts numbers are read from shorts/stacked.py and shorts/build.py, not copied. build.py imports Pillow, which
CI does not have, so its locked constants are read from its source with `ast` instead of importing it.
The landscape numbers are measured on the 261111 two-shot (see LANDSCAPE below); the vault names no caption style or
caption zone for the 16:9 X copy (brand/editing.md, "Known gaps"), so they are house starting values, not rules.
"""
import ast
import sys
from pathlib import Path

SHORTS = Path(__file__).resolve().parents[1] / "shorts"
sys.path.insert(0, str(SHORTS))
import stacked as S  # noqa: E402  (pure logic: SEAM_Y, LABEL_Y, seam_caption_box)

PAD = 4  # px above and below the cap height, the same padding build.cap_words uses


def _literal(node):
    """ast.literal_eval that also accepts dict(k=v) calls (build.AST is written that way)."""
    if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "dict":
        return {k.arg: _literal(k.value) for k in node.keywords}
    return ast.literal_eval(node)


def build_constants(path=SHORTS / "build.py"):
    """Module-level literal constants of shorts/build.py (CAP_H, CAP_MAX_W, CAP_FLOOR, AST, ...) without importing it."""
    out = {}
    for node in ast.parse(Path(path).read_text()).body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            try:
                out[node.targets[0].id] = _literal(node.value)
            except (ValueError, TypeError):
                pass  # not a literal (fonts built from paths, PIL colours, ...)
    return out


B = build_constants()


def _asterisk_rect():
    a = B["AST"]
    return (a["cx"] - a["size"] // 2, a["cy"] - a["size"] // 2, a["cx"] + a["size"] // 2, a["cy"] + a["size"] // 2)


# Landscape, measured on the 261111 master (1920x1080), 14 Nov 2026:
#   heads end at about y650 (Mitchell, chin) so nothing may start above face_bottom 760;
#   the name labels ("Vincent", "Mitchell" and the handle strip) start at y920, kept clear by label_gap 15;
#   the 16:9 signature asterisk box is the vault's x1680 / y96, 144 px (brand/thumbnail-safe-zones.md);
#   margin 96 is the vault's equal top/right clearance for 1920x1080.
# The caption sits across the middle of the frame, over the shoulders and the vertical split between the two hosts,
# the way the 13 Nov X copy did, not over a face.
LANDSCAPE = dict(
    name="landscape", canvas=(1920, 1080), margin=96,
    cy=872, cap_h=48, cap_h_fallbacks=(44, 40, 36), max_w=1728,
    face_bottom=760, label_top=920, label_gap=15,
    keepouts={"asterisk": (1680, 96, 1824, 240)},
)

PROFILES = {
    "landscape": LANDSCAPE,
    "stacked": dict(
        name="stacked", canvas=(1080, 1920), margin=0,
        cy=S.SEAM_Y, cap_h=B["CAP_H"], cap_h_fallbacks=tuple(B["CAP_H_FALLBACKS"]), max_w=B["CAP_MAX_W"],
        floor=B["CAP_FLOOR"], seam_tol=2, keepouts={"asterisk": _asterisk_rect()},
    ),
    "full": dict(
        name="full", canvas=(1080, 1920), margin=0,
        cy=B["CAP_CY"], cap_h=B["CAP_H"], cap_h_fallbacks=tuple(B["CAP_H_FALLBACKS"]), max_w=B["CAP_MAX_W"],
        floor=B["CAP_FLOOR"], keepouts={"asterisk": _asterisk_rect()},
    ),
}


def profile_for(size, name=None):
    """Profile by name, or by orientation of `size` (landscape for w > h, else the stacked Shorts layout)."""
    if name:
        if name not in PROFILES:
            raise ValueError(f"unknown profile {name!r} (one of {', '.join(PROFILES)})")
        return PROFILES[name]
    return PROFILES["landscape"] if size[0] > size[1] else PROFILES["stacked"]


def cap_sizes(profile):
    """Cap heights to try, largest first (build.cap_words steps down the same way)."""
    return (profile["cap_h"], *profile["cap_h_fallbacks"])


def caption_box(profile, cap_h, width, cy=None):
    """(x0, y0, x1, y1) of a caption line: centred horizontally, `width` px wide, cap height `cap_h`, centre `cy`."""
    cy = profile["cy"] if cy is None else cy
    cw = profile["canvas"][0]
    return ((cw - width) / 2, cy - cap_h / 2 - PAD, (cw + width) / 2, cy + cap_h / 2 + PAD)


def _overlap(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def violations(profile, box, cy=None):
    """Human-readable reasons a caption box leaves the safe zone; an empty list means it is inside.
    `box` is (x0, y0, x1, y1) in canvas pixels; `cy` is the caption's declared centre when known (seam check)."""
    p, bad = profile, []
    cw, ch = p["canvas"]
    x0, y0, x1, y1 = box
    m = p["margin"]
    if x0 < m or x1 > cw - m:
        bad.append(f"x {x0:.0f}-{x1:.0f} outside the {m} px side margin" if m else f"x {x0:.0f}-{x1:.0f} outside the canvas")
    if x1 - x0 > p["max_w"] + 0.5:
        bad.append(f"{x1 - x0:.0f} px wide, over the {p['max_w']} px limit")
    if abs((x0 + x1) / 2 - cw / 2) > 2:
        bad.append(f"not centred (centre x {(x0 + x1) / 2:.0f}, canvas {cw / 2:.0f})")
    if "floor" in p and y1 > p["floor"]:
        bad.append(f"bottom y{y1:.0f} is below y{p['floor']} (Shorts UI zone)")
    if "face_bottom" in p and y0 < p["face_bottom"]:
        bad.append(f"top y{y0:.0f} reaches the host faces (clear below y{p['face_bottom']})")
    if "label_top" in p and y1 > p["label_top"] - p["label_gap"]:
        bad.append(f"bottom y{y1:.0f} is within {p['label_gap']} px of the name labels at y{p['label_top']}")
    if y0 < m or y1 > ch - m:
        bad.append(f"y {y0:.0f}-{y1:.0f} outside the {m} px top/bottom margin")
    if "seam_tol" in p and cy is not None and abs(cy - p["cy"]) > p["seam_tol"]:
        bad.append(f"centre y{cy:.0f} is off the seam y{p['cy']} (stacked captions sit on the seam)")
    for name, rect in p["keepouts"].items():
        if _overlap(box, rect):
            bad.append(f"overlaps the {name} box {tuple(rect)}")
    return bad


def zone_summary(profile):
    """The rules as short text for the reports."""
    p = profile
    parts = [f"{p['canvas'][0]}x{p['canvas'][1]}", f"centre y{p['cy']}", f"cap height {p['cap_h']} (down to {p['cap_h_fallbacks'][-1]})",
             f"max width {p['max_w']}"]
    if "floor" in p:
        parts.append(f"nothing below y{p['floor']}")
    if "face_bottom" in p:
        parts.append(f"clear of faces above y{p['face_bottom']} and of the name labels from y{p['label_top'] - p['label_gap']}")
    if p["margin"]:
        parts.append(f"{p['margin']} px margin")
    parts += [f"{n} box {tuple(r)}" for n, r in p["keepouts"].items()]
    return ", ".join(parts)
