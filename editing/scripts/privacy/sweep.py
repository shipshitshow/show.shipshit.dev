#!/usr/bin/env python3
"""Privacy and on-screen text sweep: flag frames that show sensitive text (keys, tokens, emails, paths, client names).

Samples frames from a video (every --interval seconds, plus scene-change frames), reads the text on them with OCR
(Apple Vision through vocr.swift, or tesseract), and flags matches: API keys and tokens, JWTs, `.env` KEY=VALUE lines,
emails, phone numbers, card and IBAN numbers, URLs with secrets, home paths and a user-supplied denylist. It writes
`privacy-report.json`, `privacy-report.md` and the frames that have hits; with --blur also an ffmpeg filter and an
EDL-style CSV for the flagged boxes. Nothing is blurred or re-encoded unless you apply the filter yourself.

  sweep.py <video | episode-folder | episode-id> [--start S] [--end S] [--interval 1] [--scene-threshold 0.3]
           [--denylist FILE] [--allowlist FILE] [--out DIR] [--blur] [--engine auto|vision|tesseract]

Full secret values are never written anywhere: reports carry a preview (first 3 characters plus the length) and a
pixel box. The frames themselves still show the pixels, so --out must stay outside the repository (enforced).
Details: editing/scripts/privacy/README.md.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import detect  # noqa: E402
import workspace  # noqa: E402  (shared content-root and episode lookup)

VERSION = 1
SHOWINFO = re.compile(r"n:\s*(\d+)\s+pts:\s*-?\d+\s+pts_time:\s*(-?[\d.]+)")


def sh(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


# --- input and output locations -------------------------------------------------------------------------------

def resolve_video(arg: str) -> tuple[Path, Path]:
    """(video, default output dir). An episode folder or id resolves to raw/<id>.mp4 and out/privacy/."""
    path = Path(arg).expanduser()
    if path.is_file():
        parent = path.resolve().parent
        if parent.name == "raw" and (parent.parent / "episode.json").is_file():
            return path.resolve(), parent.parent / "out" / "privacy"
        return path.resolve(), parent / f"privacy-{path.stem}"
    episode = path.resolve() if path.is_dir() else workspace.episode_dir(arg)
    match = workspace.EPISODE_DIR.fullmatch(episode.name)
    video = episode / "raw" / f"{match.group(1) if match else episode.name}.mp4"
    if not video.is_file():
        sys.exit(f"no recording at {video}")
    return video, episode / "out" / "privacy"


def inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def probe(video: Path) -> dict:
    r = sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
            "-of", "json", str(video)])
    info = json.loads(r.stdout)
    return {"w": info["streams"][0]["width"], "h": info["streams"][0]["height"], "duration": float(info["format"]["duration"])}


# --- frames --------------------------------------------------------------------------------------------------

def extract(video: Path, vf: str, prefix: str, frames_dir: Path, start: float, length: float) -> list[tuple[float, Path]]:
    """Run one ffmpeg pass writing JPEGs; return (source time in seconds, path) read back from showinfo."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "info", "-y", "-ss", f"{start:.3f}", "-t", f"{length:.3f}",
           "-i", str(video), "-an", "-vf", f"{vf},showinfo", "-fps_mode", "passthrough", "-q:v", "2",
           "-start_number", "0", str(frames_dir / f"{prefix}_%06d.jpg")]
    r = sh(cmd)
    if r.returncode != 0 and "Nothing was written" in r.stderr:
        return []  # a scene pass with no scene changes writes no frame, which ffmpeg reports as an error
    if r.returncode != 0:
        sys.exit(f"ffmpeg failed ({prefix}): {r.stderr.strip().splitlines()[-1] if r.stderr else 'no output'}")
    out = []
    for n, pts in SHOWINFO.findall(r.stderr):
        path = frames_dir / f"{prefix}_{int(n):06d}.jpg"
        if path.is_file():
            out.append((start + float(pts), path))
    return out


def collect_frames(video: Path, frames_dir: Path, start: float, length: float, interval: float,
                   scene_threshold: float) -> list[dict]:
    frames = [{"time": t, "path": p, "source": "interval"}
              for t, p in extract(video, f"fps=1/{interval}", "i", frames_dir, start, length)]
    if scene_threshold > 0:
        seen = [f["time"] for f in frames]
        for t, p in extract(video, f"select='gt(scene,{scene_threshold})'", "s", frames_dir, start, length):
            if any(abs(t - s) < 0.2 for s in seen):
                p.unlink(missing_ok=True)
                continue
            seen.append(t)
            frames.append({"time": t, "path": p, "source": "scene"})
    return sorted(frames, key=lambda f: f["time"])


# --- OCR -----------------------------------------------------------------------------------------------------

def ensure_vocr() -> Path:
    cache = Path(os.environ.get("XDG_CACHE_HOME", "~/.cache")).expanduser() / "shipshitshow"
    binary, src = cache / "vocr", HERE / "vocr.swift"
    if not binary.is_file() or binary.stat().st_mtime < src.stat().st_mtime:
        cache.mkdir(parents=True, exist_ok=True)
        r = sh(["swiftc", "-O", str(src), "-o", str(binary)])
        if r.returncode != 0:
            sys.exit("could not build vocr.swift (needs the Xcode command line tools):\n" + r.stderr[-600:])
    return binary


def ocr_vision(paths: list[Path], batch: int = 100):
    binary = ensure_vocr()
    for i in range(0, len(paths), batch):
        chunk = paths[i:i + batch]
        listing = chunk[0].parent / ".vocr-list.txt"
        listing.write_text("\n".join(str(p) for p in chunk) + "\n")
        r = sh([str(binary), str(listing)])
        listing.unlink(missing_ok=True)
        if r.returncode != 0:
            sys.exit("vocr failed: " + r.stderr[-400:])
        for line in r.stdout.splitlines():
            if line.strip():
                yield json.loads(line)


def ocr_tesseract(paths: list[Path]):
    for path in paths:
        r = sh(["tesseract", str(path), "stdout", "-l", "eng", "--psm", "11", "tsv"])
        groups: dict[tuple, list[dict]] = {}
        for row in r.stdout.splitlines()[1:]:
            c = row.split("\t")
            if len(c) < 12 or not c[11].strip() or float(c[10]) < 0:
                continue
            groups.setdefault((c[2], c[3], c[4]), []).append(
                {"text": c[11], "box": [int(c[6]), int(c[7]), int(c[8]), int(c[9])], "conf": float(c[10]) / 100})
        lines = []
        for words in groups.values():
            text, tokens, pos = "", [], 0
            for w in words:
                if text:
                    text, pos = text + " ", pos + 1
                tokens.append({"start": pos, "end": pos + len(w["text"]), "box": w["box"]})
                text, pos = text + w["text"], pos + len(w["text"])
            lines.append({"text": text, "conf": sum(w["conf"] for w in words) / len(words), "tokens": tokens,
                          "box": detect.span_box(tokens, 0, len(text), [0, 0, 0, 0])})
        yield {"file": str(path), "lines": lines}


def pick_engine(name: str) -> str:
    if name != "auto":
        return name
    if sys.platform == "darwin" and shutil.which("swiftc"):
        return "vision"
    if shutil.which("tesseract"):
        return "tesseract"
    sys.exit("no OCR engine: needs macOS with swiftc (Apple Vision) or tesseract on PATH")


# --- scanning and reports ----------------------------------------------------------------------------------------

def scan_frames(frames: list[dict], engine: str, rules: detect.Rules, min_conf: float, min_sev: str) -> list[dict]:
    by_path = {str(f["path"]): f for f in frames}
    ocr = ocr_vision if engine == "vision" else ocr_tesseract
    hits = []
    for result in ocr([f["path"] for f in frames]):
        frame = by_path[result["file"]]
        for line in result["lines"]:
            if line["conf"] < min_conf:
                continue
            for m, text in detect.scan_line(line["text"], rules):
                if detect.SEVERITY_RANK[m.severity] < detect.SEVERITY_RANK[min_sev]:
                    continue
                hits.append({"time": round(frame["time"], 2), "frame": str(frame["path"]), "source": frame["source"],
                             "category": m.category, "severity": m.severity, "rule": m.rule,
                             "preview": detect.redact(text),
                             "box": detect.span_box(line["tokens"], m.start, m.end, line["box"]),
                             "confidence": round(line["conf"], 2)})
        # the OCR text of this frame is dropped here: nothing but the redacted preview leaves this loop
    return sorted(hits, key=lambda h: (h["time"], h["box"][1]))


def markdown(report: dict) -> str:
    s = report["summary"]
    out = [f"# Privacy sweep: {report['source']}", "",
           f"Scanned {s['frames']} frames ({report['params']['interval']} s interval + scene changes) with "
           f"{report['ocr_engine']}, {s['hits']} hits in {len(report['ranges'])} ranges to review.", "",
           "Previews show the first 3 characters and the length only. Review every range in the editor; OCR misses text and "
           "flags harmless text. Nothing was blurred.", ""]
    if s["by_category"]:
        out += ["## Hits by category", "", "| Category | Hits |", "| --- | --- |"]
        out += [f"| {c} | {n} |" for c, n in sorted(s["by_category"].items(), key=lambda kv: -kv[1])]
        out.append("")
    out += ["## Ranges to review or blur", ""]
    if report["ranges"]:
        out += ["| Start | End | Hits | Severity | Categories |", "| --- | --- | --- | --- | --- |"]
        for r in report["ranges"]:
            cats = ", ".join(f"{c} x{n}" for c, n in sorted(r["categories"].items()))
            out.append(f"| {detect.timecode(r['start'])} | {detect.timecode(r['end'])} | {r['hits']} | {r['severity']} | {cats} |")
    else:
        out.append("No hits.")
    out += ["", "## Hits (highest severity first, first 60)", ""]
    top = sorted(report["hits"], key=lambda h: (-detect.SEVERITY_RANK[h["severity"]], h["time"]))[:60]
    if top:
        out += ["| Time | Severity | Category | Preview | Box (x,y,w,h) | OCR conf | Frame |", "| --- | --- | --- | --- | --- | --- | --- |"]
        for h in top:
            box = ",".join(str(v) for v in h["box"])
            out.append(f"| {detect.timecode(h['time'])} | {h['severity']} | {h['category']} | `{h['preview']}` | {box} | "
                       f"{h['confidence']} | {Path(h['frame']).name} |")
    if report["blur_regions"]:
        out += ["", f"## Blur regions ({len(report['blur_regions'])})", "",
                "See `privacy-blur.filter` and `privacy-blur.csv` (written with --blur). Apply on the final master, then re-run this sweep on the result."]
    return "\n".join(out) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("video", help="video file, episode folder or episode id (<YYMMDD>)")
    ap.add_argument("--start", type=float, default=0.0, help="first second to scan (default 0)")
    ap.add_argument("--end", type=float, help="last second to scan (default end of video)")
    ap.add_argument("--interval", type=float, default=1.0, help="seconds between sampled frames (default 1)")
    ap.add_argument("--scene-threshold", type=float, default=0.3, help="ffmpeg scene score for extra frames; 0 disables")
    ap.add_argument("--denylist", type=Path, help="file of private names/hosts to flag (see denylist.example.txt)")
    ap.add_argument("--allowlist", type=Path, help="file of public domains/emails/paths to ignore (see allowlist.example.txt)")
    ap.add_argument("--engine", choices=["auto", "vision", "tesseract"], default="auto")
    ap.add_argument("--min-conf", type=float, default=0.3, help="ignore OCR lines below this confidence")
    ap.add_argument("--min-severity", choices=["low", "medium", "high"], default="low")
    ap.add_argument("--pad", type=float, help="seconds each hit extends before/after its frame (default: the interval)")
    ap.add_argument("--merge-gap", type=float, default=1.0, help="join review ranges closer than this many seconds")
    ap.add_argument("--blur", action="store_true", help="also write privacy-blur.filter and privacy-blur.csv")
    ap.add_argument("--blur-pad", type=int, default=8, help="pixels added around each flagged box")
    ap.add_argument("--out", type=Path, help="output folder (default: <episode>/out/privacy, or beside the video)")
    ap.add_argument("--keep-frames", action="store_true", help="keep every sampled frame, not just those with hits")
    a = ap.parse_args()

    video, default_out = resolve_video(a.video)
    out = (a.out.expanduser() if a.out else default_out).resolve()
    if inside(out, workspace.REPO):
        sys.exit(f"refusing to write reports into the repository ({out}); pass --out outside the checkout")
    info = probe(video)
    start = max(0.0, a.start)
    end = min(a.end if a.end else info["duration"], info["duration"])
    if end <= start or a.interval <= 0:
        sys.exit("empty scan window")
    rules = detect.Rules(
        denylist=detect.parse_config_lines(a.denylist.expanduser().read_text()) if a.denylist else [],
        allowlist=detect.parse_config_lines(a.allowlist.expanduser().read_text()) if a.allowlist else [])
    engine = pick_engine(a.engine)

    shutil.rmtree(out / "frames", ignore_errors=True)
    scratch = out / ".scan"
    shutil.rmtree(scratch, ignore_errors=True)
    scratch.mkdir(parents=True)
    frames = collect_frames(video, scratch, start, end - start, a.interval, a.scene_threshold)
    if not frames:
        sys.exit("no frames extracted")
    hits = scan_frames(frames, engine, rules, a.min_conf, a.min_severity)

    pad = a.pad if a.pad is not None else a.interval
    ranges = detect.merge_ranges(hits, pad, a.merge_gap, info["duration"])
    regions = detect.track_boxes(hits, pad, a.merge_gap)
    keep = out / "frames"
    keep.mkdir(parents=True, exist_ok=True)
    flagged = {h["frame"] for h in hits}
    for f in frames:
        src = f["path"]
        if str(src) in flagged or a.keep_frames:
            dest = keep / f"t{int(round(f['time'] * 100)):07d}_{f['source']}.jpg"
            shutil.move(str(src), dest)
            for h in hits:
                if h["frame"] == str(src):
                    h["frame"] = f"frames/{dest.name}"
    shutil.rmtree(scratch, ignore_errors=True)

    by_cat: dict[str, int] = {}
    for h in hits:
        by_cat[h["category"]] = by_cat.get(h["category"], 0) + 1
    report = {"version": VERSION, "source": video.name, "ocr_engine": engine, "video": info,
              "params": {"start": start, "end": end, "interval": a.interval, "scene_threshold": a.scene_threshold,
                         "pad": pad, "merge_gap": a.merge_gap, "min_conf": a.min_conf, "min_severity": a.min_severity,
                         "denylist_entries": len(rules.denylist), "allowlist_entries": len(rules.allowlist)},
              "summary": {"frames": len(frames), "hits": len(hits), "by_category": by_cat,
                          "review_seconds": round(sum(r["end"] - r["start"] for r in ranges), 1)},
              "ranges": ranges, "blur_regions": regions, "hits": hits}
    (out / "privacy-report.json").write_text(json.dumps(report, indent=2) + "\n")
    (out / "privacy-report.md").write_text(markdown(report))
    if a.blur:
        (out / "privacy-blur.filter").write_text(detect.blur_filter(regions, info["w"], info["h"], a.blur_pad) + "\n")
        (out / "privacy-blur.csv").write_text(detect.blur_csv(regions, info["w"], info["h"], a.blur_pad))
    print(f"scanned {len(frames)} frames with {engine}: {len(hits)} hits, {len(ranges)} ranges "
          f"({report['summary']['review_seconds']} s to review), {len(regions)} blur regions")
    for cat, n in sorted(by_cat.items(), key=lambda kv: -kv[1]):
        print(f"  {cat}: {n}")
    print(f"report: {out / 'privacy-report.md'}")


if __name__ == "__main__":
    main()
