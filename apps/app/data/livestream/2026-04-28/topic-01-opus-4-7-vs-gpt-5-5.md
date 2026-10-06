---
title: "GPT 5.5 vs Opus 4.7: We Pushed Both to Their Limit"
slug: "opus-4-7-vs-gpt-5-5"
source: "Anthropic, OpenAI, X, GitHub"
status: "in_progress"
date: "2026-04-28"
thumbnail_prompt: null
---

## Talking Points — Livestream Notes

### Segment Thesis

Okay, so this segment is about Livestream Notes.

### Talking Points

- [YouTube livestream](https://www.youtube.com/watch?v=z7N1z4XtYZY)

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Cold Open

- Last week Opus 4.7 and GPT 5.5 both dropped. Two frontier models in seven days.
- We ran both for a full week. Real work. Real bills. Real agent loops.
- Now we can actually talk about it.
- Spoiler — they tied on the benchmarks. Nobody won clean. The thing nobody is talking about is that GPT 5.5 burns `72%` fewer output tokens for the same job.
- **The model is not the product. The harness is.**
- Let's go.

## Summary

Anthropic dropped Claude Opus 4.7 on April 16, 2026. OpenAI fired back with GPT-5.5 exactly one week later on April 23. The benchmarks split — neither model wins clean. Opus 4.7 reclaims the multi-file refactor and architectural reasoning crown. GPT-5.5 owns long-running shell agents and burns far fewer tokens doing it. The interesting story for indie builders is not who wins. It is that the benchmark gap stopped mattering and the cost gap started mattering more. Token efficiency is now a model-selection axis, and the same plugin stack we have been pushing — RTK, caveman, code-review-graph — is the cheapest leverage you have when the bill arrives.

## Talking Points — The Setup

### Segment Thesis

Okay, so this segment is about The Setup.

### Talking Points

- Two frontier launches in seven days.
  - April 16: Anthropic ships Claude Opus 4.7.
  - April 23: OpenAI ships GPT-5.5.
- The interesting headline is not "who is smarter."
- The interesting headline is that the two labs are pulling apart instead of converging.
- One is doubling down on heavy reasoning per call.
- The other is doubling down on token-efficient agentic loops.
- For indie devs, that means model choice is now a workflow choice, not a brand loyalty choice.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — The Benchmark Split

### Segment Thesis

Okay, so this segment is about The Benchmark Split.

### Talking Points

- **SWE-Bench Pro** (real GitHub issue resolution):
  - Opus 4.7: `64.3%` — up from `53.4%` on Opus 4.6.
  - GPT-5.5: `58.6%`
  - Opus wins multi-file refactor and cross-repo reasoning.
  - [Source: Vellum benchmarks breakdown](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained)
  - [Source: Kingy AI field guide](https://kingy.ai/uncategorized/gpt-5-5-vs-claude-opus-4-7-a-benchmark-by-benchmark-field-guide-to-the-new-frontier/)
- **SWE-Bench Verified**:
  - GPT-5.5: `88.7%`
  - Opus 4.7: `87.6%`
  - Tight. Practically a tie.
  - [Source: automatio Opus 4.7 page](https://automatio.ai/models/claude-opus-4-7)
  - [Source: llm-stats GPT-5.5 vs Opus 4.7](https://llm-stats.com/blog/research/gpt-5-5-vs-claude-opus-4-7)
- **Terminal-Bench 2.0** (planning + tool coordination + shell loops):
  - GPT-5.5: `82.7%`
  - Opus 4.7: `69.4%`
  - GPT-5.5 wins agent execution by a wide margin.
  - [Source: Kingy AI field guide](https://kingy.ai/uncategorized/gpt-5-5-vs-claude-opus-4-7-a-benchmark-by-benchmark-field-guide-to-the-new-frontier/)
  - [Source: lushbinary comparison](https://lushbinary.com/blog/gpt-5-5-vs-claude-opus-4-7-comparison-benchmarks-pricing/)
- **GPQA Diamond** (graduate-level science):
  - Opus 4.7: `94.2%` — basically tied with GPT-5.4 Pro (`94.4%`) and Gemini 3.1 Pro (`94.3%`).
  - Up from Opus 4.6 at `91.3%`.
  - [Source: Vellum benchmarks breakdown](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained)
  - [Source: llm-stats Opus 4.7 page](https://llm-stats.com/models/claude-opus-4-7)
- **MMLU**:
  - Opus 4.7: `89.8%`
  - [Source: llm-stats Opus 4.7 page](https://llm-stats.com/models/claude-opus-4-7)
- **LiveCodeBench**:
  - Opus 4.7: `78.5%`
  - [Source: llm-stats Opus 4.7 page](https://llm-stats.com/models/claude-opus-4-7)
- **GDPval-AA** (Artificial Analysis benchmark for real-world agentic work):
  - Opus 4.7 at launch: `1753` Elo on max effort — surpassed GPT-5.4 xhigh, took the #1 spot.
  - [Source: Artificial Analysis announcement (X)](https://x.com/ArtificialAnlys/status/2044856740970402115)
- **Artificial Analysis Intelligence Index**:
  - Opus 4.7: `57` — `+4` over Opus 4.6, tied with GPT-5.4 and Gemini 3.1 Pro at the top.
  - [Source: Artificial Analysis index post (X)](https://x.com/ArtificialAnlys/status/2045292578434875552)
- **Token efficiency**:
  - GPT-5.5 uses roughly `72%` fewer output tokens on equivalent tasks.
  - That is not a small number. That is the bill.
  - [Source: MindStudio coding comparison](https://www.mindstudio.ai/blog/gpt-55-vs-claude-opus-47-coding-comparison)
  - [Source: digitalapplied frontier comparison](https://www.digitalapplied.com/blog/gpt-5-5-vs-claude-opus-4-7-frontier-comparison)
- Strong line:
  - **Opus thinks harder. GPT-5.5 thinks cheaper.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — The Pricing Math

### Segment Thesis

Okay, so this segment is about The Pricing Math.

### Talking Points

- **Claude Opus 4.7** ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)):
  - Input: `$5 / 1M tokens`
  - Output: `$25 / 1M tokens`
  - Cached input: `$0.50 / 1M tokens` (`90%` off, prompt caching)
  - Batch: `50%` off all rates
  - Context window: `1M` tokens
  - Tokenizer change vs Opus 4.6: new tokenizer can use up to `35%` more tokens per fixed text — same headline price, higher effective bill on long content.
- **GPT-5.5** ([OpenAI pricing](https://developers.openai.com/api/docs/pricing)):
  - Input: `$5 / 1M tokens`
  - Output: `$30 / 1M tokens`
  - Cached input: `$0.50 / 1M tokens`
  - Batch: `50%` off → `$2.50 / $15` per `1M` tokens
  - Context window: `1M` tokens on both `gpt-5.5` and `gpt-5.5-pro`
  - Long-context tax: prompts over `272K` input tokens get billed at `2x` input + `1.5x` output for the entire session.
- **GPT-5.5 Pro**:
  - Input: `$30 / 1M tokens`
  - Output: `$180 / 1M tokens`
  - This is the "I will pay for the smartest possible call" tier. Almost nobody should default to it.
- **Per-output-token, head to head**:
  - GPT-5.5 is `20%` more expensive per output token than Opus 4.7 on paper.
  - GPT-5.5 produces `~72%` fewer output tokens for equivalent work.
  - Net: GPT-5.5 is meaningfully cheaper on equivalent tasks despite the higher unit price.
- Strong line:
  - **Cheaper per task is not the same as cheaper per token. Stop reading the price page wrong.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Pick The Right Tool For The Right Loop

### Segment Thesis

Okay, so this segment is about Pick The Right Tool For The Right Loop.

### Talking Points

- Use Opus 4.7 when:
  - the task spans many files
  - the model needs to hold a whole package in its head
  - you are doing real architectural decisions, migrations, or reviews
  - you only need one expensive turn, not fifty
- Use GPT-5.5 when:
  - the model is driving a shell or CI loop
  - the agent needs to recover from errors and keep going
  - the task is repetitive, automatable, and metered
  - output volume is the dominant cost
- The lazy take is "use the better model."
- The real take is **route per task, not per brand.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Anthropic Angle (Including The Postmortem)

### Segment Thesis

Okay, so this segment is about Anthropic Angle (Including The Postmortem).

### Talking Points

- Opus 4.7 release reclaimed Anthropic's coding lead on the hard end of SWE-Bench.
- But the same window has been a rough month for Anthropic on the indie-dev side.
- April 21: Anthropic briefly removed Claude Code from the `$20` Pro plan.
  - Backlash arrived inside a day.
  - Anthropic reversed the decision.
  - Third-party agent frameworks — including OpenClaw and similar tools — were blocked from running on Pro and Max plans.
  - That move pushed power users onto pay-as-you-go API billing.
- April 23: Anthropic published an engineering postmortem on Claude Code quality.
  - Three product-layer changes between March and April had degraded performance for a real chunk of users.
  - The most damaging change was a verbosity restriction added on April 16.
  - The exact line shipped into Claude Code's system prompt:
    - **"Length limits: keep text between tool calls to 25 words or less."**
  - That single instruction caused a `~3%` drop in coding performance on both Opus 4.6 and Opus 4.7.
  - Anthropic acknowledged it and is rolling it back.
- The talking-point arc here is brutal and worth saying out loud:
  - The same week Anthropic ships a frontier model lead, they admit the wrapper around it was silently making it dumber for paying users.
  - That is the indie-dev story. The model is not the product. The harness is.
- Strong line:
  - **You can ship the smartest model on Earth and still nerf it with one line of system prompt.**
- Anthropic prompt caching is still the cleanest cost control on the platform.
  - [Anthropic docs: Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
  - Caches the full prefix across `tools`, `system`, and `messages`, in that order.
  - Default cache lifetime is `5 minutes`.
  - `1-hour` cache duration available.
  - Changes to `tool_choice` or image usage can invalidate the cache.
- Strong line:
  - **The more agentic your workflow gets, the more expensive bad prompt architecture becomes.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — OpenAI Angle

### Segment Thesis

Okay, so this segment is about OpenAI Angle.

### Talking Points

- GPT-5.5 leans hard into agentic execution and token efficiency.
- The Terminal-Bench 2.0 lead is not cosmetic.
  - Long shell loops, planning, and tool coordination is where most production agent products actually live.
- OpenAI's prompt caching is the cleanest current proof that token discipline matters at the lab level.
  - [OpenAI docs: Prompt caching](https://platform.openai.com/docs/guides/prompt-caching)
- Practical hooks:
  - Prompt caching can cut latency by up to `80%` and input token cost by up to `90%`.
  - Auto-engages on supported models when prompts are `1024` tokens or longer.
  - Exact prefix matches matter — static first, dynamic last.
  - In-memory retention is typically `5 to 10 minutes`, up to `1 hour`.
  - Extended retention can keep caches active for up to `24 hours` on supported models.
- Long-context tax is real:
  - OpenAI's pricing docs for `GPT-5.4` warn that prompts over `272K` input tokens get billed at `2x` input and `1.5x` output for the full session.
  - [OpenAI docs: GPT-5.4 long-context note](https://developers.openai.com/api/docs/models/gpt-5.4)
- Strong line:
  - **A giant context window is not permission to stop thinking.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Why Token Optimization Decides The Winner

### Segment Thesis

Okay, so this segment is about Why Token Optimization Decides The Winner.

### Talking Points

- The benchmark gap between Opus 4.7 and GPT-5.5 is small.
- The token-cost gap is huge — `72%` fewer output tokens on GPT-5.5 for equivalent work.
- That number gets larger over an agent loop, not smaller.
- Translation:
  - At low volume, model choice is taste.
  - At real volume, model choice is margin.
- The indie-dev question is not "which model is best?"
- The indie-dev question is **"which combination of model plus harness gives me the cheapest correct answer?"**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — The Core Thesis (Carryover)

### Segment Thesis

Okay, so this segment is about The Core Thesis (Carryover).

### Talking Points

- **Every repeated token is either an asset or a tax.**
- Stable cached context = leverage.
- Noisy duplicated context = drag.
- Token optimization is not "make prompts shorter."
- It is:
  - keep the valuable static prefix
  - stop resending junk
  - move dynamic content to the end
  - choose the smallest model that can do the job
  - measure what your workflow is actually spending

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Biggest Wins Are Not Where People Think

### Segment Thesis

Okay, so this segment is about Biggest Wins Are Not Where People Think.

### Talking Points

- Most builders optimize the wrong layer first.
- They obsess over shaving 30 words off a prompt while still:
  - resending the whole repo
  - changing system instructions every turn
  - keeping broken conversation history alive
  - asking a frontier model to do cheap routing work
- The real wins:
  - prompt caching
  - stable prefixes
  - conversation compaction
  - retrieval over full-context stuffing
  - smaller models for narrow tasks
  - capped output sizes
  - structural reads (only the blast radius, not the repo)

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Practical Playbook — Carryover, Re-Pointed At Opus vs GPT-5.5

### Segment Thesis

Okay, so this segment is about Practical Playbook — Carryover, Re-Pointed At Opus vs GPT-5.5.

### Talking Points

- Put stable instructions, tool definitions, and reusable examples at the start.
- Put user-specific or fast-changing content at the end.
- Keep the front of the prompt identical whenever possible.
- Send diffs, summaries, or retrieved chunks instead of full files every turn.
- Compact or summarize old conversation state before it rots.
- Route by task:
  - Opus 4.7 for the one expensive turn that needs deep reasoning.
  - GPT-5.5 for the long shell loop where output volume is the cost.
  - Smaller cheaper models for routing, tagging, extraction, formatting, classification.
- Cap output length when you do not need essays.
- Log usage and cache-hit data instead of guessing.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Sources — Reference Plugins — The Stack We Already Push

- [RTK](https://github.com/rtk-ai/rtk)
  - Compresses command output before it reaches the model context.
  - Claims `60% to 90%` token reduction on common CLI workflows.
  - Direct fit for the GPT-5.5 agentic-shell-loop story — the loop you are running is exactly where RTK earns its keep.
  - Best line:
    - **Do not pay frontier-model prices to read raw `git diff`, `pytest`, and `tree` spam.**
- [caveman](https://github.com/juliusbrussee/caveman)
  - Compresses how the agent talks back without losing substance.
  - Repo frames it as roughly `75%` less output tokens while keeping the technical answer intact.
  - Direct counter to the bad version of Anthropic's verbosity-cap idea — caveman trims output as a *style*, not as a hard system-prompt cap that nukes coding accuracy.
- [code-review-graph](https://github.com/tirth8205/code-review-graph)
  - Structural version of token optimization. Stop reading the wrong files.
  - Repo claims `6.8x` fewer tokens on reviews and up to `49x` fewer on daily coding tasks by reading only the blast radius.
  - Direct fit for the Opus 4.7 "multi-file refactor" story — Opus is great at the hard turn, but you should not feed it the entire repo to get there.

## Talking Points — Demo Angle — Live ShipCode Run

### Segment Thesis

Okay, so this segment is about Demo Angle — Live ShipCode Run.

### Talking Points

- This whole thesis lives or dies on a real demo. Run it on stream with [ShipCode](https://shipcode.shipshit.dev).
- Why ShipCode is the right demo for this topic:
  - It is the literal harness around the model.
  - Wraps `claude`, `codex`, and `openrouter` CLI providers behind one pipeline.
  - Issue → plan → review → execute → verify state machine.
  - Each pipeline step runs in an isolated git worktree.
  - Lets you route per step instead of brand-locking the whole loop.
- Demo flow on stream:
  1. **Pick a real open GitHub issue.** Something with a multi-file refactor smell. Easy to pick from the live repo.
  2. **Plan step → Opus 4.7.** Show the model holding the whole package in its head. Use the SWE-Bench Pro `64.3%` story live. Stable prefix + tool defs cached.
  3. **Review step → smaller cheap model.** Critique the plan. Don't burn frontier tokens to rubber-stamp. This is the routing point.
  4. **Execute step → GPT-5.5 in the worktree shell loop.** Terminal-Bench 2.0 `82.7%` on display. Long-running shell, error recovery, tool coordination — exactly the loop GPT-5.5 wins.
  5. **RTK on top of the shell.** Show `rtk gain` mid-stream. Quote a real number. The `60–90%` token reduction is not a slide claim; it is a live receipt.
  6. **caveman trimming the agent's output.** Counter-example to Anthropic's `25-word` system-prompt nuke — caveman compresses the *style*, not the *capacity*.
  7. **code-review-graph scoping the read.** `detect_changes` + `get_review_context` instead of greps and cats. Show the `49x` token claim against the actual graph response.
  8. **Verify step → small model again.** Cheap pass to confirm tests green.
- What viewers should walk away with:
  - The pipeline did not pick a "best model." It picked the right model per step.
  - The harness is what made the cost numbers move, not the brand.
  - Worktree isolation = no fear of letting two labs touch the same repo on the same task.
- Talking-point payoff:
  - lower cost
  - lower latency
  - cleaner product behavior
  - less wasted compute
  - you stop being held hostage by one lab's bad week
- ShipCode plug line:
  - **ShipCode is the routing layer this whole topic argues for. Today is a good day to show it.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — X Reactions To Pull Up Live

### Segment Thesis

Okay, so this segment is about X Reactions To Pull Up Live.

### Talking Points

- **Dan McAteer** (`@daniel_mac8`) — token-efficiency receipt from the GPT side. Quote line: "GPT-5.5 beats Opus 4.7 on several benchmarks, esp those related to agentic coding + tool calling… GPT-5.5 is far more token efficient than Opus 4.7. OpenAI cooked this Spud 🥔."
  - Pull when transitioning from benchmark split into pricing math. Reaction: agentic-loop tier belongs to GPT for now, Anthropic has to answer with cheaper output, not just smarter output.
  - [TWEET: @daniel_mac8 on GPT-5.5 token efficiency](https://x.com/daniel_mac8/status/2047407932954841129)
- **Boris Cherny** (`@bcherny`, Anthropic engineer on Claude Code) — defends Opus 4.7 from the inside. Quote line: "Opus 4.7 feels more intelligent, agentic, and precise than 4.6. It took a few days for me to learn how to work with it effectively, to fully take advantage of its new capabilities."
  - Use this to acknowledge Anthropic's real upgrade is not benchmarks — it is the workflow ergonomics of the new model.
  - [TWEET: @bcherny on Opus 4.7 day-to-day feel](https://x.com/bcherny/status/2044822408826380440)
- **Artificial Analysis** (`@ArtificialAnlys`) — independent benchmark authority. Confirms Opus 4.7 retook GDPval-AA #1 with Elo `1753`, ahead of GPT-5.4 xhigh.
  - Pull when defending the Opus side against "GPT just won everything" takes. The benchmark for real agentic work has Opus on top right now.
  - [TWEET: @ArtificialAnlys — Opus 4.7 #1 on GDPval-AA](https://x.com/ArtificialAnlys/status/2044856740970402115)
- **Zvi Mowshowitz** (`@TheZvi`) — long-form thread "Opus 4.7 Part 2: Capabilities and Reactions." Best single doc dump of community reactions to the launch.
  - Use when chat asks "where do I read more." Skip the press releases. This thread is the best one-stop signal aggregator.
  - [TWEET: @TheZvi — Opus 4.7 capabilities + reactions thread](https://x.com/TheZvi/status/2046703306454798538)
- **Nate Herk** (`@nateherk`) — practical hands-on comparison. Ran speed, tokens, cost, requests, quality. Same thesis as ours: route per task, do not pick a brand.
  - Pull as the natural lead-in to the ShipCode demo. He proves the same point we are about to demo live.
  - [TWEET: @nateherk — GPT-5.5 vs Opus 4.7 hands-on breakdown](https://x.com/nateherk/status/2047436752051118513)
  - [Companion video — "I Tested GPT 5.5 vs Opus 4.7"](https://www.youtube.com/watch?v=WX4rp-vP3zo)
- **OpenAI launch tweet** (`@OpenAI`) — official framing for GPT-5.5. Quote line: "A new class of intelligence for real work and powering agents."
  - Pull this on screen when reading the OpenAI angle section. The OpenAI marketing copy IS the agent-loop pitch.
  - [TWEET: @OpenAI — GPT-5.5 launch](https://x.com/OpenAI/status/2047376561205325845)
- **llmdevguy** (`@llmdevguy`) — practical "how to use 5.5" tips. Indie-dev field guide for the new behavior shape.
  - Pull as the closing beat after Theo's "should have been called GPT-6" line — Theo says old prompts won't work, llmdevguy says here's what does.
  - Maps directly to OpenAI's own guidance: outcome-first prompts, low/medium reasoning by default, drop "ALWAYS/NEVER" cargo cult, fresh baseline over migration.
  - Reaction sentence: **prompt stacks are now version-locked to model releases — your old harness is the regression.**
  - [TWEET: @llmdevguy — how to use GPT-5.5](https://x.com/llmdevguy/status/2048736363600613776)
  - TODO live: read the tweet on stream, pick 2 tips that map to our harness thesis (caveman compresses output, RTK shrinks tool noise, code-review-graph scopes the read).
- How to use the segment live:
  - One tweet on screen, one reaction sentence, one tie-back to a thesis line. Do not just quote.
  - The 3 thesis lines to land somewhere across the segment:
    - token waste is operational waste
    - context discipline is now a competitive advantage
    - benchmark wins are temporary, harness quality is permanent
  - Closing bridge: **the harness is what compounds, the model is what changes every six weeks.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Mythos vs Opus 4.7 (What Anthropic Held Back)

### Segment Thesis

Okay, so this segment is about Mythos vs Opus 4.7 (What Anthropic Held Back).

### Talking Points

- TheAIGRID buries it at `[13:40]`. We are not.
- Anthropic shipped **two** models this cycle. You only got one.
- **Claude Mythos Preview** — released April 7, 2026 under **Project Glasswing**.
  - Most capable model Anthropic has ever benchmarked.
  - Available only to Glasswing partners for defensive cybersecurity work.
  - Microsoft, Google, JP Morgan, Nvidia get it. Pro/Max users do not.
  - [Source: Anthropic — Mythos Preview](https://red.anthropic.com/2026/mythos-preview/)
  - [Source: Axios — Anthropic concedes Opus 4.7 trails Mythos](https://www.axios.com/2026/04/16/anthropic-claude-opus-model-mythos)
  - [Source: CNBC — Opus 4.7 less risky than Mythos](https://www.cnbc.com/2026/04/16/anthropic-claude-opus-4-7-model-mythos.html)
- **Benchmark gap, head to head**:
  - SWE-Bench Verified: Mythos `93.9%` vs Opus 4.7 `87.6%` — `+6.3pt`.
  - CyberGym (vulnerability repro): Mythos `83.1%` vs Opus 4.7 `73.1%` — `+10pt`.
  - GPT-5.4 on CyberGym: `66.3%`. Both Anthropic models clear it.
  - [Source: NxCode — Opus 4.7 vs 4.6 vs Mythos](https://www.nxcode.io/resources/news/claude-opus-4-7-vs-4-6-vs-mythos-which-model-2026)
  - [Source: Medium — Opus 4.7 vs Mythos breakdown](https://medium.com/data-science-in-your-pocket/claude-opus-4-7-vs-claude-mythos-f70a98643c00)
  - [Source: Ivy Pro School — Opus vs Mythos full comparison](https://ivyproschool.com/aihelpcenter/ai-strategy-pm/claude-opus-vs-claude-mythos)
- **What Anthropic left out of the 4.7 launch story**:
  - Opus 4.7 is the **bridge model**. Production safeguards tested here, then promoted up to Mythos-class for the enterprise tier.
  - The `$20`/Pro user is the safety-test cohort, not the customer.
  - Same week Anthropic briefly killed Claude Code on Pro and pushed users to API billing — see postmortem section.
- Tie back to thesis:
  - Two-tier model strategy is now explicit. Frontier capability gated behind enterprise contracts.
  - "Use the best model" stops being a real option for indie devs. You route what you have.
  - **The model is not the product. The harness is.** And the model you can't access is also not the product — it's the moat.
- Strong line:
  - **Anthropic's best model isn't on the price page. It's behind a Glasswing partner agreement.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Reaction — TheAIGRID Video

### Segment Thesis

Okay, so this segment is about Reaction — TheAIGRID Video.

### Talking Points

- Video: [Opus 4.7 Just Dropped — Here's What Everyone Missed](https://www.youtube.com/watch?v=r5BLAFPk9Jo) (TheAIGRID, 18:31, Apr 17 2026)
- Why pull up live: TheAIGRID buries the most damning indie-dev story of the launch — the **silent tokenizer change** — under generic benchmark commentary. Use the video as the springboard, then add the cost math live.
- Reaction beats with timestamps:
  - **[1:52] Document reasoning**: Opus 4.7 hits ~`80%`, miles ahead of 4.6, OpenAI, Google. Real claim. Co-Work-style multi-doc reasoning is the enterprise pitch.
  - **[3:36] Vending Machine bench**: `$8K` → `$11K`, `+36%`. Long-horizon coherence. This is where the agentic story actually lives.
  - **[5:49] GDP-Val**: Opus 4.7 max-effort = `1753`, surpasses GPT-5 Extra High. Now `#1`. Vow's Index, Vow's Finance Agent, Vibe Coding, Terminal Bench, Case Law v2 all up `5–10%+`.
  - **[9:21] Jagged frontier (Ethan Mollick)**: Opus 4.7 wins enterprise (software, IT, sciences, coding). Loses entertainment, sports, media. **Direct support for "route per task, not per brand."**
  - **[11:35] Nerf claim**: Reddit + Twitter saying Opus got dumber. TheAIGRID confirms qualitatively from his own workflows.
  - **[12:30] Wall Street Journal**: Anthropic metering compute during peak hours. Outages real.
  - **[13:23] AMD senior director quote**:
    - **"Claude has regressed and cannot be trusted to perform complex engineering."**
    - This is the kind of receipt the postmortem section needs.
  - **[13:40] Mythos via Glass Wing**: bigger Anthropic model already shipping enterprise-only. Microsoft, Google, JP Morgan, Nvidia. Pro/Max users get the leftovers.
  - **[15:13] Tokenizer change — the headline TheAIGRID buries**:
    - Opus 4.7 maps the same text to roughly `1.0x–1.35x` more tokens than 4.6.
    - Sticker price unchanged: `$5/M` input, `$25/M` output.
    - Real cost on the same prompts: up to **`+35%`**.
    - Strong line:
      - **Same price tag, more tokens per word. The bill went up and the changelog didn't say so.**
  - **[16:35] Adaptive reasoning only**: Anthropic disabled extended thinking for non-enterprise. Cannot turn high reasoning on right now.
  - **[16:54] SimpleBench regression**: Opus 4.6 ICS `67%` → Opus 4.7 `62%`. Reaper Bench worse too. Jagged frontier in action.
- Where this lands in our thesis:
  - Tokenizer change = perfect bridge to the **Token Margin Game** section. Same model, same sticker, **35%** higher real spend.
  - Mythos / Glass Wing = "the model is not the product" written in capacity decisions, not benchmarks.
  - AMD director quote = the cleanest external receipt for the postmortem story.
- Strong line:
  - **Opus 4.7 didn't just ship a smarter model. It shipped a quieter price hike.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Reaction — Theo (t3.gg) Video

### Segment Thesis

Okay, so this segment is about Reaction — Theo (t3.gg) Video.

### Talking Points

- Video: [I don't really like GPT-5.5…](https://www.youtube.com/watch?v=HUsDzyJ3H64) (Theo - t3․gg, 27:08, Apr 24 2026)
- Why pull up live: Theo is the indie-dev counterweight to corporate launch posts. He confirms the token-efficiency story with real numbers and exposes a context-pollution flaw that maps directly to our harness pitch.
- Reaction beats with timestamps:
  - **[0:36] Pricing hike**: GPT-5.5 = `$5/M` in, `$30/M` out. **2x** GPT-5.4. ~`20%` more than Opus 4.7. Lab is betting token efficiency outruns the per-token markup.
  - **[3:56] Terminal-Bench 2.0**: `82.7%` (vs `75.1` prior). Already in our notes — Theo confirms.
  - **[4:22] Anthropic banned OpenAI** from running Anthropic models in benchmarks. That's why the GPT-5.5 chart skips Opus comparisons.
  - **[4:37] GDP-Val**: `84.9` vs `83.0`. Theo calls it dishonest — wins less often, ties more. Useful counter to TheAIGRID's GDP-Val hype.
  - **[5:25] GPT-5.5 Pro**: pricing `$30/M` in, `$180/M` out. Beats Opus 4.7 on browse comp at `79.3`. Pro tier real and expensive.
  - **[6:29] Artificial Analysis Intelligence Index**: GPT-5.5 takes state-of-the-art.
  - **[7:22] Token efficiency, real numbers**:
    - GPT-5.5 X-high used `~75M` tokens to run the bench.
    - GPT-5.4 used roughly `~140M`. Opus 4.6 way more. Opus 4.7 nearly double GPT-5.5.
  - **[7:46] Cheap tier numbers**:
    - GPT-5.5 high = `45M` tokens.
    - GPT-5.5 medium = `22M` tokens, performance ~equal to 5.4 X-high.
    - **Live receipt for the `72%` token-efficiency claim in our notes.**
  - **[9:28] OpenAI now officially recommends low/medium reasoning** as default. First time a lab has explicitly told users to stop burning the top tier. Cost discipline pushed by the lab itself.
  - **[10:09] Fish Slop game demo**: 3 model versions side-by-side. Opus, GPT-5.4, GPT-5.5. GPT-5.5 plays better, looks better, taste-but-also-slop with the cards problem.
  - **[14:50] Sponsor page redesign**: classic GPT-5.5 slop. Card pills, broken state, hashed nav with no behavior. Honest demo of the failure mode.
  - **[17:46] "It feels lazy"** — Theo's main complaint:
    - Honors intent minimally. Stops too early. "Hacker on your team trying to close a Jira ticket."
    - Cursor / Lovable / Cognition love it. Theo cooler. Mixed signal worth surfacing.
  - **[18:43–18:59] Context pollution flaw — the indie-dev money quote**:
    - Once bad info enters context, GPT-5.5 keeps falling back to it.
    - Ben asks for one commit, model commits on every change after that. Telling it to stop does nothing.
    - Theo: "I've had to kill more threads with this model than I ever have in my life."
    - **"Worse at compaction, worse at coherency over time."**
  - **[19:47] Pelican Bench**: GPT-5.5 X-high crushes the SVG pelican. Codex endpoint backdoor used because the API wasn't out yet.
    - Codex endpoint usage officially blessed for OpenClaw, JetBrains, Open Code, Pi, **Claude Code 2** (yes, really). Worth a chuckle on stream.
  - **[21:19] GPT-5.5 Pro on Defcon**: solved 3 unsolved Defcon puzzles open `5–10 years`. One Theo wrote himself took `163 minutes` to crack — but it cracked. "Smartest model ever made, best code I've seen from an AI."
  - **[26:17] Pre-training note**: GPT-5.5 likely first model on a new pre-training base. Foundation laid for what's next.
  - **[26:48] "Should have been called GPT-6"**: Theo argues behavior is different enough that old prompts, harnesses, skills will not work cleanly. **This is the harness story, told by Theo without him calling it that.**
- Where this lands in our thesis:
  - **22M-token medium run** = our `72%` efficiency claim in numbers, not slides.
  - **OpenAI recommending low/medium** = lab-level proof token discipline is the new model-selection axis.
  - **Context pollution + kill-the-thread** = direct setup for code-review-graph (scope the read), caveman (compress the talk), conversation compaction (drop the rot). Stack sells itself off this clip.
  - **"Old prompts and harnesses won't work"** = literal restatement of "the model is not the product, the harness is."
- Strong line:
  - **OpenAI shipped a smarter model and told you to use it on low. Harness layer is now where the real ceiling sits.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Green Angle

### Segment Thesis

Okay, so this segment is about Green Angle.

### Talking Points

- The "green" argument is operational, not moral theater.
- Every useless token burns compute for no user value.
- Token optimization hits at once:
  - gross margin
  - speed
  - reliability
  - compute efficiency
- Best line:
  - **The greenest token is the one you never had to send.**

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Hot Take

Opus 4.7 versus GPT-5.5 is not really a fight about model quality. The benchmarks already split. The real fight is about which lab respects your bill. Anthropic shipped a frontier model and admitted in the same week that a single line in their wrapper made it measurably dumber for paying customers. OpenAI shipped a model that does roughly the same work for ~72% fewer output tokens. The lesson is not "pick a winner." The lesson is: **the model is not the product, the harness is**, and indie devs who route per task and cache aggressively will out-ship the people who keep arguing about brands. Pick the model for the loop, plug in RTK, caveman, and code-review-graph, and stop paying frontier prices for noise.

## Sources

- [GPT-5.5 vs Claude Opus 4.7 — coding comparison](https://www.mindstudio.ai/blog/gpt-55-vs-claude-opus-47-coding-comparison)
- [GPT-5.5 vs Opus 4.7 — benchmarks, pricing](https://lushbinary.com/blog/gpt-5-5-vs-claude-opus-4-7-comparison-benchmarks-pricing/)
- [GPT-5.5 vs Opus 4.7 — pricing, speed, benchmarks](https://llm-stats.com/blog/research/gpt-5-5-vs-claude-opus-4-7)
- [GPT-5.5 vs Opus 4.7 — frontier comparison](https://www.digitalapplied.com/blog/gpt-5-5-vs-claude-opus-4-7-frontier-comparison)
- [Opus 4.7 benchmarks explained — Vellum](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained)
- [TokenMix — 2026 frontier showdown](https://tokenmix.ai/blog/gpt-5-5-vs-claude-opus-4-7-showdown-2026)
- [Claude Code quality postmortem](https://devtoolpicks.com/blog/anthropic-claude-code-quality-fix-postmortem-2026)
- [Anthropic Pro plan removal and reversal](https://devtoolpicks.com/blog/anthropic-claude-code-pro-plan-removed-2026)
- [OpenAI docs: Prompt caching](https://platform.openai.com/docs/guides/prompt-caching)
- [OpenAI docs: GPT-5.4 model page](https://developers.openai.com/api/docs/models/gpt-5.4)
- [Anthropic docs: Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [GitHub: rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- [GitHub: JuliusBrussee/caveman](https://github.com/juliusbrussee/caveman)
- [GitHub: tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph)
- [ShipCode — AI dev pipeline harness](https://shipcode.shipshit.dev)
- [Anthropic — Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic — Claude Opus 4.7 launch](https://www.anthropic.com/news/claude-opus-4-7)
- [OpenAI — GPT-5.5 model page](https://developers.openai.com/api/docs/models/gpt-5.5)
- [OpenAI — API pricing](https://developers.openai.com/api/docs/pricing)
- [pricepertoken — Opus 4.7 cost breakdown](https://pricepertoken.com/pricing-page/model/anthropic-claude-opus-4.7)
- [apidog — GPT-5.5 pricing breakdown (Apr 2026)](https://apidog.com/blog/gpt-5-5-pricing/)
- [finout — Opus 4.7 pricing real cost story](https://www.finout.io/blog/claude-opus-4.7-pricing-the-real-cost-story-behind-the-unchanged-price-tag)
- [Vellum — Opus 4.7 benchmarks explained](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained)
- [llm-stats — Claude Opus 4.7 benchmarks](https://llm-stats.com/models/claude-opus-4-7)
- [automatio — Opus 4.7 1M context, SWE-bench](https://automatio.ai/models/claude-opus-4-7)
- [MindStudio — Opus 4.7 vision/coding/finance breakdown](https://www.mindstudio.ai/blog/claude-opus-47-benchmark-breakdown)
- [Kingy AI — GPT-5.5 vs Opus 4.7 benchmark field guide](https://kingy.ai/uncategorized/gpt-5-5-vs-claude-opus-4-7-a-benchmark-by-benchmark-field-guide-to-the-new-frontier/)
- [Tom's Guide — 7-test ChatGPT-5.5 vs Claude 4.7 wipeout](https://www.tomsguide.com/ai/7-0-wipeout-i-put-chatgpt-5-5-and-claude-4-7-through-7-impossible-tests-and-the-results-shocked-me)
- [TechCrunch — OpenAI ships GPT-5.5](https://techcrunch.com/2026/04/23/openai-chatgpt-gpt-5-5-ai-model-superapp/)
- [X: @daniel_mac8 — GPT-5.5 token efficiency](https://x.com/daniel_mac8/status/2047407932954841129)
- [X: @bcherny — Opus 4.7 day-to-day feel](https://x.com/bcherny/status/2044822408826380440)
- [X: @ArtificialAnlys — Opus 4.7 #1 GDPval-AA](https://x.com/ArtificialAnlys/status/2044856740970402115)
- [X: @ArtificialAnlys — Intelligence Index 57](https://x.com/ArtificialAnlys/status/2045292578434875552)
- [X: @TheZvi — Opus 4.7 capabilities + reactions](https://x.com/TheZvi/status/2046703306454798538)
- [X: @nateherk — GPT-5.5 vs Opus 4.7 hands-on](https://x.com/nateherk/status/2047436752051118513)
- [X: @OpenAI — GPT-5.5 launch](https://x.com/OpenAI/status/2047376561205325845)
- [X: @llmdevguy — how to use GPT-5.5](https://x.com/llmdevguy/status/2048736363600613776)
- [Anthropic — Claude Mythos Preview (Project Glasswing)](https://red.anthropic.com/2026/mythos-preview/)
- [Axios — Anthropic concedes Opus 4.7 trails Mythos](https://www.axios.com/2026/04/16/anthropic-claude-opus-model-mythos)
- [CNBC — Opus 4.7 less risky than Mythos](https://www.cnbc.com/2026/04/16/anthropic-claude-opus-4-7-model-mythos.html)
- [NxCode — Opus 4.7 vs 4.6 vs Mythos](https://www.nxcode.io/resources/news/claude-opus-4-7-vs-4-6-vs-mythos-which-model-2026)
- [Medium — Opus 4.7 vs Mythos breakdown](https://medium.com/data-science-in-your-pocket/claude-opus-4-7-vs-claude-mythos-f70a98643c00)
- [Ivy Pro School — Opus vs Mythos full comparison](https://ivyproschool.com/aihelpcenter/ai-strategy-pm/claude-opus-vs-claude-mythos)
- [YouTube: Nate Herk — I Tested GPT 5.5 vs Opus 4.7](https://www.youtube.com/watch?v=WX4rp-vP3zo)
- [YouTube: TheAIGRID — Opus 4.7 Just Dropped — Here's What Everyone Missed](https://www.youtube.com/watch?v=r5BLAFPk9Jo)
- [YouTube: Theo (t3.gg) — I don't really like GPT-5.5…](https://www.youtube.com/watch?v=HUsDzyJ3H64)
