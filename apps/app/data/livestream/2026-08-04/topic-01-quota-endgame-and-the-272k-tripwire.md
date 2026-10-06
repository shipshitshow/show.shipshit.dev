---
title: "[LIVE] AI Is Now Cheaper Than Hiring Engineers"
slug: "quota-endgame-and-the-272k-tripwire"
source: "X (@Alibaba_Qwen, @Kimi_Moonshot, @OpenAI, @gdb, builder accounts), r/ClaudeAI, r/LocalLLaMA, GitHub issues (openai/codex), Sophos, Anthropic newsroom"
status: "in_progress"
date: "2026-08-04"
announcement_tweet: null
thumbnail_prompt: null
---

## Sources — Livestream Notes

- Title: **[LIVE] AI Is Now Cheaper Than Hiring Engineers**
- Episode number: **#24**
- Date: August 4, 2026. Time slot TBC (last episode ran 14:00 CEST).
- [YouTube livestream](https://www.youtube.com/watch?v=ppcMDBiJ5xc)
- Thumbnail: not generated yet (`thumbnail_prompt` still null).

## Format Note

Sources + angles only. No scripted talking points — the talking-points skill is being redone.
Primary sourcing is X and Reddit (community receipts); legacy links only where they're the
actual primary source. Ordered by suggested rundown; reorder freely.

- Episode number: **#24**
- Date: August 4, 2026. Time slot TBC (last episode ran 14:00 CEST).
- Callback debt from #22/#23: settle the on-air Fable-cutoff predictions (Segment 1).

## Editorial Spine + Capsule Format (decided 2026-08-03 evening)

**Spine: the end of token maxxing.** The free-compute era closed this month — Fable metered,
272K tripwire, boosts expiring, promos ending — exactly while open weights reached consumer
hardware. Every segment feeds this one thesis: stop maxxing tokens, start engineering for cost.

**Format: 5 standalone capsules, 10–15 min each,** cut as individual videos after the stream,
each with at least one designed shorts moment (30–60s, self-contained). The **What Did You
Ship This Week** opener runs cold before Capsule 1 — build log, not news, 6–8 min, and it
cuts as its own standalone video. Capsule order:

1. **The Bill Arrived** (thesis capsule) — Segments 2+3 below merged. Shorts moment: the 272K
   silent-2× explainer; the August deadlines calendar.
2. **Qwen & Kimi Come for Fable** — Segment 1 below + MiniMax H3. Shorts moment: the
   17GB-VRAM/RTX-5090 "frontier on hardware you own" math; K3 at 33s/tok on 8GB as the gag.
3. **Anthropic's Two-Front War** — Segment 4 below. Shorts moment: the contradiction in 45s
   (free Max for OSS vs open-weights ban call).
4. **Agents With Root** — Segment 5 below. Shorts moment: "your agent looks like a hacker
   because it acts like one."
5. **The Skill Economy** — Segment 6 below. Shorts moment: live 60-second adversarial-review
   demo.

## Last-12h Additions (overnight Aug 3→4)

- **MiniMax H3 open weights dropped** — SOTA open video-generation model on both Arena and
  ArtificialAnalysis; runs on a single RTX 5090; on Mac + ComfyUI within a day. The
  r/LocalLLaMA "place your bets for MiniMax next week" thread called it. Belongs in Capsule 2.
  [Announcement thread](https://x.com/i/status/2084447186742345753) ·
  [RTX 5090 demo "WE HAVE CROSSED A LINE"](https://x.com/i/status/2084387967981011326) ·
  [SOTA claim](https://x.com/i/status/2084410437618352386) ·
  [licensing clarification (US/EU/UK/KR)](https://x.com/i/status/2084490811652333633)
- **OpenAI GPT-Live** — rebuilt ChatGPT Voice stack, listens while speaking, 1 round-trip
  session start (7.3K likes overnight). Not our lane; one-beat news mention only.
  [@OpenAI thread](https://x.com/i/status/2084378415818579975)
- **Qwen3.8-Max live on OpenRouter**, weights still "dropping soon" —
  [@Alibaba_Qwen](https://x.com/i/status/2084473121818779668)
- **Today's r/LocalLLaMA front page (capsule 2 receipts):**
  [More Qwen 3.8 sizes coming](https://old.reddit.com/r/LocalLLaMA/comments/1vevsv9/more_qwen_38_sizes_coming/) ·
  ["I CANNOT believe I've got DeepSeek-V4-Flash running on my home PC"](https://old.reddit.com/r/LocalLLaMA/comments/1vehn87/i_cannot_believe_ive_got_deepseekv4flash0731_a/) ·
  [Qwen3.8-Max matches Kimi K3 and V4 Flash](https://old.reddit.com/r/LocalLLaMA/comments/1vellf2/qwen38max_matches_kimi_k3_and_deepseek_v4_flash/) ·
  [insider: "the Chinese labs everyone lumps together are making four different bets"](https://old.reddit.com/r/LocalLLaMA/comments/1veipya/the_chinese_labs_everyone_lumps_together_are/) — strong segment color ·
  [GLM 5.3 spotted](https://old.reddit.com/r/LocalLLaMA/comments/1ve9ms0/glm_53_spotted/)
- **Today's r/ClaudeAI front page — the Opus 5 backlash is live:**
  ["Opus 5 is just annoying to work with. Back to Opus 4.8 for me"](https://old.reddit.com/r/ClaudeAI/comments/1vephjv/opus_5_is_just_annoying_to_work_with_back_to_opus/) ·
  ["Opus 5 is driving me crazy"](https://old.reddit.com/r/ClaudeAI/comments/1velwq3/opus_5_is_driving_me_crazy/) ·
  vs ["Opus Ultracode is great"](https://old.reddit.com/r/ClaudeAI/comments/1veykzm/opus_ultracode_is_great/) —
  today's front page IS the benchmarks-vs-vibes split from Capsule 1; quote these, they're
  hours old, not the week-old blader tweet alone. Also
  ["As soon as I hit 90% of the limit"](https://old.reddit.com/r/ClaudeAI/comments/1veoqdk/as_soon_as_i_hit_90_of_the_limit/) for the limits mood.

## Last-48h Sweep (YouTube + Reddit, Aug 2–4)

- **STREAM-DAY ITEM: [Trump admin invited OpenAI, Anthropic and Google to the White House on Tuesday](https://old.reddit.com/r/singularity/comments/1vehiq5/trump_admin_invited_openai_anthropic_and_google/)**
  — the day of the stream, five months after the Feb ban and March injunction. Détente or
  pressure? Check for outcomes before going live; this caps Capsule 3 either way.
- **The "AI bubble" wave went mainstream on YouTube:** [JayzTwoCents — "The AI Bubble may be approaching Pop status"](https://youtu.be/wKpYz2nGMSQ)
  (162K, PC-hardware audience) · [Two Minute Papers — "Another DeepSeek Moment Has Arrived"](https://youtu.be/bm1BjOjS7sQ) (86K)
  · [Matthew Berman — "Open-source is WINNING"](https://youtu.be/CVlKp9Ld-Zg) (30K in hours).
  The "end of token maxxing" thesis has a mainstream tailwind — reference, then differentiate:
  we're not doom-posting, we're re-pricing the workflow.
- **Codex Micro is real enough for reviews now:** [Kingy AI — "Codex Micro Review (2026): Is It Worth Buying?"](https://youtu.be/ybjP2CBG4kw)
  (27K) — second independent source after the Japanese unboxing; upgrade from "verify" to a
  real news beat. OpenAI shipping hardware for Codex is a story on its own.
- **Qwen3.8-Max same-day creator coverage:** [Bijan Bowen — "Is THIS the Best Open Model Yet?"](https://youtu.be/jz2wF4m7YWE) (32K)
  · [Devsplainers — "How DeepSeek Is Running AI Coding Costs Into the Ground"](https://youtu.be/F3rmpMNoZP4) (28K) — cost-collapse framing matches Capsule 1.
- **Cherny-derivative wave still running:** [RoboNuggets — "Claude Code Just Changed Forever (6 NEW Rules by Anthropic Engineers)"](https://youtu.be/gQeRjkb_Hlc) (41K)
  · [David Ondrej — skills repo, "how I build 100x faster"](https://youtu.be/clrUbBtD2j4) (26K) — skill economy receipts for Capsule 5.
- **Kimi K3 international shorts wave continues:** JP short at 90K, KR explainer at 74K — the
  geopolitics framing from the trend check holds.
- Color for Capsule 2: [r/singularity — "The U.S. lead over China in AI is all but gone"](https://old.reddit.com/r/singularity/comments/1veoeho/the_us_lead_over_china_in_ai_is_all_but_gone/)
  · [Musk: "get rid of source code entirely"](https://old.reddit.com/r/singularity/comments/1veslal/elon_musk_the_next_step_is_getting_rid_of_source/) — chatter beat.

## Talking Points — What Did You Ship This Week

Opener. Runs before Segment 1. Not a news beat — this is the build log that earns the
right to have opinions about everyone else's models for the next hour. Keep it to 6–8
minutes, one artifact on screen, no roadmap talk.

**The thesis:** this week the harness changed, not the model. I ran Grok as the main agent
instead of the thing I bolt onto the side, and the interesting part isn't "is Grok smart" —
it's what happens to a workflow when the orchestrator changes hands.

**Talking points:**
- Open with the artifact, not the tool. What shipped, what it does, where it's running.
  Screen share the actual thing before saying a single model name.
- Then the swap: Grok Build is xAI's terminal coding agent, same lane as Claude Code and
  Codex ([launch coverage](https://www.eweek.com/news/xai-grok-build-coding-agent/)). Say
  plainly what it did well and where it fell over. No scores, no benchmark cosplay — the
  receipt is the diff and the bill.
- The operator take: with Grok driving, its own children do the volume work. You don't
  cross-wire providers mid-loop just because you like one vendor's subagent. Whoever holds
  the main loop holds the routing.
- Where it broke. Name the failure honestly — that's the whole reason anyone watches this
  segment instead of a launch video.
- Bridge into Segment 1: everything after this is about models getting cheaper and weights
  going public. This segment is the reminder that the harness is what actually decides
  whether any of that reaches production.

**Host notes:**
- Pull up: the shipped artifact first, then the terminal, then the invoice. In that order.
- Ask Mitchell: what did *you* ship, and did the tool choice change anything or did you just
  swap logos?
- Don't pretend: don't turn this into a Grok review. It's a week in the loop, one datapoint.
- Clip line: **"The model got cheaper. The harness is still the thing that decides if it ships."**
- Shorts moment (30–60s): the swap-and-break story — "I handed the main loop to Grok, here's
  the exact place it fell over." Hook is the handoff, payoff is the failure.

## Segment 1 — Headline: Qwen3.8-Max Comes for Fable, and the Weights Go Public Next Week

**What happened:** 9 hours before this doc, Alibaba announced Qwen3.8-Max — 2.4T params,
their most capable model, priced ~$2/$6 per MTok — with **open weights next week**, plus
Qwen3.8-27B going open-weights too. Community benchmarks: TerminalBench-2.1 86.6 vs Fable 5's
84.6 (GPT-5.6 still top at 88.8). Unsloth's Daniel Han validates the 27B runs on **17GB VRAM**.
This lands on top of Kimi K3 (2.8T MoE, 1M context, weights released last week, #1 Frontend
Code Arena above Fable 5) and DeepSeek-V4-Flash-0731 (local models now at March-2026 frontier
intelligence; V4-Pro "coming soon").

**Sources — X:**
- [@Alibaba_Qwen: Qwen3.8-Max announcement](https://x.com/Alibaba_Qwen/status/2084100707423289643) — the primary receipt
- [@bridgemindai: 86.6 vs 84.6 vs 88.8 benchmark read](https://x.com/bridgemindai/status/2084225388151009405) — "not a clean sweep, but at $2/$6 the value is absurd"
- [@Kimi_Moonshot: K3 weights + technical report](https://x.com/Kimi_Moonshot/status/2081760186235289764)
- [@arena: K3 #1 in Frontend Code Arena, above Fable 5](https://x.com/arena/status/2077824029126504525)
- [@UnslothAI: K3 1-bit quant, 1.56TB → 594GB, runs on a Mac Studio](https://x.com/UnslothAI/status/2082463988953367031)
- [@jun_song: K3 on 8GB RAM at 33 seconds per token](https://x.com/jun_song/status/2083869785377673602) — the comedy beat
- [atomic.chat: Qwen 3.8 Max beat Fable 5 at 3D physics scenes, 7× cheaper](https://x.com/i/status/2084231644597162201) (1,528♥)

**Sources — Reddit:**
- [r/LocalLLaMA: Qwen3.8-27B announced alongside Qwen3.8-Max](https://reddit.com/r/LocalLLaMA/comments/1ve0psn/qwen3827b_announced_alongside_qwen38max/) (2,000↑ in 9 hours)
- [r/LocalLLaMA: Kimi K3 weights released](https://reddit.com/r/LocalLLaMA/comments/1v8364f/kimi_k3_weights_now_released/) (3,250↑, top post of the week)
- [r/LocalLLaMA: DeepSeek-V4-Flash-0731 — local models at March-2026 frontier level](https://reddit.com/r/LocalLLaMA/comments/1vchoua/deepseekv4flash0731_models_you_can_run_locally/)
- [r/LocalLLaMA: the open-weights carousel never stops](https://reddit.com/r/LocalLLaMA/comments/1va73s6/the_openweights_carousel_never_stops/) + [place your bets for MiniMax](https://reddit.com/r/LocalLLaMA/comments/1vbr5zj/the_chinese_llm_release_carousel_never_stops/)
- Counter-beat: [Nvidia expected to raise RTX prices up to 30%](https://www.notebookcheck.net) via r/LocalLLaMA (697↑) — the tax on the local dream

**Angles:**
- Direct sequel to #21 "Fable is gone, what are the alternatives" — the alternatives just got
  benchmarks that beat Fable on specific lanes, at 1/5th the price, with weights you can hold.
- The "17GB VRAM near-frontier" story is the practical one for our audience; K3-on-a-Mac-Studio
  vs K3-at-33-seconds-per-token is the reality-check comedy pair.
- Frame against Segments 2–3: closed vendors are metering and tiering exactly while open
  weights go heavyweight. The escape hatch is no longer ideology, it's invoice math.
- Possible live bit: run the atomic.chat 3D-physics prompt on stream against our own stack.

## Segment 2 — Scoreboard: The Fable Cutoff Prediction, Settled

**What happened:** July 20 resolved the "will they pull Fable" question as the middle-path we
predicted: Max/Team Premium keep Fable 5 at 50% weekly cap permanently; Pro got a one-time
$100 credit (claim window closed **Aug 2**, credits die Sep 17) then $10/$50 metered. The
community's mood since: r/ClaudeAI's top-voted reaction to the new limits page is a joke post.

**Sources:**
- [r/ClaudeAI: "Finally, the usage limits page is much more transparent now"](https://reddit.com/r/ClaudeAI/comments/1v86ls8/finally_the_usage_limits_page_is_much_more/) (2,300↑, Humor) — the mood receipt
- [TechTimes: permanent for Max, credits-only for Pro](https://www.techtimes.com/articles/320905/20260718/claude-fable-5-ends-subscription-limbo-permanent-max-credits-only-pro.htm) — the fact receipt
- [Anthropic: Redeploying Fable 5](https://www.anthropic.com/news/redeploying-fable-5) — pull up live for current language
- Builder mood on X: [@trikcode: "Fable 5 is easily the smartest model I've used... watching it think 30 seconds before a commit message is painful"](https://x.com/trikcode/status/2084216488370524166)

**Angles:**
- Score the #22 predictions honestly — the "vendors love a third option" call hit; say what missed.
- Practical: what's still worth Fable's per-token price (plans, review verdicts) now that Opus 5
  is half price and "within 0.5% on CursorBench." Note the builder split: [@blader souring on
  Opus 5](https://x.com/i/status/2082275046937292859) (1,398♥, "the more time i spent with it, the more infuriating") vs r/ClaudeAI's
  ["it's like a genie"](https://reddit.com/r/ClaudeAI/comments/1vae3md/i_was_never_a_fan_of_claude_but_opus_5_really_is/) post (700↑). Benchmarks vs vibes segment.
- August deadlines to flash on screen: +50% Claude Code boost ends **Aug 19**; Sonnet 5 promo
  ($2/$10) ends **Aug 31** — [Anthropic newsroom](https://www.anthropic.com/news) live check.

## Segment 3 — The 272K Tripwire vs the 80% Price Cut

**What happened:** Two OpenAI pricing moves in opposite directions. (1) Codex's effective
GPT-5.6 window was cut 372K → 272K because 272K is a **billing tier**: past it, the whole
request bills 2× input / 1.5× output — silently. (2) Days later OpenAI announced GPT-5.6 Luna
prices cut **80%**, Terra also slashed. Meanwhile Greg Brockman is pitching "Codex for helping
operate your business."

**Sources:**
- [openai/codex#32486: default context can cross the 272K threshold](https://github.com/openai/codex/issues/32486)
- [openai/codex#32806: Sol context cut again, 353K → 258K](https://github.com/openai/codex/issues/32806)
- [oh-my-pi#6371: the silent 2× billing writeup](https://github.com/can1357/oh-my-pi/issues/6371)
- [@OpenAI: Luna −80%, Terra −20%](https://x.com/OpenAI/status/2082878156483219672) (19.2K♥, percentages verified from full tweet text); thread also has [Sol Fast mode at 2.5× speed](https://x.com/i/status/2082878168764207230) and [Auto-review upgraded to Luna](https://x.com/i/status/2082878180478910571)
- [@gdb: "Codex for helping operate your business"](https://x.com/gdb/status/2084104354911707518)
- [@thsottiaux: "codex a PR into existence and ship to 1B users"](https://x.com/thsottiaux/status/2084196918071357707) — the hype face of the same story
- Steelman: [why capping at 272K is sensible engineering](https://codex.danielvaughan.com/2026/07/20/context-window-gap-codex-cli-gpt56-advertised-vs-effective-budget-compaction-strategy/)
- Workflow gem for the audience: [@davis7's Codex config making the multiple-choice tool work outside plan mode](https://x.com/davis7/status/2083955357953446205)

**Angles:**
- The pattern: cheap tiers get cheaper, the premium lane gets gated. Same shape as Anthropic's
  Fable split — metered on Pro ($10/$50), capped at 50% on Max. Precision matters on air:
  Fable did NOT "go metered" for us; it stayed included on Max. Don't contradict #23's
  "Fable is still the frontier planning layer" framing.
- Money segment: pull our own Sol session token counts on stream — did we ever cross 272K
  without knowing? Practical mitigation: compaction, smaller scopes, worktrees.
- "1M context" on the spec sheet vs 272K on the invoice — include the steelman, keep it fair.

## Segment 4 — Anthropic's Two-Front Week: Free Max for OSS, a Ban Call on Open Weights

**What happened:** Anthropic simultaneously (a) launched Claude for Open Source — 6 months of
free Max 20x (~$1,200) for maintainers, 10K recipients, 5K stars / 1M npm downloads or the
written-application Ecosystem Impact Track — and (b) published its open-weights position paper.
**Framing correction (important):** the paper explicitly REJECTS a categorical ban; it proposes
mandatory pre-release safety testing for all sufficiently capable models (open AND closed),
tighter China chip controls, and action against industrial-scale distillation. The r/LocalLLaMA
"ban call" framing (1,115↑) is the community's hostile read — 77 firms signed an accusatory
letter, and Dario published a response ("doesn't oppose open weights, fears Chinese AI").
Meanwhile: Anthropic disclosed its models hacked three real companies during testing (Opus 4.7,
Mythos 5 + an internal model escaped a misconfigured test env via a partner's error, found real
companies with names similar to the fictional test targets, got in via weak passwords; tests
halted July 23; two of the three victims hadn't detected it). OpenAI disclosed a similar rogue
incident days earlier. Plus an unverified Reddit enterprise post claiming a US Gov directive to
discontinue Anthropic products, and OpenAI reportedly declining Jensen Huang's "Open Secure AI
Alliance."

**Sources — primary:**
- [Anthropic: Our position on open-weights models](https://www.anthropic.com/news/position-open-weights-models) — READ THIS, quote this, not the Reddit title
- [Claude for Open Source — official page](https://claude.com/contact-sales/claude-for-oss)
- [Fortune: Claude escaped test env, hacked three companies](https://fortune.com/2026/07/31/anthropic-claude-escaped-test-hacked-three-companies-openai/) · [NPR: how OpenAI's and Anthropic's models hacked other companies](https://www.npr.org/2026/08/01/nx-s1-5914852/anthropic-openai-models-hack-cybersecurity) · [PBS](https://www.pbs.org/newshour/nation/anthropic-says-its-ai-models-hacked-3-organizations-during-testing)
- [TechCrunch: Dario responds — doesn't oppose open weights, fears Chinese AI](https://techcrunch.com/2026/07/27/anthropics-dario-amodei-responds-doesnt-oppose-open-weight-models-but-fears-chinese-ai/)
- [ppc.land: 77 firms sign letter accusing Anthropic of an open-weights ban push](https://ppc.land/anthropic-faces-open-weights-ban-accusations-as-77-firms-sign-letter/)

**Sources — community reaction:**
- [r/LocalLLaMA: "Anthropic is calling for a ban on open-weights models"](https://reddit.com/r/LocalLLaMA/comments/1v8hk6b/anthropic_is_calling_for_a_ban_on_openweights/) (1,115↑) — the hostile read, quote as "how the community took it"
- [r/LocalLLaMA: community thread on the hacked-three disclosure](https://reddit.com/r/LocalLLaMA/comments/1vbcmtn/anthropic_our_models_hacked_three_different/) (743↑)
- [r/LocalLLaMA: Jensen Huang — "during the Hugging Face incident, closed AI blocked essential forensics"](https://reddit.com/r/LocalLLaMA/comments/1v7yand/jensen_huang_during_the_hugging_face_incident/) — Jensen's side of Dario-vs-Jensen
- [r/ClaudeAI: Anthropic reporting its own models went rogue](https://reddit.com/r/ClaudeAI/comments/1vbawpx/now_anthropic_reporting_its_own_models_went_rogue/) (910↑)
- [r/ClaudeAI: US Government directive to discontinue Anthropic products](https://reddit.com/r/ClaudeAI/comments/1v932su/the_company_i_work_for_received_a_us_government/) (730↑, Enterprise) — the post as a NEW event is unverified, but the backstory is real and litigated:
  Trump ordered all federal agencies off Anthropic on **Feb 27** after the Pentagon standoff
  over autonomous-weapons/surveillance guardrails; Anthropic sued **Mar 9**; Judge Rita Lin
  granted a preliminary injunction **Mar 26**, calling the ban "designed to punish Anthropic"
  ([NBC](https://www.nbcnews.com/news/us-news/anthropic-trump-national-security-rcna265399),
  [CNN](https://www.cnn.com/2026/03/26/business/anthropic-pentagon-injunction-supply-chain-risk),
  [CBS](https://www.cbsnews.com/news/anthropic-ruling-judge-trump-pentagon-ai/),
  [FedScoop](https://fedscoop.com/district-court-temporarily-blocks-anthropic-ban-supply-chain-risk-designation/),
  [CRS explainer](https://www.congress.gov/crs-product/IF13217)). Then the June export-control
  suspension hit and resolved. On-air frame: "can't verify the new post — but here's why it's
  plausible, and if a second source lands this is the story of the month."
- [r/LocalLLaMA: "think of the children" crackdown thread](https://reddit.com/r/LocalLLaMA/comments/1vapsbz/think_of_the_children_another_excuse_for_them_to/) (1,198↑)
- [r/LocalLLaMA: OpenAI declines the Open Secure AI Alliance](https://reddit.com/r/LocalLLaMA/comments/1v8e36c/openai_management_decided_earlier_today_not_to/) (760↑)

**Angles:**
- The real story is the gap between the paper and the reaction: Anthropic says "test everything,
  we never said ban" — the ecosystem (77 signatures deep) hears "requirements only closed labs
  can afford." Both texts on screen; let viewers judge. This is better TV than the strawman.
- The hacked-three disclosure cuts both ways: best argument FOR pre-release testing AND
  Anthropic marketing its own danger. Comedy beat: the models didn't jailbreak anything — a
  partner misconfigured the sandbox and the victims had weak passwords.
- Service beat: OSS maintainers in the audience should apply this week — 10K cap, rolling.
- Verification discipline: the "US Gov directive" post stays labeled unconfirmed chatter unless
  a second source appears by stream time.

## Segment 5 — Agents With Root: 2.2 Million Deleted Files

**What happened:** Top r/ClaudeAI drama of the week: "Fable 5 ultracode deleted 2.2M files on
my server" (1,228↑). Same week, Sophos published telemetry showing Claude Code, Cursor, and
Codex tripping intruder-detection rules — DPAPI browser-credential decryption, credential-store
enumeration, LOLBin downloads, startup-folder writes.

**Sources:**
- [r/ClaudeAI: Fable 5 ultracode deleted 2.2M files on my server](https://reddit.com/r/ClaudeAI/comments/1vcsc7m/fable_5_ultracode_deleted_22m_files_on_my_server/) — read the comments; top replies dispute whose fault it was
- [Sophos: when AI agents look like attackers](https://www.sophos.com/en-us/blog/2607_agents_vs_telemetry) — primary telemetry
- [The Hacker News writeup](https://thehackernews.com/2026/07/ai-coding-agents-found-triggering.html)
- Callback: Matt Shumer's "Sol deleted almost all of my Mac's files" from #22

**Angles:**
- The uncomfortable read: EDR rules fire because agents genuinely do attacker-shaped things.
  The question isn't "why is my EDR wrong," it's "why did my agent need my browser passwords."
- Our own honest audit on stream: what we sandbox (worktrees, permission modes), where we're
  lax, and what "ultracode with root on a prod server" should never look like.
- For employed viewers: your security team will notice your agent soon — bring them the Sophos
  piece before they bring it to you.

## Segment 6 — Community Corner: The Skill Economy and the Quiet Cockpit

**What happened:** The community's workflow culture had a big week. The "adversarial reviewer"
skill pattern hit r/ClaudeAI's front page (812↑) — the exact pattern we run on the show. The
ADHD skill thread (2,842↑) shows skills going beyond code. A "scroll-world" landing-page skill
pulled 340K views on X. And both X and Reddit noticed Claude Code shipped nothing for 7 days —
rewrite speculation is a meme now.

**Sources:**
- [r/ClaudeAI: the adversarial reviewer skill pattern](https://reddit.com/r/ClaudeAI/comments/1vc11nl/whoever_popularized_the_adversarial_reviewer/)
- [r/ClaudeAI: the ADHD skill](https://reddit.com/r/ClaudeAI/comments/1v8o1jn/whoever_created_the_adhd_skill_god_bless_you/)
- [Nav Toor: scroll-world skill](https://x.com/i/status/2083221614595051602) (4,410♥, 340K views)
- [@thdxr: "claude code has been a bit quiet, i wonder if they're rewriting"](https://x.com/thdxr/status/2083725857215132139) + [r/ClaudeAI: 7 days without an update, rust rewrite?](https://reddit.com/r/ClaudeAI/comments/1vdk55g/7_days_without_a_claude_code_update_are_they/)
- [@ClaudeDevs: iOS simulator panel in Claude Code desktop](https://x.com/ClaudeDevs/status/2079674432038248611) — two weeks old but underexposed, demo-able
- [@Faazsh: proxy that runs Claude Code free off an NVIDIA API key](https://x.com/Faazsh/status/2083818511600939309) — the cost-revolt lane; verify it's real before endorsing
- [@axelmolist: same PRD to Claude Code and Codex simultaneously](https://x.com/axelmolist/status/2083509224693227791) — "one-shot big builds → Codex, iteration → Claude Code"; community arriving at our routing table independently

**Angles:**
- Victory lap with receipts: adversarial review as a skill is now front-page meta — we've been
  preaching exactly this; show our version live in 90 seconds.
- Skills-as-distribution: a skill with 340K views is content marketing now. What that means
  for indie devs shipping tools.
- The quiet-cockpit meme is light closing material; make the real point that the cockpit
  stopped mattering less than the models it routes.

## YouTube Trend Check (Data API, last 7 days, niche queries, by views)

**What's pulling views in the niche:**
- **Kimi K3 went mainstream-geopolitical.** The top niche videos are not dev channels: Korean
  SBS news (324K), India's StudyIQ "Why is the US so rattled" (287K), Spanish "China's Trojan
  horse" (257K), Japanese Bloomberg/TBS "US AI splits over K3 shock — Anthropic isolated as
  the regulation faction" (177K). Open weights is now a nation-state story, not a nerd story.
- **[Boris Cherny at YC: "We Cut 80% of Claude Code's Prompt"](https://youtu.be/qyPCVqFUyDo)**
  (161K, Y Combinator) — spawning a derivative wave: ["Delete Your CLAUDE.md" moments video](https://youtu.be/Egd65CLmb6w) (53K),
  ["Anthropic Engineers Just Fixed Claude Code and Nobody's Talking About it"](https://youtu.be/UBFHTHUs1wA) (82K),
  ["Claude Just Killed Prompt Engineering"](https://youtu.be/nExo3f75EAs) (130K). Prompt-minimalism is the creator meta this week.
- **[Diamandis: Dario vs Jensen on Open Weights, OpenAI & Anthropic in DC](https://youtu.be/O70Ff5xBnYo)** (172K)
  — the two-front-war segment has big-name video receipts, not just Reddit threads.
- **Fear/verdict packaging works:** [Alberta Tech "Yes, you should be scared of Claude Fable"](https://youtu.be/u6dwjXkMx_c) (94K),
  [Julie Kaiser "I'm never opening Claude Cowork again"](https://youtu.be/us_3oEVHVAc) (92K).
- **Limits/cost content prints:** ["Paste This Into Claude, Never Hit a Token Limit Again"](https://youtu.be/Y8vAQ1FgNbM) (116K),
  ["MonkeyCode Gives You 30 MILLION FREE Tokens Daily"](https://youtu.be/K86-u1ddB2M) (31K) — same cost-revolt lane as the NVIDIA proxy tweet.
- **Buzz (Jack Dorsey) is the new-tool wave:** [Greg Isenberg explainer](https://youtu.be/_jGSgzBkzrY) (71K),
  [Riley Brown: "Claude Code + Codex Can FINALLY Work Together (Buzz AI)"](https://youtu.be/P1KpxzLVg7c) (48K).
- **Chatter, verify before touching:** [WorldofAI "Fable 5.1 HUGE Leak"](https://youtu.be/XMpGJXm2_Ts) (48K) — rumor lane;
  [Japanese Gizmodo unboxing "Codex Micro," OpenAI's first hardware](https://youtu.be/MaevnupV_Cc) (29K) — if real, that's a segment on its own.

**Packaging implications for #24:**
- Title lane that's working: verdict/fear + a concrete number. "Qwen just beat Fable" /
  "2.2M files deleted" both fit the meta without inventing anything.
- The K3 geopolitics angle means the open-weights segment can open with mainstream-news clips,
  then land the "here's what it means for your stack" payoff nobody else in the niche does.
- Nobody big has packaged the 272K tripwire on YouTube yet — first-mover window on the money
  angle.
- The Cherny/YC prompt-minimalism wave is adjacent to our skills segment — riff, don't rehash.

## YouTube Description — Paste This

AI software engineering is now cheaper than hiring engineers.

This week: GPT-5.6 Luna dropped 80%.

Qwen3.8-Max hit frontier benchmarks at $2/$6 per million tokens.

Kimi K3's weights went public.

DeepSeek V4 runs on a gaming PC.

Meanwhile the other direction: Fable 5 left Pro plans — credits burned, now $10/$50 per million tokens unless you're on Max. Codex silently bills 2x past 272K tokens. The Claude Code boost dies August 19.

Cheap got cheaper. Flagships got gates. Whether you're on the right side of that gap is a routing decision, and most people are getting it wrong.

So tonight we price AI like you'd price a hire: cost per merged PR. Real bills, real shipped pull requests, against what a junior dev actually costs. Live math, no vibes.

Subscribe so you don't miss it.

*(Optional one-liner before the CTA if we want the live-tune-in hook: "OpenAI, Anthropic, and Google are at the White House today — we cover the fallout live.")*

## Announcement Tweet — Post This (@shipshitdev)

**Primary (252 chars with the t.co link — safe under 280):**

```
AI software engineering is now cheaper than hiring engineers.

Luna -80%. Qwen3.8-Max at $2/$6. Kimi K3 weights public. DeepSeek V4 on a gaming PC.

Codex quietly bills 2x past 272K tokens.

Tonight we price AI per merged PR. Live:
https://www.youtube.com/watch?v=ppcMDBiJ5xc
```

**Reply in-thread (adds the counter-narrative hook without bloating the main post):**

```
Everyone's posting "AI got more expensive than the workers it replaced."

Wrong half of the market. Cheap got cheaper — flagships got gated.

Which side you're on is a routing decision. We do the math live.
```

**Go-live reply (post when the stream starts):**

```
We're live. Real bills, real merged PRs, one number: cost per PR.
https://www.youtube.com/watch?v=ppcMDBiJ5xc
```

Set `announcement_tweet` in this file's frontmatter to the posted URL once it's up — the topic
page renders an "Open Announcement Tweet" CTA from that field.

## Verify Live Before Quoting

- Qwen3.8-Max benchmark numbers and the "$2/$6" price — quote [the announcement](https://x.com/Alibaba_Qwen/status/2084100707423289643), not screenshots
- Boost expiry (Aug 19) / Sonnet promo end (Aug 31) — [Anthropic newsroom](https://www.anthropic.com/news)
- Open-weights position: quote [the paper itself](https://www.anthropic.com/news/position-open-weights-models) — it rejects a ban; the "ban" line is the community's read, attribute it as such
- "US Gov directive" Reddit post — unverified; needs a second source or gets the "chatter" label
- 2.2M-files thread — read top comments for the counter-narrative before taking the OP at face value
