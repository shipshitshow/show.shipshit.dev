# Ship Shit Show Hook Reference

## Local Corpus

Useful local inputs:

- Clean transcripts: `apps/app/data/transcripts/clean/*.txt`
- Raw VTT transcripts: `apps/app/data/transcripts/*.vtt`
- Topic prep: `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`

As of the latest archive update, the repo has 23 clean transcripts and 23 raw VTT transcripts. The corpus covers livestreams and edited videos from February-May 2026.

## What The Transcripts Show

Recurring weak intro pattern:

- stream starts with "we are live", audio checks, comments, retweeting, chat greetings
- the real topic often starts 1-4 minutes late
- strong lines appear after the hosts warm up
- banter has good voice, but the first replay minute often lacks a clear promise

Keep the authentic cadence, but move the strongest claim to the first sentence.

## Voice

The show voice is:

- blunt founder/operator commentary
- AI/dev-tool obsessed
- practical, cost-aware, shipping-focused
- willing to say the impolite but useful thing
- skeptical of corporate narratives and benchmark theater
- informal without being incoherent

Good lines sound like:

- "The model is not the product. The harness is."
- "GitHub is now just the input queue. Codex is the output machine."
- "Cheaper per task is not the same as cheaper per token."
- "Every pre-AI codebase is undiscovered bug reports."

## Hook Patterns

### Narrative Reversal

Use when the topic has a consensus take.

```text
Everyone thinks [consensus].
The real story is [reversal].
And if that is true, [stake].
```

### Receipt First

Use when there is a hard number, outage, quote, benchmark, or launch.

```text
[Receipt].
That is not a small detail.
That is [interpretation].
```

### Builder Stakes

Use when the stream is about tools, models, agents, or SaaS.

```text
If you are building with AI agents, this changes [workflow/cost/risk].
Not someday. This week.
```

### Fight The Lazy Take

Use when the audience likely has a simplistic take.

```text
The lazy take is [obvious opinion].
The useful take is [operator interpretation].
```

## Cold Open Quality Bar

A finished cold open should:

- name the topic immediately
- contain one specific receipt
- make a claim strong enough to disagree with
- explain why the claim matters now
- promise what the stream will do
- end with a clean bridge into segment one

Cut:

- "Welcome back"
- "Let's check if we're live"
- "How was your week?"
- "Today we're going to talk about..." when a stronger claim exists
- meta-comments about not having an intro

## Output Contract

For a new or weak topic, return:

```markdown
## Cold Open - READ THIS

> "60-120 spoken words."

## Intro Talking Points

- Hook receipt:
- Stakes:
- Contrarian claim:
- Stream promise:
- Segment bridge:

## Better Hook Options

1. Claim-first option.
2. Receipt-first option.
3. Dark/funny option.
```

When editing an existing topic file, keep this section order near the top, after `## Livestream Notes` when that section exists.
