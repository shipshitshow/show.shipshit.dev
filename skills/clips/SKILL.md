---
name: clips
description: Extract discovery-first clips from Ship Shit Show livestreams, transcripts, topic files, and YouTube performance signals. Use when selecting Shorts, cutdowns, clip hooks, titles, captions, thumbnail prompts, timestamp ranges, or repackaging long AI/dev-tool streams for YouTube discovery.
---

# Livestream Clip Extraction

Use this skill to turn long Ship Shit Show streams into discovery assets. Optimize for viewers who have never seen the channel.

## Quick Start

1. Load the relevant topic file from `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`.
2. Load the transcript, preferring `apps/app/data/transcripts/clean/*.txt`; use raw `.vtt` when timestamps are required.
3. If available, check YouTube performance signals for recent clips and videos.
4. Extract 6-12 candidates, then rank down to the top 3-5 to publish first.
5. Output clip packages with timestamp range, hook, thesis, title, caption, thumbnail prompt, and why it should be discoverable.

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

- named model/tool/company in the first 2 seconds
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
- are visually static unless the quote is unusually strong

## Clip Types

Use a mix, not one format repeated:

- **Model fight:** OpenAI vs Anthropic, Claude vs GPT, cheap vs smart.
- **Build proof:** something works or fails on screen.
- **Operator warning:** a concrete risk builders should stop ignoring.
- **Cost/bill reveal:** the money changes the decision.
- **Hot take:** lazy consensus vs useful builder take.
- **Failure autopsy:** what broke, why it broke, and what the harness should have done.

## Ranking Rubric

Score each candidate 1-5:

- **Hook speed:** named topic and tension by second 2.
- **Standalone clarity:** understandable without the full stream.
- **Discovery surface:** likely search/browse keywords in title and first line.
- **Clip line:** one quotable sentence.
- **Visual proof:** screen action, source, chart, app, terminal, or clear facial reaction.
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
- **Hook text:** 3-7 words for on-screen text
- **Title:** <= 70 chars, no vague hype
- **Thesis:** one sentence
- **Why it works:** discovery reason
- **Caption:** 1-2 sentence Shorts caption
- **Thumbnail prompt:** optional if not a vertical crop
- **Hashtags:** 3-5 specific tags
- **Risk:** context needed, factual check, weak audio, visual mismatch, etc.

### Host Notes

- Publish order:
- Needs timestamp verification:
- Repurpose into:
```

For standalone clip plans, use a compact table plus separate packages for the top 3.

## Packaging Rules

- Shorts title target: 35-60 characters.
- Main-channel cutdown title target: 45-75 characters.
- First caption sentence must repeat the hook in different words.
- Use 3-5 hashtags max; prefer specific tags like `#ClaudeCode`, `#AICoding`, `#CursorAI`, `#SoftwareEngineering`.
- Do not put every AI lab in the title. Pick the conflict.
- Avoid "insane", "crazy", "game-changing" unless the clip earns it with a receipt.
- For build clips, title the observable result, not the tool: `Claude 4.8 Built CAD In One Prompt`, not `Testing Claude`.

## Thumbnails

Thumbnail prompts, art direction, image paths, and livestream vs recap vs surgical modes are owned by `$thumbnails`. Do not restate those rules here. Invoke that skill.

When a clip package includes `Thumbnail prompt`, invoke `$thumbnails`. Shorts, cutdowns, and recaps use that skill's recap/cutdown mode unless the user explicitly asks for livestream archive branding.

## YouTube Performance Check

When the user asks what performs best:

1. Try private YouTube Analytics first if valid OAuth tokens exist.
2. If Analytics tokens fail, use public YouTube Data API channel/video stats.
3. Compare main vs clips separately: views, average views per upload, likes, comments, subscribers, and top recent videos.
4. Translate the result into packaging rules for the current stream.

If tokens return `invalid_grant`, say reauth is needed and continue with public stats if possible.

## Verification

Before finalizing:

- Every clip has a named subject in the title.
- Every clip has a first-second hook or on-screen text.
- Timestamped clips are backed by VTT or video source.
- Claims copied from the stream are not "cleaned up" into stronger claims than were spoken.
- The first publish batch includes at least one build-proof clip when the stream includes live coding.
- The output favors discovery over archival completeness.
- Clip thumbnail prompts came from `$thumbnails` in recap/cutdown mode, not livestream two-host episode-number style.
