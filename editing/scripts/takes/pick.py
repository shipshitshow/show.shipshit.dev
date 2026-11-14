#!/usr/bin/env python3
"""Transcript take-picker: rank candidate Shorts ("takes") in an episode transcript.

Reads the transcript of the cam recording (word-level JSON, whisper.cpp `-oj` output, or the speaker-labelled
`[MM:SS] S1: text` clean transcript), finds self-contained 20 to 90 s windows that start and end on sentence
boundaries, scores each one with the `clips` rubric (deterministic heuristics, no network), and writes a ranked
JSON. Every candidate carries a `short` fragment (`source` + `segs`) that can be pasted into a Short's `short.json`
for editing/scripts/shorts/.

  pick.py <episode> [--transcript FILE] [--turns FILE] [--speakers S1=vincent,S2=mitchell]
                    [--silence | --silences FILE] [--top 10] [--out FILE] [--exclude 0:00-1:30]
                    [--judge-cmd CMD]            # optional LLM judge, off unless given (see README)

<episode> is the episode folder (projects/<YYYY-MM-DD>_<YYMMDD>) or its id (<YYMMDD>). The picker only reads text
(and, with --silence, the recording's audio via ffmpeg); it never renders video and never uploads anything.
Details: editing/scripts/takes/README.md.
"""
from __future__ import annotations

import argparse
import bisect
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import workspace  # noqa: E402  (shared content-root and episode lookup)

VERSION = 1  # bump when the scoring recipe changes

# --- Rules and weights -------------------------------------------------------------------------------------
# Length: the rulebook (vault brand/editing.md, 14 Nov 2026) allows 45 to 90 s; the `clips` skill says prefer the
# shortest cut that keeps the take. Hard window 20 to 90 s, full length score inside 25 to 60 s.
MIN_LEN, MAX_LEN = 20.0, 90.0
IDEAL_MIN, IDEAL_MAX = 25.0, 60.0
MIN_WORDS = 40                 # a window shorter than this is a quip, not a take
BACKCHANNEL_WORDS = 4          # another speaker's sentence this short ("Yeah.", "Exactly.") is cut out of the Short
SENT_GAP_S = 0.7               # a pause this long inside a long run of words ends the sentence
SENT_SPLIT_WORDS = 25          # ...once the run has this many words
SPEECH_WPS = 2.7               # words per second used to estimate timing from turn-level transcripts
WEIGHTS = {"hook": 20, "opinion": 22, "specificity": 14, "self_contained": 14,
           "cleanliness": 10, "ending": 10, "length": 10}
PENALTIES = {"soft_meta": 6, "walkthrough": 5, "bait": 10}  # points per hit; soft_meta/walkthrough capped at 3 hits
OVERLAP_MAX = 0.2              # two picks may share at most this fraction of the shorter one

RUBRIC = (
    "Score each candidate Short 0 to 100 for a stranger scrolling a feed. Reward: a radical, quotable take or "
    "founder lesson stated in the first two seconds; a first line that makes sense with no context (never starts on "
    "and/but/because/so/it/this/that); one concrete noun or number; a complete mini-arc; a clean ending. Penalise: "
    "context setup, greetings, inside jokes, product walkthroughs or compliments, news summary without an operator "
    "take, filler-heavy rambling, engagement bait, and a cut that ends mid-thought.")

# --- Lexicons (lowercase; matched on normalised text) ------------------------------------------------------
OPINION = [  # (weight, regex): strong opinion, verdicts, contrarian markers
    (1.0, r"\b(dead|never|nobody|no one|everyone|everybody|always|nothing|worst|best|biggest|insane|stupid|wrong|"
          r"lie|lies|scam|overrated|underrated|useless|pointless|obsolete|doomed|broken|garbage|trash|bullshit|"
          r"crap|ridiculous|terrible|awful|impossible|obvious|zero|only)\b"),
    (0.6, r"\b(i think|i believe|i don't think|i do not think|honestly|the truth is|the reality is|the problem is|"
          r"the thing is|here's the thing|unpopular|hot take|my take|in my opinion|i bet|i'm convinced|i guarantee|"
          r"the fact is|to be honest|frankly|i'm sure|for me)\b"),
    (1.5, r"\b(is|are|was|were) (dead|over|finished|done|a (lie|scam|joke|myth|trap|waste)|going to (die|replace|kill|win|lose)|"
          r"not (going|gonna) to)\b|\bwill (replace|kill|die|win|lose|never|all)\b|\bis the (new|real|only)\b"),
    (1.0, r"\b(actually|instead|the opposite|stop (doing|using|paying|building|pretending|worrying|wasting)|"
          r"you (should|shouldn't|must|need to|don't need|do not need)|don't need|doesn't matter|nobody cares|no one cares|"
          r"who cares|not the problem|the real (problem|reason|issue|question|skill)|the only way|too (late|slow|expensive|cheap))\b"),
]
OPINION_RE = [(w, re.compile(p)) for w, p in OPINION]
NUMBER_RE = re.compile(r"(?<![\w.])(\$?\d[\d,]*(?:\.\d+)?)(?:\s?(%|k\b|x\b|percent\b|million\b|billion\b|thousand\b))?|\b(million|billion|thousand|hundred|percent)\b")
CONCRETE_RE = re.compile(r"\b(bill|invoice|benchmark|repo|monorepo|tokens?|npm|api|agents?|prompts?|subscription|revenue|customers?|"
                         r"views|impressions|followers|price|pricing|costs?|dollars?|bucks|hours?|weeks?|months?|"
                         r"pull requests?|plugins?|framework)\b")
NOT_PROPER = {"i", "i'm", "i'll", "i've", "i'd", "ok", "okay", "yeah", "mitchell", "vincent"}
HARD_META = re.compile(r"\b(welcome back|welcome to|subscribe|like and share|bye bye|bye\b|see you (next|at|in)|"
                       r"thank you (so much )?for (watching|joining))\b")
SOFT_META = re.compile(r"\b(the chat|in the chat|live ?stream|this week|today we|next week|on the stream|on the show|"
                       r"our guest|last week|in the stream)\b")
DEICTIC = re.compile(r"\b(like you said|as (i|we) (said|mentioned)|as you (said|mentioned)|going back to|we were talking|"
                     r"we talked about|you mentioned|that thing|earlier|the one you)\b")
WALKTHROUGH = re.compile(r"\b(screen ?share|share my screen|let me (show|share|open|click)|as you can see|click (on|the)|"
                         r"step (one|two|three|1|2|3)|walk ?through|settings|dashboard|menu|tab)\b")
BAIT = re.compile(r"\b(do you agree|agree\?|what do you think|let (us|me) know|comment (below|if)|drop a comment|"
                  r"smash (that|the)|hit (the )?(like|subscribe))")
HEDGE_START = re.compile(r"^(i don't know|i do not know|i guess|maybe|i'm not sure|i am not sure|probably|not sure|"
                         r"i don't think i|um|uh)\b")
CHATTER = {"okay", "ok", "cool", "nice", "yeah", "yes", "no", "right", "exactly", "fair enough", "oh", "wow", "thanks",
           "thank you", "sure", "alright", "good", "great", "perfect", "fuck", "shit", "hmm", "true", "wait", "so"}
FILLER_RE = re.compile(r"\b(um|uh|uhm|uh-huh|hmm|you know|i mean|kind of|sort of|basically)\b")
LEAD_TRIM = {"and", "but", "so", "yeah", "yes", "okay", "ok", "well", "like", "um", "uh", "anyway"}
LEAD_TRIM_PAIRS = {("i", "mean"), ("you", "know")}
FAIL_START = {"and", "but", "because", "cause", "'cause", "so", "which", "then", "also", "anyway", "plus", "or",
              "although", "though", "however", "it", "it's", "its", "this", "that", "that's", "these", "those",
              "they", "they're", "he", "she", "him", "her", "them", "he's", "she's"}
CONTINUATION = {"and", "but", "because", "cause", "so", "which", "or", "plus", "then", "also"}
ABBREV = {"mr.", "mrs.", "dr.", "vs.", "e.g.", "i.e.", "etc.", "inc.", "st."}
SPECIAL_TOKEN = re.compile(r"^[\[(].*[\])]$")  # [_BEG_], [BLANK_AUDIO], (music)


def die(msg: str) -> None:
    sys.exit(f"error: {msg}")


# --- Time helpers ------------------------------------------------------------------------------------------
def parse_time(value: str) -> float:
    """Seconds, MM:SS or H:MM:SS."""
    parts = str(value).strip().split(":")
    try:
        nums = [float(p) for p in parts]
    except ValueError:
        raise ValueError(f"bad time {value!r}")
    secs = 0.0
    for n in nums:
        secs = secs * 60 + n
    return secs


def fmt_time(t: float) -> str:
    t = max(0.0, t)
    h, rem = divmod(int(t), 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


# --- Transcript loading ------------------------------------------------------------------------------------
TURN_RE = re.compile(r"^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\s*([^:\[\]]{1,24}):\s*(.*)$")


def norm(token: str) -> str:
    return re.sub(r"[^\w']", "", token.lower())


def spread(tokens: list[str], a: float, b: float) -> list[tuple[float, float, str]]:
    """Distribute tokens over [a, b] in proportion to their length (timing estimated, not measured)."""
    weights = [len(t) + 1 for t in tokens]
    total = float(sum(weights)) or 1.0
    out, t = [], a
    for tok, w in zip(tokens, weights):
        nxt = t + (b - a) * w / total
        out.append((t, nxt, tok))
        t = nxt
    return out


def parse_turns(text: str) -> list[dict]:
    """Speaker-labelled clean transcript -> [{start, spk, text}]; continuation lines join the previous turn."""
    turns: list[dict] = []
    for line in text.splitlines():
        line = line.rstrip()
        if not line.strip():
            continue
        m = TURN_RE.match(line)
        if m:
            h, mi, s, spk, body = m.groups()
            turns.append({"start": int(h or 0) * 3600 + int(mi) * 60 + int(s), "spk": spk.strip(), "text": body.strip()})
        elif turns:
            turns[-1]["text"] += " " + line.strip()
        else:
            die("transcript does not start with a [MM:SS] SPEAKER: turn")
    return turns


def words_from_turns(turns: list[dict]) -> list[dict]:
    """Timing is estimated: turn starts are known to the second, words are spread at a normal speaking rate."""
    out = []
    for i, turn in enumerate(turns):
        toks = turn["text"].split()
        if not toks:
            continue
        start = float(turn["start"])
        nxt = float(turns[i + 1]["start"]) if i + 1 < len(turns) else start + len(toks) / SPEECH_WPS
        speech = len(toks) / SPEECH_WPS + 0.2
        end = start + min(speech, nxt - start) if nxt > start else start + speech
        for a, b, tok in spread(toks, start, end):
            out.append({"s": a, "e": b, "t": tok, "spk": turn["spk"]})
    return out


def _word_item(item) -> dict | None:
    if isinstance(item, dict):
        text = item.get("w", item.get("word", item.get("text")))
        s = item.get("s", item.get("start"))
        e = item.get("e", item.get("end", item.get("stop")))
        spk = item.get("spk", item.get("speaker"))
    elif isinstance(item, (list, tuple)) and len(item) >= 3 and all(isinstance(x, (int, float)) for x in item[:2]):
        s, e, text = item[0], item[1], item[2]
        spk = item[3] if len(item) > 3 else None
    else:
        return None
    if text is None or s is None or e is None:
        return None
    text = str(text).strip()
    if not text or SPECIAL_TOKEN.match(text):
        return None
    return {"s": float(s), "e": float(e), "t": text, "spk": spk}


def load_words(path: Path) -> tuple[list[dict], str]:
    """Returns (words, timing). timing is "word" (measured) or "estimated" (turn or segment level)."""
    suffix = path.suffix.lower()
    text = path.read_text()
    if suffix == ".json":
        data = json.loads(text)
        if isinstance(data, dict) and "transcription" in data:  # whisper.cpp -oj
            rows, timing = [], "word"
            for seg in data["transcription"]:
                tok = seg.get("text", "").strip()
                if not tok or SPECIAL_TOKEN.match(tok):
                    continue
                a, b = seg["offsets"]["from"] / 1000, seg["offsets"]["to"] / 1000
                parts = tok.split()
                if len(parts) > 1:  # a segment, not a word (whisper run without -ml 1)
                    timing = "estimated"
                    rows += [{"s": x, "e": y, "t": t, "spk": None} for x, y, t in spread(parts, a, b)]
                else:
                    rows.append({"s": a, "e": b, "t": tok, "spk": None})
            return rows, timing
        if isinstance(data, dict):
            data = data.get("words", [])
        rows = [w for w in (_word_item(x) for x in data) if w]
        if not rows:
            die(f"{path}: no words found (expected whisper.cpp -oj output or a list of {{w, s, e}})")
        return rows, "word"
    turns = parse_turns(text)
    return words_from_turns(turns), "estimated"


def label_speakers(words: list[dict], turns: list[dict]) -> None:
    """Give word-level words the speaker of the turn they fall in (turn starts are accurate to a second)."""
    starts = [t["start"] - 0.6 for t in turns]
    for w in words:
        i = bisect.bisect_right(starts, w["s"]) - 1
        if i >= 0:
            w["spk"] = turns[i]["spk"]


# --- Sentences ---------------------------------------------------------------------------------------------
def ends_sentence(token: str) -> bool:
    t = token.rstrip("\"')]”’")
    return bool(re.search(r"[.?!]$|…$", t)) and t.lower() not in ABBREV


def split_sentences(words: list[dict]) -> list[dict]:
    sents, cur = [], []
    for k, w in enumerate(words):
        cur.append(w)
        nxt = words[k + 1] if k + 1 < len(words) else None
        end = ends_sentence(w["t"]) or nxt is None
        if nxt is not None and not end:
            gap = nxt["s"] - w["e"]
            if nxt.get("spk") != w.get("spk"):
                end = True
            elif gap >= SENT_GAP_S and len(cur) >= SENT_SPLIT_WORDS:
                end = True
            elif gap >= 1.5:
                end = True
        if end:
            sents.append(make_sentence(cur))
            cur = []
    return sents


def make_sentence(words: list[dict]) -> dict:
    counts: dict = {}
    for w in words:
        spk = w.get("spk")
        counts[spk] = counts.get(spk, 0) + 1
    spk = max(counts, key=lambda k: (counts[k], str(k)))
    sent = {"words": words, "s": words[0]["s"], "e": words[-1]["e"], "spk": spk, "n": len(words),
            "text": " ".join(w["t"] for w in words)}
    sent["f"] = sentence_features(sent)
    return sent


def hits(regex: re.Pattern, text: str) -> list[str]:
    return [m.group(0) for m in regex.finditer(text)]


def sentence_features(sent: dict) -> dict:
    text = sent["text"]
    low = " ".join(norm_keep(w["t"]) for w in sent["words"])
    op_raw, op_hits = 0.0, []
    for weight, rx in OPINION_RE:
        for h in hits(rx, low):
            op_raw += weight
            op_hits.append(h)
    nums = [m.group(0).strip() for m in NUMBER_RE.finditer(low) if m.group(0).strip()]
    concrete = hits(CONCRETE_RE, low)
    proper = []
    for k, w in enumerate(sent["words"]):
        tok = re.sub(r"[^\w']", "", w["t"])
        if k > 0 and tok[:1].isupper() and tok.lower() not in NOT_PROPER and len(tok) > 1:
            proper.append(tok)
        elif k > 0 and tok == "X":
            proper.append(tok)
    fillers = len(FILLER_RE.findall(low))
    fillers += sum(1 for w in sent["words"] if norm(w["t"]) == "like" and w["t"].rstrip().endswith(","))
    fillers += sum(1 for w in sent["words"][1:-1] if norm(w["t"]) in ("yeah", "right") and w["t"].rstrip().endswith(","))
    toks = [norm(w["t"]) for w in sent["words"]]
    stutters = sum(1 for a, b in zip(toks, toks[1:]) if a and a == b and len(a) <= 5)
    return {
        "op_raw": op_raw, "op_hits": op_hits, "nums": nums, "concrete": concrete, "proper": proper,
        "fillers": fillers, "stutters": stutters, "hard_meta": hits(HARD_META, low), "soft_meta": hits(SOFT_META, low),
        "deictic": hits(DEICTIC, low), "walkthrough": hits(WALKTHROUGH, low), "bait": hits(BAIT, low),
        "question": text.rstrip().endswith("?"),
    }


def norm_keep(token: str) -> str:
    """Lowercase, keep apostrophes, drop other punctuation except a trailing '?' (agree? is a bait pattern)."""
    t = re.sub(r"[^\w'?$%.]", "", token.lower())
    t = re.sub(r"\.+$", "", t)
    return t


# --- First-line test and cleanliness ----------------------------------------------------------------------
def trim_lead(words: list[dict]) -> int:
    """Index of the first word kept: leading fillers and connectives are cut (never words added)."""
    k = 0
    while k < len(words) - 3:
        a = norm(words[k]["t"])
        b = norm(words[k + 1]["t"]) if k + 1 < len(words) else ""
        if (a, b) in LEAD_TRIM_PAIRS:
            k += 2
        elif a in LEAD_TRIM:
            k += 1
        else:
            break
    return k


def first_line_test(words: list[dict]) -> tuple[bool, str]:
    """The `clips` first-line test on the (trimmed) first sentence. Returns (pass, why)."""
    if len(words) < 4:
        return False, "first line is a reaction (under 4 words)"
    first = norm(words[0]["t"])
    if first in FAIL_START:
        return False, f"first line starts on '{first}' (needs context)"
    return True, "first line stands alone"


# --- Silences, snapping -----------------------------------------------------------------------------------
def detect_silences(media: Path, ffmpeg: str, noise: str = "-32dB", min_s: float = 0.2) -> list[tuple[float, float]]:
    """Pauses in the recording's audio (same detector as shorts/align.py, wider minimum)."""
    r = subprocess.run([ffmpeg, "-hide_banner", "-nostats", "-vn", "-i", str(media), "-af",
                        f"silencedetect=noise={noise}:d={min_s}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[0-9.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r.stderr)]
    return [(max(0.0, s), e) for s, e in zip(starts, ends)]


def snap_start(t0: float, prev_end: float | None, silences: list[tuple[float, float]]) -> float:
    """Start of the cut: inside the pause before the first word, about 0.12 s ahead of it."""
    lo = prev_end if prev_end is not None else 0.0
    for s, e in silences:
        if s <= t0 + 0.05 and e >= t0 - 0.6 and e - s >= 0.2:
            return round(max(s, lo, min(t0, e) - 0.12), 3)
    return round(max(lo + (t0 - lo) * 0.5 if t0 - lo < 0.24 else t0 - 0.12, 0.0), 3)


def snap_end(t1: float, next_start: float | None, silences: list[tuple[float, float]]) -> tuple[float, float]:
    """End of the cut inside the pause after the last word. Returns (end, pause_after)."""
    hi = next_start if next_start is not None else t1 + 1.0
    for s, e in silences:
        if t1 - 0.4 <= s <= t1 + 0.5 and e - s >= 0.2:
            b = min(e, hi, max(t1, s) + min(0.35, (e - s) * 0.6))
            return round(b, 3), round(e - s, 3)
    gap = max(0.0, hi - t1)
    return round(min(t1 + 0.15, t1 + gap * 0.5 if gap < 0.3 else t1 + 0.15), 3), round(gap, 3)


# --- Scoring ----------------------------------------------------------------------------------------------
def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def sentence_quote_score(s: dict) -> float:
    f = s["f"]
    if not 5 <= s["n"] <= 32:
        return 0.0
    return f["op_raw"] * 1.0 + 0.8 * len(f["nums"]) + 0.4 * len(f["proper"]) + 0.3 * len(f["concrete"]) - 0.5 * f["fillers"] - 0.5 * f["stutters"]


def build_window(sents: list[dict], i: int, j: int, args: dict) -> dict | None:
    """Candidate window over sentences i..j (inclusive), or None when it is not a valid Short."""
    span = sents[i:j + 1]
    counts: dict = {}
    for s in span:
        counts[s["spk"]] = counts.get(s["spk"], 0) + s["n"]
    dom = max(counts, key=lambda k: (counts[k], str(k)))
    kept = [s for s in span if s["spk"] == dom or s["n"] > BACKCHANNEL_WORDS]
    if kept[0] is not span[0] or kept[-1] is not span[-1]:
        return None  # starts or ends on a back-channel: a different window covers it
    k0 = trim_lead(span[0]["words"])
    first_words = span[0]["words"][k0:]
    if len(first_words) < 3:
        return None
    n_words = sum(s["n"] for s in kept) - k0
    return {"i": i, "j": j, "kept": kept, "dom": dom, "k0": k0, "first_words": first_words, "n_words": n_words}


def score_window(w: dict, sents: list[dict], args: dict) -> dict | None:
    kept, first_words, k0 = w["kept"], w["first_words"], w["k0"]
    n = max(1, w["n_words"])
    feat = {key: [] for key in ("op_hits", "nums", "concrete", "proper", "hard_meta", "soft_meta", "deictic", "walkthrough", "bait")}
    op_raw = fillers = stutters = 0.0
    for s in kept:
        f = s["f"]
        for key in feat:
            feat[key] += f[key]
        op_raw += f["op_raw"]
        fillers += f["fillers"]
        stutters += f["stutters"]
    if feat["hard_meta"]:
        return None  # greetings, subscribe asks and goodbyes are never a Short
    span_s = kept[0]["words"][k0]["s"]
    dur = kept[-1]["e"] - span_s
    reasons: list[str] = []
    flags: list[str] = []
    comp: dict = {}

    # hook: the first line (first-line test), a claim in it, and it lands fast
    ok, why = first_line_test(first_words)
    first_low = " ".join(norm_keep(x["t"]) for x in first_words)
    first_op = sum(w_ for w_, rx in OPINION_RE for _ in rx.finditer(first_low))
    first_num = bool(NUMBER_RE.search(first_low))
    first_proper = sum(1 for k, x in enumerate(first_words) if k > 0 and re.sub(r"[^\w']", "", x["t"])[:1].isupper()
                       and norm(x["t"]) not in NOT_PROPER)
    claim = first_op > 0 or first_num or first_proper > 0
    fast = len(first_words) <= 22
    hedge = bool(HEDGE_START.match(first_low))
    comp["hook"] = 0.35 * ok + 0.4 * claim + 0.15 * fast + 0.1 * (not hedge)
    reasons.append(("+" if ok else "-") + why)
    if hedge:
        reasons.append("-first line opens with a hedge")
    if claim:
        reasons.append("+claim in the first line (" + ", ".join(
            [h for _, rx in OPINION_RE for h in hits(rx, first_low)][:2] + (["number"] if first_num else []) +
            (["named target"] if first_proper else [])) + ")")
    if not fast:
        reasons.append(f"-first line is long ({len(first_words)} words)")

    # opinion: weighted marker hits, as a count and as a density
    comp["opinion"] = clamp01(0.3 * min(1.0, op_raw / 4.0) + 0.7 * min(1.0, (100.0 * op_raw / n) / 4.0))
    if feat["op_hits"]:
        top = []
        for h in feat["op_hits"]:
            if h not in top:
                top.append(h)
        reasons.append(f"+opinion markers x{len(feat['op_hits'])} ({', '.join(top[:5])})")
    else:
        reasons.append("-no opinion markers")

    # specificity: numbers, named things, concrete nouns
    spec_raw = 2.0 * len(feat["nums"]) + 1.0 * len(set(feat["proper"])) + 0.5 * len(feat["concrete"])
    comp["specificity"] = clamp01(0.3 * min(1.0, spec_raw / 6.0) + 0.7 * min(1.0, (100.0 * spec_raw / n) / 8.0))
    if feat["nums"] or feat["proper"] or feat["concrete"]:
        bits = []
        if feat["nums"]:
            bits.append("numbers " + ", ".join(feat["nums"][:3]))
        if feat["proper"]:
            bits.append("names " + ", ".join(list(dict.fromkeys(feat["proper"]))[:3]))
        if feat["concrete"]:
            bits.append("nouns " + ", ".join(list(dict.fromkeys(feat["concrete"]))[:3]))
        reasons.append("+specific: " + "; ".join(bits))
    else:
        reasons.append("-nothing concrete (no number, name or measurable noun)")

    # self-contained: no context-dependent opening, no references back, no stream meta
    sc = 1.0
    if not ok:
        sc -= 0.5
    early_deictic = sum(len(s["f"]["deictic"]) for s in kept[:3])
    if early_deictic:
        sc -= min(0.6, 0.3 * early_deictic)
        reasons.append("-refers back to earlier talk (" + ", ".join(feat["deictic"][:2]) + ")")
    if len(first_words) < 6:
        sc -= 0.2
    if feat["soft_meta"]:
        sc -= 0.2
    comp["self_contained"] = clamp01(sc)

    # cleanliness: filler words and stutters per 100 words
    rate = 100.0 * (fillers + stutters) / n
    chatter = sum(1 for x in kept if x["n"] <= 3 or norm_keep(x["text"]) in CHATTER)
    chatter_ratio = chatter / len(kept)
    turns = sum(1 for x, y in zip(kept, kept[1:]) if x["spk"] != y["spk"])
    comp["cleanliness"] = clamp01(1.0 - rate / 12.0 - 1.5 * max(0.0, chatter_ratio - 0.1) - 0.04 * max(0, turns - 2))
    if chatter_ratio > 0.25:
        reasons.append(f"-chatty ({chatter} of {len(kept)} sentences are short reactions)")
    if turns > 4:
        reasons.append(f"-ping-pong dialogue ({turns} speaker changes)")
    if rate >= 6:
        reasons.append(f"-filler-heavy ({rate:.1f} fillers or stutters per 100 words)")
    elif rate < 3:
        reasons.append("+clean delivery")

    # ending: terminal punctuation, a landing sentence, a pause after, no continuation into the next sentence
    last = kept[-1]
    end_ok = ends_sentence(last["words"][-1]["t"])
    nxt = sents[w["j"] + 1] if w["j"] + 1 < len(sents) else None
    cont = bool(nxt) and norm(nxt["words"][0]["t"]) in CONTINUATION and nxt["spk"] == last["spk"]
    last_low = norm(last["words"][-1]["t"])
    dangling = last_low in {"and", "so", "but", "like", "because", "or", "the", "a", "to"}
    landing = last["n"] >= 4 and not last["f"]["question"]
    ending = 0.4 * end_ok + 0.2 * landing + 0.2 * (not dangling) + 0.2 * (not cont)
    if last["f"]["op_raw"] > 0 or last["f"]["nums"]:
        ending = min(1.0, ending + 0.1)
    comp["ending"] = clamp01(ending)
    if end_ok and not cont and not dangling:
        reasons.append("+ends on a finished sentence")
    if cont:
        reasons.append(f"-thought continues ('{norm(nxt['words'][0]['t'])}...' follows); cut ends mid-thought")
        flags.append("mid-thought-end")
    if dangling or not end_ok:
        reasons.append("-ends on an open sentence")
        flags.append("open-end")

    # length: full score inside the ideal band, 0.5 at the hard limits
    if args["ideal_min"] <= dur <= args["ideal_max"]:
        comp["length"] = 1.0
    elif dur < args["ideal_min"]:
        comp["length"] = 0.5 + 0.5 * (dur - args["min_len"]) / max(0.1, args["ideal_min"] - args["min_len"])
    else:
        comp["length"] = 0.5 + 0.5 * (args["max_len"] - dur) / max(0.1, args["max_len"] - args["ideal_max"])
    comp["length"] = clamp01(comp["length"])

    points = {k: round(WEIGHTS[k] * comp[k], 2) for k in WEIGHTS}
    total = sum(points.values())
    pen: dict = {}
    if feat["soft_meta"]:
        pen["stream meta"] = PENALTIES["soft_meta"] * min(3, len(feat["soft_meta"]))
        reasons.append("-talks about the stream (" + ", ".join(dict.fromkeys(feat["soft_meta"])) + ")")
    if feat["walkthrough"]:
        pen["walkthrough"] = PENALTIES["walkthrough"] * min(3, len(feat["walkthrough"]))
        reasons.append("-walkthrough language (" + ", ".join(dict.fromkeys(feat["walkthrough"])) + ")")
        flags.append("walkthrough")
    if feat["bait"]:
        pen["engagement bait"] = PENALTIES["bait"]
        reasons.append("-engagement bait (" + ", ".join(feat["bait"]) + ")")
        flags.append("engagement-bait")
    # filler-heavy rambling is downranked outright, not only through the cleanliness component
    total *= 1.0 - 0.5 * clamp01((rate - 5.0) / 20.0)
    total = max(0.0, min(100.0, total - sum(pen.values())))
    speakers = sorted({s["spk"] for s in kept if s["spk"] is not None}, key=str)
    if len(speakers) > 1:
        flags.append("two-speakers")
    best = max(kept, key=sentence_quote_score)
    return {"score": round(total, 1), "components": {k: {"score": round(comp[k], 2), "points": points[k]} for k in WEIGHTS},
            "penalties": pen, "reasons": reasons, "flags": flags, "dur": dur, "quote": best, "speakers": speakers}


def build_segs(w: dict, sents: list[dict], silences: list[tuple[float, float]], words_all: list[dict]) -> tuple[list[dict], float]:
    """Source-second segs: contiguous runs of kept sentences, snapped to pauses; back-channels fall in the gaps.

    Returns (segs, pause_after). Each seg is {a, b}; speaker fields are added by the caller."""
    kept = w["kept"]
    runs, cur = [], [kept[0]]
    for s in kept[1:]:
        if sents.index(s) == sents.index(cur[-1]) + 1:
            cur.append(s)
        else:
            runs.append(cur)
            cur = [s]
    runs.append(cur)
    idx = {id(x): k for k, x in enumerate(words_all)}
    segs, pause_after = [], 0.0
    for r_i, run in enumerate(runs):
        first = run[0]["words"][w["k0"] if r_i == 0 else 0]
        last = run[-1]["words"][-1]
        pi, ni = idx[id(first)] - 1, idx[id(last)] + 1
        prev_end = words_all[pi]["e"] if pi >= 0 else None
        next_start = words_all[ni]["s"] if ni < len(words_all) else None
        a = snap_start(first["s"], prev_end, silences)
        b, pause = snap_end(last["e"], next_start, silences)
        pause_after = pause
        segs.append({"a": a, "b": max(b, a + 0.1)})
    return segs, pause_after


def overlap(a: tuple[float, float], b: tuple[float, float]) -> float:
    return max(0.0, min(a[1], b[1]) - max(a[0], b[0]))


def pick(words: list[dict], timing: str, args: dict, silences: list[tuple[float, float]] | None = None) -> list[dict]:
    """Rank candidate takes. `args`: min_len, max_len, ideal_min, ideal_max, top, exclude, speakers."""
    silences = silences or []
    sents = split_sentences(words)
    excl = args.get("exclude", [])
    scored = []
    for i in range(len(sents)):
        if sents[i]["n"] < 3:
            continue
        for j in range(i, len(sents)):
            if sents[j]["e"] - sents[i]["s"] > args["max_len"] + 20:
                break
            w = build_window(sents, i, j, args)
            if w is None or w["n_words"] < MIN_WORDS:
                continue
            res = score_window(w, sents, args)
            if res is None or not args["min_len"] <= res["dur"] <= args["max_len"]:
                continue
            a0, b0 = w["kept"][0]["words"][w["k0"]]["s"], w["kept"][-1]["e"]
            if any(overlap((a0, b0), ex) > 0 for ex in excl):
                continue
            scored.append((res["score"], -i, -j, w, res))
    scored.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
    chosen: list[dict] = []
    spans: list[tuple[float, float]] = []
    for score, _, _, w, res in scored:
        a0, b0 = w["kept"][0]["words"][w["k0"]]["s"], w["kept"][-1]["e"]
        if any(overlap((a0, b0), sp) > OVERLAP_MAX * min(b0 - a0, sp[1] - sp[0]) for sp in spans):
            continue
        segs, pause_after = build_segs(w, sents, silences, words)
        chosen.append(make_candidate(w, res, segs, pause_after, timing, args))
        spans.append((a0, b0))
        if len(chosen) >= args.get("pool", args["top"]):
            break
    return chosen


def make_candidate(w: dict, res: dict, segs: list[dict], pause_after: float, timing: str, args: dict) -> dict:
    kept = w["kept"]
    a, b = segs[0]["a"], segs[-1]["b"]
    text = " ".join(s["text"] for s in kept[1:])
    first_text = " ".join(x["t"] for x in w["first_words"])
    full = (first_text + " " + text).strip()
    q = res["quote"]
    flags = list(res["flags"])
    if timing != "word":
        flags.append("timing-estimated")
    if w["k0"]:
        flags.append("lead-trimmed")
    spk_map = args.get("speakers", {})
    cand = {
        "a": round(a, 2), "b": round(b, 2), "start": fmt_time(a), "end": fmt_time(b),
        "duration": round(sum(s["b"] - s["a"] for s in segs), 2),
        "speaker": w["dom"], "speakers": res["speakers"],
        "hook": first_text, "quote": q["text"], "quote_at": round(q["s"], 2),
        "score": res["score"], "components": res["components"], "penalties": res["penalties"],
        "reasons": res["reasons"], "flags": flags, "pause_after": pause_after,
        "text": full, "sentence_range": [w["i"], w["j"]],
    }
    cand["short"] = short_fragment(cand, segs, w, spk_map, args.get("source"))
    return cand


def short_fragment(cand: dict, segs: list[dict], w: dict, spk_map: dict, source: str | None) -> dict:
    """The part of a short.json that comes from the picker: `source` and `segs` (plus two-up fields when needed)."""
    dom_name = spk_map.get(w["dom"])
    out_segs = []
    for s in segs:
        seg = {"a": s["a"], "b": s["b"], "layout": "A"}
        if dom_name:
            seg["tile"] = dom_name
        out_segs.append(seg)
    frag: dict = {"source": source, "segs": out_segs}
    if len(cand["speakers"]) > 1 and spk_map:
        letter = {k: v[:1].upper() for k, v in spk_map.items()}
        turns, clip_t = [], 0.0
        seg_i = 0
        # speaker turns in clip seconds from the kept sentences (consecutive sentences of one speaker merge)
        for s in w["kept"]:
            while seg_i + 1 < len(segs) and s["s"] >= segs[seg_i + 1]["a"] - 0.01:
                clip_t += segs[seg_i]["b"] - segs[seg_i]["a"]
                seg_i += 1
            c0 = clip_t + max(0.0, s["s"] - segs[seg_i]["a"])
            c1 = clip_t + min(segs[seg_i]["b"], s["e"]) - segs[seg_i]["a"]
            who = letter.get(s["spk"], "?")
            if turns and turns[-1][2] == who:
                turns[-1][1] = round(c1, 2)
            else:
                turns.append([round(c0, 2), round(c1, 2), who])
        for seg in out_segs:
            seg["layout"] = "B"
            seg.pop("tile", None)
        frag["default_speaker"] = letter.get(w["dom"], "M")
        frag["speaker_turns"] = turns
    return frag


# --- Optional LLM judge (off by default) ------------------------------------------------------------------
def apply_judge(cands: list[dict], cmd: str, weight: float, timeout: float = 600.0) -> list[dict]:
    """Re-rank with an external judge command. Nothing runs unless --judge-cmd is given.

    The command gets JSON on stdin: {"rubric": str, "candidates": [{"id", "text", "hook", "duration"}]} (transcript
    text only, never media) and must print {"scores": {"<id>": {"score": 0-100, "note": str}}}. The final score
    is (1 - weight) * heuristic + weight * judge; the heuristic score stays in `heuristic_score`."""
    if not 0.0 <= weight <= 1.0:
        die("--judge-weight must be between 0 and 1")
    payload = {"rubric": RUBRIC, "candidates": [
        {"id": c["id"], "text": c["text"], "hook": c["hook"], "duration": c["duration"]} for c in cands]}
    r = subprocess.run(shlex.split(cmd), input=json.dumps(payload), capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        die(f"judge command failed ({r.returncode}): {r.stderr.strip()[:300]}")
    try:
        scores = json.loads(r.stdout)["scores"]
    except (ValueError, KeyError, TypeError):
        die("judge output must be JSON like {\"scores\": {\"t01\": {\"score\": 80, \"note\": \"...\"}}}")
    for c in cands:
        j = scores.get(c["id"])
        if not isinstance(j, dict) or not isinstance(j.get("score"), (int, float)):
            die(f"judge returned no score for {c['id']}")
        js = max(0.0, min(100.0, float(j["score"])))
        c["heuristic_score"] = c["score"]
        c["judge"] = {"score": js, "note": str(j.get("note", "")), "weight": weight}
        c["score"] = round((1 - weight) * c["score"] + weight * js, 1)
    return sorted(cands, key=lambda c: -c["score"])


# --- CLI ---------------------------------------------------------------------------------------------------
def parse_speakers(spec: str | None) -> dict:
    out = {}
    for part in filter(None, (spec or "").split(",")):
        if "=" not in part:
            die(f"--speakers expects S1=vincent,S2=mitchell, got {part!r}")
        k, v = part.split("=", 1)
        if v.strip().lower() not in ("vincent", "mitchell"):
            die(f"--speakers: tile must be vincent or mitchell, got {v!r}")
        out[k.strip()] = v.strip().lower()
    return out


def parse_ranges(specs: list[str]) -> list[tuple[float, float]]:
    out = []
    for spec in specs or []:
        a, _, b = spec.partition("-")
        if not b:
            die(f"--exclude expects START-END (seconds or MM:SS), got {spec!r}")
        try:
            out.append((parse_time(a), parse_time(b)))
        except ValueError as e:
            die(str(e))
    return out


def find_ffmpeg() -> str:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shorts"))
    import common  # noqa: E402
    return common.find_bin("ffmpeg")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode", help="episode folder or id (<YYMMDD>)")
    ap.add_argument("--transcript", help="words .json (whisper.cpp -oj or [{w,s,e}]) or [MM:SS] S1: turn text; "
                                          "default raw/words.json, else raw/transcript_clean.txt")
    ap.add_argument("--turns", help="speaker-labelled turn text; labels the words of a word-level --transcript")
    ap.add_argument("--speakers", help="map labels to host tiles, e.g. S1=vincent,S2=mitchell (adds tile to segs)")
    ap.add_argument("--source", help="recording relative to the episode (default raw/<id>.mp4)")
    ap.add_argument("--silence", action="store_true", help="snap cuts to real pauses (ffmpeg silencedetect on the source audio)")
    ap.add_argument("--silences", help="JSON list of [start, end] pauses instead of running ffmpeg")
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--min-len", type=float, default=MIN_LEN)
    ap.add_argument("--max-len", type=float, default=MAX_LEN)
    ap.add_argument("--ideal-min", type=float, default=IDEAL_MIN)
    ap.add_argument("--ideal-max", type=float, default=IDEAL_MAX)
    ap.add_argument("--exclude", action="append", default=[], metavar="START-END", help="skip a span (countdown, outro); repeatable")
    ap.add_argument("--out", help="default <episode>/out/takes/takes.json")
    ap.add_argument("--judge-cmd", help="OPTIONAL external LLM judge command (off by default; see README)")
    ap.add_argument("--judge-weight", type=float, default=0.5)
    ap.add_argument("--judge-pool", type=int, default=15, help="candidates sent to the judge")
    a = ap.parse_args()

    p = Path(a.episode)
    ep = p.resolve() if p.is_dir() else workspace.episode_dir(a.episode)
    epj = ep / "episode.json"
    ep_id = json.loads(epj.read_text()).get("id") if epj.exists() else ep.name.split("_")[-1]
    if a.transcript:
        tpath = Path(a.transcript)
    else:
        tpath = next((ep / "raw" / n for n in ("words.json", "transcript_clean.txt") if (ep / "raw" / n).exists()), None)
    if not tpath or not tpath.exists():
        die(f"no transcript: pass --transcript (looked for raw/words.json and raw/transcript_clean.txt in {ep})")
    words, timing = load_words(tpath)
    if a.turns:
        label_speakers(words, parse_turns(Path(a.turns).read_text()))
    source = a.source or f"raw/{ep_id}.mp4"
    silences: list[tuple[float, float]] = []
    out = Path(a.out) if a.out else ep / "out" / "takes" / "takes.json"
    if a.silences:
        silences = [(float(x), float(y)) for x, y in json.loads(Path(a.silences).read_text())]
    elif a.silence:
        media = ep / source
        if not media.exists():
            die(f"--silence needs the recording: {media} not found")
        silences = detect_silences(media, find_ffmpeg())
    args = {"min_len": a.min_len, "max_len": a.max_len, "ideal_min": a.ideal_min, "ideal_max": a.ideal_max, "top": a.top,
            "exclude": parse_ranges(a.exclude), "speakers": parse_speakers(a.speakers), "source": source}
    if a.judge_cmd:
        args["pool"] = max(a.top, a.judge_pool)
    cands = pick(words, timing, args, silences)
    for k, c in enumerate(cands, 1):
        c["id"] = f"t{k:02d}"
    if a.judge_cmd:
        cands = apply_judge(cands, a.judge_cmd, a.judge_weight)[:a.top]
    for k, c in enumerate(cands, 1):
        c["rank"] = k
    result = {
        "schema_version": 1, "picker_version": VERSION, "episode": ep_id, "source": source,
        "transcript": {"file": tpath.name, "timing": timing, "words": len(words),
                       "duration": round(words[-1]["e"], 1) if words else 0.0, "silences": len(silences)},
        "params": {k: args[k] for k in ("min_len", "max_len", "ideal_min", "ideal_max", "top")} |
                  {"judge": bool(a.judge_cmd), "exclude": a.exclude},
        "candidates": cands,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(cands)} takes from {tpath.name} ({timing} timing, {len(words)} words) -> {out}")
    for c in cands:
        print(f"{c['rank']:>2}. {c['score']:5.1f}  {c['start']:>7}-{c['end']:<7} {c['duration']:5.1f}s  {c['speaker']}  {c['hook'][:90]}")


if __name__ == "__main__":
    main()
