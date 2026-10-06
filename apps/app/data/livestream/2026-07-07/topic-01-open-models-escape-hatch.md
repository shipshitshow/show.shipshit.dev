---
title: "Fable 5 Is Gone. What Are the Alternatives?"
slug: "open-models-escape-hatch"
source: "Anthropic, OpenAI, gpt-oss, GLM 5.2, Kimi, DeepSeek, Qwen, AWS Bedrock, Ollama, LM Studio, vLLM, Artificial Analysis, Aider, SWE-bench, Reddit, X, YouTube, How I AI, NVIDIA, EIA, Energy.gov, OpenRouter"
status: "in_progress"
date: "2026-07-07"
announcement_tweet: null
thumbnail_prompt: "16:9 YouTube livestream thumbnail, 1920x1080, high-contrast Ship Shit Show tech thumbnail. EDIT TARGET: keep the existing 260707 split-screen thumbnail composition, lighting, laptop/tablet screen, blue open-model icon grid on the left, host placement, pointing gestures, and dark cinematic background. HOST LOCKS: preserve Vincent on the left from the injected Vincent reference photo, bald man, light tan olive skin, stubble, green-hazel eyes, black hoodie, serious curious-disbelief expression; preserve Mitchell on the right from the injected Mitchell reference photo, dark slicked-back wavy brown hair, fair skin, blue eyes, navy shirt/polo, confused wait-what expression. MAIN CHANGE: remove only the orange cloud/server icon on the right side and replace it with the injected Fable butterfly question-mark asset as a glowing orange/red premium-model mark. Keep the question-mark silhouette and butterfly structure clear; do not turn it into text, a generic butterfly, a robot, a server, or a cloud. BRANDING: change the top-right episode number to '#22'. TEXT: no title text, no model-name labels, no UI labels, no official brand wordmarks, only '#22'. NEGATIVE: do not redesign the layout, do not switch to parchment full background, do not alter the blue open-model panel, do not change the hosts, do not add any cloud/server icon."
---

## Cold Open — Read This

> "The question is not whether open models are cool."
>
> "The question is whether any of them can do the job Fable 5 was doing."
>
> "Fable is the model people wanted inside the deep loop: repo audits, hard bugs, security-shaped reasoning, long agent runs, expensive decisions."
>
> "But if the model is blocked, metered, policy-shaped, or just too expensive to run all day, it becomes a single point of failure."
>
> "So tonight we build the replacement map."
>
> "Not one magic open model. A scorecard, a shortlist, local versus hosted, and one real repo test."

## Summary

Fable 5 is the job description for the episode. It showed why builders want stronger reasoning inside coding loops, but it also exposed the risk: the best worker can disappear, move behind usage credits, or behave differently because of safety and access layers. This stream reframes open models as a replacement strategy, not an ideology. The point is not "open beats closed." The point is: which open models can take which Fable jobs, what route should call them, and where does frontier still earn the bill?

## Hot Take

No single open model replaces Fable 5.

A measured bench of open models can replace the bad architecture of depending on Fable 5 for everything.

## Sources — Livestream Notes

- Title: **[LIVE] Fable 5 Is Gone. What Are the Alternatives?**
- [YouTube livestream](https://www.youtube.com/watch?v=h0EzR9Sqkz0)
- Thumbnail Fable mark asset: `/Users/decod3rs/Desktop/thumbnails/2607/260707/fable-butterfly-question-asset.png`
- Thumbnail host refs: Vincent `/Users/decod3rs/Desktop/thumbnails/pfps/vincentshipsit/vincentshipsit.jpg`; Mitchell `/Users/decod3rs/Desktop/thumbnails/pfps/mntll_nl/mntll_nl.jpg`
- Generated thumbnail: `/Users/decod3rs/Desktop/thumbnails/2607/260707/open-models-fable-5-thumbnail-v2-1920x1080.png`
- Stream path: Fable job description -> replacement scorecard -> open-model shortlist -> local/hosted routes -> bill check -> same repo test.
- Live test: one small Fable-shaped coding task, local open model vs hosted open model, score the diff.
- Main rule: do not sell open models as magic. Sell them as a replacement layer for specific jobs.

## Talking Points — Fable 5 Is The Job Description

### Segment Thesis

You cannot pick a Fable replacement until you define the job Fable was doing.

### Talking Points

- Pull up [Anthropic: Claude Fable 5 and Claude Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5). Receipt: Fable was not interesting because it could chat. It was interesting because builders wanted it for harder reasoning work.
- Pull up the previous [Ship Shit Show Fable 5 topic](../2026-06-16/topic-01-anthropic-claude-fable-5.md). Our operator receipt: Fable felt useful for deeper repo audits, game systems, bug hunts, security-shaped reasoning, and long agent loops.
- The replacement target is not "sounds smart in chat." The target is: inspect the repo, choose the right files, use tools, patch cleanly, recover when tests fail, and not hallucinate confidence.
- This is why Fable access hurt more than a normal model switch. It was becoming the expensive specialist inside the loop.
- Clip line: **"You do not replace Fable with a vibe. You replace the job it was doing."**
- Transition: once the job is clear, the next question is not which model has the prettiest launch post. It is what scorecard decides the replacement.

### Host Notes

- Ask Mitchell: what are the top three jobs he would have routed to Fable before access got weird?
- Pull up: Fable launch page, previous June 16 topic, July 1 Fable return topic if needed.
- Do not pretend every open model has to beat Fable at everything. That is not the replacement strategy.

## Talking Points — The Replacement Scorecard Beats The Leaderboard

### Segment Thesis

Benchmarks shortlist models, but the replacement test is cost per accepted diff.

### Talking Points

- Pull up [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models). Use it to filter broad quality, speed, and price.
- Pull up [Aider leaderboard](https://aider.chat/docs/leaderboards/). Use it for practical code-editing signal.
- Pull up [SWE-bench](https://www.swebench.com/). Use it for repo repair context, not as a religion.
- Replacement scorecard: accepted diff rate, right-file selection, tool obedience, test honesty, retry count, latency, cost, context handling, local/hosted availability, and failure recovery.
- The leaderboard asks "which model is strongest?" The builder asks "which model gets this PR merged with the least supervision?"
- Clip line: **"Benchmarks get the model an interview. The diff hires it."**
- Transition: that scorecard changes the show from "what is the best open model?" to "which models belong on the Fable replacement bench?"

### Host Notes

- Ask Mitchell: what matters more for his workflow, best final answer or lowest supervision?
- One chart, then terminal. Do not table-read.
- If a model ranks well but cannot patch this repo, it is not a Fable replacement for us.

## Talking Points — The Shortlist Is A Bench, Not A King

### Segment Thesis

The Fable replacement is a bench of models routed by task, not one open-model winner.

### Talking Points

- Pull up [OpenAI: Introducing gpt-oss](https://openai.com/index/introducing-gpt-oss/). Point: open-weight models are now mainstream enough that fallback architecture is not fringe anymore.
- Pull up [How I AI: GLM 5.2 is SO GOOD](https://www.youtube.com/watch?v=ZoBfQZ5utQk) and [Claire Vo on GLM 5.2 as Claude Code default](https://x.com/clairevo/status/2069828122640548204). Treat this as builder signal, not final proof.
- Pull up [r/ClaudeCode: Fable 5 Alternative](https://www.reddit.com/r/ClaudeCode/comments/1ulvuur/fable_5_alternative/) and [r/ClaudeCode: So GLM claim it's almost fable](https://www.reddit.com/r/ClaudeCode/comments/1u89jew/so_glm_claim_its_almost_fable_does_this_mean/). The audience is already asking the practical version: do I pay more to squeeze one more week out of Fable, or test GLM-style replacements now?
- Pull up [God of Prompt: Claude Fable 5 Is Gone. Here Is Exactly What I Switched To.](https://x.com/godofprompt/article/2066490932887699642), [Together AI on Kimi K2.7 Code vs Claude Fable 5](https://x.com/togethercompute/status/2067311720197173610), and [Hooeem's GLM 5.2 setup thread](https://x.com/hooeem/status/2068989788485480682). This is the social replacement stack: GLM for Claude Code loops, Kimi for cost-comparison demos, local/hosted routing for escape velocity.
- Pull up [Best Open-Source Coding Model? GLM vs DeepSeek vs MiniMax vs Kimi](https://www.youtube.com/watch?v=0SZ6mVWTxQA). Use it as the shortlist lane: GLM, Kimi, DeepSeek, Qwen, MiniMax-style contenders.
- Pull up the prior [Composer 2.5 / Kimi topic](../2026-05-26/topic-01-cursor-composer-2-5.md). The point is not Cursor. The point is that an open-weight base can collapse the cost floor when a good harness wraps it.
- Candidate lanes: one local model for cheap repetition, one hosted open model for managed fallback, one coding-specialist model for repo edits, and frontier/Fable only when failure cost is higher than model cost.
- Clip line: **"There is no Fable killer. There is a Fable bench."**
- Transition: but a replacement bench is useless if the workflow cannot call it reliably.

### Host Notes

- Ask Mitchell: if he had to pick only two open candidates for tomorrow, which two get tested first?
- Do not crown a winner from social posts. Social proof gets the model onto the bench; the repo test keeps it there.
- Use the Reddit threads as audience-language receipts. Use the X posts as builder-signal receipts. Vendor posts are framing, not independent benchmark proof.
- Keep language careful: "candidate," "builder signal," "shortlist," not "proven replacement" until the live test.

## Talking Points — Replacement Means You Can Actually Call It

### Segment Thesis

An open model only replaces Fable if it has a reliable route into the workflow.

### Talking Points

- Local route: [Ollama](https://docs.ollama.com/api/openai-compatibility), [LM Studio](https://lmstudio.ai/docs/developer/core/server), [vLLM](https://docs.vllm.ai/en/latest/getting_started/quickstart/).
- Hosted route: [AWS Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html), [Bedrock model catalog](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html), [Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html), [OpenRouter pricing](https://openrouter.ai/pricing).
- Local is control, privacy, and cheap repetition if the hardware is real. Hosted is convenience, less setup pain, and easier routing.
- The access story is the reason this episode exists. If Fable can disappear, hit usage-credit math, or get policy-shaped, your agent loop needs another route.
- Clip line: **"A model you can't call is not infrastructure."**
- Transition: calling it is only half the story. The bill decides whether the replacement survives real usage.

### Host Notes

- Ask Mitchell: what would he route local-first tomorrow, and what would he never run locally?
- Do not get stuck installing live. Show the routes, then test.
- Keep the frame: this is replacing Fable as a dependency, not dunking on Fable as a model.

## Talking Points — The Bill Picks The Route

### Segment Thesis

Open models do not remove cost. They move the bill to a different part of the system.

### Talking Points

- Pull up [OpenAI gpt-oss](https://openai.com/index/introducing-gpt-oss/). Point: 20B wants 16GB memory, 120B wants an 80GB GPU.
- Pull up [Ollama FAQ](https://docs.ollama.com/faq). Run `ollama ps`; if it spills to CPU, the workflow is not really GPU-fast.
- Pull up [NVIDIA RTX 4090 specs](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/). Receipt: 450W total graphics power, 19W idle, 850W recommended system power.
- Estimate: `(watts / 1000) * hours * kWh price`. Example: 450W for 4h/day at $0.14/kWh is about $7.50/month GPU-only. 800W 24/7 is about $81/month.
- Hosted check: [AWS Bedrock pricing](https://aws.amazon.com/bedrock/pricing/) and [OpenRouter pricing](https://openrouter.ai/pricing). Token bills scale with loops; electricity scales with hours and watts.
- Fable-credit check: compare all of this against "just pay for Fable when the task is expensive to fail." Sometimes the frontier model is still the cheap option because it saves retries and cleanup.
- Clip line: **"Open weights move the bill. They don't delete it."**
- Transition: the only honest way to end this is to make the models touch a repo.

### Host Notes

- Ask Mitchell: would he rather debug GPU heat or token invoices?
- Don't pretend local is cheaper until the machine is measured.
- Make the cost unit "finished task," not "million tokens."

## Talking Points — The Live Test Is The Replacement Test

### Segment Thesis

The Fable replacement test is one small repo task, same ask, scored by damage and recovery.

### Talking Points

- Task shape: one small but Fable-shaped job. Good candidates: find a real bug, add a guard, patch a parser, improve a test, or repair a failing edge case.
- Path A: local open model via Ollama / LM Studio.
- Path B: hosted open model via Bedrock / OpenRouter.
- Optional Path C: Fable or prior Fable behavior as the control, if access and credits make sense live.
- Score: right files, clean diff, test choice, recovery after failure, latency, cost, and whether it lies when broken.
- If the open model fails, that is useful. It shows where frontier still earns the bill.
- Clip line: **"The diff is the benchmark."**

### Host Notes

- Keep the task small. A huge live refactor turns into setup pain.
- Don't let chat turn it into "my favorite model is better." Keep it workflow-scored.
- End with routing rules, not a victory lap.

## Closing Take

> "Open models are not replacing Fable 5 as one magic brain."
>
> "They are replacing the bad assumption that one premium model can be the whole workflow."
>
> "Use frontier when the work is hard and failure is expensive."
>
> "Use hosted open when you need managed fallback."
>
> "Use local when you need control, privacy, and cheap repetition."
>
> "The architecture is not model loyalty."
>
> "The architecture is a bench, a router, and a diff."

## Sources — Fable Replacement Context

- [Anthropic: Redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5) — official Fable return, access timing, safeguards, usage-limit/credit language.
- [Anthropic: Claude Fable 5 and Claude Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5) — official Fable/Mythos page. Pull up current availability state and pricing/access language.
- [Previous Ship Shit Show: WTF Is Going On With Anthropic & Claude Fable 5?](../2026-06-16/topic-01-anthropic-claude-fable-5.md) — our prior Fable access/cost/trust framing.
- [Previous Ship Shit Show: Fable 5 Is Back. Sonnet 5 Is The Compromise.](../2026-07-01/topic-01-fable-5-sonnet-5-reaction.md) — routing setup for this follow-up.
- [OpenAI: Previewing GPT-5.6-Sol](https://openai.com/index/previewing-gpt-5-6-sol/) — official GPT-5.6 preview framing. Use this as the "exists, but preview is not a production plan" receipt.
- [OpenAI: Introducing gpt-oss](https://openai.com/index/introducing-gpt-oss/) — official open-weight model release. Pull up 20B/120B positioning.

## Sources — Open Model Candidates

- [OpenAI: Introducing gpt-oss](https://openai.com/index/introducing-gpt-oss/) — 20B memory target and 120B single-80GB-GPU framing.
- [Ollama: gpt-oss:20b](https://ollama.com/library/gpt-oss%3A20b) — Ollama model page and local memory framing.
- [How I AI: GLM 5.2 is SO GOOD (and almost free)](https://www.youtube.com/watch?v=ZoBfQZ5utQk) — reference vibe: set up an open model, run it against real code, then talk cost and capability.
- [Best Open-Source Coding Model? GLM vs DeepSeek vs MiniMax vs Kimi](https://www.youtube.com/watch?v=0SZ6mVWTxQA) — benchmark-battle setup for the replacement shortlist.
- [Claire Vo on GLM 5.2 as Claude Code default](https://x.com/clairevo/status/2069828122640548204) — builder switching signal. Treat as social proof, not final proof.
- [Hooeem: GLM 5.2 with Claude Code / Anthropic SDK / LM Studio](https://x.com/hooeem/status/2068989788485480682) — practical setup/social proof.
- [Mark Watson: Claude Code with gpt-oss-20b on Ollama](https://x.com/mark_l_watson/status/2014694705288638611) — local coding workflow angle.
- [Ship Shit Show: Cursor Composer 2.5 / Kimi topic](../2026-05-26/topic-01-cursor-composer-2-5.md) — prior context for open-weight base models lowering coding-agent cost.

## Sources — Local Route

- [Ollama: OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility) — local OpenAI-compatible endpoint.
- [Ollama FAQ: check CPU/GPU split](https://docs.ollama.com/faq) — use `ollama ps` to verify whether the model is actually on GPU.
- [LM Studio: Local server](https://lmstudio.ai/docs/developer/core/server) — local server and API docs.
- [vLLM quickstart](https://docs.vllm.ai/en/latest/getting_started/quickstart/) — OpenAI-compatible serving path for GPU boxes.
- [Simon Willison: LLM 0.26 tools with local models from Ollama](https://simonw.substack.com/p/large-language-models-can-run-tools) — credible local-model tool-use receipt.
- [Simon Willison: gpt-oss write-up](https://simonwillison.net/2025/Aug/5/gpt-oss/) — open-weight model context from a serious practitioner.

## Sources — Hardware And Electricity

- [NVIDIA RTX 4090 official specs](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) — use as a concrete 450W GPU / 850W system-power receipt.
- [NVIDIA-SMI manual](https://docs.nvidia.com/deploy/nvidia-smi/index.html) — use `power.draw`, `memory.used`, and utilization to measure the actual run.
- [Energy.gov: estimating electronic energy use](https://www.energy.gov/energysaver/estimating-appliance-and-home-electronic-energy-use) — formula for watts, hours, kWh, and cost.
- [EIA electricity monthly update](https://www.eia.gov/electricity/monthly/update/end-use.php) — current U.S. average revenue per kWh; use local rate for real math.
- [Omni electricity cost calculator](https://www.omnicalculator.com/everyday-life/electricity-cost) — fast on-stream calculator for watts, hours, rate, monthly cost.
- [Seasonic PSU wattage calculator](https://seasonic.com/wattage-calculator/) — sanity-check total system power before recommending a local GPU build.

## Sources — Hosted Route

- [AWS Bedrock: What is Amazon Bedrock?](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html) — managed model service framing.
- [AWS Bedrock pricing](https://aws.amazon.com/bedrock/pricing/) — model/provider/tier-specific hosted cost reference.
- [AWS Bedrock: Supported foundation models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) — model catalog.
- [AWS Bedrock: Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html) — one API surface across chat models.
- [OpenRouter pricing](https://openrouter.ai/pricing) — pay-as-you-go hosted-routing pricing reference.

## Sources — Benchmarks

- [Artificial Analysis model leaderboard](https://artificialanalysis.ai/leaderboards/models) — broad intelligence, price, speed comparison.
- [Aider LLM leaderboard](https://aider.chat/docs/leaderboards/) — code editing benchmark; use as practical coding filter.
- [SWE-bench](https://www.swebench.com/) — code repair benchmark context.

## Sources — Audience Pain And Social Proof

### X / Twitter To Pull Up

- [The New Stack on Fable/open-weight response](https://x.com/thenewstack/status/2067608410611229186) — bridge from blocked Fable to open models.
- [Claire Vo: GLM 5.2 as default in Claude Code + Cursor](https://x.com/clairevo/status/2069828122640548204) — direct builder-switching signal with a concrete low-cost anecdote.
- [Hooeem: GLM 5.2 setup for Claude Code / Anthropic SDK / LM Studio](https://x.com/hooeem/status/2068989788485480682) — practical replacement path for cheaper agentic loops.
- [God of Prompt: Claude Fable 5 Is Gone. Here Is Exactly What I Switched To.](https://x.com/godofprompt/article/2066490932887699642) — direct "switched from Fable" framing; use as social proof, not proof of model quality.
- [Together AI: Kimi K2.7 Code vs Claude Fable 5](https://x.com/togethercompute/status/2067311720197173610) — vendor-side comparison claim; useful because vendors are explicitly positioning open models against Fable.
- [Elliot Arledge: Kimi K2.7-Code benchmarked against Claude Fable 5](https://x.com/elliotarledge/status/2065443474560946615) — independent builder benchmark signal; verify details live before repeating numbers.
- [Mark Kretschmann: Kimi K2.7 Code near Fable on ErdosBench](https://x.com/mark_k/status/2066150260636872715) — benchmark leaderboard signal for the Kimi lane.
- [Tomasz Tunguz: burned Claude Code credits, considered GPT-OSS local](https://x.com/ttunguz/status/1988725222309347487) — legit cost-pressure receipt.
- [Rohit Ghumare: Claude Code locally with Ollama](https://x.com/ghumare64/status/2013974925694914941) — setup/social proof.
- [ayemojubar: local LLM orchestration layer for Claude Code powered by Ollama](https://x.com/ayemojubar/article/2066488612745523372) — routing-layer example.
- [rewind: AI bill to electricity bill anecdote](https://x.com/rewind02/status/2070090064453828624) — viral cost framing; verify live before treating as fact.

### Reddit Threads To Pull Up

- [r/ClaudeCode: Fable 5 Alternative](https://www.reddit.com/r/ClaudeCode/comments/1ulvuur/fable_5_alternative/) — direct user decision: pay more / add accounts to finish with Fable, or find an alternative.
- [r/ClaudeCode: So GLM claim it's almost fable. Does this mean...](https://www.reddit.com/r/ClaudeCode/comments/1u89jew/so_glm_claim_its_almost_fable_does_this_mean/) — direct GLM-as-Fable-replacement discussion.
- [r/ClaudeCode: Are the GLM 5.2 glazers all Chinese bots?](https://www.reddit.com/r/ClaudeCode/comments/1uab0qe/are_the_glm_52_glazers_all_chinese_bots/) — useful skeptical counterweight: some users say GLM is good but not Fable-level in real work.
- [r/ClaudeCode: Fable pricing is a joke](https://www.reddit.com/r/ClaudeCode/comments/1unfp0j/fable_pricing_is_a_joke/) — cost-routing argument: use cheaper models when the task is scoped enough.
- [r/ClaudeCode: Only option now that Fable is banned](https://www.reddit.com/r/ClaudeCode/comments/1u4nhv6/only_option_now_that_fable_is_banned/) — meme version of the open-source replacement desire.
- [r/LocalLLaMA: I'm tired of Claude limits, what's the best alternative?](https://www.reddit.com/r/LocalLLaMA/comments/1pggss8/im_tired_of_claude_limits_whats_the_best/) — audience pain.
- [r/LocalLLaMA: Real-world open source alternatives to Opus 4.6](https://www.reddit.com/r/LocalLLaMA/comments/1sw2gew/realworld_open_source_alternatives_to_the_now/) — reality check, not just hype.
- [r/LocalLLaMA: Best Local LLMs - Apr 2026](https://www.reddit.com/r/LocalLLaMA/comments/1sknx6n/best_local_llms_apr_2026/) — hardware/model picks.
- [r/LocalLLaMA: coding agent software for local models](https://www.reddit.com/r/LocalLLaMA/comments/1rbmnw7/is_there_any_good_coding_agent_software_for_use/) — tools around local models.

### YouTube Videos To Pull Up

- [How to use GPT-OSS locally, step by step](https://www.youtube.com/watch?v=tiW3e9sNlGY) — beginner install reference.
- [OpenAI's Opensource OSS 120B and 20B, fully tested](https://www.youtube.com/watch?v=w_1ZIXdDxlQ) — model test reference.
- [FREE Local AI Coding FOREVER](https://www.youtube.com/watch?v=Y3oe0QTSJgE) — local coding workflow hook.
- [Connect LM Studio Models to VS Code](https://www.youtube.com/watch?v=l3hcewcrYjo) — IDE setup path.
- [Deploy a fine-tuned LLM from Hugging Face to Amazon Bedrock](https://www.youtube.com/watch?v=r0YCm8XWO7I) — Bedrock deployment path.

## Tweets — Paste Live

> Fable 5 is too good to treat as guaranteed infrastructure. Tonight we build the fallback: open models, local/hosted routing, and one repo test.

> No single open model replaces Fable 5. A bench of open models can replace the bad architecture of depending on Fable for everything.

> There is no Fable killer. There is a Fable bench.

> A model you can't call is not infrastructure.

> Open weights move the bill. They don't delete it.

> Benchmarks get the model an interview. The diff hires it.
