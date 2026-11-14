#!/usr/bin/env python3
"""Dead-air and filler trimming: transcript with word times + media -> cut list (EDL) + audit report.

Step 1 of the edit automation. Reads whisper word timings (whisper.cpp `-oj` with `-ml 1 -sow`, as
shorts/align.py produces) and the source media, finds dead air (silences longer than --min-silence) and
filler words (um, uh, er, ah, hmm by default), and writes:

  <out>/<stem>.trim-<version>.edl.json    keep ranges in source time, every cut with reason codes, thresholds
  <out>/<stem>.trim-<version>.report.md   every cut with timestamp, duration, reason and the words around it

Dry-run is the default: nothing is rendered. --apply also renders the trimmed audio/video to
<out>/<stem>.trim-<version>.<ext>; it never overwrites the source, anything in a `final` folder, or an
existing file.

How cuts are placed (the transcript alone is not trusted: whisper stretches a word over the silence after
it, so word ends are late). The audio energy decides: a 5 ms RMS envelope from ffmpeg `astats` is thresholded
into quiet and speech frames. Dead air is a quiet run of at least --min-silence seconds, minus a breath of
--breath seconds left in the pause. A filler is cut at its own burst of energy, padded into the quiet
frames on either side. Every cut edge sits on a quiet frame (lowest energy within --snap seconds) and, when the
media has video, on a frame boundary. A cut that would remove speech energy that belongs to another word, or a
word with no energy at all, is refused and listed in the report instead.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "shorts"))
sys.path.insert(0, str(HERE.parent))
import common as C  # noqa: E402  (find_bin, die, AUDIO_FADE, AAC: the shared encode conventions)

TOOL_VERSION = 1
SCHEMA = "shipshitshow.trim-edl/1"

# ---- Defaults (see README.md; the rulebook is the vault page brand/editing.md) -----------------------
MIN_SILENCE = 0.6        # s, quiet runs at least this long are dead air
BREATH = 0.25            # s, pause left where dead air was cut (split evenly around the cut)
MIN_CUT = 0.15           # s, shorter cuts are not worth a join
SNAP = 0.06              # s, a cut edge may move this far to a lower-energy frame
HOP = 0.005              # s, one envelope frame (80 samples at 16 kHz)
FADE = C.AUDIO_FADE      # s, 18 ms audio fades at every join (shorts convention)
MIN_PAD = FADE + 0.02    # s, a cut edge keeps at least this much quiet between it and speech
BRIDGE = 0.03            # s, dips shorter than this do not split one burst of speech
FILLER_MIN, FILLER_MAX = 0.05, 1.2   # s, plausible length of a filler burst
EDGE_QUIET_MIN = 0.01    # s, quiet needed beside a filler burst to cut it cleanly
MIN_KEEP = 0.05          # s, never leave a kept piece shorter than this between two cuts
DEFAULT_FILLERS = ("um", "uh", "er", "ah", "hmm")
# Single words that are real words most of the time: allowed only through --flags (an explicit decision per
# occurrence), never as a blanket --phrases entry.
RISKY_SINGLE = {"like", "so", "and", "but", "right", "well", "just", "actually", "basically", "literally",
                "yeah", "okay", "ok", "i", "the", "a", "it", "that", "this", "kind", "sort", "mean", "know"}
CALM_MIN_CUT = 0.5       # rulebook "Calm cutting": no micro-cuts under about 0.5 s
CALM_MERGE = 2.0         # ... and cuts closer than 2 s apart are merged (reported, not changed)


# ---- Transcript -------------------------------------------------------------------------------------
@dataclass
class Word:
    i: int
    s: float
    e: float
    text: str
    tok: str = ""


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9']+", "", text.lower().replace("’", "'"))


def collapse(tok: str) -> str:
    """umm -> um, hmm -> hm, uhh -> uh: elongated fillers match the same entry."""
    return re.sub(r"(.)\1+", r"\1", tok)


def is_nonspeech(text: str) -> bool:
    t = text.strip()
    if not t or not re.search(r"[A-Za-z0-9]", t):
        return True
    return bool(re.fullmatch(r"(\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪[^♪]*♪?)", t))


def parse_transcript(data) -> list[Word]:
    """whisper.cpp -oj JSON (one word per segment), [[s, e, text], ...] or [{w|word|text, s|start, e|end}, ...]."""
    raw: list[tuple[float, float, str]] = []
    if isinstance(data, dict) and "transcription" in data:
        for seg in data["transcription"]:
            off = seg.get("offsets")
            if not off:
                raise ValueError("whisper JSON has no offsets")
            raw.append((off["from"] / 1000.0, off["to"] / 1000.0, seg.get("text", "")))
        spans = [b - a for a, b, t in raw if t.strip()]
        words = [t for _, _, t in raw if t.strip()]
        if words and sum(1 for t in words if len(t.split()) > 1) > len(words) * 0.2:
            raise ValueError("transcript is phrase-level, not word-level: run whisper-cli with -ml 1 -sow")
        del spans
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (list, tuple)):
                raw.append((float(item[0]), float(item[1]), str(item[2])))
            else:
                text = item.get("w", item.get("word", item.get("text", item.get("t", ""))))
                s = item.get("s", item.get("start"))
                e = item.get("e", item.get("end"))
                if s is None or e is None:
                    raise ValueError(f"word without times: {item!r}")
                raw.append((float(s), float(e), str(text)))
    else:
        raise ValueError("unrecognised transcript JSON")
    words: list[Word] = []
    for s, e, text in raw:
        if is_nonspeech(text):
            continue
        words.append(Word(len(words), s, max(e, s), text.strip(), norm(text)))
    if not words:
        raise ValueError("transcript has no words")
    return words


# ---- Fillers ----------------------------------------------------------------------------------------
@dataclass
class Hit:
    idx: list[int]
    code: str            # filler | filler-phrase | flagged-filler
    label: str


def parse_phrases(spec: str) -> list[tuple[str, ...]]:
    out = []
    for p in (x.strip() for x in spec.split(",")):
        toks = tuple(norm(t) for t in p.split() if norm(t))
        if not toks:
            continue
        if len(toks) == 1 and toks[0] in RISKY_SINGLE:
            C.die(f"--phrases {p!r} is a real word most of the time; flag single occurrences with --flags instead")
        out.append(toks)
    return out


def find_fillers(words: list[Word], fillers=DEFAULT_FILLERS, phrases=(), flagged=()) -> list[Hit]:
    fill = {collapse(norm(f)) for f in fillers if norm(f)}
    flagged = set(flagged)
    hits: list[Hit] = []
    used: set[int] = set()
    for ph in sorted(phrases, key=len, reverse=True):
        n = len(ph)
        for k in range(len(words) - n + 1):
            if any(j in used for j in range(k, k + n)):
                continue
            if tuple(w.tok for w in words[k:k + n]) == tuple(ph):
                idx = list(range(k, k + n))
                used.update(idx)
                hits.append(Hit(idx, "filler-phrase", " ".join(words[j].text.strip(",.?!") for j in idx)))
    for w in words:
        if w.i in used:
            continue
        if w.i in flagged:
            hits.append(Hit([w.i], "flagged-filler", w.text.strip(",.?!")))
            used.add(w.i)
        elif w.tok and collapse(w.tok) in fill:
            hits.append(Hit([w.i], "filler", w.text.strip(",.?!")))
            used.add(w.i)
    return sorted(hits, key=lambda h: h.idx[0])


def resolve_flags(words: list[Word], spec) -> tuple[set[int], list[str]]:
    """--flags file: [12, {"t": 83.4, "text": "like"}]. An index counts words after non-speech tokens are dropped."""
    out: set[int] = set()
    problems: list[str] = []
    for item in spec:
        if isinstance(item, int):
            if 0 <= item < len(words):
                out.add(item)
            else:
                problems.append(f"flag index {item} out of range")
            continue
        t, text = float(item["t"]), norm(item.get("text", ""))
        near = [w for w in words if abs(w.s - t) <= 0.25 and (not text or w.tok == text)]
        if near:
            out.add(min(near, key=lambda w: abs(w.s - t)).i)
        else:
            problems.append(f"flag at {t}s ({text or 'any word'}) matched no word")
    return out, problems


# ---- Energy envelope --------------------------------------------------------------------------------
@dataclass
class Env:
    db: list[float]
    t0: float = 0.0
    hop: float = HOP

    def __len__(self):
        return len(self.db)

    def idx(self, t: float) -> int:
        return int(math.floor((t - self.t0) / self.hop + 1e-6))

    def t(self, i: int) -> float:
        return self.t0 + i * self.hop

    @property
    def end(self) -> float:
        return self.t(len(self.db))


def parse_astats(text: str, t0: float) -> Env:
    vals: dict[int, float] = {}
    cur = None
    for line in text.splitlines():
        if "pts_time:" in line:
            cur = int(round(float(line.rsplit("pts_time:", 1)[1].strip()) / HOP))
        elif "RMS_level=" in line and cur is not None:
            raw = line.split("=", 1)[1].strip()
            vals[cur] = -120.0 if "inf" in raw or raw == "nan" else max(float(raw), -120.0)
    if not vals:
        raise ValueError("no energy frames parsed from ffmpeg astats output")
    return Env([vals.get(i, -120.0) for i in range(max(vals) + 1)], t0)


def read_envelope(ff: str, media: Path, start: float, dur: float | None) -> Env:
    """5 ms RMS (dB) frames of the mono 16 kHz mix, one ffmpeg pass; frame 0 begins at `start`."""
    cmd = [ff, "-hide_banner", "-nostats", "-v", "error", "-ss", f"{start:.3f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.3f}"]
    cmd += ["-i", str(media), "-vn", "-af",
            "aformat=sample_rates=16000:channel_layouts=mono,asetnsamples=n=80:p=0,"
            "astats=metadata=1:reset=1:measure_overall=RMS_level:measure_perchannel=none,"
            "ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        C.die(f"ffmpeg envelope pass failed: {r.stderr.strip()[-300:]}")
    return parse_astats(r.stdout, start)


def auto_threshold(env: Env, lo=-45.0, hi=-32.0) -> float:
    """Quiet threshold in dB: the room's own floor (10th percentile of frame energy) plus 12 dB, clamped.
    A steady noisy floor (a passing car, fan hiss) therefore counts as silence instead of speech."""
    vals = sorted(v for v in env.db if v > -119)
    if not vals:
        return hi
    floor = vals[int(len(vals) * 0.10)]
    return min(hi, max(lo, floor + 12.0))


def quiet_runs(quiet: list[bool]) -> list[tuple[int, int]]:
    """Maximal runs of True as [i0, i1) frame indices."""
    out, st = [], None
    for i, q in enumerate(quiet + [False]):
        if q and st is None:
            st = i
        elif not q and st is not None:
            out.append((st, i))
            st = None
    return out


def snap_boundary(env: Env, act: list[bool], t: float, lo: float, hi: float, window: float) -> float | None:
    """Frame boundary nearest `t` (within `window`, inside [lo, hi]) with the lowest energy on both sides;
    None when no boundary in range has quiet frames on both sides."""
    a, b = max(lo, t - window), min(hi, t + window)
    best, best_key = None, None
    for k in range(max(1, env.idx(a) + 1), min(len(env), env.idx(b) + 1)):
        if act[k - 1] or act[k]:
            continue
        e = max(env.db[k - 1], env.db[k])
        key = (round(e, 1), abs(env.t(k) - t))
        if best_key is None or key < best_key:
            best, best_key = env.t(k), key
    return best


def speech_burst(env: Env, act: list[bool], ws: float, we: float) -> tuple[float, float] | None:
    """The burst of speech energy that a transcript word [ws, we] refers to. Bursts are runs of speech frames
    (dips under BRIDGE do not split one); the one overlapping the word most wins. Returns its time span."""
    a, b = max(0, env.idx(ws - 0.1)), min(len(env), env.idx(we) + 1)
    bridge = max(1, int(round(BRIDGE / env.hop)))
    runs: list[list[int]] = []
    for i, x in enumerate(act):
        if not x:
            continue
        if runs and i - runs[-1][1] <= bridge:
            runs[-1][1] = i + 1
        else:
            runs.append([i, i + 1])
    best, best_ov = None, 0
    for s, e in runs:
        ov = min(e, b) - max(s, env.idx(ws))
        if e > a and s < b and ov > best_ov:
            best, best_ov = (s, e), ov
    if best is None:
        return None
    return env.t(best[0]), env.t(best[1])


# ---- Planning ---------------------------------------------------------------------------------------
@dataclass
class Cut:
    start: float
    end: float
    reasons: set = field(default_factory=set)
    owned: set = field(default_factory=set)     # transcript word indexes this cut removes on purpose

    @property
    def dur(self) -> float:
        return self.end - self.start


@dataclass
class Refusal:
    start: float
    end: float
    code: str
    detail: str
    words: list = field(default_factory=list)


@dataclass
class Params:
    min_silence: float = MIN_SILENCE
    breath: float = BREATH
    min_cut: float = MIN_CUT
    snap: float = SNAP
    noise_db: float = -40.0
    fps: float | None = None
    dead_air: bool = True
    fillers: bool = True


def clip_check(cut: Cut, words: list[Word], env: Env, act: list[bool]) -> tuple[str, str, list[str]] | None:
    """None when the cut touches no speech that belongs to another word. Otherwise (code, detail, words):
    `clips-word` = the cut removes speech energy inside another word's time span;
    `silent-word` = another word lies wholly inside the cut and has no energy at all (cannot tell what it is)."""
    i0, i1 = max(0, env.idx(cut.start)), min(len(env), env.idx(cut.end))
    for w in words:
        if w.i in cut.owned or w.e <= cut.start or w.s >= cut.end:
            continue
        a, b = max(0, env.idx(w.s)), min(len(env), env.idx(w.e) + 1)
        inside = [k for k in range(max(a, i0), min(b, i1)) if act[k]]
        if inside:
            return ("clips-word", f"cut would remove speech energy of {w.text!r} ({w.s:.2f}-{w.e:.2f})", [w.text])
        if w.s >= cut.start and w.e <= cut.end and not any(act[a:b]):
            return ("silent-word", f"{w.text!r} ({w.s:.2f}-{w.e:.2f}) is inside the cut but has no audible energy", [w.text])
    return None


def plan(words: list[Word], env: Env, p: Params, hits: list[Hit]) -> tuple[list[Cut], list[Refusal], dict]:
    act = [d > p.noise_db for d in env.db]
    cuts: list[Cut] = []
    refused: list[Refusal] = []
    lo_t, hi_t = env.t0, env.end
    in_range = [w for w in words if w.e > lo_t and w.s < hi_t]
    keep_ids = {w.i for w in in_range}

    # 1. fillers: cut each at its own burst, padded into the quiet frames on both sides
    filler_cuts: list[Cut] = []
    if p.fillers:
        for h in hits:
            if not all(j in keep_ids for j in h.idx):
                continue
            first, last = words[h.idx[0]], words[h.idx[-1]]
            b0, b1 = speech_burst(env, act, first.s, first.e), speech_burst(env, act, last.s, last.e)
            if not b0 or not b1:
                refused.append(Refusal(first.s, last.e, "no-energy", f"{h.label!r}: no audible energy where the transcript puts it", [h.label]))
                continue
            cs, ce = b0[0], b1[1]
            if not (FILLER_MIN <= ce - cs <= FILLER_MAX) or cs < first.s - 0.3 or ce > last.e + 0.3:
                refused.append(Refusal(cs, ce, "fused-with-speech", f"{h.label!r}: its burst ({ce - cs:.2f} s) runs into neighbouring speech", [h.label]))
                continue
            i_s, i_e = env.idx(cs), env.idx(ce)
            need = max(1, int(round(EDGE_QUIET_MIN / env.hop)))
            if not (i_s >= need and not any(act[i_s - need:i_s]) and i_e + need <= len(env) and not any(act[i_e:i_e + need])):
                refused.append(Refusal(cs, ce, "no-quiet-edge", f"{h.label!r}: no quiet gap beside it to cut in", [h.label]))
                continue
            c0 = snap_boundary(env, act, cs - 0.03, cs - 0.06, cs, p.snap)
            c1 = snap_boundary(env, act, ce + 0.03, ce, ce + 0.06, p.snap)
            if c0 is None or c1 is None:
                refused.append(Refusal(cs, ce, "no-quiet-edge", f"{h.label!r}: no quiet frame to cut on", [h.label]))
                continue
            filler_cuts.append(Cut(c0, c1, {h.code}, set(h.idx)))

    # 2. dead air: quiet runs (filler bursts count as quiet: removing one can leave a long pause behind)
    dead: list[Cut] = []
    if p.dead_air:
        quiet = [not a for a in act]
        for c in filler_cuts:
            for k in range(max(0, env.idx(c.start)), min(len(env), env.idx(c.end))):
                quiet[k] = True
        pad = max(p.breath / 2, MIN_PAD)
        for i0, i1 in quiet_runs(quiet):
            rs, re_ = env.t(i0), env.t(i1)
            if re_ - rs < p.min_silence:
                continue
            # a run touching the edge of the analysed range may continue past it: only cut what is measured
            c0 = snap_boundary(env, act, rs + pad, rs + MIN_PAD, re_ - MIN_PAD, p.snap) if i0 > 0 else rs
            c1 = snap_boundary(env, act, re_ - pad, rs + MIN_PAD, re_ - MIN_PAD, p.snap) if i1 < len(env) else re_
            if i0 == 0:
                c0 = env.t(0)
                c1 = c1 if c1 is not None else re_ - pad
            if i1 == len(env):
                c1 = re_
            if c0 is None or c1 is None or c1 - c0 < p.min_cut:
                continue
            dead.append(Cut(c0, c1, {"dead-air"}))

    # 3. merge overlapping candidates (a filler inside dead air becomes one cut with both reasons)
    allc = sorted(filler_cuts + dead, key=lambda c: (c.start, c.end))
    merged: list[Cut] = []
    for c in allc:
        if merged and c.start <= merged[-1].end + 1e-9:
            m = merged[-1]
            m.end = max(m.end, c.end)
            m.reasons |= c.reasons
            m.owned |= c.owned
        else:
            merged.append(Cut(c.start, c.end, set(c.reasons), set(c.owned)))

    # 4. frame grid (video): edges move to the nearest quiet frame boundary
    if p.fps:
        grid: list[Cut] = []
        for c in merged:
            s = grid_edge(env, act, c.start, p.fps, inward=+1)
            e = grid_edge(env, act, c.end, p.fps, inward=-1)
            if s is None or e is None:
                refused.append(Refusal(c.start, c.end, "no-quiet-frame", "no quiet video-frame boundary at the cut edge"))
            elif e - s >= min(p.min_cut, c.dur):
                c.start, c.end = s, e
                grid.append(c)
        merged = grid

    # 5. never leave a sliver between two cuts: merge if the sliver is quiet, else refuse the later cut
    spaced: list[Cut] = []
    for c in merged:
        if spaced and c.start - spaced[-1].end < MIN_KEEP:
            a, b = max(0, env.idx(spaced[-1].end)), min(len(env), env.idx(c.start))
            if not any(act[a:b]):
                spaced[-1].end = c.end
                spaced[-1].reasons |= c.reasons
                spaced[-1].owned |= c.owned
            else:
                refused.append(Refusal(c.start, c.end, "keep-too-short", f"would leave under {MIN_KEEP * 1000:.0f} ms of speech between two cuts", []))
            continue
        spaced.append(c)

    # 6. clip check: refuse any cut that would remove another word's speech
    final: list[Cut] = []
    for c in spaced:
        bad = clip_check(c, in_range, env, act)
        if bad:
            refused.append(Refusal(c.start, c.end, bad[0], bad[1], bad[2]))
        else:
            final.append(c)
    stats = {"frames": len(env), "quiet_frame_share": round(sum(1 for a in act if not a) / max(1, len(act)), 3)}
    return final, sorted(refused, key=lambda r: r.start), stats


def grid_edge(env: Env, act: list[bool], t: float, fps: float, inward: int) -> float | None:
    """Nearest video-frame boundary to `t` whose neighbouring audio frames are both quiet; prefers the one
    on the `inward` side (+1: later, -1: earlier) so a cut shrinks rather than grows."""
    k = t * fps
    cands = [math.ceil(k - 1e-9), math.floor(k + 1e-9)] if inward > 0 else [math.floor(k + 1e-9), math.ceil(k - 1e-9)]
    for g in dict.fromkeys(cands):
        tt = g / fps
        j = env.idx(tt)
        if 1 <= j < len(env) and not act[j - 1] and not act[j]:
            return tt
    return None


def keep_ranges(cuts: list[Cut], start: float, end: float) -> list[tuple[float, float]]:
    out, pos = [], start
    for c in cuts:
        if c.start > pos + 1e-9:
            out.append((pos, c.start))
        pos = max(pos, c.end)
    if end > pos + 1e-9:
        out.append((pos, end))
    return out


# ---- EDL and report ---------------------------------------------------------------------------------
def tc(t: float) -> str:
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:06.3f}"


def context(words: list[Word], c: Cut, n: int = 4) -> tuple[str, str, str]:
    owned = [words[i] for i in sorted(c.owned)]
    rest = [w for w in words if w.i not in c.owned]
    before = [w.text for w in rest if w.s < c.start][-n:]
    after = [w.text for w in rest if w.s >= c.end][:n]
    return " ".join(before), " ".join(w.text for w in owned), " ".join(after)


def build_edl(args, words, cuts, refused, env, params, rng, media_info, version, source: Path, transcript: Path):
    start, end = rng
    keeps = keep_ranges(cuts, start, end)
    out_pos, kept = 0.0, []
    for a, b in keeps:
        kept.append({"start": round(a, 4), "end": round(b, 4), "out_start": round(out_pos, 4)})
        out_pos += b - a
    cut_total = sum(c.dur for c in cuts)
    by_reason: dict[str, dict] = {}
    for c in cuts:
        for r in c.reasons:
            d = by_reason.setdefault(r, {"count": 0, "seconds": 0.0})
            d["count"] += 1
            d["seconds"] = round(d["seconds"] + c.dur, 4)
    items = []
    for n, c in enumerate(cuts, 1):
        before, removed, after = context(words, c)
        i0, i1 = env.idx(c.start), env.idx(c.end)
        out_t = sum(b - a for a, b in keep_ranges([x for x in cuts if x.end <= c.start], start, c.start))
        items.append({
            "id": f"c{n:03d}", "start": round(c.start, 4), "end": round(c.end, 4), "duration": round(c.dur, 4),
            "out_at": round(out_t, 4), "reasons": sorted(c.reasons), "removed_words": removed,
            "before": before, "after": after,
            "edge_db": [round(env.db[max(0, i0 - 1)], 1), round(env.db[min(len(env) - 1, i1)], 1)],
        })
    stat = source.stat()
    return {
        "schema": SCHEMA, "tool": {"name": "trim.py", "version": TOOL_VERSION}, "version": version,
        "source": {"file": source.name, "path": str(source), "size": stat.st_size, "mtime": int(stat.st_mtime),
                   "duration": round(media_info["duration"], 4), "fps": media_info.get("fps"),
                   "has_video": media_info["has_video"]},
        "transcript": {"file": transcript.name, "sha256": hashlib.sha256(transcript.read_bytes()).hexdigest()[:16],
                       "words": len(words)},
        "range": {"start": round(start, 4), "end": round(end, 4)},
        "params": {"min_silence": params.min_silence, "breath": params.breath, "min_cut": params.min_cut,
                   "snap": params.snap, "noise_db": round(params.noise_db, 1), "noise_mode": args.noise,
                   "fillers": [f.strip() for f in args.fillers.split(",") if f.strip()] if params.fillers else [],
                   "phrases": args.phrases or "",
                   "flags": len(args.flag_ids), "dead_air": params.dead_air,
                   "fade_s": FADE, "hop_s": HOP, "fps_grid": params.fps},
        "cuts": items,
        "keep": kept,
        "refused": [{"start": round(r.start, 4), "end": round(r.end, 4), "code": r.code, "detail": r.detail}
                    for r in refused],
        "totals": {"input_duration": round(end - start, 4), "cut_total": round(cut_total, 4),
                   "output_duration": round(end - start - cut_total, 4), "cuts": len(cuts),
                   "by_reason": by_reason},
        "render": None,
    }


def calm_notes(cuts: list[Cut]) -> list[str]:
    notes = []
    short = [c for c in cuts if c.dur < CALM_MIN_CUT]
    if short:
        notes.append(f"{len(short)} cut(s) shorter than {CALM_MIN_CUT} s")
    close = [(a, b) for a, b in zip(cuts, cuts[1:]) if b.start - a.end < CALM_MERGE]
    if close:
        notes.append(f"{len(close)} pair(s) of cuts less than {CALM_MERGE:.0f} s apart: " +
                     ", ".join(f"{tc(a.end)}-{tc(b.start)}" for a, b in close[:8]) + (" ..." if len(close) > 8 else ""))
    return notes


def build_report(edl: dict, words: list[Word], cuts: list[Cut], refused: list[Refusal]) -> str:
    t = edl["totals"]
    p = edl["params"]
    L = [f"# Trim report: {edl['source']['file']} ({edl['version']})", "",
         "Generated by `editing/scripts/trim/trim.py`. A script placed these cuts from the audio energy and the "
         "transcript; **nobody has listened to the result**. Audit the list below before using the cut.", "",
         f"- Range: {tc(edl['range']['start'])} to {tc(edl['range']['end'])} ({t['input_duration']:.1f} s)",
         f"- Cuts: {t['cuts']}, removing {t['cut_total']:.2f} s; trimmed length {t['output_duration']:.2f} s",
         f"- Thresholds: silence >= {p['min_silence']} s, breath left {p['breath']} s, quiet <= {p['noise_db']} dB "
         f"({p['noise_mode']}), edge snap {p['snap']} s, fades {int(p['fade_s'] * 1000)} ms at every join"
         + (f", video frame grid {p['fps_grid']:.3f} fps" if p["fps_grid"] else ""),
         f"- Fillers: {', '.join(p['fillers']) or 'off'}" + (f"; phrases: {p['phrases']}" if p["phrases"] else "")
         + (f"; {p['flags']} flagged" if p["flags"] else ""),
         "- By reason: " + (", ".join(f"{k} {v['count']} ({v['seconds']:.2f} s)" for k, v in sorted(t["by_reason"].items())) or "none"),
         ""]
    notes = calm_notes(cuts)
    if notes:
        L += ["Calm-cutting check (vault `brand/editing.md`: no micro-cuts under about 0.5 s, cuts closer than 2 s apart are merged). "
              "Reported, not changed: " + "; ".join(notes) + ".", ""]
    L += ["## Cuts", "", "| # | source | out at | dur | reason | removed | around the cut |", "|---|---|---|---|---|---|---|"]
    for item in edl["cuts"]:
        around = f"{item['before']} **[cut]** {item['after']}".replace("|", "/")
        L.append(f"| {item['id']} | {tc(item['start'])}-{tc(item['end'])} | {tc(item['out_at'])} | {item['duration']:.2f} s "
                 f"| {', '.join(item['reasons'])} | {item['removed_words'] or '(silence)'} | {around} |")
    if not edl["cuts"]:
        L.append("| | | | | | | no cuts |")
    L += ["", "## Refused (not cut, needs a person)", ""]
    if refused:
        L += ["| source | code | detail |", "|---|---|---|"]
        for r in refused:
            L.append(f"| {tc(r.start)}-{tc(r.end)} | {r.code} | {r.detail.replace('|', '/')} |")
    else:
        L.append("None.")
    L += ["", "Reason codes: `dead-air` (quiet run over the threshold, breath kept), `filler` (default list), "
          "`filler-phrase` (--phrases), `flagged-filler` (--flags). A cut with two codes is a filler inside dead air. "
          "Refusal codes: `clips-word`, `silent-word`, `fused-with-speech`, `no-quiet-edge`, `no-energy`, "
          "`no-quiet-frame`, `keep-too-short`.", ""]
    return "\n".join(L)


# ---- Media ------------------------------------------------------------------------------------------
def probe(media: Path, fp: str) -> dict:
    r = subprocess.run([fp, "-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate,avg_frame_rate",
                        "-of", "json", str(media)], capture_output=True, text=True)
    if r.returncode:
        C.die(f"ffprobe failed on {media}: {r.stderr.strip()[-200:]}")
    j = json.loads(r.stdout)
    vids = [s for s in j.get("streams", []) if s.get("codec_type") == "video"]
    info = {"duration": float(j["format"]["duration"]), "has_video": bool(vids), "fps": None}
    if vids:
        def frac(x):
            a, _, b = x.partition("/")
            return float(a) / float(b or 1) if float(b or 1) else 0.0
        info["fps"] = frac(vids[0]["r_frame_rate"])
        avg = frac(vids[0].get("avg_frame_rate", "0/1"))
        if avg and abs(avg - info["fps"]) / info["fps"] > 0.01:
            print(f"warning: variable frame rate ({avg:.3f} avg vs {info['fps']:.3f}); cuts are snapped to {info['fps']:.3f} fps", file=sys.stderr)
    return info


def claim(path: Path, source: Path, allow: bool) -> Path:
    """Output path guard: never the source, never inside a `final` folder, never an existing file (unless the
    file is a plan output and --overwrite was given)."""
    path = path.resolve()
    if path == source.resolve():
        C.die(f"{path} is the source file")
    if "final" in path.parts:
        C.die(f"{path} is inside a final folder; write trims elsewhere")
    if path.exists() and not allow:
        C.die(f"{path} exists; pick a new --version (media is never overwritten)")
    return path


def filter_script(keeps: list[tuple[float, float]], offset: float, video: bool, total: tuple[float, float]) -> str:
    parts, labels = [], ""
    for n, (a, b) in enumerate(keeps):
        ra, rb = a - offset, b - offset
        af = f"[0:a]atrim=start={ra:.5f}:end={rb:.5f},asetpts=PTS-STARTPTS"
        if a > total[0] + 1e-6:
            af += f",afade=t=in:st=0:d={FADE}"
        if b < total[1] - 1e-6:
            af += f",afade=t=out:st={b - a - FADE:.5f}:d={FADE}"
        parts.append(f"{af}[a{n}]")
        if video:
            parts.append(f"[0:v]trim=start={ra:.5f}:end={rb:.5f},setpts=PTS-STARTPTS[v{n}]")
            labels += f"[v{n}][a{n}]"
        else:
            labels += f"[a{n}]"
    parts.append(f"{labels}concat=n={len(keeps)}:v={1 if video else 0}:a=1" + ("[v][a]" if video else "[a]"))
    return ";\n".join(parts)


def render(ff: str, media: Path, out: Path, keeps, rng, video: bool, work: Path) -> None:
    script = work / (out.stem + ".filter.txt")
    script.write_text(filter_script(keeps, rng[0], video, rng))
    tail = (["-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", *C.AAC]
            if video else ["-map", "[a]", "-c:a", "pcm_s16le"]) + [str(out)]
    r = None
    # ffmpeg 7+ reads a filtergraph file with -/filter_complex; older builds use -filter_complex_script
    for opt in (["-/filter_complex", str(script)], ["-filter_complex_script", str(script)]):
        cmd = [ff, "-hide_banner", "-nostats", "-v", "error", "-n", "-ss", f"{rng[0]:.5f}", "-t", f"{rng[1] - rng[0]:.5f}",
               "-i", str(media), *opt, *tail]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 or "Unrecognized option" not in r.stderr:
            break
    script.unlink(missing_ok=True)
    if r.returncode:
        out.unlink(missing_ok=True)
        C.die(f"render failed: {r.stderr.strip()[-400:]}")


# ---- CLI --------------------------------------------------------------------------------------------
def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("transcript", type=Path, help="whisper word-timing JSON (see shorts/align.py)")
    ap.add_argument("media", type=Path, help="source audio or video")
    ap.add_argument("--episode", help="episode folder or id: outputs go to <episode>/out/trim/")
    ap.add_argument("--out", type=Path, help="output folder (default with --episode: <episode>/out/trim)")
    ap.add_argument("--version", default="v1", help="label in file names and the EDL (default v1)")
    ap.add_argument("--apply", action="store_true", help="also render the trimmed media (default: report only)")
    ap.add_argument("--audio-only", action="store_true", help="with --apply: render audio (wav) even if the source has video")
    ap.add_argument("--overwrite", action="store_true", help="allow replacing an existing EDL/report (never media)")
    ap.add_argument("--start", type=float, help="analyse from this source second")
    ap.add_argument("--end", type=float, help="analyse to this source second")
    ap.add_argument("--min-silence", type=float, default=MIN_SILENCE)
    ap.add_argument("--breath", type=float, default=BREATH)
    ap.add_argument("--min-cut", type=float, default=MIN_CUT)
    ap.add_argument("--snap", type=float, default=SNAP)
    ap.add_argument("--noise", default="auto", help="quiet threshold in dB (e.g. -40) or auto (room floor + 12 dB, -45..-32)")
    ap.add_argument("--fillers", default=",".join(DEFAULT_FILLERS), help="filler words, comma separated")
    ap.add_argument("--phrases", default="", help='extra filler phrases, e.g. "you know,i mean" (single risky words refused: use --flags)')
    ap.add_argument("--flags", type=Path, help="JSON list of word indexes or {t, text} to treat as filler")
    ap.add_argument("--no-fillers", action="store_true")
    ap.add_argument("--no-dead-air", action="store_true")
    ap.add_argument("--fps", type=float, help="snap cuts to this frame rate (default: the video stream's)")
    ap.add_argument("--ffmpeg")
    ap.add_argument("--ffprobe")
    a = ap.parse_args(argv)
    if a.min_silence <= 0 or a.breath < 0 or a.breath >= a.min_silence:
        ap.error("need 0 < --min-silence and 0 <= --breath < --min-silence")
    if not (a.out or a.episode):
        ap.error("give --out DIR or --episode")
    return a


def main(argv=None) -> int:
    a = parse_args(argv)
    ff, fp = C.find_bin("ffmpeg", a.ffmpeg), C.find_bin("ffprobe", a.ffprobe)
    if not a.transcript.exists() or not a.media.exists():
        C.die("transcript or media not found")
    source = a.media.resolve()
    try:
        words = parse_transcript(json.loads(a.transcript.read_text()))
    except (ValueError, KeyError, json.JSONDecodeError) as e:
        C.die(f"{a.transcript}: {e}")
    info = probe(source, fp)
    start = max(0.0, a.start or 0.0)
    end = min(info["duration"], a.end if a.end is not None else info["duration"])
    fps = a.fps or (info["fps"] if info["has_video"] and not a.audio_only else None)
    if fps:   # slice ends on the frame grid so audio and video pieces match
        start, end = math.ceil(start * fps - 1e-6) / fps, math.floor(end * fps + 1e-6) / fps
    if end - start < 1.0:
        C.die("range under 1 s")
    flag_ids: set[int] = set()
    if a.flags:
        flag_ids, problems = resolve_flags(words, json.loads(a.flags.read_text()))
        for pr in problems:
            print(f"warning: {pr}", file=sys.stderr)
    a.flag_ids = flag_ids
    fillers = [f.strip() for f in a.fillers.split(",") if f.strip()]
    hits = find_fillers(words, fillers, parse_phrases(a.phrases), flag_ids)
    env = read_envelope(ff, source, start, end - start)
    thr = auto_threshold(env) if a.noise == "auto" else float(a.noise)
    params = Params(a.min_silence, a.breath, a.min_cut, a.snap, thr, fps, not a.no_dead_air, not a.no_fillers)
    cuts, refused, _ = plan(words, env, params, hits)
    edl = build_edl(a, words, cuts, refused, env, params, (start, end), info, a.version, source, a.transcript)

    out_dir = a.out
    if a.episode:
        import workspace
        ep = Path(a.episode)
        ep = ep if ep.is_dir() else workspace.episode_dir(a.episode)
        out_dir = out_dir or ep / "out" / "trim"
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{source.stem}.trim-{a.version}"
    edl_path = claim(out_dir / f"{stem}.edl.json", source, a.overwrite)
    rep_path = claim(out_dir / f"{stem}.report.md", source, a.overwrite)
    media_out = None
    video = info["has_video"] and not a.audio_only
    if a.apply:
        media_out = claim(out_dir / f"{stem}.{'mp4' if video else 'wav'}", source, False)
    rep_path.write_text(build_report(edl, words, cuts, refused))
    if a.apply:
        keeps = keep_ranges(cuts, start, end)
        if not keeps:
            C.die("nothing left after trimming")
        render(ff, source, media_out, keeps, (start, end), video, out_dir)
        got = probe(media_out, fp)["duration"]
        want = edl["totals"]["output_duration"]
        edl["render"] = {"file": media_out.name, "video": video, "expected_duration": round(want, 4),
                         "actual_duration": round(got, 4), "delta": round(got - want, 4),
                         "ok": abs(got - want) <= 0.1}
    edl_path.write_text(json.dumps(edl, indent=2) + "\n")
    t = edl["totals"]
    print(f"{len(cuts)} cuts, {t['cut_total']:.2f} s of {t['input_duration']:.1f} s; {len(refused)} refused; "
          f"quiet <= {thr:.1f} dB")
    print(f"edl: {edl_path}\nreport: {rep_path}")
    if edl["render"]:
        r = edl["render"]
        print(f"render: {media_out} {r['actual_duration']:.3f} s (expected {r['expected_duration']:.3f}, delta {r['delta']:+.3f})")
        return 0 if r["ok"] else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
