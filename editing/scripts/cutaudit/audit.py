#!/usr/bin/env python3
"""Cut audit: check every cut of a finished edit list against the waveform. Reports only, never renders.

For every cut boundary it asks: does the cut land inside a word, is the audio quiet where it lands, does the
18 ms join fade eat a word onset or tail, and does the join leave a double pause or a doubled word or phrase.
Output is `cut-audit.json`, a markdown report (PASS/WARN/FAIL per cut with the measured values and the words
around it), an adjusted EDL with a suggested nudge for each failing edge (never applied by this script) and an
optional waveform PNG per failing edge. Exit code 1 when any cut FAILs.

Usage: audit.py CUTS TRANSCRIPT MEDIA --out DIR   (CUTS: trim EDL, chapters.json, short.json, or keep ranges)
"""
from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "trim"))
import trim as T  # noqa: E402  (transcript parsing, envelope, thresholds and fade shared with the trimmer)

C = T.C

TOOL_VERSION = 1
SCHEMA = "shipshitshow.cut-audit/1"
NUDGED_SCHEMA = "shipshitshow.cutaudit-nudged/1"

HOP = T.HOP
FADE = T.FADE               # s, the 18 ms audio fade at every join (shorts/common.py AUDIO_FADE)
MIN_PAD = T.MIN_PAD         # s, quiet a cut edge keeps between it and speech (same as the trimmer)
TOLERANCE = 0.015           # s, a cut this close to a word box edge is not "inside" the word
WINDOW = 0.03               # s, the +-30 ms window the cut-point level is measured over
DEEP_WORD = 0.06            # s, inside a word by this much on both sides: a quiet dip there is still a split word
PAUSE_SIDE = 0.2            # s, each side of a join must hold this much pause to be a "double" pause
PAUSE_WARN = 0.6            # s, joined pause that warns (the trimmer's own dead-air length)
PAUSE_FAIL = 1.0            # s, joined pause that fails
NUDGE_RANGE = 0.12          # s, a suggested nudge moves an edge at most this far
SEARCH_LIMIT = 3.0          # s, how far pauses are measured out from an edge
CONTEXT = 6                 # words shown and compared either side of a join
PRE, POST = 0.06, 0.03      # s, how far a word's energy may start before / end after its transcript stamps
LEVELS = {"PASS": 0, "WARN": 1, "FAIL": 2}
EDGE_NUDGE_CODES = {"mid-word", "mid-speech", "clipped-edge", "tight-pad", "quiet-in-word", "click-risk"}


# ---- Inputs: cut lists as sequences of kept source ranges -----------------------------------------------
@dataclass
class Sequence:
    """One output: its kept pieces in play order (source seconds) and which of its edges get a join fade."""
    name: str
    pieces: list[list[float]]
    fade: float = FADE                  # s, fade at joins between pieces
    fade_head: float = 0.0              # s, fade at the start of the first piece (0 = none)
    fade_tail: float = 0.0
    ids: list[str | None] = field(default_factory=list)     # id of each join, when the input names it
    skip_head: bool = False             # the first piece starts at the range start, not at a cut
    skip_tail: bool = False


def parse_time(v) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    parts = [float(x) for x in str(v).strip().split(":")]
    out = 0.0
    for p in parts:
        out = out * 60 + p
    return out


def subtract(a: float, b: float, drops: list[tuple[float, float]]) -> list[list[float]]:
    out, pos = [], a
    for x, y in sorted(drops):
        x, y = max(x, a), min(y, b)
        if y <= x:
            continue
        if x > pos + 1e-9:
            out.append([pos, x])
        pos = max(pos, y)
    if b > pos + 1e-9:
        out.append([pos, b])
    return out


def detect_format(data) -> str:
    if isinstance(data, dict):
        if str(data.get("schema", "")).startswith("shipshitshow.trim-edl"):
            return "trim"
        if "chapters" in data:
            return "chapters"
        if "segs" in data:
            return "short"
        if "sequences" in data:
            return "keeps"
    if isinstance(data, list) and data and all(isinstance(x, (list, tuple)) and len(x) == 2 for x in data):
        return "keeps"
    raise ValueError("unrecognised cut list: give --format trim|chapters|short|keeps")


def load_sequences(data, fmt: str, only: str | None = None) -> list[Sequence]:
    """Small adapters. trim: `keep[]` of a trim.py EDL. chapters: `chapters[]` with `drop`. short: `segs[]`
    (`a`, `b`). keeps: a list of [start, end] pairs, or {"sequences": [{"name", "pieces": [[a, b], ...]}]}."""
    if fmt == "trim":
        rng = data.get("range", {})
        seq = Sequence("main", [[k["start"], k["end"]] for k in data["keep"]],
                       ids=[c.get("id") for c in data.get("cuts", [])])
        if len(seq.ids) != len(seq.pieces) - 1:
            seq.ids = []
        seq.skip_head = bool(seq.pieces) and abs(seq.pieces[0][0] - rng.get("start", 0.0)) < 1e-3
        seq.skip_tail = bool(seq.pieces) and abs(seq.pieces[-1][1] - rng.get("end", 1e12)) < 1e-3
        return [seq]
    if fmt == "short":
        pieces = [[parse_time(s["a"]), parse_time(s["b"])] for s in data["segs"]]
        return [Sequence("short", pieces)]
    if fmt == "chapters":
        out = []
        for ch in data["chapters"]:
            if only and ch.get("id") != only:
                continue
            a, b = parse_time(ch["start"]), parse_time(ch["end"])
            drops = [(parse_time(x), parse_time(y)) for x, y in ch.get("drop", [])]
            out.append(Sequence(str(ch.get("id", f"ch{len(out) + 1}")), subtract(a, b, drops), fade=0.015,
                                fade_head=0.015, fade_tail=0.015))
        if not out:
            raise ValueError("no chapters selected")
        return out
    if fmt == "keeps":
        if isinstance(data, list):
            return [Sequence("main", [[float(a), float(b)] for a, b in data])]
        return [Sequence(str(s.get("name", f"seq{n}")), [[float(a), float(b)] for a, b in s["pieces"]],
                         fade_head=float(s.get("fade_head", 0.0)), fade_tail=float(s.get("fade_tail", 0.0)))
                for n, s in enumerate(data["sequences"], 1)]
    raise ValueError(f"unknown format {fmt}")


def clip_words_to_source(words: list[T.Word], segs: list[dict]) -> list[T.Word]:
    """Words stamped on the Short's own audio (shorts/align.py runs whisper on the segments joined) back to
    source seconds. A word is placed in the seg holding its midpoint."""
    bounds, acc = [], 0.0
    for s in segs:
        a, b = parse_time(s["a"]), parse_time(s["b"])
        bounds.append((acc, acc + (b - a), a))
        acc += b - a
    out = []
    for w in words:
        mid = (w.s + w.e) / 2
        for lo, hi, a in bounds:
            if lo - 1e-6 <= mid <= hi + 1e-6:
                shift = a - lo
                out.append(T.Word(len(out), min(max(w.s, lo), hi) + shift, min(max(w.e, lo), hi) + shift, w.text, w.tok))
                break
    return out


# ---- Waveform context: thresholds, word boxes ---------------------------------------------------------
@dataclass
class Box:
    i: int
    s: float
    e: float
    text: str


def speech_runs(act: list[bool]) -> list[list[int]]:
    """Bursts of speech energy as [i0, i1) frame runs; dips under BRIDGE do not split one (as in trim.speech_burst)."""
    bridge = max(1, int(round(T.BRIDGE / HOP)))
    runs: list[list[int]] = []
    for i, x in enumerate(act):
        if not x:
            continue
        if runs and i - runs[-1][1] <= bridge:
            runs[-1][1] = i + 1
        else:
            runs.append([i, i + 1])
    return runs


def word_boxes(words: list[T.Word], env: T.Env, act: list[bool]) -> list[Box]:
    """Where each transcript word's energy really sits. Whisper stamps run late and stretch word ends over the pause
    after them (hundreds of ms on this kind of recording), so the transcript is only a hint: a word's box is the
    speech burst that overlaps its stamps most, clipped to the stamps. A word with no burst under it gets no box."""
    runs = speech_runs(act)
    ends = [r[1] for r in runs]
    boxes = []
    for w in words:
        a, b = env.idx(w.s - PRE), env.idx(w.e + POST) + 1
        best, ov = None, 0
        for r in runs[bisect.bisect_right(ends, a):]:
            if r[0] >= b:
                break
            o = min(r[1], b) - max(r[0], a)
            if o > ov:
                best, ov = r, o
        if best is not None:
            boxes.append(Box(w.i, env.t(max(best[0], a)), env.t(min(best[1], b)), w.text))
    boxes.sort(key=lambda x: x.s)
    return boxes


def pct(vals: list[float], q: float) -> float:
    vals = sorted(vals)
    return vals[min(len(vals) - 1, int(len(vals) * q))]


class Ctx:
    """Everything the checks read: the envelope, the quiet threshold, the activity mask and the word boxes."""

    def __init__(self, env: T.Env, quiet_db: float, words: list[T.Word], tol: float = TOLERANCE):
        self.env, self.quiet_db, self.words, self.tol = env, quiet_db, words, tol
        self.act = [d > quiet_db for d in env.db]
        self.boxes = word_boxes(words, env, self.act)
        self.box_starts = [b.s for b in self.boxes]
        self.span = {w.i: (w.s, w.e) for w in words}
        self.span.update({b.i: (b.s, b.e) for b in self.boxes})
        self.order = sorted(words, key=lambda w: self.span[w.i][0])
        self.order_starts = [self.span[w.i][0] for w in self.order]
        valid = [d for d in env.db if d > -119]
        speech = [d for d in valid if d > quiet_db]
        self.floor_db = pct(valid, 0.10) if valid else -120.0
        self.speech_db = pct(speech, 0.90) if speech else quiet_db + 20.0

    def local_speech_db(self, t: float, radius: float = 2.0) -> float:
        a, b = max(0, self.env.idx(t - radius)), min(len(self.env), self.env.idx(t + radius) + 1)
        vals = [d for d in self.env.db[a:b] if d > self.quiet_db]
        return pct(vals, 0.90) if len(vals) >= 20 else self.speech_db

    def window_db(self, t: float, side: int, width: float = WINDOW) -> float:
        """Loudest 5 ms frame in the 30 ms on one side of t (side +1 after, -1 before)."""
        i = self.env.idx(t)
        n = max(1, int(round(width / HOP)))
        idx = range(i, i + n) if side > 0 else range(i - n, i)
        vals = [self.env.db[k] for k in idx if 0 <= k < len(self.env)]
        return max(vals) if vals else -120.0

    def is_active(self, k: int) -> bool:
        return 0 <= k < len(self.act) and self.act[k]

    def pad(self, t: float, side: int, limit: float = SEARCH_LIMIT) -> float:
        """Quiet run (s) from t outward in the direction `side` (+1 after t, -1 before) to the first speech frame."""
        i = self.env.idx(t)
        k = i if side > 0 else i - 1
        n, max_n = 0, int(limit / HOP)
        while 0 <= k + n * side < len(self.act) and not self.act[k + n * side] and n < max_n:
            n += 1
        return n * HOP

    def inside(self, t: float) -> list[dict]:
        """Word boxes the time t falls strictly inside (beyond the tolerance of either edge)."""
        j = bisect.bisect_right(self.box_starts, t - self.tol)
        out = []
        for b in self.boxes[max(0, j - 8):j]:
            if t - b.s > self.tol and b.e - t > self.tol:
                out.append({"word": b.text, "in_ms": round((t - b.s) * 1000), "left_ms": round((b.e - t) * 1000)})
        return out

    def kept_words(self, a: float, b: float, n: int = CONTEXT, tail: bool = False) -> list[T.Word]:
        """Whole words whose energy lies inside [a, b] (first n, or last n with tail=True)."""
        lo = bisect.bisect_left(self.order_starts, a - self.tol)
        out = []
        for w in self.order[lo:]:
            s, e = self.span[w.i]
            if s >= b:
                break
            if s >= a - self.tol and e <= b + self.tol:
                out.append(w)
        return out[-n:] if tail else out[:n]


# ---- Edge and join checks ------------------------------------------------------------------------------
def issue(level: str, code: str, detail: str) -> dict:
    return {"level": level, "code": code, "detail": detail}


def verdict_of(issues: list[dict]) -> str:
    return max((i["level"] for i in issues), key=LEVELS.get, default="PASS")


def measure_edge(ctx: Ctx, t: float, side: str) -> dict:
    """Measurements at one cut edge. side "in": the kept audio starts at t. side "out": it ends at t."""
    kd = 1 if side == "in" else -1
    i = ctx.env.idx(t)
    kept_adj, rem_adj = (i, i - 1) if kd > 0 else (i - 1, i)
    local = ctx.local_speech_db(t)
    kept_db, removed_db = ctx.window_db(t, kd), ctx.window_db(t, -kd)
    return {
        "t": round(t, 4), "side": side,
        "kept_pad": ctx.pad(t, kd), "removed_pad": ctx.pad(t, -kd),
        "kept_db": round(kept_db, 1), "removed_db": round(removed_db, 1), "local_speech_db": round(local, 1),
        "rel_db": round(kept_db - local, 1),
        "kept_active": ctx.is_active(kept_adj), "continuous": ctx.is_active(kept_adj) and ctx.is_active(rem_adj),
        "inside": ctx.inside(t),
    }


def classify_edge(m: dict, fade: float) -> list[dict]:
    """The checks for one edge. `fade` is the join fade in seconds (0 = this edge has none)."""
    p, ins = m["kept_pad"], m["inside"]
    pad_ms = round(p * 1000)
    if ins:
        w = ins[0]
        where = f'inside "{w["word"]}" ({w["in_ms"]} ms in, {w["left_ms"]} ms to its end)'
        if m["continuous"] or p < MIN_PAD:
            return [issue("FAIL", "mid-word", f"cut lands {where}; speech energy continues on the kept side ({pad_ms} ms quiet)")]
        deep = min(w["in_ms"], w["left_ms"]) >= DEEP_WORD * 1000
        return [issue("FAIL" if deep else "WARN", "quiet-in-word",
                      f"cut lands {where} in a quiet dip (stop closure, or word stamps off): the word is split")]
    if m["continuous"]:
        return [issue("FAIL", "mid-speech", "speech energy runs straight through the cut and no transcript word explains it")]
    if m["kept_active"]:
        if fade:
            return [issue("FAIL", "clipped-edge", f"kept audio starts or ends on speech energy: the {round(fade * 1000)} ms fade eats the onset or tail")]
        return [issue("WARN", "click-risk", "kept audio starts or ends on speech energy with no fade: transient click risk")]
    if fade and p < fade:
        return [issue("FAIL", "clipped-edge", f"only {pad_ms} ms of quiet before speech: the {round(fade * 1000)} ms fade overlaps the onset or tail")]
    if p < MIN_PAD:
        return [issue("WARN", "tight-pad", f"{pad_ms} ms of quiet beside speech (want at least {round(MIN_PAD * 1000)} ms)")]
    return []


def find_repeat(before: list[str], after: list[str]) -> tuple[int, int]:
    """(n, offset): the longest run of n words that opens `after` and also closes `before` (offset 0, a doubled word
    or phrase right across the join) or sits up to 4 words earlier in `before` (offset > 0, a restart). (0, 0) if none."""
    best = (0, 0)
    for off in range(0, 5):
        end = len(before) - off
        for n in range(min(end, len(after), 8), 0, -1):
            if n < 2 and off:
                break
            if before[end - n:end] == after[:n]:
                if n > best[0]:
                    best = (n, off)
                break
    return best


def classify_join(pause_before: float, pause_after: float, before: list[str], after: list[str]) -> list[dict]:
    out = []
    total = pause_before + pause_after
    both = pause_before >= PAUSE_SIDE and pause_after >= PAUSE_SIDE
    if both and total >= PAUSE_FAIL:
        out.append(issue("FAIL", "double-pause", f"pause either side of the join adds up to {round(total * 1000)} ms ({round(pause_before * 1000)} + {round(pause_after * 1000)})"))
    elif both and total >= PAUSE_WARN:
        out.append(issue("WARN", "double-pause", f"pause either side of the join adds up to {round(total * 1000)} ms ({round(pause_before * 1000)} + {round(pause_after * 1000)})"))
    elif total >= PAUSE_FAIL:
        out.append(issue("WARN", "long-pause", f"{round(total * 1000)} ms of pause left at the join (dead air the trimmer would cut)"))
    n, off = find_repeat(before, after)
    if n:
        phrase = " ".join(after[:n])
        if n >= 3 or (n == 2 and off == 0):
            out.append(issue("FAIL", "duplicate-phrase", f'"{phrase}" is said on both sides of the join' + (f" ({off} words apart)" if off else "")))
        else:
            out.append(issue("WARN", "doubled-word" if off == 0 else "restart", f'"{phrase}" repeats across the join' + (f" ({off} words apart)" if off else "")))
    for tok, where in ((before[-1] if before else "", "ends"), (after[0] if after else "", "starts")):
        if tok and T.collapse(tok) in T.DEFAULT_FILLERS:
            out.append(issue("WARN", "filler-at-join", f'the kept audio {where} on the filler "{tok}" ("No cut starts or ends on a filler word")'))
    return out


def tokens(words: list[T.Word]) -> list[str]:
    return [w.tok for w in words if w.tok]


def audit_sequences(seqs: list[Sequence], ctx: Ctx, duration: float | None = None) -> list[dict]:
    """One result per cut: every join between pieces, plus the head and tail of each sequence."""
    multi = len(seqs) > 1
    results: list[dict] = []

    def edge_result(t: float, side: str, fade: float) -> dict:
        m = measure_edge(ctx, t, side)
        m["fade_ms"] = round(fade * 1000)
        m["issues"] = classify_edge(m, fade)
        m["verdict"] = verdict_of(m["issues"])
        return m

    for seq in seqs:
        pre = f"{seq.name}/" if multi else ""
        n = len(seq.pieces)
        for k in range(-1, n):
            if k == -1:
                a = seq.pieces[0][0]
                if seq.skip_head or a <= 1e-3:
                    continue
                kind, out_e, in_e = "head", None, (a, seq.fade_head)
                cid = f"{pre}head"
            elif k == n - 1:
                b = seq.pieces[-1][1]
                if seq.skip_tail or (duration is not None and b >= duration - 1e-3):
                    continue
                kind, out_e, in_e = "tail", (b, seq.fade_tail), None
                cid = f"{pre}tail"
            else:
                kind, out_e, in_e = "join", (seq.pieces[k][1], seq.fade), (seq.pieces[k + 1][0], seq.fade)
                named = seq.ids[k] if k < len(seq.ids) else None
                cid = f"{pre}{named or f'j{k + 1:03d}'}"
            res: dict = {"id": cid, "sequence": seq.name, "kind": kind, "piece": max(k, 0)}
            issues: list[dict] = []
            if out_e:
                res["out"] = edge_result(out_e[0], "out", out_e[1])
                issues += [dict(i, edge="out") for i in res["out"]["issues"]]
            if in_e:
                res["in"] = edge_result(in_e[0], "in", in_e[1])
                issues += [dict(i, edge="in") for i in res["in"]["issues"]]
            before_w = ctx.kept_words(seq.pieces[k][0], out_e[0], CONTEXT, tail=True) if out_e else []
            after_w = ctx.kept_words(in_e[0], seq.pieces[k + 1][1] if k + 1 < n else in_e[0] + 5.0) if in_e else []
            res["words_before"] = [w.text for w in before_w]
            res["words_after"] = [w.text for w in after_w]
            if kind == "join":
                pb, pa = res["out"]["kept_pad"], res["in"]["kept_pad"]
                res["join"] = {"pause_before_ms": round(pb * 1000), "pause_after_ms": round(pa * 1000),
                               "pause_total_ms": round((pb + pa) * 1000), "removed_s": round(in_e[0] - out_e[0], 3)}
                jiss = classify_join(pb, pa, tokens(before_w), tokens(after_w))
                issues += [dict(i, edge="join") for i in jiss]
                if in_e[0] > out_e[0]:
                    gone = ctx.kept_words(out_e[0], in_e[0], 12)
                    res["removed_words"] = [w.text for w in gone]
            res["issues"] = issues
            res["verdict"] = verdict_of(issues)
            results.append(res)
    return results


# ---- Nudges ---------------------------------------------------------------------------------------------
def find_nudge(ctx: Ctx, t: float, side: str, rng: float = NUDGE_RANGE) -> float | None:
    """Nearest frame boundary to t, within +-rng, that is quiet on both sides, outside every word box and keeps
    at least MIN_PAD of quiet on the kept side. A candidate may not move across a word the cut was not already
    inside, so the kept words only change when the cut is currently splitting one. None when nothing fits."""
    kd = 1 if side == "in" else -1
    here = {w["word"] for w in ctx.inside(t)}
    steps = int(round(rng / HOP))
    cands = []
    for k in range(-steps, steps + 1):
        tt = t + k * HOP
        i = ctx.env.idx(tt)
        if not (1 <= i < len(ctx.env)) or ctx.act[i] or ctx.act[i - 1]:
            continue
        if ctx.inside(tt) or ctx.pad(tt, kd) < MIN_PAD:
            continue
        lo, hi = min(t, tt), max(t, tt)
        j = bisect.bisect_right(ctx.box_starts, hi)
        if any(b.e > lo and b.s < hi and b.text not in here for b in ctx.boxes[max(0, j - 12):j]):
            continue
        cands.append((abs(k), max(ctx.env.db[i - 1], ctx.env.db[i]), tt))
    return min(cands)[2] if cands else None


def add_nudges(results: list[dict], ctx: Ctx, fade_of: dict[str, float]) -> int:
    """Attach a suggestion to every FAIL edge (and every WARN edge about the cut position). Returns how many."""
    made = 0
    for r in results:
        for side in ("out", "in"):
            e = r.get(side)
            if not e:
                continue
            bad = [i for i in e["issues"] if i["code"] in EDGE_NUDGE_CODES and (i["level"] == "FAIL" or i["level"] == "WARN")]
            if not bad:
                continue
            tt = find_nudge(ctx, e["t"], side)
            if tt is None:
                e["nudge"] = None
                continue
            after = classify_edge(measure_edge(ctx, tt, side), fade_of[f"{r['id']}:{side}"])
            e["nudge"] = {"to": round(tt, 4), "delta_ms": round((tt - e["t"]) * 1000), "verdict_after": verdict_of(after)}
            made += 1
    return made


def apply_to_pieces(seqs: list[Sequence], results: list[dict]) -> list[Sequence]:
    """Copies of the sequences with every suggested nudge applied (for the adjusted EDL only)."""
    out = [Sequence(s.name, [list(p) for p in s.pieces], s.fade, s.fade_head, s.fade_tail, list(s.ids), s.skip_head, s.skip_tail)
           for s in seqs]
    by_name = {s.name: s for s in out}
    for r in results:
        s = by_name[r["sequence"]]
        k = r["piece"]
        for side in ("out", "in"):
            nd = (r.get(side) or {}).get("nudge")
            if not nd:
                continue
            if side == "out":
                s.pieces[k][1] = nd["to"]
            else:
                idx = k + 1 if r["kind"] == "join" else 0
                s.pieces[idx][0] = nd["to"]
    return out


def adjusted_edl(raw, fmt: str, seqs: list[Sequence], adj: list[Sequence], version: str, count: int):
    """The suggested edit list. For a trim EDL: the same file with keep[] and cuts[] moved. Otherwise a generic
    sequences file the `keeps` adapter reads back."""
    note = {"applied": False, "source": "cut-audit.json", "nudges": count,
            "note": "suggestion only: review each nudge, nothing was rendered or applied"}
    if fmt == "trim":
        edl = json.loads(json.dumps(raw))
        pieces = adj[0].pieces
        pos = 0.0
        for k, p in enumerate(pieces):
            edl["keep"][k].update({"start": round(p[0], 4), "end": round(p[1], 4), "out_start": round(pos, 4)})
            pos += p[1] - p[0]
        for k, c in enumerate(edl.get("cuts", [])):
            if k + 1 < len(pieces):
                c["start"], c["end"] = round(pieces[k][1], 4), round(pieces[k + 1][0], 4)
                c["duration"] = round(c["end"] - c["start"], 4)
                c["out_at"] = round(edl["keep"][k + 1]["out_start"], 4)
        edl["version"] = f"{raw.get('version', 'v1')}-nudged"
        edl["totals"]["output_duration"] = round(pos, 4)
        edl["render"] = None
        edl["cutaudit"] = note
        return edl
    return {"schema": NUDGED_SCHEMA, "source_format": fmt, "version": version, "cutaudit": note,
            "sequences": [{"name": s.name, "pieces": [[round(a, 4), round(b, 4)] for a, b in s.pieces],
                           "fade_head": s.fade_head, "fade_tail": s.fade_tail} for s in adj]}


# ---- Waveform PNG (Pillow is optional) -------------------------------------------------------------------
def render_png(path: Path, ctx: Ctx, edge: dict, title: str, half: float = 0.45) -> bool:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return False
    t, kd = edge["t"], (1 if edge["side"] == "in" else -1)
    W, H, ML, MT, MB = 960, 340, 12, 26, 28
    x0, x1 = ML, W - ML
    a, b = t - half, t + half
    env = ctx.env

    def X(tt):
        return x0 + (tt - a) / (b - a) * (x1 - x0)

    lo, hi = min(ctx.floor_db, ctx.quiet_db) - 6, edge["local_speech_db"] + 4
    plot_top, plot_bot = 64, H - MB

    def Y(db):
        return plot_bot - max(0.0, min(1.0, (db - lo) / (hi - lo))) * (plot_bot - plot_top)

    img = Image.new("RGB", (W, H), (250, 250, 250))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=12)
    except TypeError:
        font = ImageFont.load_default()
    removed = (X(a), X(t)) if kd > 0 else (X(t), X(b))
    d.rectangle([removed[0], plot_top, removed[1], plot_bot], fill=(236, 226, 226))
    kept = (X(t), X(t) + FADE / (b - a) * (x1 - x0)) if kd > 0 else (X(t) - FADE / (b - a) * (x1 - x0), X(t))
    d.rectangle([kept[0], plot_top, kept[1], plot_bot], fill=(255, 240, 190))
    i0, i1 = max(0, env.idx(a)), min(len(env), env.idx(b) + 1)
    for k in range(i0, i1):
        xa, xb = X(env.t(k)), X(env.t(k + 1))
        col = (70, 110, 200) if ctx.act[k] else (170, 180, 195)
        d.rectangle([xa, Y(env.db[k]), max(xa + 1, xb - 1), plot_bot], fill=col)
    yq = Y(ctx.quiet_db)
    for x in range(int(x0), int(x1), 8):
        d.line([x, yq, x + 4, yq], fill=(200, 120, 40))
    d.text((x0 + 2, yq - 14), f"quiet {ctx.quiet_db:.0f} dB", fill=(200, 120, 40), font=font)
    for bx in ctx.boxes:
        if bx.e < a or bx.s > b:
            continue
        d.rectangle([X(max(bx.s, a)), 34, X(min(bx.e, b)), 58], outline=(30, 120, 60), fill=(220, 240, 225))
        d.text((X(max(bx.s, a)) + 3, 38), bx.text, fill=(20, 80, 40), font=font)
    d.line([X(t), 28, X(t), plot_bot], fill=(210, 30, 30), width=2)
    nd = edge.get("nudge")
    if nd:
        d.line([X(nd["to"]), 28, X(nd["to"]), plot_bot], fill=(20, 150, 60), width=2)
        d.text((X(nd["to"]) + 4, plot_bot - 16), f"nudge {nd['delta_ms']:+d} ms", fill=(20, 150, 60), font=font)
    for ms in range(-int(half * 1000), int(half * 1000) + 1, 100):
        xx = X(t + ms / 1000)
        d.line([xx, plot_bot, xx, plot_bot + 4], fill=(90, 90, 90))
        d.text((xx - 12, plot_bot + 8), f"{ms:+d}", fill=(90, 90, 90), font=font)
    d.text((x0 + 2, 6), title, fill=(30, 30, 30), font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return True


# ---- Report ----------------------------------------------------------------------------------------------
def summarize(results: list[dict]) -> dict:
    c = {"PASS": 0, "WARN": 0, "FAIL": 0}
    for r in results:
        c[r["verdict"]] += 1
    codes: dict[str, int] = {}
    for r in results:
        for i in r["issues"]:
            if i["level"] != "PASS":
                codes[f"{i['level']} {i['code']}"] = codes.get(f"{i['level']} {i['code']}", 0) + 1
    return {"cuts": len(results), **{k.lower(): v for k, v in c.items()}, "by_issue": dict(sorted(codes.items()))}


def summary_line(s: dict) -> str:
    return f"Cut audit: {s['cuts']} cuts: {s['pass']} PASS, {s['warn']} WARN, {s['fail']} FAIL"


def ms(x: float) -> str:
    return f"{round(x * 1000)} ms"


def md_cell(text: str) -> str:
    return text.replace("|", "/").replace("\n", " ")


def edge_line(e: dict) -> str:
    s = (f"{e['side']} edge {T.tc(e['t'])}: kept pad {ms(e['kept_pad'])}, removed-side pad {ms(e['removed_pad'])}, "
         f"kept +-30 ms peak {e['kept_db']} dB ({e['rel_db']:+.1f} dB vs local speech {e['local_speech_db']} dB), "
         f"fade {e['fade_ms']} ms")
    if e["inside"]:
        w = e["inside"][0]
        s += f', inside "{w["word"]}" ({w["in_ms"]} ms in)'
    return s


def build_report(meta: dict, results: list[dict], summ: dict, pngs: dict[str, str]) -> str:
    L = [f"# Cut audit", "", f"**{summary_line(summ)}**", ""]
    L += [f"- cuts: `{meta['cuts_file']}` ({meta['format']}), transcript `{meta['transcript_file']}` ({meta['words']} words), media `{meta['media_file']}`",
          f"- thresholds: quiet {meta['quiet_db']:.1f} dB (room floor {meta['floor_db']:.1f} dB, speech level {meta['speech_db']:.1f} dB); "
          f"fade {round(FADE * 1000)} ms; quiet pad at least {round(MIN_PAD * 1000)} ms; word tolerance {round(meta['tolerance'] * 1000)} ms",
          "- The transcript is a hint: word boxes come from the waveform, because whisper stretches word ends over the pause after them.",
          "- Verified by measurement only; nobody has listened to these cuts.", ""]
    if summ["by_issue"]:
        L += ["Findings: " + ", ".join(f"{v} x {k}" for k, v in summ["by_issue"].items()), ""]
    L += ["## Every cut", "", "| Cut | At | Verdict | Measured | Words around | Findings |", "|---|---|---|---|---|---|"]
    for r in results:
        at = T.tc((r.get("out") or r["in"])["t"])
        meas = []
        if "out" in r:
            meas.append(f"out pad {ms(r['out']['kept_pad'])}")
        if "in" in r:
            meas.append(f"in pad {ms(r['in']['kept_pad'])}")
        if "join" in r:
            meas.append(f"pause {r['join']['pause_total_ms']} ms")
        around = f"{' '.join(r['words_before'][-4:])} || {' '.join(r['words_after'][:4])}"
        found = "; ".join(f"{i['code']}" for i in r["issues"]) or "-"
        L.append(f"| {r['id']} | {at} | {r['verdict']} | {', '.join(meas)} | {md_cell(around)} | {found} |")
    bad = [r for r in results if r["verdict"] != "PASS"]
    if bad:
        L += ["", "## Warnings and failures", ""]
    for r in bad:
        L.append(f"### {r['id']} {r['verdict']} at {T.tc((r.get('out') or r['in'])['t'])}")
        L.append("")
        L.append(f"Words: {' '.join(r['words_before'])} || {' '.join(r['words_after'])}")
        if r.get("removed_words"):
            L.append(f"Removed between: {' '.join(r['removed_words'])}")
        L.append("")
        for i in r["issues"]:
            L.append(f"- **{i['level']} {i['code']}** ({i['edge']}): {i['detail']}")
        for side in ("out", "in"):
            if side in r:
                L.append(f"- {edge_line(r[side])}")
                nd = r[side].get("nudge", "n/a")
                if nd not in ("n/a",) and r[side]["issues"]:
                    if nd:
                        L.append(f"  - suggested nudge: {T.tc(r[side]['t'])} -> {T.tc(nd['to'])} ({nd['delta_ms']:+d} ms), re-check {nd['verdict_after']}")
                    else:
                        L.append(f"  - no quiet frame outside every word within +-{round(NUDGE_RANGE * 1000)} ms: a person decides")
                if f"{r['id']}:{side}" in pngs:
                    L.append(f"  - waveform: `{pngs[f'{r['id']}:{side}']}`")
        L.append("")
    nudged = sum(1 for r in results for s in ("out", "in") if (r.get(s) or {}).get("nudge"))
    L += ["## Nudges", "", f"{nudged} suggested; written to the adjusted EDL, which is **not applied** by this script. "
          "Review each, apply by hand or re-run the trimmer, then audit again.", ""]
    return "\n".join(L)


# ---- CLI ---------------------------------------------------------------------------------------------------
def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cuts", type=Path, help="cut list: trim.py EDL, chapters.json, short.json, or keep ranges")
    ap.add_argument("transcript", type=Path, help="whisper word-timing JSON (see shorts/align.py)")
    ap.add_argument("media", type=Path, help="the source audio or video the cuts refer to")
    ap.add_argument("--format", choices=["auto", "trim", "chapters", "short", "keeps"], default="auto")
    ap.add_argument("--chapter", help="chapters format: audit only this chapter id")
    ap.add_argument("--clip-time", action="store_true",
                    help="short format: the transcript is stamped on the Short's own audio (align.py), map it to source time")
    ap.add_argument("--out", type=Path, help="output folder (default with --episode: <episode>/out/cutaudit)")
    ap.add_argument("--episode", help="episode folder or id")
    ap.add_argument("--overwrite", action="store_true", help="replace existing audit files (never media)")
    ap.add_argument("--png", choices=["fail", "warn", "none"], default="fail", help="waveform PNGs for edges with this level or worse")
    ap.add_argument("--tolerance", type=float, default=TOLERANCE, help="s, word-edge tolerance")
    ap.add_argument("--noise", default="auto", help="quiet threshold in dB or auto (room floor + 12 dB, -45..-32)")
    ap.add_argument("--fail-on", choices=["fail", "warn"], default="fail", help="exit 1 on FAIL (default) or on WARN too")
    ap.add_argument("--ffmpeg")
    ap.add_argument("--ffprobe")
    return ap.parse_args(argv)


def main(argv=None) -> int:
    a = parse_args(argv)
    ff, fp = C.find_bin("ffmpeg", a.ffmpeg), C.find_bin("ffprobe", a.ffprobe)
    for p in (a.cuts, a.transcript, a.media):
        if not p.exists():
            C.die(f"{p} not found")
    try:
        raw = json.loads(a.cuts.read_text())
        fmt = detect_format(raw) if a.format == "auto" else a.format
        seqs = load_sequences(raw, fmt, a.chapter)
        words = T.parse_transcript(json.loads(a.transcript.read_text()))
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
        C.die(f"input error: {e}")
    if a.clip_time:
        if fmt != "short":
            C.die("--clip-time needs a short.json cut list")
        words = clip_words_to_source(words, raw["segs"])
    source = a.media.resolve()
    info = T.probe(source, fp)
    if fmt == "trim" and raw.get("source", {}).get("size") not in (None, source.stat().st_size):
        print("warning: the EDL was made from a different file size than this media", file=sys.stderr)

    out_dir = a.out
    if a.episode:
        import workspace
        ep = Path(a.episode)
        ep = ep if ep.is_dir() else workspace.episode_dir(a.episode)
        out_dir = out_dir or ep / "out" / "cutaudit"
    if not out_dir:
        C.die("give --out DIR or --episode")
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {n: T.claim(out_dir / n, source, a.overwrite) for n in ("cut-audit.json", "cut-audit.md", "cut-audit.nudged.edl.json")}

    edges = [t for s in seqs for p in s.pieces for t in p]
    start = max(0.0, min(edges) - 5.0)
    end = min(info["duration"], max(edges) + 5.0)
    env = T.read_envelope(ff, source, start, end - start)
    quiet = T.auto_threshold(env) if a.noise == "auto" else float(a.noise)
    ctx = Ctx(env, quiet, words, a.tolerance)
    results = audit_sequences(seqs, ctx, info["duration"])
    fade_of = {}
    for r in results:
        for side in ("out", "in"):
            if side in r:
                fade_of[f"{r['id']}:{side}"] = r[side]["fade_ms"] / 1000
    nudges = add_nudges(results, ctx, fade_of)
    summ = summarize(results)

    pngs: dict[str, str] = {}
    if a.png != "none":
        want = {"FAIL"} if a.png == "fail" else {"FAIL", "WARN"}
        warned = False
        for r in results:
            for side in ("out", "in"):
                e = r.get(side)
                if e and e["verdict"] in want:
                    name = f"png/{r['id'].replace('/', '_')}-{side}.png"
                    if render_png(out_dir / name, ctx, e, f"{r['id']} {side} edge {T.tc(e['t'])} {e['verdict']}"):
                        pngs[f"{r['id']}:{side}"] = name
                        e["png"] = name
                    elif not warned:
                        print("note: Pillow is not installed for this python; waveform PNGs skipped", file=sys.stderr)
                        warned = True

    meta = {"cuts_file": a.cuts.name, "format": fmt, "transcript_file": a.transcript.name, "words": len(words),
            "media_file": source.name, "quiet_db": quiet, "floor_db": ctx.floor_db, "speech_db": ctx.speech_db,
            "tolerance": a.tolerance}
    doc = {
        "schema": SCHEMA, "tool": {"name": "audit.py", "version": TOOL_VERSION},
        "input": {"cuts": a.cuts.name, "format": fmt, "cuts_sha256": hashlib.sha256(a.cuts.read_bytes()).hexdigest()[:16],
                  "transcript": a.transcript.name, "words": len(words), "clip_time": a.clip_time},
        "media": {"file": source.name, "duration": round(info["duration"], 3)},
        "params": {"quiet_db": round(quiet, 1), "floor_db": round(ctx.floor_db, 1), "speech_db": round(ctx.speech_db, 1),
                   "fade_s": FADE, "min_pad_s": MIN_PAD, "tolerance_s": a.tolerance, "window_s": WINDOW,
                   "pause_warn_s": PAUSE_WARN, "pause_fail_s": PAUSE_FAIL, "nudge_range_s": NUDGE_RANGE},
        "summary": summ, "cuts": results,
    }
    paths["cut-audit.json"].write_text(json.dumps(doc, indent=2) + "\n")
    paths["cut-audit.md"].write_text(build_report(meta, results, summ, pngs))
    adj = apply_to_pieces(seqs, results)
    paths["cut-audit.nudged.edl.json"].write_text(
        json.dumps(adjusted_edl(raw, fmt, seqs, adj, "v1", nudges), indent=2) + "\n")
    print(summary_line(summ))
    print(f"report: {paths['cut-audit.md']}")
    worst = summ["fail"] or (a.fail_on == "warn" and summ["warn"])
    return 1 if worst else 0


if __name__ == "__main__":
    sys.exit(main())
