#!/usr/bin/env python3
"""final: Vision person mask (vmatte gray8 raw, any size) -> 1920x1080 host matte (gray8 raw on stdout).
Temporal EMA (no flicker), contrast stretch, 1 px erode (no halo), ~1.5 px feather, and the burned-in
name lower-thirds forced opaque so they stay above the motion.
usage: matte_post.py <in.raw> <layout S|X> > out.gray"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter
LABELS = {'S': [(0, 978, 245, 1080), (960, 978, 1142, 1080)],
          'X': [(0, 920, 375, 1080), (960, 920, 1249, 1080)]}
src, lay = sys.argv[1], sys.argv[2]
meta = json.load(open(src + '.json'))
w, h, n = meta['w'], meta['h'], meta['n']
raw = np.memmap(src, np.uint8, 'r', shape=(n, h, w))
ema, K = None, 0.55
out = sys.stdout.buffer
for i in range(n):
    m = np.asarray(Image.fromarray(raw[i]).resize((1920, 1080), Image.BILINEAR), np.float32) / 255
    ema = m if ema is None else K * m + (1 - K) * ema
    a = np.clip((ema - 0.2) / 0.6, 0, 1)
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
    a = np.array(im)
    for x0, y0, x1, y1 in LABELS[lay]:
        a[y0:y1, x0:x1] = 255
    out.write(a.tobytes())
