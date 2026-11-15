#!/usr/bin/env python3
"""Release-package check: title, tweet, Shorts, thumbnails and caption safe zones, as a PASS/WARN/FAIL report.

Step 5 of the edit automation. It reports; it never edits, renders or uploads. Stdlib Python; ffprobe only with --probe.
Every rule is cited to the vault (`brand/editing.md`, `brand/thumbnail-safe-zones.md`) or to the public `skills/` notes.
Where no rule exists the check says so and does not invent one (see UNSPECIFIED, also written to the JSON).

Usage:
  check.py --package package.json [--episode DIR] [--out DIR] [--probe] [--strict]
  check.py --episode DIR            # title and Shorts from DIR/upload-plan.json
Exit code: 1 if any check FAILs (--strict also fails on WARN), 0 otherwise.
Output: package-check.json and package-check.md in --out (default: next to the package file, else DIR/out/package/).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import safezone as Z  # noqa: E402

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"
ORDER = {PASS: 0, WARN: 1, FAIL: 2}

TITLE_MAX, TITLE_WARN_MAX, TITLE_SKILL_AIM = 45, 50, 40
TWEET_OK, TWEET_MAX = 240, 280
MAX_HASHTAGS = 2
N_SHORTS, N_THUMBS = 5, 3
SHORT_MIN_S, SHORT_MAX_S = 45, 90
SHORT_TITLE_MAX = 100                      # YouTube's own title limit
SMALL_WORDS = {"a", "an", "the", "and", "but", "or", "nor", "for", "on", "in", "at", "to", "of", "by", "vs", "as", "if"}

R_TITLE = "vault brand/editing.md, title row (about 45 characters at most, Title Case: every word capitalised, 13 Nov; no [LIVE])"
R_TWEET = "vault brand/editing.md, tweet standard (take first, one real receipt, link in the first reply, three checks); skills/x"
R_SHORTS = "vault brand/editing.md, Shorts row (5 Shorts, 45 to 90 s); shorts/stacked.py and shorts/build.py (locked caption layout)"
R_THUMBS = "vault _admin/docs/audits/2026-11-14/editing-automation-audit.md, gap 5 (three thumbnails per episode); brand/editing.md thumbnails row"
R_XCOPY = "vault brand/editing.md, X copy (burned captions, full quality, not recompressed or downscaled to fit)"

# Where the rules say nothing. Reported with every run so a PASS is not read as more than it is.
UNSPECIFIED = [
    "Title under 40 characters: the vault sets only an upper bound (about 45), so a short title passes; skills/metadata aims for 40 or fewer.",
    "Tweet length: the vault sets none; the 240 (warn) and 280 (fail) limits come from skills/x and X's own limit.",
    "Tweet link: the vault and skills/x put the link in the first reply and not in the tweet, so a link in the tweet FAILs here.",
    "Title Case for Shorts titles: not specified, so it is not checked.",
    "Three thumbnails: an audit gap (gap 5), not a rule in brand/editing.md; a different count WARNs.",
    "Thumbnail content (hosts at the edges, no title text) and size: not checked; the check only counts files.",
    "X/LinkedIn copy caption style and zone: brand/editing.md lists it as an open gap; the landscape zone in safezone.py is a measured house default, not a vault rule.",
    "Words per Shorts caption chunk: only checked when the package lists the chunks (captions.chunks) or the longest chunk (captions.max_words); a chunk over 3 words WARNs.",
    "Overlay graphics (asterisk, b-roll, mascot) inside the Shorts graphics safe box x48-888 / y400-1248: the package carries no graphics data, so this is not checked here (unit-tested for the asterisk, documented for the rest).",
    "Burned captions over host faces: only the face band measured on the 261111 two-shot is known; a different framing needs a different profile.",
]


# ---- individual checks ------------------------------------------------------------------------------

def item(level, cid, subject, message, rule=""):
    return {"level": level, "id": cid, "subject": subject, "message": message, "rule": rule}


def title_case_issues(title):
    """(hard, soft): words that start lowercase (a real miss) and small words left lowercase (the vault says every word)."""
    hard, soft = [], []
    for word in re.split(r"\s+", title.strip()):
        for part in word.split("-"):
            core = re.sub(r"^[^A-Za-z0-9]+", "", part)
            if not core or not core[0].isalpha() or core[0].isupper():
                continue
            (soft if core.lower() in SMALL_WORDS else hard).append(core)
    return hard, soft


def check_title(title):
    s, out = "title", []
    if not (title or "").strip():
        return [item(FAIL, "title.present", s, "no title", R_TITLE)]
    t = title.strip()
    n = len(t)
    if n <= TITLE_MAX:
        out.append(item(PASS, "title.length", s, f"{n} characters (limit about {TITLE_MAX}; aim {TITLE_SKILL_AIM} or fewer per skills/metadata)", R_TITLE))
    elif n <= TITLE_WARN_MAX:
        out.append(item(WARN, "title.length", s, f"{n} characters, over the {TITLE_MAX} limit by {n - TITLE_MAX}", R_TITLE))
    else:
        out.append(item(FAIL, "title.length", s, f"{n} characters, over the {TITLE_MAX} limit by {n - TITLE_MAX}", R_TITLE))
    hard, soft = title_case_issues(t)
    if hard:
        out.append(item(FAIL, "title.case", s, "not Title Case, lowercase start: " + ", ".join(hard), R_TITLE))
    elif soft:
        out.append(item(WARN, "title.case", s, "small words left lowercase (the vault says every word is capitalised): " + ", ".join(soft), R_TITLE))
    else:
        out.append(item(PASS, "title.case", s, "every word capitalised", R_TITLE))
    if re.search(r"\[\s*live\s*\]", t, re.I):
        out.append(item(FAIL, "title.live", s, "contains [LIVE]", R_TITLE))
    return out


URL_RE = re.compile(r"(?:https?://|\b(?:youtu\.be|youtube\.com)/)\S+", re.I)
HASHTAG_RE = re.compile(r"(?<![\w&])#\w+")
PLACEHOLDER = "{episode_link}"
FIRST_WORDS = re.compile(r"^\s*(new (video|episode)|watch|edited with|check out)\b", re.I)


def check_tweet(tweet, episode_link=""):
    s, out = "tweet", []
    tweet = tweet or {}
    text = (tweet.get("text") or "").strip()
    if not text:
        return [item(FAIL, "tweet.present", s, "no tweet text", R_TWEET)]
    n = len(text)
    lvl = PASS if n <= TWEET_OK else WARN if n <= TWEET_MAX else FAIL
    out.append(item(lvl, "tweet.length", s, f"{n} characters (under about {TWEET_OK} per skills/x; X limit {TWEET_MAX})", R_TWEET))
    tags = HASHTAG_RE.findall(text)
    if any(t.lower() == "#ai" for t in tags):
        out.append(item(FAIL, "tweet.hashtags", s, "uses #ai (skills/x: never)", R_TWEET))
    elif len(tags) > MAX_HASHTAGS:
        out.append(item(FAIL, "tweet.hashtags", s, f"{len(tags)} hashtags (0 to {MAX_HASHTAGS} niche ones)", R_TWEET))
    else:
        out.append(item(PASS, "tweet.hashtags", s, f"{len(tags)} hashtags", R_TWEET))
    if URL_RE.search(text) or PLACEHOLDER in text:
        out.append(item(FAIL, "tweet.link", s, "the link is in the tweet; it belongs in the first reply", R_TWEET))
    else:
        out.append(item(PASS, "tweet.link", s, "no link in the tweet", R_TWEET))
    reply = (tweet.get("first_reply") or "").strip()
    if not reply:
        out.append(item(FAIL, "tweet.first_reply", s, "no first reply; it carries the episode link", R_TWEET))
    else:
        urls = URL_RE.findall(reply)
        if PLACEHOLDER in reply:
            out.append(item(PASS, "tweet.first_reply", s, f"first reply carries the {PLACEHOLDER} placeholder (fill it before posting)", R_TWEET))
        elif not urls:
            out.append(item(FAIL, "tweet.first_reply", s, f"first reply has no episode link or {PLACEHOLDER} placeholder", R_TWEET))
        elif episode_link and not any(episode_link.rstrip("/") in u for u in urls):
            out.append(item(WARN, "tweet.first_reply", s, "first reply link differs from the package episode_link", R_TWEET))
        elif not any("utm_" in u for u in urls):
            out.append(item(WARN, "tweet.first_reply", s, "first reply link has no UTM tags (skills/x)", R_TWEET))
        else:
            out.append(item(PASS, "tweet.first_reply", s, "first reply carries the tagged episode link", R_TWEET))
    # the vault's three checks need a human; only the two cheap tells are flagged
    soft = []
    if FIRST_WORDS.search(text):
        soft.append("opens like an announcement (\"New video\", \"Watch\"), not a take")
    if not re.search(r"\d|\"|“", text):
        soft.append("no number or quote, so probably no real receipt")
    out.append(item(WARN if soft else PASS, "tweet.standard", s,
                    ("; ".join(soft) if soft else "no announcement opener, has a number or quote") + " (heuristic; the three checks need a human)", R_TWEET))
    return out


def probe(path, ffprobe="ffprobe"):
    """{width, height, duration} via ffprobe, or None when unavailable."""
    try:
        r = subprocess.run([ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                            "-of", "json", str(path)], capture_output=True, text=True, check=True)
        j = json.loads(r.stdout)
        st = (j.get("streams") or [{}])[0]
        return {"width": st.get("width"), "height": st.get("height"), "duration": float(j["format"]["duration"])}
    except (OSError, subprocess.CalledProcessError, KeyError, ValueError):
        return None


def check_captions(profile, spec, subject, rule):
    """Caption safe zone from a measured extent (`extent`, written by render/dual.py) or a declared {cap_h, cy, width}."""
    spec = spec or {}
    if spec.get("extent"):
        box, cy, how = tuple(spec["extent"]), None, "measured extent"
    elif not any(k in spec for k in ("cap_h", "cy", "width")):
        return [item(WARN, "captions.zone", subject,
                     f"no caption spec in the package; the {profile['name']} defaults sit inside the zone but nothing confirms the render used them", rule)]
    else:
        cy = spec.get("cy", profile["cy"])
        box = Z.caption_box(profile, spec.get("cap_h", profile["cap_h"]), spec.get("width", profile["max_w"]), cy)
        how = "declared"
    bad = Z.violations(profile, box, cy)
    if bad:
        out = [item(FAIL, "captions.zone", subject, f"outside the {profile['name']} safe zone ({how}): " + "; ".join(bad), rule)]
    else:
        out = [item(PASS, "captions.zone", subject, f"inside the {profile['name']} safe zone ({how}; {Z.zone_summary(profile)})", rule)]
    return out + check_caption_words(profile, spec, subject, rule)


def check_caption_words(profile, spec, subject, rule):
    """WARN when a Shorts caption chunk has more than the profile's word limit (3). `spec` may list the chunk texts
    (`chunks`) or give the largest chunk's word count (`max_words`); without either nothing is known and nothing is said."""
    limit = profile.get("max_words")
    if not limit:
        return []
    spec = spec or {}
    counts = [len(str(t).split()) for t in spec.get("chunks") or []]
    if spec.get("max_words") is not None:
        counts.append(int(spec["max_words"]))
    if not counts:
        return []
    over = [n for n in counts if n > limit]
    if over:
        return [item(WARN, "captions.words", subject,
                     f"{len(over)} caption chunk(s) over {limit} words (longest {max(over)}); the Shorts rule is {limit} words a chunk at most", rule)]
    return [item(PASS, "captions.words", subject, f"every caption chunk has {limit} words or fewer", rule)]


def _exists(path, base):
    p = Path(path)
    return (p if p.is_absolute() else base / p)


def check_shorts(shorts, base, do_probe, ffprobe="ffprobe"):
    out = []
    n = len(shorts or [])
    out.append(item(PASS if n == N_SHORTS else FAIL, "shorts.count", "shorts", f"{n} Shorts (need {N_SHORTS})", R_SHORTS))
    for i, sh in enumerate(shorts or [], 1):
        s = f"short {sh.get('id') or i}"
        title = (sh.get("title") or "").strip()
        if not title:
            out.append(item(FAIL, "short.title", s, "no title", R_SHORTS))
        elif len(title) > SHORT_TITLE_MAX:
            out.append(item(FAIL, "short.title", s, f"title is {len(title)} characters (YouTube limit {SHORT_TITLE_MAX})", R_SHORTS))
        else:
            out.append(item(PASS, "short.title", s, f"title present ({len(title)} characters)", R_SHORTS))
        dur, f = sh.get("duration_s"), sh.get("file")
        if not f:
            out.append(item(FAIL, "short.file", s, "no file", R_SHORTS))
        else:
            p = _exists(f, base)
            if not p.exists():
                out.append(item(FAIL, "short.file", s, f"file not found: {Path(f).name}", R_SHORTS))
            else:
                out.append(item(PASS, "short.file", s, f"file present ({Path(f).name})", R_SHORTS))
                if do_probe and dur is None:
                    info = probe(p, ffprobe)
                    dur = info["duration"] if info else None
        if dur is None:
            out.append(item(WARN, "short.duration", s, "duration unknown (give duration_s or run with --probe)", R_SHORTS))
        elif SHORT_MIN_S <= float(dur) <= SHORT_MAX_S:
            out.append(item(PASS, "short.duration", s, f"{float(dur):.1f} s (45 to 90)", R_SHORTS))
        else:
            out.append(item(WARN, "short.duration", s, f"{float(dur):.1f} s, outside 45 to 90", R_SHORTS))
        layout = sh.get("layout") or "stacked"
        try:
            prof = Z.profile_for((1080, 1920), layout)
        except ValueError as e:
            out.append(item(FAIL, "captions.zone", s, str(e), R_SHORTS))
            continue
        out += check_captions(prof, sh.get("captions"), s, R_SHORTS)
    return out


def check_thumbnails(thumbs, base):
    thumbs = thumbs or []
    out = []
    n = len(thumbs)
    if n == 0:
        out.append(item(FAIL, "thumbnails.count", "thumbnails", f"no thumbnails (need {N_THUMBS})", R_THUMBS))
    elif n != N_THUMBS:
        out.append(item(WARN, "thumbnails.count", "thumbnails", f"{n} thumbnails (three per episode is an audit gap, not a vault rule)", R_THUMBS))
    else:
        out.append(item(PASS, "thumbnails.count", "thumbnails", f"{N_THUMBS} thumbnails", R_THUMBS))
    for t in thumbs:
        if not _exists(t, base).exists():
            out.append(item(FAIL, "thumbnails.file", "thumbnails", f"file not found: {Path(t).name}", R_THUMBS))
    return out


def check_x_copy(x, base, do_probe, ffprobe="ffprobe"):
    s = "X/LinkedIn copy"
    if not x:
        return [item(WARN, "xcopy.present", s, "no X/LinkedIn copy in the package", R_XCOPY)]
    out = []
    f = x.get("file")
    if not f:
        out.append(item(WARN, "xcopy.file", s, "no file named", R_XCOPY))
    elif not _exists(f, base).exists():
        out.append(item(FAIL, "xcopy.file", s, f"file not found: {Path(f).name}", R_XCOPY))
    else:
        out.append(item(PASS, "xcopy.file", s, f"file present ({Path(f).name})", R_XCOPY))
    prof = Z.profile_for((1920, 1080), x.get("profile") or "landscape")
    spec = dict(x)
    rep = x.get("report")
    if rep:
        rp = _exists(rep, base)
        if rp.exists():
            try:
                cap = json.loads(rp.read_text()).get("captions") or {}
                if cap.get("extent"):
                    spec = {"extent": cap["extent"]}
            except ValueError:
                out.append(item(WARN, "xcopy.report", s, f"{rp.name} is not valid JSON", R_XCOPY))
        else:
            out.append(item(WARN, "xcopy.report", s, f"render report not found: {Path(rep).name}", R_XCOPY))
    out += check_captions(prof, spec, s, R_XCOPY)
    if do_probe and f and _exists(f, base).exists():
        info = probe(_exists(f, base), ffprobe)
        if info and (info["width"], info["height"]) != tuple(prof["canvas"]):
            out.append(item(WARN, "xcopy.size", s, f"{info['width']}x{info['height']}, expected {prof['canvas'][0]}x{prof['canvas'][1]} (not downscaled)", R_XCOPY))
        elif info:
            out.append(item(PASS, "xcopy.size", s, f"{info['width']}x{info['height']}, full size", R_XCOPY))
    return out


# ---- package assembly and report ------------------------------------------------------------------------

def from_episode(episode):
    """Title and Shorts from <episode>/upload-plan.json (item id 'main' and kind 'short'); nothing else is guessed."""
    plan = Path(episode) / "upload-plan.json"
    if not plan.exists():
        return {}
    items = json.loads(plan.read_text()).get("items", [])
    pkg = {"title": "", "shorts": []}
    for it in items:
        if it.get("id") == "main":
            pkg["title"] = it.get("title", "")
        elif it.get("kind") == "short":
            pkg["shorts"].append({"id": it.get("id"), "title": it.get("title", ""), "file": it.get("file")})
    return pkg


def run_checks(pkg, base=Path("."), do_probe=False, ffprobe="ffprobe"):
    res = []
    res += check_title(pkg.get("title"))
    res += check_tweet(pkg.get("tweet"), pkg.get("episode_link", ""))
    res += check_shorts(pkg.get("shorts"), base, do_probe, ffprobe)
    res += check_thumbnails(pkg.get("thumbnails"), base)
    res += check_x_copy(pkg.get("x_copy"), base, do_probe, ffprobe)
    counts = {k: sum(1 for r in res if r["level"] == k) for k in (PASS, WARN, FAIL)}
    overall = FAIL if counts[FAIL] else WARN if counts[WARN] else PASS
    return {"schema": 1, "episode": pkg.get("episode", ""), "overall": overall, "counts": counts, "checks": res,
            "unspecified": UNSPECIFIED}


def render_markdown(rep):
    c = rep["counts"]
    lines = [f"# Package check{': ' + rep['episode'] if rep['episode'] else ''}", "",
             f"**{rep['overall']}**: {c[PASS]} pass, {c[WARN]} warn, {c[FAIL]} fail.", "",
             "| Level | Check | Subject | Result |", "|---|---|---|---|"]
    for r in sorted(rep["checks"], key=lambda r: -ORDER[r["level"]]):
        lines.append(f"| {r['level']} | {r['id']} | {r['subject']} | {r['message'].replace('|', '/')} |")
    rules = sorted({r["rule"] for r in rep["checks"] if r["rule"]})
    lines += ["", "## Rules cited", ""] + [f"- {x}" for x in rules]
    lines += ["", "## Not specified (no rule invented)", ""] + [f"- {x}" for x in rep["unspecified"]]
    lines += ["", "A PASS means the package matches the written rules; it does not mean the captions, title or tweet are good. Listen to and read the output before posting.", ""]
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--package", help="package JSON (see README)")
    ap.add_argument("--episode", help="episode project folder; title and Shorts come from its upload-plan.json")
    ap.add_argument("--out", help="folder for package-check.json and package-check.md")
    ap.add_argument("--probe", action="store_true", help="ffprobe the Shorts durations and the X copy size")
    ap.add_argument("--strict", action="store_true", help="exit 1 on WARN as well as FAIL")
    ap.add_argument("--ffprobe", default="ffprobe")
    a = ap.parse_args(argv)
    if not a.package and not a.episode:
        ap.error("give --package and/or --episode")
    pkg = from_episode(a.episode) if a.episode else {}
    base = Path(a.episode) if a.episode else Path(".")
    if a.package:
        pp = Path(a.package)
        pkg.update(json.loads(pp.read_text()))
        base = pp.resolve().parent
    out = Path(a.out) if a.out else (Path(a.episode) / "out" / "package" if a.episode and not a.package else base)
    rep = run_checks(pkg, base, a.probe, a.ffprobe)
    out.mkdir(parents=True, exist_ok=True)
    (out / "package-check.json").write_text(json.dumps(rep, indent=2) + "\n")
    md = render_markdown(rep)
    (out / "package-check.md").write_text(md)
    print(md)
    return 1 if rep["counts"][FAIL] or (a.strict and rep["counts"][WARN]) else 0


if __name__ == "__main__":
    sys.exit(main())
