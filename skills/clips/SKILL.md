---
name: clips
description: Pick and package Shorts and cutdowns from Ship Sh*t Show livestreams, transcripts, topic files and YouTube performance signals. Use when selecting Shorts, first lines, titles, captions, covers, timestamp ranges, or repackaging long AI/founder streams for YouTube discovery.
---

# Livestream Clip Extraction

Use this skill to turn long Ship Sh*t Show streams into discovery assets. Optimize for viewers who have never seen the channel.

**Where Shorts go (Vincent, 2026-11-10):** Shorts publish on the main channel (@ShipShitShow). The clips channel (@ShipShitShowClips) is kept but no longer maintained; do not upload to it or plan for it. Every Short sets its full episode as the YouTube Related video and links it in the description once the episode is live.

**What makes a pick (Vincent, 2026-10-29):** the viewer gets value. Each Short is one hot take or founder lesson. Never a feature walkthrough, a product compliment or an install demo; those can go to LinkedIn as they are. Keep a host's opinion phrased as opinion and a lesson, not a sales pitch. See [the product marketing context](../../.agents/memory/product-marketing-context.md).

## Quick Start

1. Load the relevant topic file from `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`.
2. Load the transcript, preferring `apps/app/data/transcripts/clean/*.txt`; use raw `.vtt` when timestamps are required.
3. If available, check YouTube performance signals for recent clips and videos.
4. Extract 6-12 candidates, then rank down to the top 3-5 to publish first.
5. Run the first-line test and the delivery check below on every survivor.
6. Output clip packages with timestamp range, opening line, thesis, title, caption, cover brief, and why it should be discoverable.
7. Send Vincent the plan (candidate takes and source ranges) plus one layout example before recutting a batch.

When `live-cues.md` or the rundown contains planned Shorts and editor markers,
start with those candidates and their intended claim, proof and payoff. Follow
[the show editorial format](../../docs/show-prep/editorial-format.md). Plans and
rough markers only help locate material; verify each against the recording/VTT.
Do not fabricate a missing take to hit the planned count. Retain a qualification
or opposing case when its removal would misrepresent the conclusion. Add a
strong unplanned moment when the actual discussion earns it.

## Source Priority

Prefer sources in this order:

1. Raw VTT transcript when exact timestamps matter.
2. Clean transcript when judging clip quality and phrasing.
3. Topic markdown for intended thesis, sources, and segment structure.
4. YouTube Data/Analytics signals for what packaging already works.
5. External trend research only when the clip depends on a fresh news hook.

Do not invent quotes, timestamps, metrics, or reactions. If a timestamp is approximate, label it `approx`.

## Discovery Bias

Clips are not episode summaries. A clip should work cold in a feed.

Prioritize clips with:

- the take itself in the first 2 seconds, with the named model/tool/company when the take is about one
- a visible tension: versus, failure, cost, risk, surprise, or proof
- one concrete noun: bill, benchmark, repo, token, npm, CAD, FPS, agent trace
- a line that can become the title
- a complete mini-arc without needing the full livestream
- a clip line the viewer can steal, not a "agree?" / "what do you think?" beg

Downrank clips that:

- start with context setup, greetings, or "we were talking about"
- need more than 5 seconds before the topic is clear
- rely on inside jokes or channel lore
- summarize news without an operator take
- use generic text like "AI is changing everything"
- close on engagement bait ("agree?", "comment if", "what do you think?")
- are product walkthroughs, feature explanations, product compliments or install demos
- have the framed host looking down or away for the take, unless the line is unusually strong
- are visually static unless the quote is unusually strong

## Clip Types

Use a mix, not one format repeated:

- **Model fight:** OpenAI vs Anthropic, Claude vs GPT, cheap vs smart.
- **Build proof:** something works or fails on screen and the host draws a lesson from it. A walkthrough with no take is not a Short.
- **Operator warning:** a concrete risk builders should stop ignoring.
- **Cost/bill reveal:** the money changes the decision.
- **Hot take:** lazy consensus vs useful builder take.
- **Failure autopsy:** what broke, why it broke, and what the harness should have done.

## First-line test

The first spoken line must make sense to a stranger with no context. On the channel, the 36 Shorts whose first line needs context ("And if I say to Opus", "Because right now", "It's the biggest issue, I think") have a median of 151 views; the 54 that open on a clear claim or question have a median of 611 (audit of 10 Nov 2026; a correlation on a small channel, with rounded view counts).

- If the line starts with "and", "but", "because", "that's why", "so", or an "it", "this" or "that" with no subject, it fails.
- Fix it by pulling a later line forward (the strongest line often sits mid-segment), or by picking another range. Do not add words that were not spoken.
- Read the first line aloud as the title of the Short. If a stranger would ask "what is?", rewrite the cut.
- Verify the final first line against the VTT or the rendered audio, not the plan.

## Length

No fixed length: the take decides, and the Short stays under 60 seconds (Vincent, 2026-11-05). Prefer the shortest cut that keeps the take and its caveat. On the channel, Shorts of 60 words or fewer have a median of 517 views against 294 for longer ones (same audit, same caveat). Cut a restart, a back-channel or a recap of the setup before cutting the payoff.

## Ranking Rubric

Score each candidate 1-5:

- **Hook speed:** the take and its tension by second 2, and the first line passes the test above.
- **Standalone clarity:** understandable without the full stream.
- **Discovery surface:** likely search/browse keywords in title and first line.
- **Clip line:** one quotable sentence.
- **Visual proof:** screen action, source, chart, app, terminal, or the speaker looking at the lens with energy.
- **Operator value:** viewer leaves with a decision, warning, or workflow rule.

Publish first when total score is high and the title is obvious. If two clips tie, pick the one with stronger visual proof.

## Output Format

For topic markdown files, use dashboard-safe headings:

```markdown
## Talking Points — Clip Candidates

### Segment Thesis

These are the Shorts/cutdowns most likely to drive discovery from the stream.

### Talking Points

- **Clip:** 00:12:34-00:13:08 approx
- **Type:** Model fight / Build proof / Operator warning / Cost reveal / Hot take / Failure autopsy
- **Opening line:** the first spoken sentence, verbatim from the VTT, after the first-line test
- **Title:** <= 45 chars, take first, no vague hype
- **Thesis:** one sentence
- **Why it works:** discovery reason
- **Caption:** 1-2 sentence Shorts caption
- **Cover brief:** the subject of the take, one colour direction different from the rest of the batch
- **Hashtags:** 3-5 specific tags
- **Risk:** context needed, factual check, weak audio, visual mismatch, etc.

### Host Notes

- Publish order:
- Needs timestamp verification:
- Repurpose into: (LinkedIn for demos and walkthroughs)
- Full episode to link and set as Related video:
```

For standalone clip plans, use a compact table plus separate packages for the top 3.

## Packaging Rules

- Titles follow `$metadata`: one line on the home feed, 40 characters or fewer to aim for, 45 as a hard limit, the take in the first words, no trailing "!" as a substitute for a stake. This applies to Shorts and cutdowns alike. Spell-check names before upload.
- There is no on-screen title or hook text on a Short; the take is carried by the spoken first line and the captions.
- First caption sentence must repeat the opening line in different words.
- Use 3-5 hashtags max; prefer specific tags like `#ClaudeCode`, `#AICoding`, `#CursorAI`, `#SoftwareEngineering`.
- Do not put every AI lab in the title. Pick the conflict.
- Avoid "insane", "crazy", "game-changing" unless the clip earns it with a receipt.
- For build clips, title the observable result, not the tool: `Claude 4.8 Built CAD In One Prompt`, not `Testing Claude`.

## Covers

Thumbnail prompts, art direction, image paths, and livestream vs recap vs surgical modes are owned by `$thumbnails`. Do not restate those rules here. Invoke that skill.

Every Short gets a custom cover, planned in the same pass as the cut, not after upload. Add the cover brief to each package, then invoke `$thumbnails` in its Shorts/cutdown mode.

- No host faces.
- The cover shows the subject of the take. A recognisable person or company belongs on it only when the take is about them; for a general take pick the object or scene the take is about, so the cover does not promise something the Short does not contain.
- Vary the colour direction across a batch. Nearly all 90 older covers were dark red with the same few faces, which made them hard to tell apart on the channel page; the 30 October covers (teal, gold, green, blue) are the model.
- The red asterisk goes on at the cover row of the placement table (`bun run thumbnail:stamp --format shorts`).
- Covers reach few viewers (89% of the clips channel's views came from the Shorts feed, where no cover shows), so never trade the first line for a better cover.

## Shorts layout and brand mark

The locked 9:16 template (speaker fills the frame, no title, red asterisk centred at x940/y290 at 120 px, captions at y1480) is in `docs/show-prep/edit-style.md`; the asterisk's colour, size and position for every other format come from the placement table in the vault brand kit (https://github.com/shipshitshow/vault/blob/master/brand/placement.md). Use the SVG master from the kit, never a redraw. Show one rendered example before cutting a batch.

## YouTube Performance Check

When the user asks what performs best:

1. Try private YouTube Analytics first if valid OAuth tokens exist.
2. If Analytics tokens fail, use public YouTube Data API channel/video stats.
3. Compare main-channel Shorts against main-channel long-form: views, average views per upload, likes, comments, subscribers, and top recent videos. The clips channel is a frozen archive; use it only as historical data.
4. Translate the result into packaging rules for the current stream.

If tokens return `invalid_grant`, say reauth is needed and continue with public stats if possible.

## Verification

Before finalizing:

- Every clip has a named subject in the title, and the title is 45 characters or fewer.
- Every clip's first spoken line passes the first-line test and is quoted verbatim from the VTT or audio.
- Every clip is a take or lesson, not a walkthrough, and the framed speaker is visible with their eyes up for the take.
- Every clip has a cover brief that shows the subject of the take, with no host face.
- Every package names the full episode to set as Related video and to link in the description.
- Timestamped clips are backed by VTT or video source.
- Claims copied from the stream are not "cleaned up" into stronger claims than were spoken.
- The output favors discovery over archival completeness.
- Cover prompts came from `$thumbnails` in its Shorts/cutdown mode, not livestream two-host episode-number style.
- Nothing is uploaded or made public without Vincent's OK: uploads go up private first.
