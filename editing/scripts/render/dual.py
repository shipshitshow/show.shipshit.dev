#!/usr/bin/env python3
"""Dual render: one finished master to a clean YouTube copy and a burned-caption X/LinkedIn copy.

Step 6 of the edit automation. Both copies are full quality (no size cap, no downscale) and carry the same audio
stream: the master's audio is measured against the Shorts target (I=-14 LUFS, TP=-1.5 dBTP) and either copied as it is
(already on target) or normalised once with the two-pass loudnorm and a limiter, then muxed into both files.
  clean   video stream copied from the master, no captions.
  x       video re-encoded once (libx264 crf 16, source frame rate and size) with captions burned in.

Captions come from a whisper.cpp word JSON (-oj -ml 1 -sow), a words.json ([[word, start, end], ...]), a Shorts
capsw.json ([[a, b, text, [[word, start], ...]], ...]) or an SRT. With word timing they are karaoke: white with the
active word red (the Shorts captions: Arial Bold, uppercase, 3 px dark outline, soft shadow). An SRT only has phrase
times, so its captions are plain white. The caption zone is package/safezone.py, the one the package check uses; every
chunk is stepped down through the Shorts cap heights, then split, until it fits, and the measured extent goes in the report.

Usage:
  dual.py MASTER --captions FILE --out DIR [--profile landscape|stacked|full] [--caption-offset S] [--dry-run]
  dual.py --episode <dir|YYMMDD> [--captions FILE] [--out DIR]   # master out/video/final/video-final.mp4, its .srt
Writes <out>/<name>-youtube.mp4, <name>-x.mp4, <name>-captions.ass and dual-report.json; refuses to overwrite.
--dry-run prints the ffmpeg commands and writes nothing. Needs ffmpeg-full (libass) and, to fit captions, Pillow.
Nobody listens to the output when this runs: the loudness is measured, not heard.
"""
import argparse
import hashlib
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "package"))
sys.path.insert(0, str(HERE.parent / "shorts"))
import common as C  # noqa: E402  (find_bin, die, workspace on sys.path)
import finalize as F  # noqa: E402  (LOUDNORM target, measure)
import safezone as Z  # noqa: E402
import workspace  # noqa: E402

B = Z.B                                    # build.py's locked caption constants, read once in safezone.py
FONT_FILE = B["CAPFONT"]
FONT_DIR = str(Path(FONT_FILE).parent)
CAP_RATIO = 0.716                          # Arial Bold cap height / em, the ratio build.cap_words sizes by
ASS_CELL = 1.117                           # libass \fs is the line cell (Arial win ascent+descent = 1.117 em)
RED, STROKE, SHADOW = B["RED"], B["CAP_STROKE"], B["CAP_SHADOW"]
CRF, PRESET = "16", "medium"               # the same encode quality as shorts/common.X264, source fps kept
AAC_AUDIO = ["-c:a", "aac", "-b:a", "256k", "-ar", "48000"]
LIMIT_DB = -2.0                            # limiter ceiling, 0.5 dB under the -1.5 dBTP target: headroom for the AAC encode
TP_LIMIT = 10 ** (LIMIT_DB / 20)
LU_TOLERANCE, TP_TARGET = 0.5, -1.5
MAX_WORDS, MAX_CHARS, PAUSE = 6, 32, 0.35  # caption chunking for word timing


# ---- caption inputs ---------------------------------------------------------------------------------------

def parse_srt(text):
    """[(start, end, text)] from SRT text; tolerant of CRLF and of a BOM."""
    cues = []
    for block in re.split(r"\n\s*\n", text.replace("\r", "").lstrip("﻿").strip()):
        lines = [ln for ln in block.split("\n") if ln.strip()]
        for i, ln in enumerate(lines):
            m = re.match(r"(\d+):(\d\d):(\d\d)[,.](\d{1,3})\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d{1,3})", ln)
            if m:
                g = [int(x) if k not in (3, 7) else int(x.ljust(3, "0")) for k, x in enumerate(m.groups())]
                a = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
                b = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
                body = " ".join(lines[i + 1:]).strip()
                if body and b > a:
                    cues.append((a, b, body))
                break
    return cues


def chunk(tokens, starts, a, b):
    return {"a": a, "b": b, "tokens": tokens, "starts": starts}


def words_to_chunks(words):
    """Word list [(text, start, end)] to caption chunks of at most MAX_WORDS words and MAX_CHARS characters, broken at
    pauses over PAUSE seconds and after sentence ends once a chunk has three words."""
    out, cur = [], []

    def flush():
        if cur:
            out.append(chunk([w[0] for w in cur], [w[1] for w in cur], cur[0][1], cur[-1][2]))
            cur.clear()

    for w in words:
        if cur:
            chars = sum(len(x[0]) + 1 for x in cur) + len(w[0])
            if len(cur) >= MAX_WORDS or chars > MAX_CHARS or w[1] - cur[-1][2] > PAUSE:
                flush()
        cur.append(w)
        if len(cur) >= 3 and w[0].rstrip("\"')").endswith((".", "?", "!")):
            flush()
    flush()
    return out


def load_captions(path):
    """Caption chunks from a whisper JSON, words.json, capsw.json or SRT. Returns (chunks, kind); kind is 'words'
    (karaoke) or 'phrases' (plain). Times are the file's own, in seconds."""
    p = Path(path)
    if p.suffix.lower() == ".srt":
        return [chunk(t.split(), None, a, b) for a, b, t in parse_srt(p.read_text())], "phrases"
    data = json.loads(p.read_text())
    if isinstance(data, dict) and "transcription" in data:           # whisper.cpp -oj
        words = []
        for s in data["transcription"]:
            t = s["text"].strip()
            if t and not re.fullmatch(r"\[.*\]", t):
                words.append((t, s["offsets"]["from"] / 1000, s["offsets"]["to"] / 1000))
        return words_to_chunks(words), "words"
    rows = data if isinstance(data, list) and data and isinstance(data[0], list) else []
    if rows and len(rows[0]) == 4:                                    # capsw.json
        out = []
        for a, b, text, ws in rows:
            toks = text.split()
            ok = len(toks) == len(ws)
            out.append(chunk(toks, [s for _, s in ws] if ok else None, a, b))
        return out, "words" if all(c["starts"] for c in out) else "phrases"
    if rows and len(rows[0]) == 3:                                    # words.json
        return words_to_chunks([(w, s, e) for w, s, e in rows]), "words"
    C.die(f"{path}: not a whisper JSON, words.json, capsw.json or SRT")


def shift(chunks, offset):
    """Add `offset` seconds to every time (the slice or the trim moved the captions); drops what falls before zero."""
    out = []
    for c in chunks:
        a, b = c["a"] + offset, c["b"] + offset
        starts = [s + offset for s in c["starts"]] if c["starts"] else None
        if b <= 0:
            continue
        if a < 0:
            a = 0.0
        out.append(chunk(c["tokens"], starts, a, b))
    return out


def clip(chunks, duration):
    """Drop captions that start after the video ends and end the last one at the end (a slice of a longer caption file)."""
    return [{**c, "b": min(c["b"], duration)} for c in chunks if c["a"] < duration]


# ---- fitting to the safe zone -----------------------------------------------------------------------------

def em_size(cap_h):
    return round(cap_h / CAP_RATIO)


def pil_measure(font_path=FONT_FILE):
    """text, cap_h -> width in px at that cap height (the same PIL measure build.cap_words uses). Needs Pillow."""
    try:
        from PIL import ImageFont
    except ImportError:
        C.die("Pillow is needed to fit captions to the safe zone (use /usr/local/bin/python3)")
    fonts = {}

    def measure(text, cap_h):
        if cap_h not in fonts:
            fonts[cap_h] = ImageFont.truetype(font_path, em_size(cap_h))
        return fonts[cap_h].getlength(text)
    return measure


def split_chunk(c):
    """Split a chunk near the middle of its text; time follows the word starts, or the character share for plain captions."""
    toks = c["tokens"]
    if len(toks) < 2:
        return [c]
    total = sum(len(t) + 1 for t in toks)
    acc, k = 0, 1
    for i, t in enumerate(toks[:-1], 1):
        acc += len(t) + 1
        k = i
        if acc >= total / 2:
            break
    if c["starts"]:
        mid = c["starts"][k]
        return [chunk(toks[:k], c["starts"][:k], c["a"], mid), chunk(toks[k:], c["starts"][k:], mid, c["b"])]
    left = sum(len(t) + 1 for t in toks[:k]) / total
    mid = c["a"] + (c["b"] - c["a"]) * left
    return [chunk(toks[:k], None, c["a"], mid), chunk(toks[k:], None, mid, c["b"])]


def fit(chunks, profile, measure):
    """Fit every chunk inside profile['max_w']: largest cap height first, then smaller, then split the chunk.
    Returns (chunks with 'cap_h', 'width', 'text'), and the chunks that still do not fit (a single word too wide)."""
    sizes = Z.cap_sizes(profile)
    max_words = profile.get("max_words")
    out, unfit, todo = [], [], list(reversed(chunks))
    while todo:
        c = todo.pop()
        if max_words and len(c["tokens"]) > max_words:        # Shorts: at most 3 words a chunk
            todo.extend(reversed(split_chunk(c)))
            continue
        text = " ".join(c["tokens"]).upper()
        for cap_h in sizes:
            w = measure(text, cap_h)
            if w <= profile["max_w"]:
                out.append({**c, "text": text, "cap_h": cap_h, "width": w})
                break
        else:
            parts = split_chunk(c)
            if len(parts) == 1:
                out.append({**c, "text": text, "cap_h": sizes[-1], "width": w})
                unfit.append(c)
            else:
                todo.extend(reversed(parts))
    return out, unfit


def extent(fitted, profile):
    """Union of the caption boxes, (x0, y0, x1, y1), as the package check reads it."""
    boxes = [Z.caption_box(profile, c["cap_h"], c["width"]) for c in fitted]
    if not boxes:
        return None
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]


# ---- ASS --------------------------------------------------------------------------------------------------

def ass_time(t):
    cs = round(max(t, 0) * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def bgr(rgb):
    return f"&H{rgb[2]:02X}{rgb[1]:02X}{rgb[0]:02X}&"


def esc(tok):
    return tok.replace("\\", "").replace("{", "").replace("}", "")


def ass_text(fitted_tokens, active=None):
    """Event text: the chunk in white, word `active` in red (all white when None)."""
    parts = []
    for i, t in enumerate(fitted_tokens):
        t = esc(t)
        parts.append(f"{{\\c{bgr(RED)}}}{t}{{\\c&HFFFFFF&}}" if i == active else t)
    return " ".join(parts)


def build_ass(fitted, profile, kind):
    cw, ch = profile["canvas"]
    sh = SHADOW[3]
    head = (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {cw}\nPlayResY: {ch}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
            "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
            "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
            f"Style: Cap,Arial,60,&H00FFFFFF,&H00FFFFFF,&H00{bgr(STROKE)[2:-1]},&H{255 - sh:02X}000000,-1,0,0,0,100,100,0,0,1,3,0,5,0,0,0,1\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    ev = []
    for c in fitted:
        fs = round(em_size(c["cap_h"]) * ASS_CELL)
        pre = f"{{\\an5\\pos({round(Z.center_x(profile))},{profile['cy']})\\fs{fs}\\bord3\\xshad3\\yshad4}}"
        toks = [esc(t).upper() for t in c["tokens"]]
        if c["starts"]:
            ends = c["starts"][1:] + [c["b"]]
            for k, (s, e) in enumerate(zip(c["starts"], ends)):
                if ass_time(e) != ass_time(s) and e > s:      # skip words that fall before zero or last under a centisecond
                    ev.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{pre}{ass_text(toks, k)}")
        else:
            ev.append(f"Dialogue: 0,{ass_time(c['a'])},{ass_time(c['b'])},Cap,,0,0,0,,{pre}{ass_text(toks)}")
    return head + "\n".join(ev) + "\n"


# ---- ffmpeg -----------------------------------------------------------------------------------------------

def probe(ffprobe, path):
    r = subprocess.run([ffprobe, "-v", "error", "-show_entries", "stream=index,codec_type,codec_name,width,height,r_frame_rate,"
                        "color_space,color_transfer,color_primaries:format=duration", "-of", "json", str(path)],
                       capture_output=True, text=True)
    if r.returncode:
        C.die(f"ffprobe failed on {path}: {r.stderr.strip()}")
    j = json.loads(r.stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        C.die(f"{path}: no video stream")
    return {"width": v["width"], "height": v["height"], "fps": v["r_frame_rate"], "video_codec": v["codec_name"],
            "colour": {k: v[k] for k in ("color_space", "color_transfer", "color_primaries") if v.get(k) not in (None, "unknown")},
            "audio": bool(a), "duration": float(j["format"]["duration"])}


def audio_filter(m):
    """Second-pass loudnorm from the first-pass measurement `m`, then the peak limiter and the 48 kHz resample."""
    return (f"loudnorm={F.LOUDNORM}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
            f"alimiter=limit={TP_LIMIT:.4f}:level=disabled,aresample=48000")


def needs_norm(m):
    """True when the master's audio is not already on target (integrated within LU_TOLERANCE of -14, peak under -1.5 dBTP)."""
    return abs(float(m["input_i"]) - (-14.0)) > LU_TOLERANCE or float(m["input_tp"]) > TP_TARGET + 0.05


def commands(ff, master, audio_src, ass, outs, pinfo, norm_filter=None):
    """The ffmpeg command lists, in order. `audio_src` is the master itself when its audio is on target, else the
    normalised audio file written first. Both outputs mux that one audio stream, copied bit for bit."""
    cmds = {}
    if norm_filter:
        cmds["audio"] = [ff, "-y", "-hide_banner", "-loglevel", "error", "-i", str(master), "-vn", "-af", norm_filter, *AAC_AUDIO, str(audio_src)]
    maps = ["-map", "0:v:0", "-map", "1:a:0"]
    inp = ["-i", str(master), "-i", str(audio_src)]
    cmds["clean"] = [ff, "-y", "-hide_banner", "-loglevel", "error", *inp, *maps, "-c", "copy", "-movflags", "+faststart", str(outs["clean"])]
    tags = [x for k, f in (("color_space", "-colorspace"), ("color_transfer", "-color_trc"), ("color_primaries", "-color_primaries"))
            for x in ((f, pinfo["colour"][k]) if k in pinfo["colour"] else ())]
    vf = f"ass={ass.name}:fontsdir={FONT_DIR}"
    cmds["x"] = [ff, "-y", "-hide_banner", "-loglevel", "error", *inp, *maps, "-vf", vf, "-c:v", "libx264", "-crf", CRF, "-preset", PRESET,
                 "-pix_fmt", "yuv420p", *tags, "-c:a", "copy", "-movflags", "+faststart", str(outs["x"])]
    return cmds


def video_md5(ff, path):
    r = subprocess.run([ff, "-v", "error", "-i", str(path), "-map", "0:v:0", "-c", "copy", "-f", "md5", "-"], capture_output=True, text=True)
    return r.stdout.strip().removeprefix("MD5=") or None


def resolve_episode(arg):
    p = Path(arg).expanduser()
    return p.resolve() if p.is_dir() else workspace.episode_dir(arg)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("master", nargs="?", help="the finished master video")
    ap.add_argument("--episode", help="episode folder or YYMMDD: master, captions and --out default from it")
    ap.add_argument("--captions", help="whisper JSON, words.json, capsw.json or SRT")
    ap.add_argument("--out", help="output folder")
    ap.add_argument("--name", help="output file stem (default: the master's)")
    ap.add_argument("--profile", choices=sorted(Z.PROFILES), help="caption safe zone (default: by orientation of the master)")
    ap.add_argument("--caption-offset", type=float, default=0.0, metavar="S", help="seconds added to every caption time (slice or trim shift)")
    ap.add_argument("--dry-run", action="store_true", help="print the ffmpeg commands and write nothing")
    ap.add_argument("--no-verify", action="store_true", help="skip the video-stream hash and the loudness re-measure")
    ap.add_argument("--ffmpeg")
    ap.add_argument("--ffprobe")
    a = ap.parse_args(argv)

    ep = resolve_episode(a.episode) if a.episode else None
    master = Path(a.master) if a.master else (ep / "out" / "video" / "final" / "video-final.mp4" if ep else None)
    if not master:
        ap.error("give a master video or --episode")
    caps = Path(a.captions) if a.captions else master.with_suffix(".srt")
    out = Path(a.out) if a.out else (ep / "out" / "video" / "dual" if ep else None)
    if not out:
        ap.error("give --out (or --episode)")
    master, caps, out = master.expanduser().resolve(), caps.expanduser().resolve(), out.expanduser().resolve()   # ffmpeg runs from `out`
    if not master.exists():
        C.die(f"{master} not found")
    if not caps.exists():
        C.die(f"{caps} not found (pass --captions)")
    ff, fp = C.find_bin("ffmpeg", a.ffmpeg), C.find_bin("ffprobe", a.ffprobe)
    name = a.name or master.stem
    outs = {"clean": out / f"{name}-youtube.mp4", "x": out / f"{name}-x.mp4"}
    ass = out / f"{name}-captions.ass"
    pinfo = probe(fp, master)
    if not pinfo["audio"]:
        C.die(f"{master}: no audio stream")
    profile = Z.profile_for((pinfo["width"], pinfo["height"]), a.profile)
    if (pinfo["width"], pinfo["height"]) != tuple(profile["canvas"]):
        C.die(f"master is {pinfo['width']}x{pinfo['height']}, the {profile['name']} zone is for {profile['canvas'][0]}x{profile['canvas'][1]}")
    chunks, kind = load_captions(caps)
    chunks = clip(shift(chunks, a.caption_offset), pinfo["duration"])
    if not chunks:
        C.die(f"{caps}: no captions after the offset")
    if not a.dry_run:
        for p in (*outs.values(), ass):
            if p.exists():
                C.die(f"{p} already exists; refusing to overwrite (pass a different --out or --name)")

    # loudness: measure the master's audio; dry-run prints the measurement command and shows placeholders
    measure_cmd = [ff, "-hide_banner", "-nostats", "-i", str(master), "-af", f"loudnorm={F.LOUDNORM}:print_format=json", "-vn", "-f", "null", "-"]
    if a.dry_run:
        m = {"input_i": "<measured_I>", "input_tp": "<measured_TP>", "input_lra": "<measured_LRA>", "input_thresh": "<measured_thresh>", "target_offset": "<offset>"}
        norm = True
        print("# 0. loudness measurement (decides copy or normalise; shown as if normalising)\n" + shlex.join(measure_cmd) + "\n")
    else:
        m = F.measure(ff, master)
        norm = needs_norm(m)
    audio_src = (out / f"{name}-audio.m4a") if norm else master
    cmds = commands(ff, master, audio_src, ass, outs, pinfo, audio_filter(m) if norm else None)
    if a.dry_run:
        print(f"# captions: {len(chunks)} chunks from {caps.name} ({kind}), profile {profile['name']}, {Z.zone_summary(profile)}")
        print(f"# captions are fitted and written to {ass.name} when run (needs Pillow); the video filter reads it from the output folder\n")
        for i, (k, c) in enumerate(cmds.items(), 1):
            print(f"# {i}. {k}" + (f" (run from {out})" if k == "x" else "") + f"\n{shlex.join(c)}\n")
        return 0

    out.mkdir(parents=True, exist_ok=True)
    fitted, unfit = fit(chunks, profile, pil_measure())
    ass.write_text(build_ass(fitted, profile, kind))
    ext = extent(fitted, profile)
    bad = Z.violations(profile, tuple(ext)) if ext else []
    for u in unfit:
        print(f"warning: caption does not fit at the smallest size: {' '.join(u['tokens'])}", file=sys.stderr)
    for k, c in cmds.items():
        subprocess.run(c, check=True, cwd=out if k == "x" else None)    # cwd so ass=<name> needs no path escaping
    report = {"schema": 1, "master": master.name, "outputs": {k: v.name for k, v in outs.items()}, "profile": profile["name"],
              "captions": {"source": caps.name, "kind": kind, "offset_s": a.caption_offset, "chunks": len(fitted),
                           "cap_h_used": {str(h): sum(1 for c in fitted if c["cap_h"] == h) for h in sorted({c["cap_h"] for c in fitted})},
                           "extent": ext, "unfit": [" ".join(u["tokens"]) for u in unfit], "violations": bad},
              "audio": {"before": {k: m[k] for k in ("input_i", "input_tp", "input_lra")}, "action": "normalised" if norm else "copied unchanged"},
              "video": {"clean": "stream copy", "x": f"libx264 crf {CRF} {PRESET}, {pinfo['width']}x{pinfo['height']} at {pinfo['fps']}"}}
    if not a.no_verify:
        report["audio"]["after"] = {k: {x: j[x] for x in ("input_i", "input_tp", "input_lra")} for k, j in
                                    ((k, F.measure(ff, p)) for k, p in outs.items())}
        report["video"]["clean_video_identical_to_master"] = video_md5(ff, master) == video_md5(ff, outs["clean"])
        report["durations_s"] = {"master": pinfo["duration"], **{k: probe(fp, p)["duration"] for k, p in outs.items()}}
    (out / "dual-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 1 if bad or unfit else 0


if __name__ == "__main__":
    sys.exit(main())
