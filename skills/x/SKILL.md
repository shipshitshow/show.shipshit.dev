---
name: x
description: Turn Ship Shit Show episodes and real ships into X-ready drafts — single posts, threads, and X Articles — in the show voice, ranked against the Aug 2026 For You algorithm. Use when writing or rewriting an X post, thread, announcement tweet, quote-tweet, reply, or X Article; when packaging an episode for @vincentshipsit; or when checking a draft against xai-org/x-algorithm. Drafts only. Never post.
---

# X Pipeline

Use this skill to convert a finished episode (topic file + transcript + published flagship) or a verified first-hand ship into the X distribution set: posts, an optional thread, and an optional X Article.

X is the show's builder-native channel. Voice is the same as `prep` (`references/brand-voice.md`, `references/live-voice-extraction.md`). Do **not** apply the LinkedIn register override. Swearing is punctuation, not seasoning. Do **not** invent launches.

This skill **drafts**. It never posts, never drives the X UI, never fires the X connector as a write.

## Quick Start

1. Load episode context: `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`, clean transcript in `apps/app/data/transcripts/clean/`, published flagship/livestream URLs.
2. Read `../prep/references/brand-voice.md` and `../prep/references/live-voice-extraction.md` before writing a line.
3. Read `references/x-algorithm-2026.md` (Aug 2026 dump of https://github.com/xai-org/x-algorithm). Ignore the stale `x-content` plugin ("1 report = 468 likes", April 2023 75.0 / 13.5 weights).
4. Draft the set using the **Formats** contracts. One original post per beat. Do not dump several originals in a row.
5. Tag every outbound link with the **UTM convention**.
6. Write drafts into the topic's `## X Pipeline` section (see **Where Output Goes**).
7. Run the **Quality Gate**. Fix failures before handing anything back.

## Source Priority

1. Current topic markdown: title, thesis, sources, talking points, `## The Live Build`, existing `## Announcement Tweet` / `## Tweets — Paste Live`.
2. Clean transcript — real problem, the moment it worked, numbers said on air.
3. First-hand ship notes from Pascal / the topic's receipts. If it did not ship, it is not a post.
4. Published artifact metadata: flagship title/description, playbook URL.
5. Vincent's already-written X Article drafts under `.agents/drafts/` when present.
6. External sources only to verify a claim that will appear in the post.

Do not invent metrics, build times, customer stories, launches, or results. If the build partially worked, say what worked and what didn't.

## Voice

Same source of truth as the show. LinkedIn's "no swearing / translate every acronym" override does **not** apply here.

- Blunt. Lead with the conclusion.
- Business-first. Cost, customer, bill, job.
- Specific. Named tool, date, number, incident.
- Receipt immediately. "I tried it" only when the transcript or topic has first-hand use.
- Signature moves from brand-voice: lazy take vs useful take, wrapper, bill reveals truth, corporate story vs builder reality.
- Live rhythm from live-voice-extraction: "The thing is…", "It works, but…", "That's why…". Do not overuse the phrases.
- Never beg. No "agree?", no "change my mind", no "what's your take?" as the closer. That is engagement bait and it reads fake.
- One strong swear only when the line would sound dishonest sanitized.

Litmus: would Vincent read this live without laughing at how AI it sounds? If not, rewrite.

## Accounts

- Growth and replies: `@vincentshipsit` only.
- Brand handles (`@shipshitdev`, `@genfeedai`, `@shipshitshow`) announce; they do not reply into other people's threads.
- One reply per thread, and only from a real ship. Skip celebrity dunks (including Elon) unless Vincent locks it.
- Quote-tweets add an operator take. "This 👆" is not a draft.

## Algorithm (Aug 2026 — use this, not x-content)

Source: https://github.com/xai-org/x-algorithm (updates through 2026-08-14). Details in `references/x-algorithm-2026.md`.

Write for what Phoenix **predicts the viewer will do**, not for raw count math.

**Optimize for:** reply, dwell / dwell time, profile click, share (including copy-link and DM). Favorite is cheap. Video completion is not the job.

**Avoid predicting:** mute, block, report, not-interested, not-dwelled. Rage-bait, off-niche dumps, and fake controversy raise those probabilities.

**Distribution mechanics that change the draft, not just the schedule:**

- For You drops posts older than **48 hours** (`AgeFilter`). After that you are on follower timeline, search, and profile.
- **Author diversity decay:** each extra original from the same author in a slate is multiplied down. Do not fire a post, a thread, and an article teaser in the same hour.
- **Out-of-network discount:** non-followers see you cheaper. First-hour replies and dwell from people who already follow you are how the post earns the right to leave the in-network pool (`Thunder`). Post when followers are awake. Reply to real replies. Do not immediately post again.
- In-network replies and reposts can also take the OON discount. Original posts from the author beat "replying to yourself as the product."
- Visibility filtering is separate from ranking. Spam, bait, and off-label media get dropped before score matters.

Do not quote April 2023 weight tables. Do not say "1 report cancels 468 likes." The Aug 14 2026 comments in `home-mixer/scorers/ranking_scorer.rs` exist specifically to kill that reading: weights scale **P(action)**, which is driven by the viewer's own history.

## Formats

### 1. Single post — default

The house unit. One claim, one receipt, one consequence.

Contract:

- First line is the take. No warmup, no "hot take:", no "unpopular opinion:".
- One concrete receipt (date, dollar, percent, named product, what broke).
- Optional second beat: the operator rule.
- 0-2 hashtags, niche only, or none. Never `#ai`.
- One link, last, UTM-tagged. Clip lines from the stream (`## Tweets — Paste Live`) stay link-free so they can be posted as-is or used as article pull-quotes.
- Under ~240 characters unless the receipt needs the room. Do not pad to 280.

Shape, from the Aug 18 topic (draft, not a claim it posted):

```text
You didn't pick SpaceX as a vendor. Your code editor picked it for you.
```

```text
When the $200 product is free, the $200 product is the bait.
```

### 2. Thread — only when the steps are the product

Use a thread when the viewer needs a sequence they can steal (how we ran the bot, the decision sheet). Otherwise write an X Article or a single post.

- 4-8 posts. Each post stands alone.
- Hook post has no "1/" tax if the line is strong; number from the second post if the sequence matters.
- Last post is the artifact + UTM link, not "that's it thanks."
- The thread is one conversation. Do not also drop three unrelated originals beside it the same hour.

### 3. X Article — the argument

Use when the idea needs dwell: a full operator walkthrough, the trust/cost picture, the thing a post would flatten.

Contract (mirror `.agents/drafts/2026-08-18-x-article-grok-bot.md` when one exists):

- Title is the claim, not the tool. "We Gave a Bot One Job: Find Us a Customer." not "Thoughts on Grok Bot."
- Open on the lazy consensus, then the run. No newsletter throat-clearing.
- Separate products/layers before the story so the take cannot be misread.
- Receipts in order. What we did, what it produced, what we would not trust it with.
- Close on the rule the reader can run tomorrow, plus the artifact.
- Pull 3-5 clip lines out as standalone posts. Do not paste the article into a thread.
- Announce the article with one post. Do not stack the announcement on top of two other originals.

X Articles are dwell machines. Short paragraphs. One idea per break. No "in this article we will."

### 4. Pre-stream announcement

Allowed when the topic has pull. Never replaces the recap post.

- Thesis + when + what you will prove or build. Not "we're live in 10."
- See the Aug 18 `## Announcement Tweet` for the bar.

### 5. Recap post — flagship day

Problem as the reader feels it. What was built. Honest result. Link to the flagship with UTM. Same story as LinkedIn's Build Recap, show voice not buyer register.

## Cadence

- One original post (or one thread, or one article announcement) per sitting.
- Recap on flagship day. Playbook-style thread or article later if the steps are stealable — not the same afternoon.
- Replies can happen the same hour as an original. They are not a second original.
- After 48 hours, do not "boost" a dead For You post by rewriting it slightly. Write the next real ship.

## UTM Convention

Same campaign as LinkedIn. Source changes:

```
?utm_source=x&utm_medium=social&utm_campaign=ep-<NN>-<slug>
```

No untagged links.

## Where Output Goes

- **Announcement / recap / clip lines / thread / article** → `## X Pipeline` on the topic file (internal `##` section, `###` inside — same rule as `## LinkedIn Pipeline`).
- Recap, announcement, thread, and article drafts live under `## X Pipeline`. `prep` keeps paste-live clip lines only (`## Tweets — Paste Live`). Do not rewrite those clip lines into announcement copy from this skill, and do not put recap/article drafts in talking-points.
- Full X Article markdown → `.agents/drafts/YYYY-MM-DD-x-article-<slug>.md`, and link that path from `## X Pipeline`.
- Preserve frontmatter and unrelated sections.
- Do **not** invent a generated `x_post` field unless the types already have one.

## Quality Gate

All must pass before a draft leaves this skill:

- [ ] Every claim traces to the transcript, topic file, or a named source.
- [ ] No invented launch, metric, customer, or "we shipped" that Pascal did not confirm.
- [ ] First line is the take. No warmup, no engagement-bait closer.
- [ ] Voice matches brand-voice / live-voice-extraction, not the LinkedIn buyer register, not `x-content` bait patterns.
- [ ] Algorithm check: written for reply / dwell / profile click / share. Not for like-farming or report-bait. No stacked originals in one hour.
- [ ] Links UTM-tagged. Clip lines stay link-free unless they are the recap.
- [ ] Article (if any) has a stealable close and 3-5 extractable clip lines.
- [ ] Draft only. Nothing was posted.

## Publish Tracking

After Vincent posts (he posts, or he asks):

1. Append the live URL and date under `## X Pipeline`.
2. Never fabricate impressions. If the X connector cannot read, say so and wait.
