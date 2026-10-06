#!/usr/bin/env python3
"""Draft rough chapter candidates from a WebVTT transcript.

This intentionally produces rough buckets. The skill instructions require a
human/agent pass to rename, merge, and verify chapters before publishing.
"""

from __future__ import annotations

import argparse
import html
import re
from collections import Counter
from pathlib import Path


TIME_RE = re.compile(
    r"(?P<start>(?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s+-->\s+"
    r"(?P<end>(?:\d{2}:)?\d{2}:\d{2}\.\d{3})"
)
WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+'-]*")
STOPWORDS = {
    "about",
    "actually",
    "again",
    "and",
    "bar",
    "because",
    "blah",
    "can",
    "don't",
    "from",
    "get",
    "going",
    "gonna",
    "have",
    "it's",
    "just",
    "know",
    "nbsp",
    "now",
    "like",
    "look",
    "okay",
    "see",
    "so",
    "really",
    "right",
    "that",
    "that's",
    "the",
    "then",
    "there",
    "this",
    "what",
    "when",
    "with",
    "would",
    "yeah",
    "yes",
    "you",
}


def parse_time(value: str) -> float:
    parts = value.split(":")
    seconds = float(parts[-1])
    minutes = int(parts[-2])
    hours = int(parts[-3]) if len(parts) == 3 else 0
    return hours * 3600 + minutes * 60 + seconds


def format_time(seconds: float) -> str:
    total = max(0, int(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def clean_caption(line: str) -> str:
    line = html.unescape(line)
    line = re.sub(r"<[^>]+>", " ", line)
    line = line.replace("\xa0", " ")
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def read_cues(path: Path) -> list[tuple[float, str]]:
    cues: list[tuple[float, str]] = []
    current_start: float | None = None
    text: list[str] = []

    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        match = TIME_RE.search(line)
        if match:
            if current_start is not None and text:
                cues.append((current_start, clean_caption(" ".join(text))))
            current_start = parse_time(match.group("start"))
            text = []
            continue
        if not line or line == "WEBVTT" or line.isdigit():
            continue
        if current_start is not None:
            text.append(line)

    if current_start is not None and text:
        cues.append((current_start, clean_caption(" ".join(text))))
    return cues


def title_for_text(text: str) -> str:
    words = [
        word.lower()
        for word in WORD_RE.findall(text)
        if len(word) > 2 and word.lower() not in STOPWORDS
    ]
    common = [word for word, _ in Counter(words).most_common(3)]
    if not common:
        return "Topic Turn"
    return " ".join(word.capitalize() for word in common[:3])


def draft_chapters(cues: list[tuple[float, str]], interval: int) -> list[tuple[float, str]]:
    if not cues:
        return []

    chapters: list[tuple[float, str]] = []
    bucket_start = 0.0
    bucket_text: list[str] = []

    for start, text in cues:
        if start >= bucket_start + interval and bucket_text:
            chapters.append((bucket_start, title_for_text(" ".join(bucket_text))))
            bucket_start = start
            bucket_text = []
        bucket_text.append(text)

    if bucket_text:
        chapters.append((bucket_start, title_for_text(" ".join(bucket_text))))

    if chapters and chapters[0][0] != 0:
        chapters[0] = (0.0, chapters[0][1])
    return chapters


def main() -> int:
    parser = argparse.ArgumentParser(description="Draft rough YouTube chapters from VTT.")
    parser.add_argument("vtt", type=Path)
    parser.add_argument("--interval", type=int, default=300, help="Bucket size in seconds.")
    args = parser.parse_args()

    chapters = draft_chapters(read_cues(args.vtt), args.interval)
    for start, title in chapters:
        print(f"{format_time(start)} {title}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
