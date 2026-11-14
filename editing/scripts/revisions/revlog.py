#!/usr/bin/env python3
"""Revisions log and b-roll credits for an episode's edit.

Two jobs, both writing into the episode's out/ folder (never into the repository):

  revlog.py add     --episode-dir EP --note "what changed" [--field k=v ...] [--edl EDL.json]
                    [--output FILE ...] [--input name=PATH ...] [--no-source-hash]
  revlog.py show    --episode-dir EP [vN] [--json]
  revlog.py diff    --episode-dir EP vN vM [--json]
  revlog.py credits --episode-dir EP [--broll-dir DIR] [--plan FILE ...] [--scan-folder] [--strict]

`add` appends one record to out/revisions.jsonl (append-only: v1, v2, ...) holding the note, structured
fields, sha256 of the inputs (source, EDL, chapters.json, every short.json), tool versions (git commit of
these scripts, ffmpeg), each output's sha256, duration and loudness (ebur128 integrated LUFS and true peak),
and a cut-list summary when an EDL JSON is given. out/revisions.md is re-rendered from the JSONL each time.
`credits` reads every b-roll clip the episode uses, looks for sidecar attribution metadata and writes
out/credits.md; a clip with no creator/license on record is listed as UNVERIFIED, never given an invented credit.

<episode> is an episode folder (projects/<YYYY-MM-DD>_<YYMMDD>) or its id (<YYMMDD>). Stdlib only plus
ffmpeg/ffprobe. Run it on the Mac Studio. Details and the sidecar schema: editing/scripts/revisions/README.md.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import workspace  # noqa: E402  (shared content-root and episode lookup)

SCHEMA = 1
SCRIPTS_DIR = Path(__file__).resolve().parents[1]
MEDIA_EXT = (".mp4", ".mov", ".webm", ".mkv", ".m4v", ".gif", ".png", ".jpg", ".jpeg", ".webp")


def die(msg: str) -> None:
    sys.exit(f"error: {msg}")


def find_bin(name: str) -> str | None:
    for cand in (os.environ.get(name.upper()), f"/opt/homebrew/opt/ffmpeg-full/bin/{name}"):
        if cand and os.path.exists(cand):
            return cand
    return shutil.which(name)


# --- small pure helpers -----------------------------------------------------------------------------------
def parse_t(v) -> float | None:
    """Seconds from a number or 'MM:SS' / 'H:MM:SS(.fff)'; None when it is neither."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str) and re.fullmatch(r"(\d+:)?\d+:\d+(\.\d+)?", v.strip()):
        t = 0.0
        for part in v.strip().split(":"):
            t = t * 60 + float(part)
        return t
    if isinstance(v, str):
        try:
            return float(v)
        except ValueError:
            return None
    return None


def parse_version(arg) -> int:
    m = re.fullmatch(r"v?(\d+)", str(arg).strip().lower())
    if not m:
        raise ValueError(f"bad version {arg!r} (use v1, v2, ...)")
    return int(m.group(1))


def parse_field(text: str) -> tuple[str, object]:
    key, sep, val = text.partition("=")
    if not sep or not key.strip():
        raise ValueError(f"--field needs key=value, got {text!r}")
    try:
        return key.strip(), json.loads(val)
    except json.JSONDecodeError:
        return key.strip(), val


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# --- EDL / cut-list summary -------------------------------------------------------------------------------
_RANGE_KEYS = (("start", "end"), ("in", "out"), ("a", "b"), ("ss", "to"), ("src_in", "src_out"),
               ("source_start", "source_end"), ("from", "to"), ("t0", "t1"), ("start_s", "end_s"))
_CUT_LISTS = ("cuts", "cut", "removed", "removals", "drops", "drop", "deletions", "silences")
_KEEP_LISTS = ("keep", "keeps", "kept", "segments", "segs", "clips", "events", "ranges")
_SRC_DURATION = ("source_duration", "source_duration_s", "duration_s", "duration", "total_duration")


def _range(item) -> tuple[float, float, str | None] | None:
    """(start, end, reason) from [a, b] or an object using one of the usual key pairs; None if not a range."""
    reason = None
    if isinstance(item, (list, tuple)) and len(item) >= 2:
        a, b = parse_t(item[0]), parse_t(item[1])
    elif isinstance(item, dict):
        a = b = None
        for ka, kb in _RANGE_KEYS:
            if ka in item and kb in item:
                a, b = parse_t(item[ka]), parse_t(item[kb])
                break
        r = item.get("reason") or item.get("why") or item.get("kind") or item.get("label")
        reason = r if isinstance(r, str) else None
    else:
        return None
    if a is None or b is None:
        return None
    return a, b, reason


def _union_length(ranges: list[tuple[float, float]]) -> float:
    total, cur_a, cur_b = 0.0, None, None
    for a, b in sorted(ranges):
        if cur_b is None or a > cur_b:
            if cur_b is not None:
                total += cur_b - cur_a
            cur_a, cur_b = a, b
        else:
            cur_b = max(cur_b, b)
    if cur_b is not None:
        total += cur_b - cur_a
    return total


def _list_under(data: dict, names) -> list | None:
    for n in names:
        if isinstance(data.get(n), list):
            return data[n]
    return None


def summarize_edl(data) -> dict:
    """Cut count and total removed seconds from whatever cut list the trimmer or chapters produced.

    Accepts {"cuts": [{start,end,reason}]} (also removed/drops/...), {"keep": [[a,b], ...]} (also
    segments/segs/clips/...), a bare list of either, and a chapters.json-style {"chapters": [{"drop": ...}]}.
    Anything else degrades to {"format": "unknown"} instead of failing.
    """
    source_s = None
    cuts_raw: list | None = None
    keep_raw: list | None = None
    fmt = "unknown"
    if isinstance(data, dict):
        for k in _SRC_DURATION:
            v = parse_t(data.get(k))
            if v:
                source_s = v
                break
        cuts_raw = _list_under(data, _CUT_LISTS)
        if cuts_raw is not None:
            fmt = "cuts"
        else:
            keep_raw = _list_under(data, _KEEP_LISTS)
            if keep_raw is not None:
                fmt = "keep"
            elif isinstance(data.get("chapters"), list):
                cuts_raw = [d for c in data["chapters"] if isinstance(c, dict) for d in (c.get("drop") or [])]
                fmt = "chapters-drop"
    elif isinstance(data, list):
        if data and all(isinstance(i, dict) and str(i.get("type", i.get("kind", ""))).lower() in ("cut", "drop", "remove") for i in data):
            cuts_raw, fmt = data, "cuts"
        else:
            keep_raw, fmt = data, "keep"
    if cuts_raw is None and keep_raw is None:
        return {"format": "unknown", "note": "no cut or keep list recognised"}

    skipped = 0
    if cuts_raw is not None:
        ranges, reasons = [], {}
        for item in cuts_raw:
            r = _range(item)
            if r is None or r[1] <= r[0]:
                skipped += 1
                continue
            ranges.append((r[0], r[1]))
            if r[2]:
                reasons[r[2]] = reasons.get(r[2], 0) + 1
        out = {"format": fmt, "cut_count": len(ranges), "removed_s": round(_union_length(ranges), 3)}
        if reasons:
            out["reasons"] = dict(sorted(reasons.items()))
    else:
        kept = []
        for item in keep_raw:
            r = _range(item)
            if r is None or r[1] <= r[0]:
                skipped += 1
                continue
            kept.append((r[0], r[1]))
        kept.sort()
        merged: list[list[float]] = []
        for a, b in kept:
            if merged and a <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        gaps = [(merged[i][1], merged[i + 1][0]) for i in range(len(merged) - 1)]
        if merged and merged[0][0] > 1e-6:
            gaps.insert(0, (0.0, merged[0][0]))
        if merged and source_s and source_s - merged[-1][1] > 1e-6:
            gaps.append((merged[-1][1], source_s))
        out = {"format": "keep", "keep_count": len(merged), "kept_s": round(sum(b - a for a, b in merged), 3),
               "cut_count": len(gaps), "removed_s": round(sum(b - a for a, b in gaps), 3)}
    if source_s:
        out["source_duration_s"] = round(source_s, 3)
    if skipped:
        out["skipped"] = skipped
    return out


# --- loudness ---------------------------------------------------------------------------------------------
def parse_ebur128(stderr: str) -> dict:
    """Integrated LUFS and true peak (dBTP) from the Summary block ffmpeg's ebur128 filter prints."""
    tail = stderr.split("Summary:")[-1]
    out = {"lufs_i": None, "true_peak_dbtp": None}
    m = re.search(r"\bI:\s+(-?\d+(?:\.\d+)?|-inf)\s+LUFS", tail)
    if m and m.group(1) != "-inf":
        out["lufs_i"] = float(m.group(1))
    m = re.search(r"True peak:\s*\n\s*Peak:\s+(-?\d+(?:\.\d+)?|-inf)\s+dBFS", tail)
    if m and m.group(1) != "-inf":
        out["true_peak_dbtp"] = float(m.group(1))
    return out


def measure_output(path: Path) -> dict:
    """sha256, size, duration and loudness of a rendered file; fields that cannot be measured stay None."""
    rec: dict = {"sha256": sha256_file(path), "size": path.stat().st_size, "duration_s": None,
                 "lufs_i": None, "true_peak_dbtp": None}
    ffprobe, ffmpeg = find_bin("ffprobe"), find_bin("ffmpeg")
    if ffprobe:
        p = subprocess.run([ffprobe, "-v", "error", "-of", "json", "-show_entries", "format=duration", str(path)],
                           capture_output=True, text=True)
        try:
            rec["duration_s"] = round(float(json.loads(p.stdout)["format"]["duration"]), 3)
        except (ValueError, KeyError, json.JSONDecodeError):
            pass
    if ffmpeg:
        p = subprocess.run([ffmpeg, "-hide_banner", "-nostdin", "-nostats", "-i", str(path), "-vn",
                            "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                           capture_output=True, text=True)
        if p.returncode == 0:
            rec.update(parse_ebur128(p.stderr))
    return rec


# --- tool versions ----------------------------------------------------------------------------------------
def tool_versions() -> dict:
    tools: dict = {"scripts_commit": None, "scripts_dirty": None, "ffmpeg": None,
                   "python": ".".join(map(str, sys.version_info[:3]))}
    git = shutil.which("git")
    if git:
        r = subprocess.run([git, "-C", str(SCRIPTS_DIR), "rev-parse", "--short=10", "HEAD"], capture_output=True, text=True)
        if r.returncode == 0:
            tools["scripts_commit"] = r.stdout.strip()
            s = subprocess.run([git, "-C", str(SCRIPTS_DIR), "status", "--porcelain", "--", str(SCRIPTS_DIR)],
                               capture_output=True, text=True)
            tools["scripts_dirty"] = bool(s.stdout.strip()) if s.returncode == 0 else None
    ffmpeg = find_bin("ffmpeg")
    if ffmpeg:
        r = subprocess.run([ffmpeg, "-version"], capture_output=True, text=True)
        first = r.stdout.splitlines()[0] if r.stdout else ""
        m = re.match(r"ffmpeg version (\S+)", first)
        tools["ffmpeg"] = m.group(1) if m else first or None
    return tools


# --- the log: JSONL records, numbering, chain, rendering --------------------------------------------------
def next_version(records: list[dict]) -> int:
    return max((r.get("n", 0) for r in records), default=0) + 1


def parse_log(text: str) -> list[dict]:
    records = []
    for i, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError as e:
            raise ValueError(f"revisions.jsonl line {i} is not valid JSON ({e}); the log is append-only, fix or restore it") from e
        records.append(rec)
    return records


def check_chain(text: str) -> list[str]:
    """Each record stores the sha256 of the previous line; report any record whose predecessor changed."""
    problems, prev = [], None
    for line in (ln for ln in text.splitlines() if ln.strip()):
        rec = json.loads(line)
        if rec.get("prev") != prev:
            problems.append(f"{rec.get('version')}: earlier log content changed after this record was written")
        prev = sha256_text(line)
    return problems


def find_record(records: list[dict], arg) -> dict:
    n = parse_version(arg)
    for r in records:
        if r.get("n") == n:
            return r
    raise ValueError(f"no revision v{n} (have: {', '.join(r['version'] for r in records) or 'none'})")


def _delta(a, b) -> float | None:
    return None if a is None or b is None else round(b - a, 3)


def diff_revisions(a: dict, b: dict) -> dict:
    """What changed between two records: inputs by hash, outputs by hash/duration/loudness, tools, EDL, note."""
    ia, ib = a.get("inputs", {}), b.get("inputs", {})
    inputs = {"changed": [], "added": sorted(set(ib) - set(ia)), "removed": sorted(set(ia) - set(ib)), "unchanged": [],
              "unknown": []}
    for name in sorted(set(ia) & set(ib)):
        sa, sb = (ia[name] or {}).get("sha256"), (ib[name] or {}).get("sha256")
        if sa is None and sb is None and (ia[name] or {}).get("missing") and (ib[name] or {}).get("missing"):
            inputs["unchanged"].append(name)
        elif sa is None or sb is None:
            inputs["unknown"].append(name)  # one side was not hashed (or not found): cannot tell
        elif sa != sb:
            inputs["changed"].append({"name": name, "from": sa, "to": sb})
        else:
            inputs["unchanged"].append(name)
    oa, ob = a.get("outputs", []), b.get("outputs", [])
    by_a, by_b = {o["path"]: o for o in oa}, {o["path"]: o for o in ob}
    pairs = [(by_a[p], by_b[p]) for p in by_a if p in by_b]
    only_a, only_b = [p for p in by_a if p not in by_b], [p for p in by_b if p not in by_a]
    if not pairs and len(oa) == len(ob) and oa:  # same outputs under new names: compare by position
        pairs, only_a, only_b = list(zip(oa, ob)), [], []
    outputs = {"changed": [], "unchanged": [], "added": only_b, "removed": only_a}
    for x, y in pairs:
        row = {"path": y["path"] if x["path"] == y["path"] else f"{x['path']} -> {y['path']}",
               "sha256": [x.get("sha256"), y.get("sha256")],
               "duration_delta_s": _delta(x.get("duration_s"), y.get("duration_s")),
               "lufs_delta": _delta(x.get("lufs_i"), y.get("lufs_i")),
               "true_peak_delta": _delta(x.get("true_peak_dbtp"), y.get("true_peak_dbtp"))}
        (outputs["changed"] if x.get("sha256") != y.get("sha256") else outputs["unchanged"]).append(row)
    ta, tb = a.get("tools", {}), b.get("tools", {})
    tools = [{"name": k, "from": ta.get(k), "to": tb.get(k)} for k in sorted(set(ta) | set(tb)) if ta.get(k) != tb.get(k)]
    ea, eb = a.get("edl") or {}, b.get("edl") or {}
    edl = [{"name": k, "from": ea.get(k), "to": eb.get(k)} for k in sorted(set(ea) | set(eb))
           if k != "reasons" and ea.get(k) != eb.get(k)]
    return {"from": a.get("version"), "to": b.get("version"), "note": b.get("note"), "inputs": inputs,
            "outputs": outputs, "tools": tools, "edl": edl}


def _short(sha) -> str:
    return sha[:10] if isinstance(sha, str) else "-"


def format_diff(d: dict) -> str:
    lines = [f"{d['from']} -> {d['to']}: {d['note'] or ''}".rstrip()]
    i = d["inputs"]
    for c in i["changed"]:
        lines.append(f"  input changed   {c['name']}: {_short(c['from'])} -> {_short(c['to'])}")
    lines += [f"  input unknown   {n}: hash missing on one side" for n in i["unknown"]]
    lines += [f"  input added     {n}" for n in i["added"]] + [f"  input removed   {n}" for n in i["removed"]]
    if not (i["changed"] or i["added"] or i["removed"] or i["unknown"]):
        lines.append("  inputs unchanged" + (f" ({', '.join(i['unchanged'])})" if i["unchanged"] else ""))
    o = d["outputs"]
    for c in o["changed"]:
        bits = [f"sha {_short(c['sha256'][0])} -> {_short(c['sha256'][1])}"]
        if c["duration_delta_s"] is not None:
            bits.append(f"duration {c['duration_delta_s']:+.2f} s")
        if c["lufs_delta"] is not None:
            bits.append(f"LUFS {c['lufs_delta']:+.1f}")
        if c["true_peak_delta"] is not None:
            bits.append(f"true peak {c['true_peak_delta']:+.1f} dB")
        lines.append(f"  output changed  {c['path']}: " + ", ".join(bits))
    lines += [f"  output unchanged {c['path']}" for c in o["unchanged"]]
    lines += [f"  output added    {p}" for p in o["added"]] + [f"  output removed  {p}" for p in o["removed"]]
    lines += [f"  tool changed    {t['name']}: {t['from']} -> {t['to']}" for t in d["tools"]]
    lines += [f"  edl changed     {e['name']}: {e['from']} -> {e['to']}" for e in d["edl"]]
    return "\n".join(lines)


def _fmt_edl(edl: dict) -> str:
    if not edl:
        return ""
    if edl.get("format") == "unknown":
        return f"unrecognised format ({edl.get('note', '')})"
    s = f"{edl['cut_count']} cuts, {edl['removed_s']} s removed"
    if "kept_s" in edl:
        s += f", {edl['kept_s']} s kept"
    return s


def render_md(records: list[dict], episode: str) -> str:
    lines = [f"# Revisions: {episode}", "",
             "Generated from `revisions.jsonl` (append-only); do not edit by hand. "
             f"{len(records)} revision(s).", ""]
    for idx, r in enumerate(records):
        lines += [f"## {r['version']}: {r.get('note') or '(no note)'}", "", f"- When: {r.get('timestamp')}"]
        if r.get("fields"):
            lines.append("- Fields: " + ", ".join(f"`{k}`={json.dumps(v) if not isinstance(v, str) else v}" for k, v in r["fields"].items()))
        t = r.get("tools", {})
        lines.append(f"- Tools: scripts `{t.get('scripts_commit')}`{' (uncommitted changes)' if t.get('scripts_dirty') else ''}, "
                     f"ffmpeg {t.get('ffmpeg')}")
        for name, inp in r.get("inputs", {}).items():
            lines.append(f"- Input `{name}`: {inp.get('path')} `{_short(inp.get('sha256'))}`" if inp.get("sha256") else f"- Input `{name}`: {inp.get('path')} (not found)")
        if r.get("edl"):
            lines.append(f"- EDL: {_fmt_edl(r['edl'])}")
        for o in r.get("outputs", []):
            lufs = f"{o['lufs_i']} LUFS" if o.get("lufs_i") is not None else "loudness n/a"
            tp = f", {o['true_peak_dbtp']} dBTP" if o.get("true_peak_dbtp") is not None else ""
            dur = f"{o['duration_s']} s, " if o.get("duration_s") is not None else ""
            lines.append(f"- Output `{o['path']}`: {dur}{lufs}{tp}, sha256 `{_short(o.get('sha256'))}`")
        if idx:
            lines += ["", f"Since {records[idx - 1]['version']}:", "", "```", format_diff(diff_revisions(records[idx - 1], r)), "```"]
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def format_show(records: list[dict]) -> str:
    rows = []
    for r in records:
        o = (r.get("outputs") or [{}])[0]
        loud = f"{o['lufs_i']} LUFS" if o.get("lufs_i") is not None else "-"
        rows.append(f"{r['version']:<5} {r.get('timestamp', ''):<21} {loud:<11} {(r.get('note') or '')[:80]}")
    return "\n".join(rows) if rows else "no revisions yet"


# --- episode + file locations -----------------------------------------------------------------------------
class Episode:
    def __init__(self, arg: str, out_dir: str | None = None):
        p = Path(arg).expanduser()
        try:
            self.dir = p.resolve() if p.is_dir() else workspace.episode_dir(arg)
        except ValueError as e:
            die(str(e))
        ep = self.dir / "episode.json"
        try:
            self.id = json.loads(ep.read_text()).get("id") if ep.exists() else None
        except json.JSONDecodeError:
            self.id = None
        self.id = self.id or self.dir.name.split("_")[-1]
        self.out = Path(out_dir).expanduser().resolve() if out_dir else self.dir / "out"
        self.log = self.out / "revisions.jsonl"
        self.md = self.out / "revisions.md"

    def rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.dir).as_posix()
        except ValueError:
            return str(path.resolve())

    def source(self) -> Path | None:
        """The recording the edit reads: chapters.json `source`, else a short.json `source`, else raw/<id>.mp4."""
        rel = None
        for cfg in [self.dir / "chapters.json", *sorted((self.dir / "out" / "shorts").glob("*/short.json"))]:
            try:
                rel = json.loads(cfg.read_text()).get("source")
            except (OSError, json.JSONDecodeError, AttributeError):
                rel = None
            if rel:
                break
        path = self.dir / (rel or f"raw/{self.id}.mp4")
        return workspace.graded_source(path) if path.exists() else None


def read_log(ep: Episode) -> tuple[list[dict], str]:
    text = ep.log.read_text() if ep.log.exists() else ""
    try:
        return parse_log(text), text
    except ValueError as e:
        die(str(e))


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    with os.fdopen(fd, "w") as f:
        f.write(text)
    os.replace(tmp, path)


def hash_input(path: Path | None, ep: Episode, do_hash: bool = True) -> dict:
    if path is None or not path.exists():
        return {"path": ep.rel(path) if path else None, "sha256": None, "missing": True}
    rec = {"path": ep.rel(path), "size": path.stat().st_size}
    rec["sha256"] = sha256_file(path) if do_hash else None
    if not do_hash:
        rec["mtime"] = int(path.stat().st_mtime)
    return rec


# --- b-roll credits ---------------------------------------------------------------------------------------
_ALIASES = {
    "creator": ("creator", "author", "artist", "by", "credit"),
    "source_url": ("source_url", "url", "source", "link", "page"),
    "license": ("license", "licence"),
    "license_url": ("license_url", "licence_url"),
    "title": ("title", "name"),
    "attribution": ("attribution", "attribution_text"),
}


def normalize_sidecar(raw) -> dict:
    """Canonical credit fields from a sidecar dict; missing values stay absent (nothing is inferred)."""
    if not isinstance(raw, dict):
        return {}
    out: dict = {}
    low = {str(k).lower(): v for k, v in raw.items()}
    for canon, names in _ALIASES.items():
        for n in names:
            v = low.get(n)
            if isinstance(v, str) and v.strip():
                out[canon] = v.strip()
                break
    if isinstance(low.get("attribution_required"), bool):
        out["attribution_required"] = low["attribution_required"]
    if low.get("original") is True:
        out["original"] = True
    return out


def parse_license_txt(text: str) -> dict:
    """`Key: value` lines (Creator, Source, License, Title, URL); with none, the first line is the license."""
    raw = {}
    known = {a for names in _ALIASES.values() for a in names}
    for line in text.splitlines():
        k, sep, v = line.partition(":")
        if sep and k.strip().lower() in known:
            raw[k.strip().lower()] = v.strip()
    if not raw:
        first = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
        if first:
            raw["license"] = first
    return normalize_sidecar(raw)


def credit_status(meta: dict) -> tuple[str, list[str]]:
    """('credited' | 'UNVERIFIED', missing fields). Credited needs a license and a creator (or original: true)."""
    if meta.get("original"):
        return "credited", []
    missing = [f for f in ("creator", "license") if not meta.get(f)]
    return ("UNVERIFIED" if missing else "credited"), missing


def attribution_line(meta: dict) -> str:
    if meta.get("attribution"):
        return meta["attribution"]
    title = f"\"{meta['title']}\"" if meta.get("title") else None
    if meta.get("original") and not meta.get("creator"):
        who = "Original work"
    else:
        who = f"by {meta['creator']}" if meta.get("creator") else ""
    head = " ".join(p for p in (title, who) if p) or "B-roll"
    tail = []
    if meta.get("source_url"):
        tail.append(meta["source_url"])
    lic = meta.get("license") or ("original" if meta.get("original") else None)
    if lic:
        tail.append(f"{lic} ({meta['license_url']})" if meta.get("license_url") else lic)
    return head + (" - " + " - ".join(tail) if tail else "")


def _walk_refs(node, used_in: str, found: list) -> None:
    """Dicts with beat/kind 'broll' (plan overlays, Shorts events) and any 'broll' list, wherever they sit."""
    if isinstance(node, dict):
        if str(node.get("beat", node.get("kind", ""))).lower() in ("broll", "b-roll") and any(k in node for k in ("name", "asset", "path", "file")):
            found.append((node, used_in))
        for k, v in node.items():
            if k == "broll" and isinstance(v, list):
                for item in v:
                    found.append((item, used_in))
            elif isinstance(v, (dict, list)):
                _walk_refs(v, used_in, found)
    elif isinstance(node, list):
        for v in node:
            _walk_refs(v, used_in, found)


def collect_refs(ep_dir: Path, plans: list[Path] | None = None) -> list[tuple[object, str]]:
    """(reference, used-in label) from chapters.json, every out/shorts/*/short.json, and any --plan JSON."""
    found: list = []
    cfgs = [(ep_dir / "chapters.json", "chapters.json")]
    cfgs += [(p, f"short {p.parent.name}") for p in sorted((ep_dir / "out" / "shorts").glob("*/short.json"))]
    cfgs += [(p, f"plan {p.name}") for p in (plans or [])]
    for path, label in cfgs:
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        if label == "chapters.json" and isinstance(data, dict):
            for ch in data.get("chapters") or []:
                if isinstance(ch, dict):
                    _walk_refs({"broll": ch.get("broll") or []}, f"chapter {ch.get('id', '?')}", found)
            _walk_refs({"broll": data.get("broll") or []}, "chapters.json", found)
        else:
            _walk_refs(data, label, found)
    return found


def ref_names(ref) -> tuple[str | None, str | None]:
    """(path or None, clip key) of a reference: a string, or an object with path/file/asset/name."""
    if isinstance(ref, str):
        ref = {"path": ref} if ("/" in ref or Path(ref).suffix.lower() in MEDIA_EXT) else {"name": ref}
    if not isinstance(ref, dict):
        return None, None
    path = ref.get("path") or ref.get("file") or ref.get("clip")
    name = ref.get("name") or ref.get("asset")
    if path and not name:
        name = Path(path).stem
    if name and Path(str(name)).suffix.lower() in MEDIA_EXT:
        name = Path(str(name)).stem
    return (str(path) if path else None), (str(name) if name else None)


def find_clip(path: str | None, key: str, ep_dir: Path, roots: list[Path]) -> Path | None:
    if path:
        p = Path(os.path.expandvars(path)).expanduser()
        for cand in ([p] if p.is_absolute() else [ep_dir / p] + [r / p for r in roots]):
            if cand.is_file():
                return cand
    for root in roots:
        for d in (root / key, root):
            if not d.is_dir():
                continue
            for ext in MEDIA_EXT:
                if (d / f"{key}{ext}").is_file():
                    return d / f"{key}{ext}"
        folder = root / key
        if folder.is_dir():
            media = sorted(f for f in folder.iterdir() if f.suffix.lower() in MEDIA_EXT and not re.search(r"-(sheet|relay)\b", f.stem))
            if media:
                return media[0]
    return None


def _index_lookup(doc, keys: list[str]) -> dict | None:
    """Entry for any of keys in a credits.json index: {"clips": {key: {...}}}, {key: {...}}, or a list of entries."""
    if isinstance(doc, dict):
        table = doc.get("clips") if isinstance(doc.get("clips"), (dict, list)) else doc
        if isinstance(table, dict):
            for k in keys:
                if isinstance(table.get(k), dict):
                    return table[k]
        elif isinstance(table, list):
            for item in table:
                if isinstance(item, dict) and any(str(item.get(f, "")) in keys or Path(str(item.get(f, ""))).stem in keys
                                                  for f in ("clip", "file", "name", "asset", "path")):
                    return item
    elif isinstance(doc, list):
        return _index_lookup({"clips": doc}, keys)
    return None


def find_sidecar(clip: Path | None, key: str, roots: list[Path]) -> tuple[dict, str | None, list[str]]:
    """(normalized metadata, sidecar path or None, names looked for). The nearest sidecar wins."""
    keys = [key] + ([clip.name, clip.stem] if clip else [])
    dirs: list[Path] = []
    if clip:
        d = clip.parent
        while True:
            dirs.append(d)
            if d in roots or d.parent == d or len(dirs) > 6:
                break
            d = d.parent
    else:
        dirs = [r / key for r in roots] + roots
    looked: list[str] = []
    for d in dirs:
        names = list(dict.fromkeys([f"{clip.name}.json" if clip else "", f"{key}.json", f"{clip.stem}.json" if clip else "",
                                    f"{key}.license.txt", f"{clip.name}.license.txt" if clip else "", f"{clip.stem}.license.txt" if clip else ""]))
        for n in filter(None, names):
            f = d / n
            looked.append(n)
            if f.is_file():
                try:
                    meta = parse_license_txt(f.read_text()) if n.endswith(".txt") else normalize_sidecar(json.loads(f.read_text()))
                except (OSError, json.JSONDecodeError):
                    continue
                if meta:
                    return meta, str(f), looked
        idx = d / "credits.json"
        looked.append("credits.json")
        if idx.is_file():
            try:
                doc = json.loads(idx.read_text())
            except (OSError, json.JSONDecodeError):
                continue
            entry = _index_lookup(doc, keys)
            if entry is None and isinstance(doc, dict) and d.name == key and any(k in doc for k in ("license", "creator", "original")):
                entry = doc  # a credits.json inside the clip's own folder describes that clip
            meta = normalize_sidecar(entry) if entry else {}
            if meta:
                return meta, str(idx), looked
    return {}, None, list(dict.fromkeys(looked))


def build_credits(ep_dir: Path, refs: list[tuple[object, str]], roots: list[Path], extra_keys: list[str] | None = None) -> list[dict]:
    """One entry per distinct clip: status, merged metadata, where it is used, what was missing."""
    clips: dict[str, dict] = {}
    for ref, used in refs:
        path, key = ref_names(ref)
        if not key:
            continue
        e = clips.setdefault(key, {"key": key, "path": path, "used_in": []})
        e["path"] = e["path"] or path
        if used not in e["used_in"]:
            e["used_in"].append(used)
    for key in extra_keys or []:
        clips.setdefault(key, {"key": key, "path": None, "used_in": []})
    entries = []
    for key in sorted(clips):
        e = clips[key]
        clip = find_clip(e["path"], key, ep_dir, roots)
        meta, sidecar, looked = find_sidecar(clip, key, roots)
        status, missing = credit_status(meta)
        notes = []
        if clip is None:
            notes.append("clip file not found")
        if status == "credited" and not meta.get("source_url") and not meta.get("original"):
            notes.append("no source_url on record")
        entries.append({"key": key, "file": clip.name if clip else None, "status": status, "missing": missing,
                        "meta": meta, "sidecar": Path(sidecar).name if sidecar else None, "used_in": e["used_in"],
                        "looked_for": looked, "notes": notes})
    return entries


def render_credits_md(entries: list[dict], episode: str) -> str:
    credited = [e for e in entries if e["status"] == "credited"]
    bad = [e for e in entries if e["status"] != "credited"]
    lines = [f"# B-roll credits: {episode}", "",
             f"{len(credited)} credited, {len(bad)} UNVERIFIED of {len(entries)} clip(s). "
             "Generated by `revlog.py credits`; edit the clips' sidecar metadata, not this file."]
    if bad:
        lines += ["", f"**Do not publish with these {len(bad)} clip(s) unresolved: add creator and license sidecar metadata, then re-run.**"]
    need = [e for e in credited if e["meta"].get("attribution_required") is not False or e["meta"].get("attribution")]
    exempt = [e for e in credited if e not in need]
    lines += ["", "## YouTube description", "", "```text"]
    if need:
        lines.append("B-roll credits:")
        seen: list[str] = []
        for e in need:
            line = attribution_line(e["meta"])
            if line not in seen:
                seen.append(line)
        lines += seen
    else:
        lines.append("(no b-roll credits required)" if not bad else "(no verified credits yet)")
    lines.append("```")
    if exempt:
        lines += ["", "## Credited, attribution not required (for the record)", ""]
        lines += [f"- {e['key']}: {attribution_line(e['meta'])}" for e in exempt]
    if bad:
        lines += ["", "## UNVERIFIED", ""]
        for e in bad:
            miss = " or ".join(e["missing"]) or "metadata"
            lines.append(f"- **{e['key']}**: UNVERIFIED, no {miss} on record"
                         + (f" (found `{e['sidecar']}` but incomplete)" if e["sidecar"] else " (no sidecar found)")
                         + (f"; {'; '.join(e['notes'])}" if e["notes"] else "")
                         + (f"; used in {', '.join(e['used_in'])}" if e["used_in"] else "; not referenced by any edit"))
    lines += ["", "## Clips", "", "| clip | status | sidecar | used in |", "| --- | --- | --- | --- |"]
    for e in entries:
        lines.append(f"| {e['key']} | {e['status']} | {e['sidecar'] or '-'} | {', '.join(e['used_in']) or 'not referenced'} |")
    return "\n".join(lines) + "\n"


def broll_roots(ep_dir: Path, extra: str | None) -> list[Path]:
    roots = [Path(extra).expanduser().resolve()] if extra else []
    roots += [ep_dir / "out" / "video" / "assets" / "broll", ep_dir / "out" / "video" / "assets", ep_dir / "assets" / "broll"]
    return [r for r in roots if r.is_dir()]


# --- commands ---------------------------------------------------------------------------------------------
def cmd_add(a) -> None:
    ep = Episode(a.episode_dir, a.out_dir)
    if not a.note.strip():
        die("--note must not be empty")
    try:
        fields = dict(parse_field(f) for f in a.field)
    except ValueError as e:
        die(str(e))
    inputs = {"source": hash_input(ep.source(), ep, not a.no_source_hash)}
    inputs["chapters.json"] = hash_input(ep.dir / "chapters.json", ep)
    for sj in sorted((ep.dir / "out" / "shorts").glob("*/short.json")):
        inputs[f"short:{sj.parent.name}"] = hash_input(sj, ep)
    edl_summary = None
    if a.edl:
        edl = Path(a.edl).expanduser()
        if not edl.exists():
            die(f"EDL not found: {edl}")
        inputs["edl"] = hash_input(edl, ep)
        try:
            edl_summary = summarize_edl(json.loads(edl.read_text()))
        except json.JSONDecodeError:
            edl_summary = {"format": "unknown", "note": "not valid JSON"}
    for spec in a.input:
        name, sep, p = spec.partition("=")
        if not sep:
            die(f"--input needs name=PATH, got {spec!r}")
        inputs[name] = hash_input(Path(p).expanduser(), ep)
    outputs = []
    for o in a.output:
        path = Path(o).expanduser()
        if not path.is_file():
            die(f"output not found: {path}")
        outputs.append({"path": ep.rel(path), **measure_output(path)})

    ep.out.mkdir(parents=True, exist_ok=True)
    ep.log.touch()
    with open(ep.log, "a+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.seek(0)
        text = f.read()
        try:
            records = parse_log(text)
        except ValueError as e:
            die(str(e))
        lines = [ln for ln in text.splitlines() if ln.strip()]
        n = next_version(records)
        rec = {"schema": SCHEMA, "version": f"v{n}", "n": n, "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "note": a.note.strip(), "fields": fields, "inputs": inputs, "tools": tool_versions(),
               "edl": edl_summary, "outputs": outputs, "prev": sha256_text(lines[-1]) if lines else None}
        f.seek(0, os.SEEK_END)
        f.write(json.dumps(rec, sort_keys=True) + "\n")
        f.flush()
        os.fsync(f.fileno())
        records.append(rec)
    atomic_write(ep.md, render_md(records, ep.id))
    print(f"{rec['version']} appended to {ep.log}")
    print(f"rendered {ep.md}")


def cmd_show(a) -> None:
    ep = Episode(a.episode_dir, a.out_dir)
    records, text = read_log(ep)
    for problem in check_chain(text) if text else []:
        print(f"warning: {problem}", file=sys.stderr)
    try:
        sel = [find_record(records, a.version)] if a.version else records
    except ValueError as e:
        die(str(e))
    if a.json:
        print(json.dumps(sel[0] if a.version else sel, indent=2, sort_keys=True))
    elif a.version:
        print(render_md(sel, ep.id).split("\n", 3)[3].strip())
    else:
        print(format_show(records))


def cmd_diff(a) -> None:
    ep = Episode(a.episode_dir, a.out_dir)
    records, _ = read_log(ep)
    try:
        d = diff_revisions(find_record(records, a.a), find_record(records, a.b))
    except ValueError as e:
        die(str(e))
    print(json.dumps(d, indent=2, sort_keys=True) if a.json else format_diff(d))


def cmd_credits(a) -> None:
    ep = Episode(a.episode_dir, a.out_dir)
    roots = broll_roots(ep.dir, a.broll_dir)
    refs = collect_refs(ep.dir, [Path(p).expanduser() for p in a.plan])
    extra: list[str] = []
    if a.scan_folder:
        for root in [r for r in roots if r.name == "broll" or (a.broll_dir and r == Path(a.broll_dir).expanduser().resolve())]:
            for d in sorted(root.iterdir()):
                if d.is_dir() and any(f.suffix.lower() in MEDIA_EXT for f in d.iterdir()):
                    extra.append(d.name)
    entries = build_credits(ep.dir, refs, roots, extra)
    if not entries:
        print("no b-roll references found (chapters.json, short.json, --plan) and nothing scanned")
    out = Path(a.out).expanduser() if a.out else ep.out / "credits.md"
    atomic_write(out, render_credits_md(entries, ep.id))
    bad = sum(e["status"] != "credited" for e in entries)
    print(f"{len(entries) - bad} credited, {bad} UNVERIFIED of {len(entries)} clip(s) -> {out}")
    if bad and a.strict:
        sys.exit(1)


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p):
        p.add_argument("--episode-dir", required=True, help="episode folder or id (<YYMMDD>)")
        p.add_argument("--out-dir", help="where revisions.jsonl/.md and credits.md live (default <episode>/out)")
        return p

    p = common(sub.add_parser("add", help="append a revision"))
    p.add_argument("--note", required=True)
    p.add_argument("--field", action="append", default=[], metavar="K=V", help="structured field (repeatable; JSON values allowed)")
    p.add_argument("--edl", help="EDL / cut-list JSON to summarise")
    p.add_argument("--output", action="append", default=[], help="rendered file to hash and measure (repeatable)")
    p.add_argument("--input", action="append", default=[], metavar="NAME=PATH", help="extra input to hash (repeatable)")
    p.add_argument("--no-source-hash", action="store_true", help="record size/mtime for the source instead of its sha256")
    p.set_defaults(fn=cmd_add)
    p = common(sub.add_parser("show", help="list revisions, or print one"))
    p.add_argument("version", nargs="?")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_show)
    p = common(sub.add_parser("diff", help="what inputs/outputs changed between two revisions"))
    p.add_argument("a")
    p.add_argument("b")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_diff)
    p = common(sub.add_parser("credits", help="write credits.md for the episode's b-roll"))
    p.add_argument("--broll-dir", help="extra b-roll folder searched first")
    p.add_argument("--plan", action="append", default=[], help="plan JSON whose broll overlays/events to include (repeatable)")
    p.add_argument("--scan-folder", action="store_true", help="also list every clip folder in the b-roll folder, used or not")
    p.add_argument("--out", help="credits file to write (default <out>/credits.md)")
    p.add_argument("--strict", action="store_true", help="exit 1 when any clip is UNVERIFIED")
    p.set_defaults(fn=cmd_credits)
    args = ap.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
