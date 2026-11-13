#!/usr/bin/env python3
"""Chapter-by-chapter runner for the 16:9 recap edit.

Cuts a recap one chapter at a time so each chapter can be reviewed and fixed on its own, instead of one
hand-written plan script per episode. Reads <episode>/chapters.json, writes one playable clip per chapter
to <episode>/out/chapters/, and joins the approved chapters into the full recap.

  run_chapters.py plan    <episode>                  validate chapters.json, print durations and status
  run_chapters.py chapter <episode> <n> [--force]    render chapter n (1-based) if its inputs changed
  run_chapters.py all     <episode> [--force]        render every chapter whose inputs changed
  run_chapters.py stitch  <episode> [--draft]        join the chapters with the stinger, append the outro

<episode> is the episode folder (projects/<YYYY-MM-DD>_<YYMMDD>) or just its id (<YYMMDD>).
Common options: --height 720 (review copy, default) or 1080.

The rules (layout, audio, captions, music, transition, outro) live in the vault page brand/editing.md and
win over everything here; the numbers below are copied from it and `plan --vault <path>` warns when the
page no longer contains them. Run it on the Mac Studio. Details: editing/scripts/chapters/README.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import workspace  # noqa: E402  (shared content-root and episode lookup)

VERSION = 1  # bump when the render recipe changes; it is part of every cache key

# --- Rules, from the vault page brand/editing.md (the page wins; see `plan --vault`) -----------------------
RULES = {
    "fps": 60,                      # review/final plate rate (the stinger is 60 fps)
    "min_cut_s": 0.5,               # no cuts under about 0.5 s
    "merge_cut_s": 2.0,             # merge cuts closer than 2 s
    "min_chapters": 3,              # chapters: at least three,
    "min_chapter_gap_s": 10.0,      # each at least 10 s apart (first one at 0:00)
    "highpass_hz": 80,              # cleanup: high-pass about 80 Hz; denoise only if needed
    "denoise": "afftdn=nr=6:nf=-75:tn=0",  # gentle denoise carried from 261111 (per chapter: "denoise": true)
    "lufs": -14.5,                  # master per chapter: about -14.5 LUFS integrated,
    "true_peak": -1.5,              # true peak at or below -1.5 dBTP
    "lra": 11,
    "bed_db_under_voice": 28,       # music bed about 28 dB under the voices, ducked under speech
    "bed_fade_in_s": 0.5,           # quick fade-in (first chapter only: the bed is continuous after that)
    "cut_fade_s": 0.015,            # click guard on every audio cut
    "swap_frame": 10,               # stinger: picture cuts at frame 10 of 24 (0.40 s at 60 fps)
    "stinger_s": 0.40,
    "whoosh_peak_db": -19,          # stinger whoosh level, carried from 261111 (0.22 x speech peak)
    "outro_s": 12,                  # outro: last 10-12 s, right column empty for end-screen elements
    "loop_xfade_s": 2.5,            # crossfade that makes the 3-minute bed loop seamlessly
}
# Strings the vault page must still contain (checked by `plan --vault`).
VAULT_MARKERS = ["-14.5 LUFS", "-1.5 dBTP", "80 Hz", "28 dB", "0.5 s", "2 s", "10 s", "stinger-standard", "build_outro.py"]
CAPTION_FIXES = [  # ASR name fixes from the vault page; every applied fix is logged
    (r"\bclou?d code\b", "Claude Code"), (r"\bclawed code\b", "Claude Code"), (r"\bclawed\b", "Claude"),
    (r"\bclaude code\b", "Claude Code"), (r"\bgrock\b", "Grok"), (r"\bphp\b", "PHP"),
    (r"\bcloudflare\b", "Cloudflare"), (r"\bship (?:sh[a-z*]*t|ship) show\b", "Ship Sh*t Show"),
]
SLUG = re.compile(r"[a-z0-9][a-z0-9-]*")


def die(msg: str) -> None:
    sys.exit(f"error: {msg}")


def find_bin(name: str) -> str:
    for cand in (os.environ.get(name.upper()), f"/opt/homebrew/opt/ffmpeg-full/bin/{name}"):
        if cand and os.path.exists(cand):
            return cand
    return shutil.which(name) or die(f"{name} not found (set ${name.upper()})")


FFMPEG, FFPROBE = find_bin("ffmpeg"), find_bin("ffprobe")


def run(cmd: list, **kw) -> subprocess.CompletedProcess:
    p = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if p.returncode:
        die(f"{Path(str(cmd[0])).name} failed ({p.returncode}):\n{p.stderr[-1500:]}")
    return p


def ffm(*args) -> subprocess.CompletedProcess:
    return run([FFMPEG, "-hide_banner", "-nostdin", "-y", "-v", "error", *args])


def probe(path, entries="format=duration") -> dict:
    return json.loads(run([FFPROBE, "-v", "error", "-of", "json", "-show_entries", entries, path]).stdout)


def duration(path) -> float:
    return float(probe(path)["format"]["duration"])


def stat_key(path) -> list:
    s = Path(path).stat()
    return [str(path), s.st_size, int(s.st_mtime)]


def digest(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()[:16]


def parse_t(v, what: str) -> float:
    """Seconds as a number, or 'MM:SS' / 'H:MM:SS(.fff)'."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    if isinstance(v, str) and re.fullmatch(r"(\d+:)?\d+:\d+(\.\d+)?", v):
        t = 0.0
        for part in v.split(":"):
            t = t * 60 + float(part)
        return t
    die(f"{what}: bad time {v!r} (use seconds or MM:SS)")


# --- project + chapters.json ------------------------------------------------------------------------------
class Project:
    def __init__(self, arg: str):
        p = Path(arg).expanduser()
        self.dir = p.resolve() if p.is_dir() else workspace.episode_dir(arg)
        cfg_path = self.dir / "chapters.json"
        if not cfg_path.exists():
            die(f"{cfg_path} not found (see editing/scripts/chapters/README.md)")
        self.cfg = json.loads(cfg_path.read_text())
        ep = self.dir / "episode.json"
        self.episode_id = json.loads(ep.read_text()).get("id") if ep.exists() else self.dir.name.split("_")[-1]
        src = self.cfg.get("source") or f"raw/{self.episode_id}.mp4"
        self.source = (self.dir / src).resolve()
        self.out = self.dir / "out" / "chapters"
        self.work = self.out / ".work"
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.chapters = self._chapters()

    def _chapters(self) -> list[dict]:
        raw = self.cfg.get("chapters")
        if not isinstance(raw, list) or not raw:
            die("chapters.json needs a non-empty 'chapters' list")
        if not self.source.exists():
            die(f"source video not found: {self.source}")
        src_dur = duration(self.source)
        chapters, seen, recap_t = [], set(), 0.0
        for i, c in enumerate(raw, 1):
            name = f"chapter {i}"
            cid = c.get("id", "")
            if not SLUG.fullmatch(cid):
                self.errors.append(f"{name}: id {cid!r} must be lowercase letters, digits and hyphens")
            if cid in seen:
                self.errors.append(f"{name}: duplicate id {cid!r}")
            seen.add(cid)
            a, b = parse_t(c.get("start"), f"{name} start"), parse_t(c.get("end"), f"{name} end")
            if not 0 <= a < b <= src_dur:
                self.errors.append(f"{name} ({cid}): start/end {a}..{b} must satisfy 0 <= start < end <= {src_dur:.1f}")
                a, b = max(0, min(a, src_dur)), max(min(b, src_dur), min(a, src_dur))
            drops = sorted((parse_t(d[0], f"{name} drop"), parse_t(d[1], f"{name} drop")) for d in c.get("drop", []))
            segs, cur = [], a
            for da, db in drops:
                if not a <= da < db <= b or da < cur:
                    self.errors.append(f"{name} ({cid}): drop {da}..{db} must sit inside start..end and not overlap another drop")
                    continue
                if db - da < RULES["min_cut_s"]:
                    self.warnings.append(f"{name} ({cid}): drop {da}..{db} is under {RULES['min_cut_s']} s")
                if da > cur:
                    segs.append((cur, da))
                cur = db
            if cur < b:
                segs.append((cur, b))
            for k, (s0, e0) in enumerate(segs):
                inner = 0 < k < len(segs) - 1
                if inner and e0 - s0 < RULES["merge_cut_s"]:
                    self.warnings.append(f"{name} ({cid}): kept piece {s0:.1f}..{e0:.1f} is under {RULES['merge_cut_s']} s between two cuts (merge the cuts)")
            dur = sum(e - s for s, e in segs)
            chapters.append({
                "n": i, "id": cid, "title": c.get("title", cid), "notes": c.get("notes", ""),
                "approved": bool(c.get("approved", False)), "denoise": bool(c.get("denoise", False)),
                "start": a, "end": b, "segs": segs, "dur": dur, "recap_start": recap_t,
                "slug": f"{i:02d}-{cid}",
            })
            recap_t += dur
        if len(chapters) < RULES["min_chapters"]:
            self.warnings.append(f"only {len(chapters)} chapters; the page asks for at least {RULES['min_chapters']}")
        for ch in chapters:
            if ch["dur"] < RULES["min_chapter_gap_s"]:
                self.warnings.append(f"chapter {ch['n']} ({ch['id']}) is {ch['dur']:.1f}s, under the {RULES['min_chapter_gap_s']:.0f} s minimum between chapters")
        return chapters

    def chapter(self, n: int) -> dict:
        if not 1 <= n <= len(self.chapters):
            die(f"chapter {n} out of range (1..{len(self.chapters)})")
        return self.chapters[n - 1]

    # outputs
    def clip(self, ch, h):
        return self.out / f"{ch['slug']}-{h}p.mp4"

    def srt(self, ch, h):
        return self.out / f"{ch['slug']}-{h}p.srt"

    def meta(self, ch, h):
        return self.work / f"{ch['slug']}-{h}p.json"


def assets() -> dict:
    root = workspace.ROOT / "_assets"
    a = {
        "music": root / "music" / "on-the-flip_the-grey-room-density-and-time.mp3",
        "stinger": root / "transitions" / "stinger-standard.mov",
        "whoosh": root / "transitions" / "stinger-standard-whoosh.wav",
        "outro_src": root / "outro" / "src" / "build_outro.py",
    }
    for k, p in a.items():
        if not p.exists():
            die(f"asset missing: {k} -> {p}")
    return a


# --- keys: what makes a chapter clip stale ----------------------------------------------------------------
def video_key(pr: Project, ch, h) -> str:
    return digest({"v": VERSION, "src": stat_key(pr.source), "segs": ch["segs"], "h": h, "fps": RULES["fps"]})


def audio_key(pr: Project, ch, h, a) -> str:
    keep = {k: RULES[k] for k in ("highpass_hz", "denoise", "lufs", "true_peak", "lra", "bed_db_under_voice",
                                  "bed_fade_in_s", "cut_fade_s", "loop_xfade_s")}
    return digest({"v": VERSION, "src": stat_key(pr.source), "segs": ch["segs"], "denoise": ch["denoise"],
                   "music": stat_key(a["music"]), "bed_at": round(ch["recap_start"], 3), "rules": keep})


def caption_key(pr: Project) -> str:
    return digest({"fixes": CAPTION_FIXES, "extra": pr.cfg.get("caption_fixes", {}), "model": os.environ.get("WHISPER_MODEL", "")})


def clip_state(pr: Project, ch, h, a) -> str:
    m = pr.meta(ch, h)
    if not (m.exists() and pr.clip(ch, h).exists() and pr.srt(ch, h).exists()):
        return "missing"
    try:
        have = json.loads(m.read_text()).get("keys")
    except ValueError:
        return "stale"
    want = {"video": video_key(pr, ch, h), "audio": audio_key(pr, ch, h, a), "captions": caption_key(pr)}
    return "current" if have == want else "stale"


# --- chapter render ---------------------------------------------------------------------------------------
def render_video(pr: Project, ch, h, out: Path) -> None:
    a0 = ch["segs"][0][0]
    span = ch["segs"][-1][1] - a0
    parts, labels = [], []
    for k, (s, e) in enumerate(ch["segs"]):
        parts.append(f"[0:v]trim={s - a0:.4f}:{e - a0:.4f},setpts=PTS-STARTPTS,fps={RULES['fps']},"
                     f"scale=-2:{h}:flags=lanczos,setsar=1,format=yuv420p[v{k}]")
        labels.append(f"[v{k}]")
    parts.append(f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[v]")
    ffm("-ss", f"{a0:.4f}", "-t", f"{span:.4f}", "-i", pr.source, "-filter_complex", ";".join(parts), "-map", "[v]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20" if h <= 720 else "16", "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-color_range", "tv", "-g", "120", "-an", "-movflags", "+faststart", out)


def render_dialog(pr: Project, ch, out: Path) -> None:
    a0 = ch["segs"][0][0]
    span = ch["segs"][-1][1] - a0
    f, parts, labels = RULES["cut_fade_s"], [], []
    for k, (s, e) in enumerate(ch["segs"]):
        d = e - s
        parts.append(f"[0:a]atrim={s - a0:.4f}:{e - a0:.4f},asetpts=PTS-STARTPTS,aresample=48000,"
                     f"afade=t=in:d={f},afade=t=out:st={max(0, d - f):.4f}:d={f}[a{k}]")
        labels.append(f"[a{k}]")
    clean = f"highpass=f={RULES['highpass_hz']}:poles=2" + (f",{RULES['denoise']}" if ch["denoise"] else "")
    parts.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1,{clean},aformat=channel_layouts=stereo[a]")
    ffm("-ss", f"{a0:.4f}", "-t", f"{span:.4f}", "-i", pr.source, "-filter_complex", ";".join(parts), "-map", "[a]",
        "-c:a", "pcm_f32le", "-ar", "48000", out)


def loudness(path, extra=()) -> dict:
    p = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", *extra, "-i", str(path), "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    s = p.stderr[p.stderr.rindex("Summary:"):]
    g = lambda k: float(re.search(k + r":\s+(-?[\d.]+)", s).group(1))  # noqa: E731
    return {"I": g("I"), "LRA": g("LRA"), "TP": g("Peak")}


def bed_loop(a, work: Path) -> tuple[Path, float, float]:
    """Seamless loop of the music bed (tail crossfaded onto the head). Returns (wav, period_s, integrated LUFS)."""
    x = RULES["loop_xfade_s"]
    dur = duration(a["music"])
    period = dur - x
    wav = work / f"bed-loop-{digest(stat_key(a['music']) + [x])}.wav"
    if not wav.exists():
        fc = (f"[0:a]asplit=3[a1][a2][a3];[a1]atrim=0:{x},asetpts=PTS-STARTPTS,afade=t=in:d={x}:curve=qsin[h];"
              f"[a2]atrim={period:.4f}:{dur:.4f},asetpts=PTS-STARTPTS,afade=t=out:d={x}:curve=qsin[t];"
              f"[h][t]amix=inputs=2:normalize=0:duration=longest[x];"
              f"[a3]atrim={x}:{period:.4f},asetpts=PTS-STARTPTS[b];[x][b]concat=n=2:v=0:a=1,"
              f"aformat=channel_layouts=stereo,aresample=48000[o]")
        ffm("-i", a["music"], "-filter_complex", fc, "-map", "[o]", "-c:a", "pcm_f32le", wav)
    meta = wav.with_suffix(".json")
    if not meta.exists():
        meta.write_text(json.dumps(loudness(wav)))
    return wav, period, json.loads(meta.read_text())["I"]


def mix_master(pr: Project, ch, a, dialog: Path, dur: float, out: Path) -> dict:
    """Bed under the voice (ducked), then two-pass loudnorm to the master target. Returns the measured values."""
    wav, period, bed_i = bed_loop(a, pr.work)
    dlg_i = loudness(dialog)["I"]
    gain = dlg_i - RULES["bed_db_under_voice"] - bed_i
    off = ch["recap_start"]
    fade = RULES["bed_fade_in_s"] if ch["n"] == 1 else 0
    bed = (f"[1:a]atrim={off:.4f}:{off + dur + 0.5:.4f},asetpts=PTS-STARTPTS,volume={gain:.2f}dB"
           + (f",afade=t=in:d={fade}" if fade else "") + "[bed]")
    # the voice both rides over the bed and drives the duck (side chain)
    fc = (f"[0:a]asplit=2[dv][ds];{bed};[bed][ds]sidechaincompress=threshold=0.01:ratio=6:attack=20:release=350[duck];"
          f"[dv][duck]amix=inputs=2:normalize=0:duration=first,atrim=0:{dur:.4f}[m]")
    ins = ["-i", dialog, "-stream_loop", "-1", "-i", wav]
    pre = pr.work / f"{ch['slug']}-premix.wav"
    ffm(*ins, "-filter_complex", fc, "-map", "[m]", "-c:a", "pcm_f32le", "-ar", "48000", pre)
    ln = f"loudnorm=I={RULES['lufs']}:TP={RULES['true_peak']}:LRA={RULES['lra']}"
    p = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-i", str(pre), "-af", f"{ln}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(p.stderr[p.stderr.rindex("{"):p.stderr.rindex("}") + 1])
    second = (f"{ln}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
              f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=summary,"
              f"alimiter=limit={10 ** ((RULES['true_peak'] - 0.3) / 20):.4f}:level=disabled")
    ffm("-i", pre, "-af", second, "-ar", "48000", "-c:a", "pcm_f32le", out)
    pre.unlink(missing_ok=True)
    return {"dialog_I": dlg_i, "bed_gain_db": round(gain, 2), "bed_I": bed_i, "premaster": m}


def fix_srt(text: str, extra: dict, log: list) -> str:
    """Apply the ASR name fixes inside each cue's text (a name can span a line break); log every change."""
    rules = [(re.compile(p, re.I), r) for p, r in CAPTION_FIXES]
    rules += [(re.compile(r"\b" + r"\s+".join(map(re.escape, k.split())) + r"\b", re.I), v) for k, v in extra.items()]

    def one_rule(rep):
        def sub(m):
            if m.group(0) != rep:
                log.append(f"{m.group(0)} -> {rep}")
            return rep
        return sub

    blocks = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.split("\n")
        body = " ".join(x.strip() for x in lines[2:])
        for rx, rep in rules:
            body = rx.sub(one_rule(rep), body)
        blocks.append("\n".join(lines[:2] + [body]))
    return "\n\n".join(blocks) + "\n"


def render_captions(pr: Project, dialog: Path, out: Path) -> dict:
    model = Path(os.environ.get("WHISPER_MODEL", "~/.cache/whisper/ggml-small.en.bin")).expanduser()
    cli = shutil.which("whisper-cli") or die("whisper-cli not found")
    if not model.exists():
        die(f"whisper model not found: {model} (set $WHISPER_MODEL)")
    w16 = out.with_suffix(".16k.wav")
    ffm("-i", dialog, "-ac", "1", "-ar", "16000", w16)
    base = out.with_suffix("")
    run([cli, "-m", model, "-f", w16, "-osrt", "-of", base, "-ml", "42", "-sow", "-np"])
    w16.unlink(missing_ok=True)
    log: list = []
    out.write_text(fix_srt(out.read_text(), pr.cfg.get("caption_fixes", {}), log))
    return {"fixes": log, "cues": len(re.findall(r"-->", out.read_text()))}


def build_chapter(pr: Project, ch, h, a, force: bool) -> str:
    st = clip_state(pr, ch, h, a)
    if st == "current" and not force:
        return "skipped (inputs unchanged)"
    pr.out.mkdir(parents=True, exist_ok=True)
    pr.work.mkdir(parents=True, exist_ok=True)
    slug = f"{ch['slug']}-{h}p"
    old = {}
    if pr.meta(ch, h).exists():
        old = json.loads(pr.meta(ch, h).read_text())
    want = {"video": video_key(pr, ch, h), "audio": audio_key(pr, ch, h, a), "captions": caption_key(pr)}
    vid, dlg, mas = pr.work / f"{slug}.video.mp4", pr.work / f"{slug}.dialog.wav", pr.work / f"{slug}.master.wav"
    ran = []
    if force or old.get("keys", {}).get("video") != want["video"] or not vid.exists():
        render_video(pr, ch, h, vid)
        ran.append("video")
    dur = duration(vid)
    if force or old.get("keys", {}).get("audio") != want["audio"] or not mas.exists():
        render_dialog(pr, ch, dlg)
        mix = mix_master(pr, ch, a, dlg, dur, mas)
        ran.append("audio")
    else:
        mix = old.get("mix", {})
    if force or old.get("keys", {}).get("audio") != want["audio"] or old.get("keys", {}).get("captions") != want["captions"] or not pr.srt(ch, h).exists():
        if not dlg.exists():
            render_dialog(pr, ch, dlg)
        caps = render_captions(pr, dlg, pr.srt(ch, h))
        ran.append("captions")
    else:
        caps = old.get("captions", {})
    clip = pr.clip(ch, h)
    ffm("-i", vid, "-i", mas, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.4f}",
        "-movflags", "+faststart", clip)
    final = loudness(clip)
    meta = {"keys": want, "duration_s": round(dur, 3), "loudness": final, "mix": mix, "captions": caps,
            "size_mb": round(clip.stat().st_size / 1e6, 1), "stages": ran, "segs": ch["segs"]}
    pr.meta(ch, h).write_text(json.dumps(meta, indent=1))
    flags = []
    if final["TP"] > RULES["true_peak"] + 0.5:
        flags.append(f"true peak {final['TP']} dBTP is above {RULES['true_peak']}")
    if abs(final["I"] - RULES["lufs"]) > 0.8:
        flags.append(f"loudness {final['I']} LUFS is off the {RULES['lufs']} target")
    if meta["size_mb"] > 90:
        flags.append("over 90 MB: too big to post to the thread")
    return (f"rendered [{', '.join(ran)}] {dur:.1f}s {final['I']} LUFS {final['TP']} dBTP {meta['size_mb']} MB -> {clip}"
            + (f"  FLAGS: {'; '.join(flags)}" if flags else ""))


# --- stitch -----------------------------------------------------------------------------------------------
def srt_shift(text: str, off: float) -> list[tuple[float, float, str]]:
    cues = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.strip().split("\n")
        m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+) --> (\d+):(\d+):(\d+)[,.](\d+)", lines[1] if len(lines) > 1 else "")
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        cues.append((g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000 + off, g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000 + off, "\n".join(lines[2:])))
    return cues


def fmt_t(t: float) -> str:
    ms = round(t * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def build_outro(pr: Project, h, a) -> Path | None:
    cfg = pr.cfg.get("outro")
    if not cfg:
        return None
    src = (pr.dir / cfg["src"]).resolve() if cfg.get("src") else pr.source
    ss, dur = parse_t(cfg["ss"], "outro ss"), float(cfg.get("dur", RULES["outro_s"]))
    out = pr.work / f"outro-{h}p-{digest([stat_key(src), ss, dur, stat_key(a['outro_src']), VERSION])}.mp4"
    if not out.exists():
        pr.work.mkdir(parents=True, exist_ok=True)
        run([sys.executable, a["outro_src"], "--src", src, "--ss", ss, "--dur", dur, "--out", out, "--height", h])
    return out


def stitch(pr: Project, h, draft: bool, no_outro: bool) -> None:
    a = assets()
    chs = pr.chapters
    pending = [c for c in chs if not c["approved"]]
    if pending and not draft:
        die("not every chapter is approved (" + ", ".join(f"{c['n']}:{c['id']}" for c in pending) +
            "). Set \"approved\": true in chapters.json after review, or use --draft for a review copy.")
    for c in chs:
        st = clip_state(pr, c, h, a)
        if st != "current":
            die(f"chapter {c['n']} ({c['id']}) clip is {st}: run `chapter {c['n']}` first")
    outro = None if no_outro else build_outro(pr, h, a)
    if not outro and not no_outro:
        print("note: no 'outro' in chapters.json, so the recap has no outro (add {\"ss\": <goodbye start>, \"dur\": 12})")
    clips = [pr.clip(c, h) for c in chs] + ([outro] if outro else [])
    durs = [duration(p) for p in clips]
    n_st = len(chs) - 1
    ins: list = []
    for p in clips:
        ins += ["-i", p]
    for _ in range(n_st):
        ins += ["-i", a["stinger"]]
    ins += ["-i", a["whoosh"]]
    fc, vlab, alab = [], [], []
    for k in range(len(clips)):
        vlab.append(f"[{k}:v]")
        alab.append(f"[a{k}]")
        fc.append(f"[{k}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a{k}]")
    fc.append(f"{''.join(f'[{k}:v][a{k}]' for k in range(len(clips)))}concat=n={len(clips)}:v=1:a=1[cv][ca]")
    cut_t = [sum(durs[:k + 1]) for k in range(n_st)]
    sw = RULES["swap_frame"] / RULES["fps"]
    cur = "[cv]"
    fc.append(f"{cur}scale=in_color_matrix=bt709:in_range=tv,format=gbrp[g0]")
    cur = "[g0]"
    for k, t in enumerate(cut_t):
        si = len(clips) + k
        fc.append(f"[{si}:v]fps={RULES['fps']},scale=-2:{h}:flags=lanczos,scale=in_color_matrix=bt470bg:in_range=tv,"
                  f"format=gbrap,setpts=PTS-STARTPTS+{t - sw:.4f}/TB[s{k}]")
        fc.append(f"{cur}[s{k}]overlay=format=gbrp:eof_action=pass[g{k + 1}]")
        cur = f"[g{k + 1}]"
    fc.append(f"{cur}scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]")
    wi = len(clips) + n_st
    whoosh_db = RULES["whoosh_peak_db"] - max_peak_db(a["whoosh"])
    wl = []
    for k, t in enumerate(cut_t):
        fc.append(f"[{wi}:a]volume={whoosh_db:.2f}dB,aformat=channel_layouts=stereo,adelay={int((t - sw) * 1000)}|{int((t - sw) * 1000)}[w{k}]")
        wl.append(f"[w{k}]")
    fc.append(f"[ca]{''.join(wl)}amix=inputs={1 + n_st}:normalize=0:duration=first,"
              f"alimiter=limit={10 ** ((RULES['true_peak'] - 0.3) / 20):.4f}:level=disabled[a]")
    out = pr.dir / "out" / f"recap{'-draft' if draft else ''}-{h}p.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    ffm(*ins, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20" if h <= 720 else "16", "-profile:v", "high", "-pix_fmt", "yuv420p", "-colorspace", "bt709",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-r", str(RULES["fps"]),
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out)
    cues, off = [], 0.0
    for c in chs:
        cues += srt_shift(pr.srt(c, h).read_text(), off)
        off += duration(pr.clip(c, h))
    srt = out.with_suffix(".srt")
    srt.write_text("\n".join(f"{i}\n{fmt_t(s)} --> {fmt_t(e)}\n{t}\n" for i, (s, e, t) in enumerate(cues, 1)))
    v = probe(out, "stream=codec_name,width,height,r_frame_rate,sample_aspect_ratio,display_aspect_ratio,pix_fmt")
    loud = loudness(out)
    expect = sum(durs)
    got = duration(out)
    report = {"out": str(out), "srt": str(srt), "duration_s": round(got, 3), "expected_s": round(expect, 3),
              "size_mb": round(out.stat().st_size / 1e6, 1), "streams": v["streams"], "loudness": loud,
              "chapter_starts_s": [round(sum(durs[:k]), 3) for k in range(len(chs))],
              "outro": str(outro) if outro else None, "draft": draft, "approved": [c["id"] for c in chs if c["approved"]]}
    (pr.work / f"stitch-{h}p.json").write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))
    if abs(got - expect) > 0.1:
        print(f"WARNING: duration {got:.2f}s differs from the sum of the clips {expect:.2f}s")
    if report["size_mb"] > 90:
        print("WARNING: over 90 MB, too big to post to the thread")
    print("not checked: caption sync of the joined SRT (cues are shifted by clip length, not re-transcribed), and nobody has listened.")


def max_peak_db(path) -> float:
    p = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True)
    return float(re.search(r"max_volume:\s+(-?[\d.]+) dB", p.stderr).group(1))


# --- commands ---------------------------------------------------------------------------------------------
def cmd_plan(pr: Project, h, vault) -> int:
    a = assets()
    print(f"episode  {pr.dir}\nsource   {pr.source} ({duration(pr.source):.1f}s)\nheight   {h}p\n")
    print(f"{'#':>2}  {'id':<22} {'source range':<19} {'cuts':>4} {'len':>7} {'recap at':>9}  {'clip':<8} approved")
    for c in pr.chapters:
        print(f"{c['n']:>2}  {c['id']:<22} {fmt_clock(c['start'])}-{fmt_clock(c['end'])}  {len(c['segs']) - 1:>4} "
              f"{c['dur']:>6.1f}s {fmt_clock(c['recap_start']):>9}  {clip_state(pr, c, h, a):<8} {'yes' if c['approved'] else 'no'}")
    print(f"\ntotal recap before the outro: {fmt_clock(sum(c['dur'] for c in pr.chapters))}")
    if vault:
        text = Path(vault).expanduser().read_text()
        missing = [m for m in VAULT_MARKERS if m not in text]
        pr.warnings += [f"vault page no longer contains {m!r}: re-check the RULES in run_chapters.py" for m in missing]
        print(f"vault check: {len(VAULT_MARKERS) - len(missing)}/{len(VAULT_MARKERS)} rule markers found in {vault}")
    else:
        print("vault check: skipped (pass --vault <path to brand/editing.md> to compare the rule numbers)")
    sd = duration(a["stinger"])
    if abs(sd - RULES["stinger_s"]) > 0.02:
        pr.errors.append(f"stinger is {sd:.2f}s, the runner assumes {RULES['stinger_s']} s with the swap at frame {RULES['swap_frame']}")
    for w in pr.warnings:
        print("warning:", w)
    for e in pr.errors:
        print("ERROR:", e)
    return 1 if pr.errors else 0


def fmt_clock(t: float) -> str:
    t = round(t, 1)
    return f"{int(t // 3600)}:{int(t // 60 % 60):02d}:{t % 60:04.1f}" if t >= 3600 else f"{int(t // 60)}:{t % 60:04.1f}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("plan", "chapter", "all", "stitch"):
        sp = sub.add_parser(name)
        sp.add_argument("episode")
        if name == "chapter":
            sp.add_argument("n", type=int)
        sp.add_argument("--height", type=int, default=720, choices=(720, 1080))
        if name in ("chapter", "all"):
            sp.add_argument("--force", action="store_true", help="re-render even when the inputs are unchanged")
        if name == "plan":
            sp.add_argument("--vault", help="path to the vault page brand/editing.md, to check the rule numbers")
        if name == "stitch":
            sp.add_argument("--draft", action="store_true", help="join unapproved chapters into a review copy")
            sp.add_argument("--no-outro", action="store_true")
    args = ap.parse_args()
    pr = Project(args.episode)
    if args.cmd == "plan":
        sys.exit(cmd_plan(pr, args.height, args.vault))
    if pr.errors:
        for e in pr.errors:
            print("ERROR:", e)
        die("chapters.json has errors; run `plan`")
    a = assets()
    if args.cmd in ("chapter", "all"):
        todo = [pr.chapter(args.n)] if args.cmd == "chapter" else pr.chapters
        for c in todo:
            print(f"chapter {c['n']} ({c['id']}): {build_chapter(pr, c, args.height, a, args.force)}", flush=True)
    else:
        stitch(pr, args.height, args.draft, args.no_outro)


if __name__ == "__main__":
    main()
