#!/usr/bin/env python3
"""Voice chain and two-pass loudnorm of a built Short (video stream copied), then re-measure and print.

Ported from 261103/shorts/_work v3d (finalize_v3d.py), 5 Nov 2026.
Target (docs/show-prep/edit-style.md): I=-14 LUFS, TP=-1.5 dBTP, LRA=11.
Voice chain before the loudnorm (owner, 14 Nov 2026): high-pass, level to a reference, compress, de-ess.
The level is measured on each Short, so the compressor and the de-esser act the same on every recording.

Usage:
  finalize.py <slug> --episode $SHIPSHITSHOW_CONTENT_ROOT/projects/<date>_<YYMMDD> [--in FILE] [--out FILE]
Defaults: --in <short>/outputs/work/video-prenorm.mp4, --out <short>/final/video.mp4.
Refuses to overwrite an existing output.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C

# ---- Locked template values (docs/show-prep/edit-style.md) ----------------------------------
LOUDNORM = "I=-14:TP=-1.5:LRA=11"
AAC = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]

# ---- Voice chain: tool defaults, the same values as chapters/run_chapters.py ----------------
HIGHPASS = "highpass=f=80:poles=2"
VOICE_REF_LUFS = -19.0        # the voice is first brought to this level
VOICE_GAIN_LIMIT_DB = 20.0    # so a near-silent Short is not boosted without limit
VOICE_COMP = {"over_ref_db": 3.0, "ratio": 3, "attack_ms": 10, "release_ms": 150, "knee": 4}
VOICE_DEESS = 0.5             # ffmpeg deesser intensity, 0..1


def voice_chain(measured_i):
    """High-pass, level to the reference, compress, de-ess. The level step comes before the other two because
    ffmpeg's de-esser and the compressor threshold both depend on the absolute level of what they are given."""
    gain = max(-VOICE_GAIN_LIMIT_DB, min(VOICE_GAIN_LIMIT_DB, VOICE_REF_LUFS - measured_i))
    c = VOICE_COMP
    thr = 10 ** ((VOICE_REF_LUFS + c["over_ref_db"]) / 20)
    return (f"{HIGHPASS},volume={gain:.2f}dB,acompressor=threshold={thr:.4f}:ratio={c['ratio']}:attack={c['attack_ms']}:"
            f"release={c['release_ms']}:knee={c['knee']}:makeup=1,deesser=i={VOICE_DEESS}")


def measure(ff, path, pre=""):
    """Loudnorm first pass. `pre` is a filter chain (ending in a comma) applied before the measurement."""
    r = subprocess.run([ff, "-hide_banner", "-nostats", "-i", str(path), "-af", f"{pre}loudnorm={LOUDNORM}:print_format=json",
                        "-vn", "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr, re.S)
    if not m:
        C.die(f"loudnorm measurement failed for {path}")
    return json.loads(m.group(0))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--episode", required=True)
    ap.add_argument("--in", dest="src")
    ap.add_argument("--out")
    args = ap.parse_args()
    ff, fp = C.find_bin("ffmpeg"), C.find_bin("ffprobe")
    short_dir = Path(args.episode).resolve() / "out" / "shorts" / args.slug
    src = Path(args.src) if args.src else short_dir / "outputs" / "work" / "video-prenorm.mp4"
    out = Path(args.out) if args.out else short_dir / "final" / "video.mp4"
    if not src.exists():
        C.die(f"{src} not found: run build.py first")
    if out.exists():
        C.die(f"{out} already exists; refusing to overwrite (pass a different --out)")
    out.parent.mkdir(parents=True, exist_ok=True)

    raw = measure(ff, src, HIGHPASS + ",")   # level of the voice as recorded, after the high-pass
    voice = voice_chain(float(raw["input_i"]))
    j = measure(ff, src, voice + ",")        # loudnorm first pass on the processed voice
    af = (f"{voice},loudnorm={LOUDNORM}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-c:v", "copy", "-af", af,
                    *AAC, "-movflags", "+faststart", str(out)], check=True)
    k = measure(ff, out)
    d = subprocess.run([fp, "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,r_frame_rate",
                        "-of", "json", str(out)], capture_output=True, text=True).stdout
    print(args.slug, "source I", raw["input_i"], "LRA", raw["input_lra"], "| after voice chain I", j["input_i"], "LRA", j["input_lra"],
          "TP", j["input_tp"], "| post I", k["input_i"], "TP", k["input_tp"], "LRA", k["input_lra"])
    print(d.replace("\n", ""))
    print(out)


if __name__ == "__main__":
    main()
