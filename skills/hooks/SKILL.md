---
name: hooks
description: Generate, critique, and improve Ship Shit Show livestream introductions, cold opens, hooks, and intro talking points. Use when preparing a livestream topic markdown file, rewriting weak intros, turning transcript/channel context into a sharper opening, creating "Cold Open" or "READ THIS" sections, or producing host-ready talking points for AI/startup/dev-tool commentary.
---

# Livestream Intro Hooks

## Quick Start

Use this skill to turn a Ship Shit Show topic into a host-ready opening that lands fast.

1. Load the topic file, usually `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`.
2. Run `scripts/show-context.sh <topic-file>` from this skill to inspect local transcript coverage and nearby show prep.
3. Voice source of truth is `$prep`: read `../prep/references/brand-voice.md` and `../prep/references/live-voice-extraction.md`. This skill is the cold-open specialist, not a second brand voice.
4. Read `references/shipshitshow-hooks.md` for the cold-open quality bar and output contract.
5. Write or replace the topic's intro sections in this order:
   - `## Cold Open - READ THIS`
   - `## Summary`
   - `## Intro Talking Points`
6. Keep existing sources, URLs, and factual claims unless you verify new ones.

## Source Priority

Prefer local sources in this order:

1. Current topic markdown: title, summary, sources, livestream notes, existing talking points.
2. Clean transcripts: `apps/app/data/transcripts/clean/*.txt`.
3. Raw VTT transcripts: `apps/app/data/transcripts/*.vtt` when clean text is missing.
4. Recent livestream prep files: `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`.
5. External research only when facts are stale, missing, or high-risk.

The repo currently has transcript text, not local video footage. Do not claim visual analysis unless actual video/media files are supplied or fetched separately.

## Workflow

### Diagnose The Existing Intro

Flag these problems directly:

- starts with setup logistics instead of a claim
- waits too long before naming the topic
- asks rhetorical questions without a concrete payoff
- has banter that only works for live viewers, not replay viewers
- lacks a reason the viewer should care today
- lacks a promise for what the stream will prove, build, or decide

### Build The Hook

Use this structure for the first 20-45 seconds:

1. **Contradiction:** What everyone assumes versus what is actually happening.
2. **Receipt:** One concrete fact, metric, quote, incident, or observed behavior.
3. **Stakes:** Why this matters for indie builders, devs, AI agents, or software companies.
4. **Promise:** What the stream will prove, build, compare, or tear down.
5. **Turn:** A punchy bridge into the first segment.

Default shape:

```text
Everyone thinks [comfortable story].
But [specific event/fact] means [sharper interpretation].
If you build software, this changes [concrete consequence].
We'll [prove / build / decide the thing].
Let's go.
```

Do not open with "Today we're going to talk about..." — that is a brand-voice anti-pattern unless there is no stronger claim.

### Write Host-Ready Output

Produce concise sections that can be pasted into the topic file:

```markdown
## Cold Open - READ THIS

> "..."

## Intro Talking Points

- ...
- ...
- ...

## Better Hook Options

1. ...
2. ...
3. ...
```

Make the cold open spoken, not essay-like. A good cold open should read naturally out loud in one breath, with short sentences and obvious emphasis points.

## Editing Rules

- Remove "we are live", audio checks, greetings, and platform housekeeping from the planned intro.
- Keep the hosts' blunt/operator voice, but remove transcript filler.
- Prefer concrete claims over hype words.
- Use one strong swear only when it earns its place; do not spray profanity as seasoning.
- Avoid generic YouTube language like "in this video" or "today we're going to" unless it is part of a joke or there is no stronger claim.
- Do not invent numbers, dates, quotes, launch details, or benchmark claims.
- If the topic file has a `Cold Open - READ THIS`, improve it instead of duplicating it under a new heading.
- If rewriting a file, preserve frontmatter and unrelated sections.

## Verification

Before finalizing:

- Read the cold open aloud mentally; cut any sentence that stalls.
- Confirm the topic is named in the first 10 seconds.
- Confirm there is at least one receipt and one stake.
- Confirm the output can serve both live viewers and replay viewers.
- Run the skill validator after changing this skill:

```bash
uv run --with pyyaml python /Users/decod3rs/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/hooks
```
