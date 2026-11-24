"""Brand wallpaper frame and the irregular-chunk reveal used by `pixel.py` (styles `wall`, `chunks`).

Everything is drawn in code from the vault tokens: charcoal ground, white crosshairs and thin outline boxes,
red #E83B3B hairlines, and optionally the standalone six-arm asterisk (vault `brand/assets/asterisk-red.svg`:
three 20x88 bars in a 96 box, rotated 0, 60 and 120 degrees about the centre). No text, no faces.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw

INK = (13, 13, 13)           # tokens ink #0D0D0D
RED = (232, 59, 59)          # tokens accent_red #E83B3B
WHITE = (255, 255, 255)


def asterisk_mask(size: int, supersample: int = 4) -> np.ndarray:
    """Float mask 0..1 of the six-arm asterisk filling a size x size box (same geometry as the SVG master)."""
    s = size * supersample
    k = s / 96.0
    img = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(img)
    for deg in (0, 60, 120):
        a = math.radians(deg)
        pts = []
        for x, y in ((38, 4), (58, 4), (58, 92), (38, 92)):
            dx, dy = x - 48, y - 48
            pts.append(((48 + dx * math.cos(a) - dy * math.sin(a)) * k, (48 + dx * math.sin(a) + dy * math.cos(a)) * k))
        d.polygon(pts, fill=255)
    return np.asarray(img.resize((size, size), Image.LANCZOS), np.float32) / 255.0


def _smooth_noise(w: int, h: int, scale: int, rng) -> np.ndarray:
    gw, gh = max(2, w // scale + 2), max(2, h // scale + 2)
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im, np.float32) / 255.0


def wallpaper(w: int, h: int, seed: int = 261124, mark: bool = True) -> np.ndarray:
    """The branded frame, uint8 (h, w, 3): cloudy charcoal, crosshair grid, outline boxes, red hairlines, mark."""
    rng = np.random.default_rng(seed)
    u = max(1.0, min(w, h) / 1080)                                  # line weights scale with the frame
    cloud = 0.6 * _smooth_noise(w, h, int(150 * u), rng) + 0.4 * _smooth_noise(w, h, int(48 * u), rng)
    base = INK[0] + (cloud - 0.35).clip(0, 1) * 34                  # 13..~35: dark, with visible cloud shapes
    img = np.repeat(base[..., None], 3, axis=2).astype(np.float32)
    img += (rng.random((h, w, 1)) - 0.5) * 5                        # static grain

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pitch = int(min(w, h) / 4.4)
    arm = int(11 * u)
    xs = list(range(pitch // 2, w, pitch))
    ys = list(range(pitch // 2, h, pitch))
    for x in xs:
        for y in ys:                                                # crosshair grid
            a = int(255 * rng.uniform(0.12, 0.3))
            d.line([(x - arm, y), (x + arm, y)], fill=(255, 255, 255, a), width=max(1, int(2 * u)))
            d.line([(x, y - arm), (x, y + arm)], fill=(255, 255, 255, a), width=max(1, int(2 * u)))
    step = max(4, pitch // 4)
    for _ in range(9):                                              # thin outline boxes, a few with a plus
        bw, bh = step * int(rng.integers(2, 7)), step * int(rng.integers(2, 6))
        bx, by = step * int(rng.integers(0, max(1, (w - bw) // step))), step * int(rng.integers(0, max(1, (h - bh) // step)))
        d.rectangle([bx, by, bx + bw, by + bh], outline=(255, 255, 255, int(255 * rng.uniform(0.07, 0.16))), width=max(1, int(u)))
        if rng.random() < 0.6:
            cx, cy, r = bx + bw // 2, by + bh // 2, int(7 * u)
            d.line([(cx - r, cy), (cx + r, cy)], fill=(255, 255, 255, 60), width=1)
            d.line([(cx, cy - r), (cx, cy + r)], fill=(255, 255, 255, 60), width=1)
    for _ in range(14):                                             # tiny boxed plus marks
        bx, by, r = int(rng.integers(0, w - 20)), int(rng.integers(0, h - 20)), int(8 * u)
        d.rectangle([bx - r, by - r, bx + r, by + r], outline=(255, 255, 255, 70), width=1)
        d.line([(bx - r // 2, by), (bx + r // 2, by)], fill=(255, 255, 255, 90), width=1)
        d.line([(bx, by - r // 2), (bx, by + r // 2)], fill=(255, 255, 255, 90), width=1)
    for _ in range(13):                                             # red hairlines with a dot at one end
        x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
        ln = int(rng.uniform(70, 420) * u)
        horiz = rng.random() < 0.5
        x2, y2 = (x + ln, y) if horiz else (x, y + ln)
        d.line([(x, y), (x2, y2)], fill=RED + (int(255 * rng.uniform(0.25, 0.55)),), width=1)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=RED + (150,))
    rgba = np.asarray(layer, np.float32)
    al = rgba[..., 3:4] / 255.0
    img = img * (1 - al) + rgba[..., :3] * al

    if mark:
        size = int(min(w, h) * 0.30)
        m = asterisk_mask(size)
        grain = 1 - rng.random((size, size)).astype(np.float32) * 0.18   # speckled, like printed paper
        x0, y0 = (w - size) // 2, (h - size) // 2
        a = (m * grain)[..., None]
        reg = img[y0:y0 + size, x0:x0 + size]
        reg[:] = reg * (1 - a) + np.array(RED, np.float32) * a
    return np.clip(img, 0, 255).astype(np.uint8)


def cell_for(w: int, h: int) -> int:
    """Chunk edge in px: the same fraction of the short side on every format (about 28 across it)."""
    return max(6, int(round(min(w, h) / 28)))


def chunk_field(w: int, h: int, cell: int, direction: str = "right", seed: int = 261124) -> np.ndarray:
    """Per-cell reveal order in [0, 1): a cell opens when the progress passes it. Irregular, connected blobs
    (smooth plus fine noise) with a drift from one side, so the break travels but never forms a straight edge."""
    rows, cols = -(-h // cell), -(-w // cell)
    rng = np.random.default_rng(seed + 3)
    coarse = np.asarray(Image.fromarray((rng.random((max(2, rows // 5 + 2), max(2, cols // 5 + 2))) * 255).astype(np.uint8))
                        .resize((cols, rows), Image.BICUBIC), np.float32) / 255
    fine = rng.random((rows, cols)).astype(np.float32)
    yy, xx = np.mgrid[0:rows, 0:cols]
    fx, fy = xx / max(cols - 1, 1), yy / max(rows - 1, 1)
    bias = {"right": 1 - fx, "left": fx, "top": fy, "bottom": 1 - fy,
            "center": np.hypot(fx - 0.5, (fy - 0.5) * rows / cols) / 0.6}[direction]
    f = 0.42 * bias + 0.36 * coarse + 0.22 * fine
    order = f.ravel().argsort().argsort().reshape(f.shape)          # rank transform: progress == covered share
    return (order / f.size).astype(np.float32)


def reveal_mask(field: np.ndarray, p: float, frame: int, seed: int = 261124) -> np.ndarray:
    """Bool per cell: True once the chunk is open at progress p (0..1). Edge cells flicker a little frame to frame."""
    rng = np.random.default_rng(seed + 100 + frame // 2)
    amp = 0.06 * math.sin(math.pi * min(max(p, 0.0), 1.0))
    jitter = (rng.random(field.shape) - 0.5) * 2 * amp
    return (field + jitter) < p * 1.12


def to_px(cells: np.ndarray, cell: int, h: int, w: int) -> np.ndarray:
    return np.repeat(np.repeat(cells, cell, axis=0), cell, axis=1)[:h, :w]


def edge_lines(region: np.ndarray, thick: int):
    """Edges of a bool pixel region: (red right/bottom edges, white left/top edges), each `thick` px wide."""
    right = region.copy()
    right[:, :-thick] &= ~region[:, thick:]
    right[:, -thick:] = False
    bottom = region.copy()
    bottom[:-thick] &= ~region[thick:]
    bottom[-thick:] = False
    left = region.copy()
    left[:, thick:] &= ~region[:, :-thick]
    left[:, :thick] = False
    top = region.copy()
    top[thick:] &= ~region[:-thick]
    top[:thick] = False
    r = right | bottom
    wh = (left | top) & ~r
    return r, wh


def paint_edges(img: np.ndarray, region: np.ndarray, thick: int) -> None:
    red, white = edge_lines(region, thick)
    img[red] = img[red] * 0.1 + np.array(RED, np.float32) * 0.9
    img[white] = img[white] * 0.55 + np.array(WHITE, np.float32) * 0.45
