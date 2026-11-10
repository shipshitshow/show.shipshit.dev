#!/usr/bin/env python3
"""Measure how each host spoke in a two-host livestream transcript.

Input is a YouTube caption file (.vtt, auto or manual) or a speaker-labelled text
file (`Vincent: text`, optional `[HH:MM:SS]` prefix). Output is JSON (default) or a
short Markdown table. The script only measures; reading the flagged passages and
judging them (is that a claim, a story, a push-back?) is the coach's job.

Speaker split. YouTube captions carry only a `>>` marker at each change of
speaker, no names. Two-person turns alternate, so the script gives the turns two
lanes and decides which lane is which host from where the hosts say each other's
names. That is an inference: it drifts when a marker is missed or doubled, and it
cannot see a third voice (a read-out chat message, a guest). The `attribution`
block reports the evidence and a confidence label. A labelled transcript skips
the inference.
"""
import argparse
import html
import json
import re
import statistics
import sys
from pathlib import Path

TS = re.compile(r"(\d+):(\d\d):(\d\d)\.(\d+)")
SOUND = re.compile(r"^(?:\[[^\]]*\]\s*)+$")
BACKCHANNEL_MAX = 3

GREETING = re.compile(
    r"welcome|what'?s up|sup\b|how (?:was|is|are)|hello|good (?:morning|evening|afternoon)|"
    r"catch.?up|busy|ready to ship|special edition|quick recap|before we (?:start|begin)",
    re.I,
)
AGREE = re.compile(
    r"^(?:yeah|yes|yep|exactly|right|totally|true|agreed?|fair|absolutely|definitely|"
    r"100%|that'?s (?:true|right|fair)|i agree|good point|good one|okay,? (?:that'?s|so))\b",
    re.I,
)
PUSHBACK_OPEN = re.compile(
    r"^(?:no,?|nope|but|actually|wait|hold on|hmm|well,? (?:no|actually)|i disagree|"
    r"i don'?t (?:think|agree|buy)|not (?:really|sure)|that'?s not|come on|really\?)\b",
    re.I,
)
PUSHBACK_ANY = re.compile(
    r"i disagree|i don'?t (?:think|agree|buy)|not sure (?:about|that)|i'?m not convinced|"
    r"that'?s not (?:true|right|what)|the problem (?:is|with)|but (?:i|we|you) (?:think|would|don'?t)|"
    r"on the other hand|i'?d (?:push back|argue)|devil'?s advocate|counter.?point",
    re.I,
)
FILLER_TOKENS = {"uh", "um", "uhm", "erm", "er", "hmm", "ah"}
HEDGES = [
    "i think", "maybe", "kind of", "sort of", "i guess", "i don't know", "i mean",
    "you know", "basically", "literally", "obviously", "honestly",
]
STORY = re.compile(
    r"\b(?:i|we) (?:tried|built|shipped|launched|spent|paid|had|got|ran|used|wrote|lost|fired|"
    r"hired|started|found|asked|posted|made|did|saw|checked|switched|set up|cancelled|canceled|"
    r"tested|deployed|migrated|rebuilt|burned|burnt|signed)\b|"
    r"\blast (?:week|month|year|night)\b|\bmy (?:customer|client|team|company|agency|app|product|"
    r"business|account|setup|workflow)\b|\bin my (?:company|business|case|experience)\b",
    re.I,
)
READ_ALOUD = re.compile(
    r"\bit says\b|\bthey say\b|\baccording to\b|\bthe (?:article|post|tweet|blog|paper|report|thread|"
    r"headline|docs?|readme)\b|\bhe says\b|\bshe says\b|\bit reads\b|\blet me read\b|\bquote\b|"
    r"\bscroll(?:ing)? down\b|\bso here\b|\bthe next (?:one|point|bullet)\b",
    re.I,
)
SHRUG = re.compile(
    r"\bwhatever\b|\bi don'?t know\b|\bblah,? blah\b|\bwhat is (?:that|this)\b|\bno idea\b|"
    r"\bi'?m not sure (?:exactly )?what\b|\bwho knows\b|\bor something\b",
    re.I,
)
FIRST_PERSON = re.compile(r"\b(?:i|i'm|i've|i'd|i'll|we|we're|we've|my|our|me)\b", re.I)
CHAT = re.compile(
    r"\bchat\b(?!\s*(?:gpt|with|bot))|\bin the comments\b|\bcomments? (?:says?|section)\b|"
    r"\bsomeone (?:asked|says|said|wrote)\b|\bviewers?\b|\bquestion from\b|\blive chat\b|"
    r"\bsuper ?chat\b|\bdrop (?:it |a comment )?in the chat\b",
    re.I,
)
CTA = re.compile(
    r"\bsubscribe\b|\blike (?:the|and|this)\b|\bhit the bell\b|\bfollow (?:us|me|the)\b|"
    r"\bthanks for (?:watching|joining|coming)\b|\bsee you\b|\bnext week\b|\bbye\b|"
    r"\blink in\b|\bsign up\b",
    re.I,
)
ASSERT = re.compile(
    r"\bi (?:think|believe|bet|say|would say|don'?t think|'?m convinced)\b|\bis (?:dead|over|"
    r"the future|overrated|underrated|a scam|broken|better|worse)\b|\bwill (?:never|always|kill|"
    r"replace|win|lose)\b|\bthe (?:problem|point|truth|reality) is\b|\bnobody\b|\beveryone\b",
    re.I,
)
NAME_ALIASES = {
    "Vincent": r"vincent|vince",
    "Mitchell": r"mitchell|mitch|mitchel|michal|mitchelle",
}


def sec(parts):
    h, m, s, ms = parts
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / (10 ** len(ms))


def _cues(text):
    cur = None
    for line in text.split("\n"):
        if "-->" in line:
            if cur:
                yield cur
            found = TS.findall(line)
            cur = [sec(found[0]), sec(found[1]), []] if len(found) >= 2 else None
        elif cur is not None and line.strip() and not line.strip().isdigit():
            cur[2].append(line)
    if cur:
        yield cur


def parse_vtt(path):
    """Return [(time, token)] where token '>>' marks a speaker change.

    Parses by the `-->` line, not by blank lines: auto captions put a
    whitespace-only line after the timestamp line.
    """
    text = Path(path).read_text(encoding="utf-8")
    auto = "<c>" in text
    words, last = [], None
    for t0, t1, body in _cues(text):
        if not body:
            continue
        if auto:
            if t1 - t0 < 0.05:
                continue
            line = body[-1]
            plain = re.sub(r"<[^>]+>", "", line)
            if plain == last:
                continue
            last = plain
            parts = re.split(r"<(\d+:\d\d:\d\d\.\d+)>", line)
            t = t0
            for i, part in enumerate(parts):
                if i % 2 == 1:
                    t = sec(TS.findall(part)[0])
                    continue
                clean = html.unescape(re.sub(r"<[^>]+>", "", part)).replace("\xa0", " ")
                for w in clean.split():
                    words.append((t, w))
        else:
            clean = re.sub(r"<[^>]+>", "", html.unescape(" ".join(body)))
            tokens = clean.split()
            for i, w in enumerate(tokens):
                words.append((t0 + (t1 - t0) * i / max(len(tokens), 1), w))
    return words


def turns_from_markers(words):
    """Split on '>>' and alternate lane 0/1 at each marker."""
    turns, cur, lane = [], [], 0
    for t, w in words:
        if w == ">>":
            if cur:
                turns.append({"lane": lane, "words": cur})
            lane = 1 - lane
            cur = []
        else:
            cur.append((t, w))
    if cur:
        turns.append({"lane": lane, "words": cur})
    return turns


LABEL = re.compile(r"^\s*(?:\[?(\d+):(\d\d)(?::(\d\d))?\]?\s*)?([A-Z][\w .'-]{0,30}?)\s*:\s+(.*)$")


def turns_from_labels(path):
    turns, names = [], []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = LABEL.match(line)
        if m:
            a, b, c, name, body = m.groups()
            t = None
            if a is not None:
                t = int(a) * 3600 + int(b) * 60 + int(c) if c is not None else int(a) * 60 + int(b)
            if name not in names:
                names.append(name)
            turns.append({"name": name, "words": [(t, w) for w in body.split()]})
        elif turns and line.strip():
            turns[-1]["words"] += [(turns[-1]["words"][-1][0] if turns[-1]["words"] else None, w) for w in line.split()]
    return turns, names


def norm(w):
    return re.sub(r"[^a-z0-9'$%.-]", "", w.lower()).strip(".-")


def text_of(turn):
    return " ".join(w for _, w in turn["words"])


def is_sound_only(turn):
    return bool(SOUND.match(text_of(turn)))


def speech_words(turn):
    """Words with sound tags like [laughter] or [clears throat] removed."""
    out, depth = [], False
    for t, w in turn["words"]:
        if w.startswith("["):
            depth = True
        if not depth:
            out.append((t, w))
        if w.endswith("]"):
            depth = False
    return out


def name_anchors(turns):
    """Moments a turn says the other host's name. Returns (turn_index, lane, named_host)."""
    out = []
    for i, turn in enumerate(turns):
        if "lane" not in turn:
            continue
        text = " ".join(w for _, w in speech_words(turn))
        for host, pattern in NAME_ALIASES.items():
            for m in re.finditer(r"\b(?:%s)\b" % pattern, text, re.I):
                before = text[: m.start()].split()[-1:] or [""]
                if before[0].lower() in {"with", "from", "of", "about", "and", "by"}:
                    continue
                after = text[m.end(): m.end() + 12].lower()
                if after.startswith((" ships", " shipshit")):
                    continue
                out.append((i, turn["lane"], host))
    return out


def assign_lanes(turns, hosts, lane0=None, flips=()):
    first, second = hosts
    anchors = name_anchors(turns)
    for_first = sum(1 for _, lane, named in anchors if (lane == 0) == (named == second))
    for_second = len(anchors) - for_first
    method = "flag"
    if lane0:
        chosen = lane0
    elif anchors and for_first != for_second:
        chosen = first if for_first > for_second else second
        method = "name-anchors"
    else:
        chosen = first
        method = "default"
    agree = max(for_first, for_second) if method == "name-anchors" else (
        for_first if chosen == first else for_second)
    if lane0:
        agree = for_first if chosen == first else for_second
    thirds = []
    if turns:
        n = len(turns)
        for k in range(3):
            lo, hi = k * n // 3, (k + 1) * n // 3
            a = [x for x in anchors if lo <= x[0] < hi]
            ok = sum(1 for _, lane, named in a if ((lane == 0) == (named == second)) == (chosen == first))
            thirds.append({"anchors": len(a), "agree": ok})
    total = len(anchors)
    drift = any(t["anchors"] >= 2 and t["agree"] / t["anchors"] < 0.5 for t in thirds)
    if method == "flag" or total == 0:
        conf = "low"
    elif drift or agree / total < 0.75:
        conf = "low"
    elif total >= 4 and agree / total >= 0.9:
        conf = "medium"
    else:
        conf = "low"
    other = second if chosen == first else first
    mapping = {0: chosen, 1: other}
    for turn in turns:
        if "lane" in turn:
            n_flips = sum(1 for f in flips if turn["words"] and turn["words"][0][0] is not None and turn["words"][0][0] >= f)
            lane = (turn["lane"] + n_flips) % 2
            turn["name"] = mapping[lane]
    if flips:
        conf = "low"
    return {
        "method": method,
        "lane0": chosen,
        "name_anchors": total,
        "anchors_agreeing": agree,
        "anchors_by_third": thirds,
        "manual_flips_at": [fmt(f) for f in flips],
        "confidence": conf,
        "conflicting_anchors": bool(anchors) and for_first == for_second and not lane0,
        "note": (
            "Speakers are inferred from caption change markers and the hosts naming each "
            "other. Treat per-host numbers as indicative until the spot checks below are "
            "confirmed by ear or a labelled transcript replaces them."
        ),
    }


def fmt(t):
    if t is None:
        return None
    t = int(round(t))
    return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60}:{t % 60:02d}"


def snippet(turn, n=22):
    ws = [w for _, w in speech_words(turn)]
    return " ".join(ws[:n]) + (" ..." if len(ws) > n else "")


def host_stats(name, turns, total_words, span):
    mine = [t for t in turns if t["name"] == name]
    words = [norm(w) for t in mine for _, w in speech_words(t)]
    words = [w for w in words if w]
    n = len(words)
    text = " ".join(words)
    per_k = lambda c: round(c / n * 1000, 1) if n else 0.0
    fill = sum(1 for w in words if w in FILLER_TOKENS)
    hedges = {h: len(re.findall(r"\b" + re.escape(h) + r"\b", text)) for h in HEDGES}
    like = len(re.findall(r"\blike\b", text))
    repeats = sum(1 for a, b in zip(words, words[1:])
                  if a == b and a not in {"yeah", "no", "very", "really", "so", "ha", "bye", "that", "had"})
    yeah_openers = 0
    agree = push = backchannels = substantive = 0
    push_examples, agree_examples = [], []
    laughs = sum(len(re.findall(r"\[(?:laughter|laughs|laughing|snorts)\]", text_of(t), re.I)) for t in mine)
    for t in mine:
        sw = [w for _, w in speech_words(t)]
        body = " ".join(sw)
        if len(sw) <= BACKCHANNEL_MAX:
            if sw:
                backchannels += 1
            continue
        substantive += 1
        if AGREE.match(body):
            agree += 1
            if len(agree_examples) < 4:
                agree_examples.append({"at": fmt(t["words"][0][0]), "text": snippet(t)})
        if PUSHBACK_OPEN.match(body) or PUSHBACK_ANY.search(body):
            push += 1
            if len(push_examples) < 6:
                push_examples.append({"at": fmt(t["words"][0][0]), "text": snippet(t, 30)})
        if re.match(r"^yeah\b", body, re.I):
            yeah_openers += 1
    story, read = [], []
    for t in mine:
        sw = [w for _, w in speech_words(t)]
        body = " ".join(sw)
        if len(sw) >= 40 and STORY.search(body):
            story.append({"at": fmt(t["words"][0][0]), "words": len(sw), "text": snippet(t)})
        fp = len(FIRST_PERSON.findall(body))
        if (len(sw) >= 60 and fp <= 1) or (len(sw) >= 25 and READ_ALOUD.search(body)):
            read.append({"at": fmt(t["words"][0][0]), "words": len(sw), "text": snippet(t)})
    chat = [{"at": fmt(t["words"][0][0]), "text": snippet(t, 26)} for t in mine if CHAT.search(" ".join(w for _, w in speech_words(t)))]
    shrugs = [{"at": fmt(t["words"][0][0]), "text": snippet(t, 26)} for t in mine
              if SHRUG.search(" ".join(w for _, w in speech_words(t)))]
    asserts = [t for t in mine if len(speech_words(t)) >= 12 and ASSERT.search(text_of(t))]
    return {
        "turns": len(mine),
        "substantive_turns": substantive,
        "backchannels": backchannels,
        "words": n,
        "share_of_words_pct": round(n / total_words * 100, 1) if total_words else 0,
        "words_per_minute": round(n / (span / 60), 1) if span else None,
        "fillers": {
            "uh_um_count": fill,
            "uh_um_per_1000": per_k(fill),
            "like_per_1000": per_k(like),
            "hedges_per_1000": per_k(sum(hedges.values())),
            "repeated_words_per_1000": per_k(repeats),
            "yeah_openers": yeah_openers,
            "top_hedges": dict(sorted(((k, v) for k, v in hedges.items() if v), key=lambda kv: -kv[1])[:4]),
            "caveat": "Auto captions drop many uh/um; counts are a floor.",
        },
        "agreement": {
            "turns_opening_with_agreement": agree,
            "turns_with_push_back": push,
            "push_back_per_10_substantive_turns": round(push / substantive * 10, 1) if substantive else 0,
            "laughs": laughs,
            "push_back_examples": push_examples,
            "agreement_examples": agree_examples,
        },
        "stories_vs_read_aloud": {
            "story_turns": len(story),
            "read_aloud_turns": len(read),
            "story_candidates": story[:6],
            "read_aloud_candidates": read[:6],
        },
        "chat_mentions": {"count": len(chat), "examples": chat[:6]},
        "shrug_phrases": {"count": len(shrugs), "examples": shrugs[:5],
                          "what": "whatever / I don't know / what is that / blah blah: moments that read as not prepared"},
        "claim_style_turns": len(asserts),
    }


def monologues(turns, hosts, top=3):
    """Longest uninterrupted talk per host; short backchannels from the other host don't break it."""
    result = {h: [] for h in hosts}
    runs = []
    cur = None
    for i, t in enumerate(turns):
        sw = speech_words(t)
        if not sw or sw[0][0] is None:
            continue
        if cur and cur["name"] == t["name"]:
            cur["end"] = sw[-1][0]
            cur["words"] += len(sw)
            cur["parts"].append(t)
            continue
        if cur and len(sw) <= BACKCHANNEL_MAX and t["name"] != cur["name"]:
            nxt = next((u for u in turns[i + 1:] if speech_words(u)), None)
            if nxt and nxt["name"] == cur["name"]:
                continue
        if cur:
            runs.append(cur)
        cur = {"name": t["name"], "start": sw[0][0], "end": sw[-1][0], "words": len(sw), "parts": [t]}
    if cur:
        runs.append(cur)
    for r in runs:
        result[r["name"]].append(r)
    out = {}
    for h in hosts:
        best = sorted(result[h], key=lambda r: -(r["end"] - r["start"]))[:top]
        durs = [r["end"] - r["start"] for r in result[h]]
        out[h] = {
            "median_run_seconds": round(statistics.median(durs)) if durs else None,
            "longest": [
                {"at": fmt(r["start"]), "seconds": round(r["end"] - r["start"]), "words": r["words"],
                 "text": snippet(r["parts"][0])}
                for r in best
            ],
        }
    return out


def opening(turns, countdown):
    first_t = next((t["words"][0][0] for t in turns if t["words"] and t["words"][0][0] is not None), None)
    cands = []
    for t in turns:
        sw = speech_words(t)
        if len(sw) < 18 or sw[0][0] is None or sw[0][0] < countdown:
            continue
        body = " ".join(w for _, w in sw)
        if GREETING.search(body):
            continue
        cands.append({
            "host": t["name"], "at": fmt(sw[0][0]), "seconds_since_live": round(sw[0][0] - countdown),
            "has_claim_wording": bool(ASSERT.search(body)), "text": snippet(t, 40),
        })
        if len(cands) == 4:
            break
    claimy = next((c for c in cands if c["has_claim_wording"]), None)
    return {
        "countdown_seconds": countdown,
        "first_word_at": fmt(first_t),
        "first_word_seconds_since_live": None if first_t is None else round(first_t - countdown),
        "first_non_greeting_turns": cands,
        "first_candidate_with_claim_wording": claimy,
        "note": "Candidates only. The coach reads them and names the real first claim; a greeting or recap is not one.",
    }


def closing(turns, last_t, window=150):
    tail = [t for t in turns if t["words"] and t["words"][0][0] is not None and t["words"][0][0] >= last_t - window]
    ctas = []
    for t in tail:
        body = " ".join(w for _, w in speech_words(t))
        m = CTA.search(body)
        if m:
            ctas.append({"host": t["name"], "at": fmt(t["words"][0][0]),
                         "seconds_before_end": round(last_t - t["words"][0][0]), "text": snippet(t, 30)})
    return {
        "last_seconds_text": [{"host": t["name"], "at": fmt(t["words"][0][0]), "text": snippet(t, 40)} for t in tail[-10:]],
        "cta_mentions": ctas,
        "note": "Judge whether the close answers the viewer question and whether the CTA is brief and not begging.",
    }


def spot_checks(mono, turns, hosts):
    """Moments to confirm by ear: who is really speaking. Both hosts, spread over the show."""
    out = []
    for h in hosts:
        for m in mono[h]["longest"][:2]:
            out.append({"at": m["at"], "labelled_as": h, "text": m["text"]})
    return sorted(out, key=lambda x: x["at"].count(":") * 10000 + int(re.sub(r"\D", "", x["at"])))


def parse_clock(value):
    parts = [int(x) for x in value.split(":")]
    out = 0
    for x in parts:
        out = out * 60 + x
    return out


def silences(turns, min_gap=10):
    """Stretches with no speech from either host. Not attributable to one host."""
    stamped = [t for t in turns if speech_words(t) and speech_words(t)[0][0] is not None]
    gaps = []
    for a, b in zip(stamped, stamped[1:]):
        end, start = speech_words(a)[-1][0], speech_words(b)[0][0]
        if start - end >= min_gap:
            gaps.append({"at": fmt(end), "seconds": round(start - end)})
    gaps.sort(key=lambda g: -g["seconds"])
    return {"min_gap_seconds": min_gap, "count": len(gaps), "total_seconds": sum(g["seconds"] for g in gaps),
            "longest": gaps[:4]}


def chat_gaps(turns, last_t):
    ts = [t["words"][0][0] for t in turns if t["words"] and t["words"][0][0] is not None
          and CHAT.search(" ".join(w for _, w in speech_words(t)))]
    if not ts:
        return {"mentions": 0, "first_at": None, "longest_gap_seconds": None}
    pts = [0] + ts + [last_t]
    gap = max(b - a for a, b in zip(pts, pts[1:]))
    return {"mentions": len(ts), "first_at": fmt(ts[0]), "longest_gap_seconds": round(gap)}


def analyze(path, hosts, lane0=None, countdown=30, flips=()):
    path = Path(path)
    if path.suffix == ".vtt":
        words = parse_vtt(path)
        turns = turns_from_markers(words)
        if len(turns) < 20:
            raise SystemExit(
                f"{path.name}: no speaker-change markers (>>) in this caption file, so the hosts "
                "cannot be told apart. Use a speaker-labelled transcript (Name: text)."
            )
        attribution = assign_lanes(turns, hosts, lane0, flips)
    else:
        turns, names = turns_from_labels(path)
        known = [n for n in names if n in hosts]
        if len(known) < 2:
            raise SystemExit(f"labelled transcript names {names}, expected {hosts}")
        turns = [t for t in turns if t["name"] in hosts]
        attribution = {"method": "labels", "confidence": "high", "note": "Labelled transcript."}
    stamped = [t for t in turns if t["words"] and t["words"][0][0] is not None]
    if not stamped:
        raise SystemExit("no timestamps in transcript")
    first_t = stamped[0]["words"][0][0]
    last_t = max(w[0] for t in stamped for w in t["words"] if w[0] is not None)
    span = last_t - first_t
    total_words = sum(len([1 for _, w in speech_words(t) if norm(w)]) for t in turns)
    mono = monologues(turns, hosts)
    return {
        "source": path.name,
        "hosts": hosts,
        "length_seconds": round(last_t),
        "length": fmt(last_t),
        "attribution": attribution,
        "opening": opening(turns, countdown),
        "per_host": {h: host_stats(h, turns, total_words, span) for h in hosts},
        "longest_monologues": mono,
        "spot_checks": spot_checks(mono, turns, hosts),
        "chat": chat_gaps(turns, last_t),
        "silence": silences(turns),
        "close": closing(turns, last_t),
    }


NUMERIC = [
    ("share_of_words_pct", "Share of words %"),
    ("words_per_minute", "Words per minute"),
    ("fillers.uh_um_per_1000", "uh/um per 1000 words"),
    ("fillers.like_per_1000", "'like' per 1000 words"),
    ("fillers.hedges_per_1000", "Hedges per 1000 words"),
    ("fillers.repeated_words_per_1000", "Repeated words per 1000"),
    ("agreement.turns_opening_with_agreement", "Turns opening with agreement"),
    ("agreement.turns_with_push_back", "Turns with push-back"),
    ("stories_vs_read_aloud.story_turns", "Story turns"),
    ("stories_vs_read_aloud.read_aloud_turns", "Read-aloud turns"),
    ("chat_mentions.count", "Chat mentions"),
    ("shrug_phrases.count", "Shrug phrases (whatever, I don't know)"),
]


def dig(d, dotted):
    for k in dotted.split("."):
        d = d[k]
    return d


def render_md(cur, prev=None):
    lines = [f"# Coach numbers: {cur['source']} ({cur['length']})", ""]
    a = cur["attribution"]
    lines.append(f"Speaker attribution: {a['method']}, confidence **{a['confidence']}**. {a['note']}")
    o = cur["opening"]
    lines += ["", f"First word {o['first_word_at']} ({o['first_word_seconds_since_live']} s after the countdown)."]
    c = o["first_candidate_with_claim_wording"] or (o["first_non_greeting_turns"] or [None])[0]
    if c:
        lines.append(f"First claim candidate: {c['host']} at {c['at']} ({c['seconds_since_live']} s after going live): {c['text']}")
    lines += ["", "| Metric | " + " | ".join(cur["hosts"]) + (" | Last week (" + " / ".join(cur["hosts"]) + ") |" if prev else " |")]
    lines.append("|---|" + "---|" * len(cur["hosts"]) + ("---|" if prev else ""))
    for key, label in NUMERIC:
        row = [str(dig(cur["per_host"][h], key)) for h in cur["hosts"]]
        extra = ""
        if prev:
            extra = " | " + " / ".join(str(dig(prev["per_host"][h], key)) for h in cur["hosts"])
        lines.append(f"| {label} | " + " | ".join(row) + extra + " |")
    for h in cur["hosts"]:
        m = cur["longest_monologues"][h]["longest"]
        if m:
            lines.append(f"\nLongest monologue, {h}: {m[0]['seconds']} s at {m[0]['at']}: {m[0]['text']}")
    sil = cur["silence"]
    lines.append(f"\nSilence over {sil['min_gap_seconds']} s: {sil['count']} stretches, {sil['total_seconds']} s total"
                 + (f"; longest {sil['longest'][0]['seconds']} s at {sil['longest'][0]['at']}" if sil["longest"] else "") + ".")
    if a.get("method") != "labels":
        lines += ["", "Spot checks (confirm who is speaking):"]
        lines += [f"- {c['at']} labelled {c['labelled_as']}: {c['text']}" for c in cur["spot_checks"]]
    return "\n".join(lines) + "\n"


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("transcript", help=".vtt caption file or speaker-labelled .txt")
    p.add_argument("--previous", help="last week's transcript, for week-on-week numbers")
    p.add_argument("--hosts", default="Vincent,Mitchell", help="comma-separated, in order")
    p.add_argument("--lane0", help="host who speaks first in the captions (overrides the inference)")
    p.add_argument("--flip-at", default="", help="comma-separated times (m:ss or h:mm:ss) where the "
                   "inferred speakers swap, to correct drift found at a spot check")
    p.add_argument("--countdown", type=float, default=30, help="seconds of countdown before going live")
    p.add_argument("--format", choices=["json", "md"], default="json")
    args = p.parse_args(argv)
    hosts = [h.strip() for h in args.hosts.split(",")]
    if len(hosts) != 2:
        p.error("exactly two hosts")
    if args.lane0 and args.lane0 not in hosts:
        p.error("--lane0 must be one of the hosts")
    flips = [parse_clock(x) for x in args.flip_at.split(",") if x.strip()]
    cur = analyze(args.transcript, hosts, args.lane0, args.countdown, flips)
    prev = analyze(args.previous, hosts, None, args.countdown) if args.previous else None
    if args.format == "md":
        sys.stdout.write(render_md(cur, prev))
    else:
        out = {"current": cur}
        if prev:
            out["previous"] = prev
        json.dump(out, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
