---
name: chapters
description: Generate concise YouTube chapter timestamps from video transcripts, raw .vtt captions, clean transcript text, episode notes, or existing rough descriptions. Use when the user asks for chapters, timestamps, timestamped sections, YouTube description chapters, or transcript-derived navigation for Ship Shit Show videos. Enforce 3 words maximum per chapter title.
---

# YouTube Chapters

Use this skill to produce YouTube-ready chapters from transcript evidence. The output is a navigation aid, not a summary.

## Quick Start

1. Prefer raw `.vtt` captions when exact timestamps matter.
2. Use clean transcripts or episode notes only to name sections; verify timestamps against VTT when available.
3. Generate 6-12 chapters for normal videos and 8-18 chapters for livestreams.
4. Keep every chapter title to **3 words max**.
5. Output a plain timestamp list that can be pasted into a YouTube description.

## Timestamp Sources

Prefer sources in this order:

1. Raw VTT: `apps/app/data/transcripts/*.vtt`
2. Existing YouTube description chapters, if present
3. Clean transcript: `apps/app/data/transcripts/clean/*.txt`
4. Topic notes or episode metadata

Do not invent exact timestamps from clean transcript text. If only clean text exists, label timestamps `approx` or ask for VTT/video when exact chapters are required.

## Optional Draft Helper

Use the parser to create rough time-bucket chapter candidates from VTT:

```bash
python3 skills/chapters/scripts/draft_chapters.py path/to/transcript.vtt
```

Treat script output as a draft. Rewrite titles for meaning, remove weak buckets, and enforce the 3-word maximum.

## Chapter Rules

- First chapter must start at `0:00`.
- Format timestamps as `M:SS` or `H:MM:SS`.
- Use exact VTT timestamps when available.
- Title each chapter with 1-3 words.
- Prefer concrete nouns: `Opus Setup`, `First Build`, `Boss Fight`, `Cost Reality`.
- Avoid filler: `Introduction`, `Overview`, `Discussion`, `Conclusion`, `Final Thoughts`.
- Avoid punctuation-heavy titles unless needed for a product name.
- Space chapters by real topic turns, not fixed intervals.
- For YouTube compatibility, include at least 3 chapters and keep the first timestamp exactly `0:00`.

## Naming Style

Use Ship Shit Show phrasing: short, direct, builder-native.

Good:

```text
0:00 Cold Open
0:42 Opus Test
2:06 First Build
5:49 Boss Fight
10:26 Final Run
13:28 Get It
```

Bad:

```text
0:00 Introduction And Context
0:42 Discussing Claude Opus 4.8 Model Capabilities
2:06 We Start Looking At The First Build
```

## Output Contract

Return this structure unless the user asks for a different format:

```markdown
### Chapters

0:00 Cold Open
0:42 Opus Test
2:06 First Build
```

If timestamps are approximate:

```markdown
### Chapters

0:00 Cold Open approx
```

## Verification

Before finalizing:

- Every chapter title is 3 words max.
- The first chapter starts at `0:00`.
- Timestamps are monotonic.
- Chapters are backed by VTT/video when presented as exact.
- The list can be pasted directly into a YouTube description.
