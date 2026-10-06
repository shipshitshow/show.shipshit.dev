---
title: "Cursor is a frontier lab now"
slug: "cursor-composer-2-5"
source: "Cursor, Artificial Analysis, Moonshot, DataCamp, The New Stack, ChatForest, TechTimes, r/cursor, AI Coding Daily, WorldofAI, Awesome Agents, Michael Truell, Elon Musk"
status: "in_progress"
date: "2026-05-26"
thumbnail_prompt: null
---

## Talking Points — Livestream Notes

### Segment Thesis

Okay, so this segment is about Livestream Notes.

### Talking Points

- Title: **[LIVE] Cursor is a frontier lab now — Composer 2.5 receipt run**
- [YouTube livestream](https://www.youtube.com/watch?v=QoQjddWCnKA)
- Tool I am NOT using daily. Honest outsider angle. Pull receipts from people who are.
- Released 2026-05-18. 8 days old. Still hot, not stale.
- Base model: Moonshot Kimi K2.5 (open-weight, Chinese). Cursor fine-tune + RL on top.
- Headline claim: SWE-Bench Multilingual parity with Opus 4.7 at ~1/10 cost per task.
- Independent rank: 3rd on Artificial Analysis Coding Agent Index.
- Operator angle: if a Kimi fine-tune beats closed labs per dollar, every harness on your machine adjusts or dies.
- Pair with Microsoft cutting Claude Code internally over token bills (May 23-25). Same week. Not a coincidence.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Cold Open - READ THIS

> "Everyone thinks Cursor is yesterday's IDE. Composer 2.5 just scored 79.8 on SWE-Bench Multilingual — 0.7 points behind Opus 4.7 at one-tenth the price. Artificial Analysis independently ranked it third in the world. The base model? Moonshot Kimi K2.5. An open-weight Chinese model. I don't even use Cursor. But if a fine-tuned Kimi is beating Anthropic and OpenAI per dollar, every harness on your machine is about to get cheaper or die. Today: real benchmarks, real receipts, what this changes for the rest of us."

## Summary

Composer 2.5 is the first credible proof that a fine-tuned open-weight base can hit closed-lab coding performance at a tenth of the price. The story is not Cursor vs Claude Code — it is the cost floor under every coding agent collapsing.

## Talking Points — The Bench Run

### Segment Thesis

Composer 2.5 is not a hype model. The benchmarks are real, near-frontier, and independently verified.

### Talking Points

- **Claim:** Composer 2.5 matches Opus 4.7 on coding benchmarks at a fraction of the price.
- **Receipt:**
  - SWE-Bench Multilingual: Composer 2.5 **79.8%** vs Opus 4.7 80.5%. [Cursor blog](https://cursor.com/blog/composer-2-5)
  - CursorBench v3.1: Composer 2.5 **63.2%** vs Opus 4.7 61.6%. [DataCamp](https://www.datacamp.com/blog/composer-2-5)
  - Terminal-Bench 2.0: Composer 2.5 69.3% vs Opus 4.7 69.4%. [DataCamp](https://www.datacamp.com/blog/composer-2-5)
  - Artificial Analysis Coding Agent Index: 3rd at score 62, behind only Opus 4.7 Max (66) and GPT-5.5 xHigh (65). [AA article](https://artificialanalysis.ai/articles/cursor-composer-2-5-coding-agent-index)
  - SWE-Bench-Pro-Hard-AA: 47% — a +35 point jump over Composer 2 (12%).
- **Why it matters:** This is the first non-frontier lab on the leaderboard. The gap was supposed to be wider.
- **Operator take:** Self-reported benches always lie. Artificial Analysis is the one that counts here — they had no skin in it.
- **Clip line:** "It's third in the world. And it's built on a Chinese open-weight model. Read that sentence again."
- **Transition:** Now the cost story — because the bench numbers don't matter without the bill.

### Host Notes

- Push on: Terminal-Bench parity is the operator number. Devs live in the shell.
- Avoid: arguing benchmark methodology in detail. Cite + move on.
- Pull up: the AA leaderboard screenshot on stream.

## Talking Points — The Bill

### Segment Thesis

Frontier coding just got 10-60x cheaper per task. That is the actual story.

### Talking Points

- **Claim:** Composer 2.5 makes "agent runs all day" economically rational for the first time.
- **Receipt:**
  - Per-task cost on AA index: Opus 4.7 Max **$4.10**, GPT-5.5 xHigh **$4.82**.
  - Composer 2.5 Fast: **$0.44/task** (~10x cheaper).
  - Composer 2.5 standard: **$0.07/task** (~60x cheaper).
  - SDK launch with 90% off weekend: [Cursor SDK tweet](https://x.com/cursor_ai/status/2057913121558413770)
  - Cursor doubled included usage for first week of launch: [Cursor launch tweet](https://x.com/cursor_ai/status/2056415413077233983)
- **Why it matters:** Microsoft just cut Claude Code internally over token bills — same week. That decision rationalizes differently if you can route to a $0.07/task model.
- **Operator take:** This is the model you point at the boring 80%. Keep Opus/GPT-5.5 for the 20% that breaks taste tests.
- **Clip line:** "Opus is a Michelin meal. Composer is the cafeteria that ships."
- **Transition:** And the cafeteria is running on a Chinese open base — which is the supply chain story nobody's framing right.

### Host Notes

- Push on: $0.07/task is the price that ends "should I let the agent retry?" hesitation.
- Avoid: pretending you can read the full pricing model live. Stick to AA per-task numbers.
- Pull up: pricing screenshot from AA + Cursor blog.

## Talking Points — The Supply Chain Shift

### Segment Thesis

The base model is Moonshot Kimi K2.5. An open-weight Chinese model just became the foundation of a top-3 Western coding agent. That is a one-way door.

### Talking Points

- **Claim:** Western frontier labs no longer own the coding-model supply chain.
- **Receipt:**
  - Cursor confirms base: [Cursor on K2.5 base](https://x.com/cursor_ai/status/2056415417971986647)
  - Moonshot acknowledges integration: [Kimi/Moonshot tweet](https://x.com/Kimi_Moonshot/status/2035074972943831491)
  - ChatForest deep-dive on the supply chain implications: [link](https://chatforest.com/builders-log/cursor-composer-2-5-kimi-k2-5-coding-agent-benchmark/)
  - The New Stack framing: [Cursor bets on cheaper coding with Composer 2.5 and Kimi K2.5](https://thenewstack.io/cursor-composer-benchmarks/)
- **Why it matters:** If the best coding model under $1/task is an open-weight fine-tune, the moat for closed labs is shrinking to taste, not capability.
- **Operator take:** This is what "post-training is the new pretraining" actually looks like in production. Cursor isn't a frontier lab because they trained a base — they're a frontier lab because they had the harness and RL pipeline ready when an open base became viable.
- **Clip line:** "Cursor didn't catch up to Anthropic. They skipped the part where you spend a billion dollars on the base."
- **Transition:** So if everyone can do this — what does it mean for the next 6 months of coding agents?

### Host Notes

- Push on: "Cursor is a frontier lab now" — that's the headline take.
- Avoid: geopolitical framing. Stay technical/economic.
- Pull up: Moonshot Kimi K2.5 model card if accessible.

## Talking Points — User Receipts

### Segment Thesis

The on-the-ground reaction is "new default" for most. Not all. The split is informative.

### Talking Points

- **Claim:** Real users moved Composer 2.5 to default within 48 hours. A meaningful minority hates it.
- **Receipt (positive):**
  - r/cursor 197 upvotes: ["Composer 2.5 is my new default. It is fast, accurate, and actually cheap"](https://www.reddit.com/r/cursor/comments/1tijtom/composer_25_is_my_new_default_it_is_fast_accurate/)
  - r/cursor 56 upvotes: ["Thoughts on Composer 2.5?"](https://www.reddit.com/r/cursor/comments/1tiezii/thoughts_on_composer_25/) — "huge jump from Composer 2"
  - r/cursor megathread: [Real World Reviews](https://www.reddit.com/r/cursor/comments/1tizaja/composer_25_real_world_reviews/)
  - Michael Truell (CEO): ["now the most-chosen model in Cursor"](https://x.com/mntruell/status/2056780569380626686)
  - Elon Musk plug: ["Try Composer 2.5 on Cursor!"](https://x.com/elonmusk/status/2056818469195407458)
  - TestingCatalog launch summary: [thread](https://x.com/testingcatalog/status/2056416963153269148)
- **Receipt (negative):**
  - r/cursor: ["Is it just me, or is Composer 2.5 extremely bad?"](https://www.reddit.com/r/cursor/comments/1tn580j/) — monorepo + cross-repo struggles
  - Cursor forum official feedback thread: [link](https://forum.cursor.com/t/share-your-thoughts-on-composer-2-5/160935)
- **Why it matters:** Pattern is consistent — Composer 2.5 wins on single-repo, contained tasks; struggles on multi-repo / very long horizon work where Opus still pulls ahead.
- **Operator take:** This matches the bench. SWE-Bench tasks are scoped. Real multi-repo refactors aren't. Don't pretend the gap closed everywhere — it closed where benchmarks measure.
- **Clip line:** "The hate posts are useful. They're telling you exactly where Opus is still worth the bill."
- **Transition:** Closing take — what this changes for non-Cursor users.

### Host Notes

- Push on: the negative reviews — they pin down the real ceiling.
- Avoid: dismissing the haters. They're the operator signal.
- Pull up: screenshots of the top positive + top negative post side-by-side.

## Closing Take

> "I don't use Cursor. After this week, I'm thinking about it — not because the IDE matters, but because Composer 2.5 just reset the cost floor for every coding agent on the planet. Claude Code, Codex, Warp — every one of them now competes against a $0.07/task open-weight fine-tune that lands top-3 on independent benchmarks. The right response is not to switch tools. It is to route harder. Use Composer-grade economics for the 80% that's well-scoped. Spend Opus tokens only where taste and long context actually matter. That's the show. Subscribe if you want the receipts before the headlines."

## Sources — Demo Videos

- [WorldofAI — full test, "On par with Opus 4.7 + GPT 5.5"](https://www.youtube.com/watch?v=1ANj1A8Ecic) — 14k views, biggest reaction video
- [AI Coding Daily — updated LLM benchmark on Composer 2.5](https://www.youtube.com/watch?v=f7PGu8u-pvU) — most credible independent reviewer
- [Awesome Agents — "Rivals Claude for a tenth the cost"](https://www.youtube.com/watch?v=P-c9IeIcLms) — raises training-disclosure scrutiny
- [AI Coding Daily — Plan with Opus, build with Composer 2.5](https://www.youtube.com/watch?v=SYJadIs0A_0) — hybrid routing thesis, matches our take

## Sources — Long-Form Articles

- [Cursor blog: Introducing Composer 2.5](https://cursor.com/blog/composer-2-5) — primary source
- [The New Stack: Cursor bets on cheaper coding with Composer 2.5 and Kimi K2.5](https://thenewstack.io/cursor-composer-benchmarks/) — analyst framing
- [ChatForest: 79.8% SWE-Bench, Opus parity, 10× cheaper](https://chatforest.com/reviews/cursor-composer-2-5-coding-model-review/)
- [TechTimes: matches Opus 4.7 at 1/10 cost](https://www.techtimes.com/articles/316917/20260520/cursor-composer-25-matches-claude-opus-47-coding-benchmarks-one-tenth-cost.htm)
- [DataCamp benchmark table](https://www.datacamp.com/blog/composer-2-5)
- [HN launch thread](https://news.ycombinator.com/item?id=48182516) — operator skepticism
- [Artificial Analysis full article on the Coding Agent Index](https://artificialanalysis.ai/articles/cursor-composer-2-5-coding-agent-index)
- [Artificial Analysis on X: rank announcement](https://x.com/ArtificialAnlys/status/2057277363789197561)

## Talking Points — Verification Checklist

### Segment Thesis

Okay, so this segment is about Verification Checklist.

### Talking Points

- [x] Topic named in first 10 seconds (cold open)
- [x] One receipt + one stake in cold open (79.8 SWE-Bench + cost floor reset)
- [x] Every segment has claim, receipt, operator take, transition
- [x] At least one clip line per segment
- [x] Outsider POV preserved — "I don't use Cursor"
- [x] Negative receipts included for balance
- [x] All sources linked with URLs

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:
