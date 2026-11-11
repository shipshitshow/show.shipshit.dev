---
name: hooks
description: Write and critique the first sentence on air for a Ship Sh*t Show livestream, plus the board's Cold Open section. Use when preparing a topic file, rewriting a weak opening, or turning transcript and channel context into a sharper first claim.
---

# Livestream opening

The opening specialist for the `$prep` board. One rule, shared with `$prep` and `$cues`: after the countdown, the first spoken sentence is the episode's promise, said to the lens, and it is prepared and approved with the board. It is a claim plus the stake, under 15 seconds. Everything after it stays natural. This skill does not write a monologue to read.

`## Cold Open` is only this on-air first sentence, the viewer promise. It is not a teaser montage and not a recap-edit device; recaps open on the topic the same way (see `$recap`).

The first 30 seconds of every stream are a deliberate countdown, not dead air. Open on the topic right after it. Stream and audio checks happen before going live; greetings and catch-up come after the close.

## Quick start

1. Load the topic file, usually `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`.
2. Run `scripts/show-context.sh <topic-file>` from this skill to see local transcript coverage and recent boards.
3. Read the rule and patterns in `../prep/references/opening-and-hooks.md`, and the voice in `../prep/references/brand-voice.md`. Those two files are the source of truth; this skill applies them.
4. Read `references/shipshitshow-hooks.md` for the openings the channel's best videos use and the output contract.
5. Write or replace `## Cold Open` in the topic file with the shape below. Keep existing sources, URLs and factual claims unless you verify new ones.

## Source priority

1. Current topic markdown: title, viewer question, sources, livestream notes, existing talking points.
2. Clean transcripts: `apps/app/data/transcripts/clean/*.txt`, then raw VTT when clean text is missing. Do not quote the auto-translated transcripts (19 August to 21 October).
3. Recent livestream boards under `apps/app/data/livestream/`.
4. External research only when a fact is stale, missing or high-risk.

The repo holds transcript text, not video. Do not claim anything about the picture or camera from it.

## Diagnose the existing opening

Flag directly:

- starts with stream logistics, a greeting or "how was your week" instead of a claim
- names the topic late, or never names the stake
- asks a rhetorical question with no payoff
- asks for a like or subscribe before the first payoff
- needs context a replay viewer does not have
- promises something the segments do not deliver

## Build the first sentence

1. **Claim:** what the hosts actually hold, or what the source actually shows.
2. **Receipt:** one number, quote, incident or firsthand moment already on the board, with its source.
3. **Stake:** why it matters to a founder or small team using AI in their business.

Shape:

```text
[Claim]. [Receipt]. If you [viewer situation], [consequence].
```

Under 15 seconds aloud (about 35 words). Return two or three options built on different patterns (claim first, receipt first, story first, fight the lazy take), each with the receipt it rests on. Never invent a number, date, quote or result, and never write a host's firsthand story for them: mark it `Host to supply` or leave it out. Mark an unchecked fact `CHECK BEFORE SAYING`.

## Output

```markdown
## Cold Open — "Viewer promise"

- **First sentence (approve one):** "Option A, under 15 seconds."
- Alternate B: "…" (receipt: …)
- Alternate C: "…" (receipt: …)
- On screen with both hosts: the source passage, screenshot or ready result.
- By about 45 seconds: the three questions guiding the episode and the first useful point.
- Budget: about 1 minute. Exit: into segment one.
```

The app routes any `##` heading that starts with "Cold Open" to the timeline, so keep that heading. An existing `## Cold Open - READ THIS` section is replaced by this shape, not duplicated. If rewriting a file, preserve frontmatter and unrelated sections.

## Rules

- Remove "we are live", audio checks, greetings and platform housekeeping from the plan.
- No "Welcome back", "today we're going to talk about…" or "in this video" when a stronger claim exists.
- No like or subscribe ask in the opening.
- Keep the hosts' blunt operator voice; use one strong swear only where it earns its place.
- Prefer concrete claims over hype words.

## Verification

- The topic is named in the first sentence and it stands alone for a replay viewer.
- One receipt, one stake, nothing invented.
- Read it aloud once: under 15 seconds.
- The segments deliver what it promises.
