#!/usr/bin/env python3
"""Per-word caption timing for one Short.

Ported from 261103/shorts/_work v3d (align_v3d.py), 5 Nov 2026. Whisper word stamps
(<work>/w.json) of the Short's own audio (<work>/a.wav) are mapped onto the caption chunks in
short.json and snapped to real pauses (silencedetect -32 dB). Writes <work>/capsw.json =
[[a, b, text, [[word, start], ...]], ...] in clip time, which build.py reads.

Usage:
  align.py <slug> --episode editing/projects/<YYMMDD> --prep      # make a.wav + w.json, print numbered words
  align.py <slug> --episode editing/projects/<YYMMDD> [--fixes f.json]
fixes: {"W": {"<1-based word idx>": [start, end]}} hand-corrects whisper word times (clip seconds).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C

# ---- Timing constants carried over from v3d --------------------------------------------------
SIL_NOISE = "-32dB"     # silencedetect threshold
SIL_MIN = 0.06          # s, shortest pause detected
SIL_MERGE = 0.05        # s, pauses closer than this are merged
LONG_PAUSE = 0.2        # s, captions are trimmed to these
BIG_PAUSE = 0.25        # s, whisper words drifted into these are moved back before the pause
MIN_CAPTION = 0.45      # s
WHISPER_MODEL = Path.home() / ".cache" / "whisper" / "ggml-small.en.bin"


def prep(cfg, episode, work, ff, model, src_override):
    """a.wav = the Short's audio (16 kHz mono, segs concatenated), w.json = whisper word stamps."""
    src = C.source_path(cfg, episode, src_override)
    work.mkdir(parents=True, exist_ok=True)
    segs = cfg["segs"]
    inputs, ain = [], ""
    for i, s in enumerate(segs):
        inputs += ["-ss", f"{s['a']:.3f}", "-t", f"{s['b'] - s['a']:.3f}", "-i", str(src)]
        ain += f"[{i}:a]"
    wav = work / "a.wav"
    subprocess.run([ff, "-y", "-v", "error", *inputs, "-filter_complex", f"{ain}concat=n={len(segs)}:v=0:a=1[a]",
                    "-map", "[a]", "-ar", "16000", "-ac", "1", str(wav)], check=True)
    cli = "whisper-cli"
    if not Path(model).exists():
        C.die(f"whisper model not found: {model} (pass --model)")
    subprocess.run([cli, "-m", str(model), "-f", str(wav), "-ml", "1", "-sow", "-oj", "-of", str(work / "w")],
                   check=True, capture_output=True)
    words = load_words(work, {})
    print(" ".join(f"{i + 1}:{w[2]}" for i, w in enumerate(words)))
    print(f"\n{len(words)} words -> write chunks in short.json ([\"TEXT\", [word idx...]]), then run align.py without --prep")


def load_words(work, fixes):
    W = [[s["offsets"]["from"] / 1000, s["offsets"]["to"] / 1000, s["text"].strip()]
         for s in json.loads((work / "w.json").read_text())["transcription"] if s["text"].strip()]
    for k, v in fixes.get("W", {}).items():
        W[int(k) - 1][0], W[int(k) - 1][1] = v
    return W


def align(cfg, work, ff, fixes):
    W = load_words(work, fixes)
    r = subprocess.run([ff, "-hide_banner", "-nostats", "-i", str(work / "a.wav"), "-af",
                        f"silencedetect=noise={SIL_NOISE}:d={SIL_MIN}", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    SIL = list(zip([float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r)],
                   [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r)]))
    M = []
    for s_, e_ in SIL:
        if M and s_ - M[-1][1] < SIL_MERGE:
            M[-1] = (M[-1][0], e_)
        else:
            M.append((s_, e_))
    SIL = M
    LONG = [x for x in SIL if x[1] - x[0] >= LONG_PAUSE]
    # whisper drifts words late into pauses: a word whose start is inside a pause >=0.25 s was spoken before it
    # (a cluster of such words is packed evenly into the 0.12 s * n before the pause start, not before the previous word)
    BIG = [x for x in SIL if x[1] - x[0] >= BIG_PAUSE]
    for s_, e_ in BIG:
        for i, w in enumerate(W):   # start in the last 0.12 s of the pause = speech resuming: snap to the pause end
            if e_ - 0.12 <= w[0] < e_:
                w[0] = e_
        run = [i for i, w in enumerate(W) if s_ + 0.03 < w[0] < e_ - 0.12]
        if run:
            n = len(run)
            lo = max(W[run[0] - 1][0] + 0.08 if run[0] else 0, s_ - 0.12 * n)
            step = (s_ - lo) / n
            for q, i in enumerate(run):
                W[i][0] = lo + q * step
                W[i][1] = max(W[i][0] + 0.05, min(W[i][1], s_))
            print("moved", [W[i][2] for i in run], "before pause", round(s_, 2))
    caps = []
    for t, idx in cfg["chunks"]:
        assert len(t.split()) == len(idx), (t, idx)
        assert max(idx) <= len(W), (t, idx, len(W))
        caps.append([W[idx[0] - 1][0], W[idx[-1] - 1][1], t, [W[i - 1][0] for i in idx]])
    for k in range(len(caps)):
        a, b = caps[k][0], caps[k][1]
        for s, e in LONG:
            if s < b <= e + 0.02 and a < s:
                b = s
            if s - 0.02 <= a < e and e < b:
                a = e
        caps[k][0], caps[k][1] = a, b
    for k in range(len(caps) - 1):
        b, a = caps[k][1], caps[k + 1][0]
        if a - b > 0.4:
            continue
        best = None
        for s, e in SIL:
            d = min(abs(b - s), abs(b - e), abs(a - s), abs(a - e), 0 if s <= b <= e or s <= a <= e else 9)
            if d <= 0.2 and (best is None or d < best[0]):
                best = (d, s, e)
        if best and best[1] - caps[k][0] >= 0.5 and caps[k + 1][1] - best[2] >= 0.5:
            b, a = best[1], best[2]
        if a - b < 0.15:
            b = a = (a + b) / 2
        caps[k][1], caps[k + 1][0] = b, a
    for k in range(len(caps)):
        a, b = caps[k][0], caps[k][1]
        nxt = caps[k + 1][0] if k + 1 < len(caps) else b + 0.6
        if b - a < MIN_CAPTION:
            caps[k][1] = max(b, min(a + 0.6, nxt - 0.02))
    out = []
    for a, b, t, st in caps:
        toks = t.split()
        st = [max(a, min(x, b - 0.05)) for x in st]
        st[0] = a
        # spread equal / non-increasing starts evenly up to the next distinct start (or chunk end)
        i = 0
        while i < len(st):
            j = i
            while j + 1 < len(st) and st[j + 1] <= st[i] + 0.02:
                j += 1
            if j > i:
                nxt = st[j + 1] if j + 1 < len(st) else b
                for q in range(i, j + 1):
                    st[q] = st[i] + (nxt - st[i]) * (q - i) / (j - i + 1)
            i = j + 1
        out.append([round(a, 3), round(b, 3), t, [[w, round(s, 3)] for w, s in zip(toks, st)]])
        print(f"{a:6.2f} {b:6.2f} {b - a:4.2f}  {t:24s}", " ".join(f"{s:.2f}" for s in st))
    (work / "capsw.json").write_text(json.dumps(out))
    print(work / "capsw.json")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--episode", required=True)
    ap.add_argument("--config")
    ap.add_argument("--work", help="default <short>/outputs/work/tmp_v3c")
    ap.add_argument("--prep", action="store_true", help="make a.wav + w.json (whisper) and print the numbered words")
    ap.add_argument("--fixes", help="JSON of whisper word-time corrections")
    ap.add_argument("--source")
    ap.add_argument("--model", default=str(WHISPER_MODEL))
    args = ap.parse_args()
    cfg, episode, sdir = C.load_short(args.episode, args.slug, args.config)
    work = Path(args.work) if args.work else C.default_work(sdir)
    ff = C.find_bin("ffmpeg")
    if args.prep:
        prep(cfg, episode, work, ff, args.model, args.source)
        return
    if not cfg.get("chunks"):
        C.die("short.json has no 'chunks'; run with --prep, then write them")
    for need in ("w.json", "a.wav"):
        if not (work / need).exists():
            C.die(f"{work / need} missing: run align.py --prep first")
    fixes = json.loads(Path(args.fixes).read_text()) if args.fixes else {}
    align(cfg, work, ff, fixes)


if __name__ == "__main__":
    main()
