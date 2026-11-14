"""Pure logic of the privacy sweep: what counts as sensitive on-screen text, redaction, range merging, blur output.

No ffmpeg, no OCR and no file access here (config files are read by sweep.py and passed in as lists), so everything
in this module is unit-tested. The matched value is never returned: a match carries its span, and previews are built
with `redact` (first 3 characters plus the length).
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2}

# Secret formats with a known prefix. Prefixes are written as alternations of short pieces so this file never
# contains a complete provider-shaped literal.
API_KEY_PATTERNS = [
    ("openai-style", r"\bsk-(?:proj-|ant-[a-z0-9]+-|live-)?[A-Za-z0-9_-]{20,}"),
    ("stripe-style", r"\b[sprw]k_(?:live|test)_[A-Za-z0-9]{16,}"),
    ("github", r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})"),
    ("aws-access-key", r"\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[0-9A-Z]{16}\b"),
    ("slack", r"\bxox[abposr]-[A-Za-z0-9-]{10,}"),
    ("google-api", r"\bAIza[0-9A-Za-z_-]{35}\b"),
    ("gitlab", r"\bglpat-[A-Za-z0-9_-]{20,}"),
    ("npm", r"\bnpm_[A-Za-z0-9]{30,}"),
    ("sendgrid", r"\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}"),
    # \S rather than a strict alphabet: OCR swaps look-alike letters (a Cyrillic "a" for a Latin one) inside tokens.
    ("bearer", r"\b[Bb]earer\s+[^\s\"'<>]{20,}"),
    ("private-key", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
]
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")
LONG_HEX = re.compile(r"(?<![0-9A-Za-z])[0-9a-fA-F]{32,}(?![0-9A-Za-z])")
LONG_B64 = re.compile(r"(?<![A-Za-z0-9+/_=-])[A-Za-z0-9+/_=-]{40,}(?![A-Za-z0-9+/_=-])")
ENV_LINE = re.compile(r"^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*=\s*(\S.*)$")
SECRET_KEY_WORDS = ("KEY", "TOKEN", "SECRET", "PASSWORD", "PASSWD", "PWD", "CREDENTIAL", "PRIVATE", "AUTH", "DSN",
                    "DATABASE_URL", "CONNECTION")
EMAIL = re.compile(r"(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
PHONE_INTL = re.compile(r"(?<![\w+])\+\d{1,3}[ .-]?\(?\d{1,4}\)?(?:[ .-]?\d{2,4}){2,4}(?!\d)")
PHONE_US = re.compile(r"(?<![\d.])(?:\(\d{3}\)\s?|\d{3}[ .-])\d{3}[ .-]\d{4}(?!\d)")
PHONE_FR = re.compile(r"(?<![\d.])0[1-9](?:[ .-]\d{2}){4}(?!\d)")
IBAN = re.compile(r"\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,4})?\b")
CARD = re.compile(r"(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])")
URL = re.compile(r"\b[a-z][a-z0-9+.-]*://[^\s\"'<>)]+", re.I)
URL_SECRET_PARAM = re.compile(
    r"(?:token|secret|password|passwd|pwd|api[_-]?key|apikey|access[_-]?key|auth|signature|sig|session|credential|"
    r"client[_-]?secret|key)=([^&\s]{6,})", re.I)
URL_USERINFO = re.compile(r"^[a-z][a-z0-9+.-]*://[^/\s:@]+:[^/\s@]+@", re.I)
HOME_PATH = re.compile(r"(?:/Users|/home)/[A-Za-z0-9._-]+(?:/[^\s\"'<>]*)?|[A-Za-z]:\\Users\\[A-Za-z0-9._ -]+(?:\\[^\s\"'<>]*)?")

# Higher priority first: when two matches overlap, the first one in this order wins.
PRIORITY = ["api_key", "jwt", "private_key", "card", "iban", "env_line", "url_secret", "denylist", "email", "phone",
            "home_path", "long_secret"]
CATEGORIES = PRIORITY


@dataclass(frozen=True)
class Match:
    category: str
    start: int
    end: int
    severity: str
    rule: str


def redact(text: str) -> str:
    """First 3 characters plus the length: enough to recognise a hit, never the value."""
    return f"{text[:3]}...[{len(text)}]"


def shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    counts: dict[str, int] = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1
    return -sum(n / len(text) * math.log2(n / len(text)) for n in counts.values())


def luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d = d * 2 - 9 if d * 2 > 9 else d * 2
        total += d
        alt = not alt
    return total % 10 == 0


def iban_ok(raw: str) -> bool:
    s = raw.replace(" ", "").upper()
    if not 15 <= len(s) <= 34 or not s[:2].isalpha() or not s[2:4].isdigit():
        return False
    moved = s[4:] + s[:4]
    try:
        number = "".join(str(int(c, 36)) for c in moved)
    except ValueError:
        return False
    return int(number) % 97 == 1


def parse_config_lines(text: str) -> list[str]:
    """Config file format: one entry per line, `#` starts a comment, blank lines ignored."""
    out = []
    for raw in text.splitlines():
        line = raw.split(" #", 1)[0].strip() if not raw.lstrip().startswith("#") else ""
        if line:
            out.append(line)
    return out


@dataclass
class Rules:
    denylist: list[str] = field(default_factory=list)
    allowlist: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._deny = []
        for i, entry in enumerate(self.denylist, 1):
            if entry.lower().startswith("re:"):
                pattern = re.compile(entry[3:], re.I)
            else:
                pattern = re.compile(r"(?<![A-Za-z0-9])" + re.escape(entry) + r"(?![A-Za-z0-9])", re.I)
            self._deny.append((f"denylist#{i}", pattern))
        self._allow_regex = [re.compile(e[3:], re.I) for e in self.allowlist if e.lower().startswith("re:")]
        self._allow_plain = [e.lower() for e in self.allowlist if not e.lower().startswith("re:")]

    def allowed(self, text: str) -> bool:
        """True when the allowlist covers the matched text: exact, `@domain`, a domain (email or URL host), or a prefix."""
        low = text.lower()
        host = None
        if "@" in low and not low.startswith("http"):
            host = low.rsplit("@", 1)[1]
        elif low.startswith("http"):
            host = re.sub(r"^https?://([^/:?#]+@)?", "", low).split("/")[0].split(":")[0].split("?")[0]
        for entry in self._allow_plain:
            if low == entry:
                return True
            if entry.startswith("@") and low.endswith(entry):
                return True
            if host and (host == entry or host.endswith("." + entry)):
                return True
            if "/" in entry and low.startswith(entry.rstrip("/")):
                return True
        return any(r.search(text) for r in self._allow_regex)


def _find_all(line: str, rules: Rules) -> list[tuple[Match, str]]:
    found: list[tuple[Match, str]] = []

    def add(cat: str, m: re.Match, sev: str, rule: str, group: int = 0) -> None:
        found.append((Match(cat, m.start(group), m.end(group), sev, rule), m.group(group)))

    for name, pat in API_KEY_PATTERNS:
        for m in re.finditer(pat, line):
            add("api_key", m, "high", name)
    for m in JWT.finditer(line):
        add("jwt", m, "high", "jwt")
    for m in CARD.finditer(line):
        digits = re.sub(r"\D", "", m.group())
        if 13 <= len(digits) <= 19 and luhn_ok(digits):
            add("card", m, "high", "luhn")
    for m in IBAN.finditer(line):
        if iban_ok(m.group()):
            add("iban", m, "high", "mod97")
    env = ENV_LINE.match(line)
    if env:
        key, value = env.group(1), env.group(2).strip().strip("\"'")
        secretish = any(w in key for w in SECRET_KEY_WORDS)
        trivial = value.lower() in {"true", "false", "null", "none", "development", "production", "test"} or value.isdigit() and len(value) < 5
        if len(value) >= 3 and not trivial:
            found.append((Match("env_line", env.start(0), env.end(0), "high" if secretish else "low",
                                "secret-key-name" if secretish else "key-value"), env.group(0)))
    for m in URL.finditer(line):
        url = m.group().rstrip(".,;")
        sub = URL_SECRET_PARAM.search(url)
        if sub or URL_USERINFO.match(url):
            found.append((Match("url_secret", m.start(), m.start() + len(url), "high",
                                "query-secret" if sub else "userinfo"), url))
    for rule, pat in rules._deny:
        for m in pat.finditer(line):
            add("denylist", m, "medium", rule)
    for m in EMAIL.finditer(line):
        add("email", m, "medium", "email")
    for name, pat in (("intl", PHONE_INTL), ("us", PHONE_US), ("fr", PHONE_FR)):
        for m in pat.finditer(line):
            if 9 <= len(re.sub(r"\D", "", m.group())) <= 15:
                add("phone", m, "medium", f"phone-{name}")
    for m in HOME_PATH.finditer(line):
        add("home_path", m, "medium", "home-path")
    for m in LONG_HEX.finditer(line):
        if len(m.group()) != 40:  # exactly 40 hex characters is a git commit id, shown everywhere
            add("long_secret", m, "low", "hex")
    for m in LONG_B64.finditer(line):
        tok = m.group()
        if (any(c.isdigit() for c in tok) and any(c.isalpha() for c in tok) and tok.count("/") < 2
                and "://" not in tok and shannon_entropy(tok) >= 3.6):
            add("long_secret", m, "low", "base64-like")
    return found


def scan_line(line: str, rules: Rules) -> list[tuple[Match, str]]:
    """All non-overlapping sensitive matches in one OCR line as (Match, matched text), allowlisted ones removed.

    The matched text is returned so the caller can redact it immediately; it must not be stored or printed.
    """
    found = [(m, text) for m, text in _find_all(line, rules) if not rules.allowed(text)]
    found.sort(key=lambda item: (PRIORITY.index(item[0].category), item[0].start))
    kept: list[tuple[Match, str]] = []
    for m, text in found:
        if all(m.end <= k.start or m.start >= k.end for k, _ in kept):
            kept.append((m, text))
    return sorted(kept, key=lambda item: item[0].start)


def span_box(tokens: list[dict], start: int, end: int, line_box: list[float]) -> list[int]:
    """Pixel box [x, y, w, h] of the OCR tokens overlapping the character span; the whole line when none do."""
    boxes = [t["box"] for t in tokens if t["start"] < end and t["end"] > start]
    if not boxes:
        boxes = [line_box]
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[0] + b[2] for b in boxes)
    y1 = max(b[1] + b[3] for b in boxes)
    return [round(x0), round(y0), round(x1 - x0), round(y1 - y0)]


# --- time ranges and boxes ---------------------------------------------------------------------------------

def merge_ranges(hits: list[dict], pad: float, gap: float, duration: float | None = None) -> list[dict]:
    """Merge hit times into review ranges. Each hit covers [t - pad, t + pad]; ranges closer than `gap` are joined."""
    spans = sorted(((max(0.0, h["time"] - pad), h["time"] + pad, h) for h in hits), key=lambda x: (x[0], x[1]))
    out: list[dict] = []
    for start, end, hit in spans:
        if duration is not None:
            end = min(end, duration)
        if out and start <= out[-1]["end"] + gap:
            cur = out[-1]
            cur["end"] = max(cur["end"], end)
            cur["hits"] += 1
            cur["categories"][hit["category"]] = cur["categories"].get(hit["category"], 0) + 1
            if SEVERITY_RANK[hit["severity"]] > SEVERITY_RANK[cur["severity"]]:
                cur["severity"] = hit["severity"]
        else:
            out.append({"start": start, "end": end, "hits": 1, "categories": {hit["category"]: 1},
                        "severity": hit["severity"]})
    for r in out:
        r["start"], r["end"] = round(r["start"], 2), round(r["end"], 2)
    return out


def _overlap(a: list[int], b: list[int]) -> float:
    ix = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
    smaller = max(1, min(a[2] * a[3], b[2] * b[3]))
    return ix * iy / smaller


def _union(a: list[int], b: list[int]) -> list[int]:
    x0, y0 = min(a[0], b[0]), min(a[1], b[1])
    x1, y1 = max(a[0] + a[2], b[0] + b[2]), max(a[1] + a[3], b[1] + b[3])
    return [x0, y0, x1 - x0, y1 - y0]


def track_boxes(hits: list[dict], pad: float, gap: float, min_overlap: float = 0.3) -> list[dict]:
    """Group hits whose boxes overlap across consecutive samples into regions: {start, end, box, category list}.

    A region is the union of its boxes, so text that scrolls produces one taller box rather than many thin ones.
    """
    regions: list[dict] = []
    for hit in sorted(hits, key=lambda h: h["time"]):
        start, end = max(0.0, hit["time"] - pad), hit["time"] + pad
        for reg in regions:
            if start <= reg["end"] + gap and _overlap(reg["box"], hit["box"]) >= min_overlap:
                reg["end"] = max(reg["end"], end)
                reg["box"] = _union(reg["box"], hit["box"])
                reg["categories"].add(hit["category"])
                break
        else:
            regions.append({"start": start, "end": end, "box": list(hit["box"]), "categories": {hit["category"]}})
    for reg in regions:
        reg["start"], reg["end"] = round(reg["start"], 2), round(reg["end"], 2)
        reg["categories"] = sorted(reg["categories"])
    return sorted(regions, key=lambda r: (r["start"], r["box"][1]))


def pad_box(box: list[int], px: int, width: int, height: int) -> list[int]:
    """Grow a box by px on every side, clip to the frame, snap to even numbers (yuv420 friendly)."""
    x0, y0 = max(0, box[0] - px) // 2 * 2, max(0, box[1] - px) // 2 * 2
    x1, y1 = min(width, box[0] + box[2] + px), min(height, box[1] + box[3] + px)
    w, h = (x1 - x0 + 1) // 2 * 2, (y1 - y0 + 1) // 2 * 2
    return [x0, y0, min(w, width // 2 * 2 - x0), min(h, height // 2 * 2 - y0)]


def blur_filter(regions: list[dict], width: int, height: int, px: int = 8) -> str:
    """An ffmpeg filter_complex that boxblurs each region during its time range ([0:v] in, [vout] out)."""
    if not regions:
        return "[0:v]null[vout]"
    parts, last = [], "0:v"
    for i, reg in enumerate(regions):
        x, y, w, h = pad_box(reg["box"], px, width, height)
        radius = max(1, min(w, h) // 4 - 1)
        parts.append(f"[{last}]split[a{i}][b{i}]")
        parts.append(f"[b{i}]crop={w}:{h}:{x}:{y},boxblur=luma_radius={radius}:luma_power=3[bl{i}]")
        out = "vout" if i == len(regions) - 1 else f"v{i + 1}"
        parts.append(f"[a{i}][bl{i}]overlay={x}:{y}:enable='between(t,{reg['start']},{reg['end']})'[{out}]")
        last = out
    return ";\n".join(parts)


def blur_csv(regions: list[dict], width: int, height: int, px: int = 8) -> str:
    """EDL-style rows (seconds and pixels) for an editor or another script: start,end,x,y,w,h,categories."""
    rows = ["start,end,x,y,w,h,categories"]
    for reg in regions:
        x, y, w, h = pad_box(reg["box"], px, width, height)
        rows.append(f"{reg['start']},{reg['end']},{x},{y},{w},{h},{'+'.join(reg['categories'])}")
    return "\n".join(rows) + "\n"


def timecode(seconds: float) -> str:
    tenths = int(round(seconds * 10))
    whole = tenths // 10
    return f"{whole // 3600:02d}:{whole % 3600 // 60:02d}:{whole % 60:02d}.{tenths % 10}"
