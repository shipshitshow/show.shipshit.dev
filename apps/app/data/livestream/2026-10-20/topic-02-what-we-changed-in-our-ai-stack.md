---
title: "Is OpenAI Dying? Anthropic Is Taking Over"
slug: "what-we-changed-in-our-ai-stack"
source: "Silicon Carne 'OpenAI au cœur de la bulle IA' (YouTube vjANwplght0, 19 Oct, French auto-captions), Financial Times via Reuters/The Star (cash burn, 18-19 Sep), TechCrunch citing the FT (run rate, 8 Oct), The Information via TradingKey (Q1 2026 figures and compute commitments, 16 Jun), OpenAI funding announcement (Mar), Mitchell's lineup (via Vincent, 19 Oct), hosts' own billing and usage, Anthropic monthly API credits for Max and Team (announced 7 Oct, Help Center and platform docs), Developers Digest summary (8 Oct), @bot and @elonmusk Grok Bot email posts (9 Oct), 9to5Mac (9 Oct), Notebookcheck on Muse skipping Europe (Oct), our 6 Oct Grok Bot vs Dots vs Muse board, Anthropic 'How employment is changing at Anthropic' (16 Oct)"
status: "in_progress"
date: "2026-10-20"
announcement_tweet: null
thumbnail_prompt: null
---

## Sources — Livestream Notes

- Date: Tue 20 Oct 2026. Start time and YouTube link: **not set yet.** Previous shows started at 14:00 CEST.
- **Spine (Vincent, 20 Oct): OpenAI's money problem.** OpenAI forecasts **$278B of negative free cash flow from 2026 to 2030** (FT). Its run rate is about **$50B, not the $70B** investors had been passed (FT, 8 Oct). It has up to **$665B of compute commitments** (The Information). We already moved our spend from Codex to Claude. The live question: **if you build on OpenAI, what happens to your business if it can't pay its bills?**
- **Mitchell's five stories stay as the segments** (and the Shorts). The OpenAI segment opens the show and frames them: every segment is a way we cut dependency or cost.
- **Viewer question:** "OpenAI might not be able to pay for what it promised. Should founders still build on it?"
- **Format:** opening segment on the OpenAI numbers (about 15 minutes), then Mitchell's segments of 8–12 minutes each. Re-name the subject at the start of every segment so each cut stands alone. Tie each one back to the spine: S1 is the switch, S2 where the money went, S3 the hedge (never one lab), S4 fewer tokens means less exposure to one vendor's pricing, S5 the stakes (your agents' vendor risk is your business risk).
- **Title locked (Vincent, 20 Oct):** `Is OpenAI Dying? Anthropic Is Taking Over`. No `[LIVE]` prefix.
  - "Dying" stays a question: the board's numbers show cash burn and a funding gap, not a collapse. Answer it on air.
  - "Taking over" receipts: Anthropic Q2 revenue $11.5B vs OpenAI $6.7B (Reuters and Bloomberg, via The Next Web); the panel's 10x vs 3.3x growth this year (14:31) and ~80% vs ~50% enterprise revenue (29:01). Run rates are measured differently (gross vs net), say so.
- **Careful with "Codex will be sunset":** that is our speculation. Nobody we found reports it. The Silicon Carne panel says the opposite: Codex made an "excellent turnaround" and is taking share from Anthropic (19:01, 23:31, 29:01). Frame it as a question ("if OpenAI has to cut, what goes first?"), and let Mitchell argue that Codex is fine.
- **Not in this episode:** no benchmarks. Everything is our own usage and bills.
- **Hosts to fill before the show (each segment lists its own fields):** the Codex plan change, the Claude bill screenshot, the Grok Bot email test, one before/after slop cleanup.
- **Thumbnail:** one of `stack-a-swap-v4-25/40/60` (Claude growing, OpenAI fading); v4-40 recommended. X drafts not made.

### How to read the references

- Most of this episode is **our own experience**. Say "for us" and show the screen; do not generalise to "Codex is worse" or "Claude is free".
- The Claude Max API credit facts come from Anthropic's Help Center and platform docs as summarised by Developers Digest; open Anthropic's page on air before quoting the numbers.
- Grok Bot email facts come from the @bot announcement and 9to5Mac. Who can mail the bot and what spam protection exists is **not documented**. Vincent has not tried it yet; say so.
- EU availability changes often. Re-check Muse and Gemini Spark the morning of the show.

### Post order at a glance

0. OpenAI numbers: Silicon Carne clip, FT cash burn, TechCrunch run rate, The Information Q1 (S0)
1. Codex plan page before and after (S1)
2. Claude billing page plus Anthropic API credits page (S2)
3. @bot email announcement, 9to5Mac, Muse EU page (S3)
4. Slop cleanup before/after diff and line counts (S4)
5. Optional live build (S5)
6. Grok Bot task list as "the junior team" (S6)

## Cold Open — Facts card

- **Cash burn:** OpenAI forecasts $278B negative free cash flow 2026–2030, revenue from $36B this year to $350B in 2030, and about $856B on compute by 2030 (FT, via Reuters, 18–19 Sep).
- **Run rate:** "approaching $50B", not the ~$70B investors had passed around (FT, via TechCrunch, 8 Oct). The gap is mostly net vs gross: OpenAI excludes partner sales, Anthropic counts them.
- **Q1 2026:** $5.7B revenue, net loss over $21.3B (about $12.4B of it non-cash), cash burn $3.7B (The Information, 16 Jun, from a shareholder document).
- **Commitments:** up to $665B of compute purchase commitments with cloud providers at end-2025, mostly off the balance sheet (The Information).
- **Funding:** $122B raised in March at an $852B valuation (OpenAI); IPO pushed to early 2027 (CNBC, via TechCrunch). Now reportedly raising $30B+ at about $1.2–1.4T (Bloomberg, via The Next Web; the panel says $1.2T, down from $1.4T).
- **Codex:** we scaled down our sub. Fill: from which plan to which, and the monthly saving.
- **Claude Max 20x** is $200 a month and, since 7 Oct, comes with **$200 a month of API credit** (Max 5x: $100). Credits cover the API, Playground, Managed Agents and Agent SDK; **not interactive Claude Code**, and they expire each billing cycle.
- **Grok Bot** can claim its own `@mail.grokbot.com` address (9 Oct) to sign up for services, contact businesses or schedule time.
- **EU:** Muse is US and Canada only; Gemini Spark excludes the EEA. Grok Bot works for us.
- **Slop:** we have our bot clean up slop. Fill: one repo, lines before and after.

## Segment 0 — OpenAI's money problem

### Question and opening cue

Open on the number: "OpenAI says it will burn $278 billion over the next five years. We already cut our Codex plan. Here's why that matters for anyone building on OpenAI."

### Posts to pull up, in order

1. [Silicon Carne, "OpenAI au cœur de la bulle IA : peut-on éviter le pire ?"](https://www.youtube.com/watch?v=vjANwplght0) (19 Oct, 40:47, French). Clips, timestamps from auto-captions, check before playing:
   - 00:00, the $50B vs $70B run rate that shook the sector.
   - 18:31, Raphaël: a "non-negligible risk" OpenAI disappears by 2029, because of the business model and cost structure, not the tech.
   - 19:30–20:03, who depends on OpenAI: more than half of Oracle's ~$300B backlog, about two-thirds of CoreWeave, almost all of Stargate.
   - 27:00–28:00, the obligations: ~$750B of compute commitments, 80% take-or-pay, so ~$120B a year it pays whether it uses it or not, needing ~$150B of revenue.
   - 32:01–33:01, the gap: ~$150B needed vs ~$100B expected in 2027, so the new raise covers about $50B a year.
   These are the panel's estimates, not filings. Say so.
2. [FT via Reuters/The Star](https://www.thestar.com.my/tech/tech-news/2026/09/19/openai-forecasts-cash-burn-near-280-billion-by-2030-ft-reports): $278B burn, $856B compute, $122B raised at $852B, cash expected to run out by 2028.
3. [TechCrunch, 8 Oct](https://techcrunch.com/2026/10/08/openais-revenue-is-reportedly-20-billion-less-than-previously-projected/): run rate "approaching $50 billion", $20B below the figure investors circulated.
4. [The Information via TradingKey](https://www.tradingkey.com/analysis/stocks/us-stocks/261972340-openai-cost-revenue-q1-2026-tradingkey): Q1 net loss over $21.3B, up to $665B of commitments.

### Conversation cues

- Controversial claim to test: **if your product depends on one AI vendor that has to raise $50B a year just to pay its compute bills, that vendor is a business risk, not just a tool.** Strongest opposing case: OpenAI raised $122B this year, revenue grew about 3x, Codex is gaining share, and "too big to fail" cuts both ways when Microsoft, Nvidia and Oracle all need it alive.
- The Codex question: if OpenAI has to cut costs, what goes first? A coding tool priced below cost is a candidate, but there is **no report** that Codex is being shut down. Mitchell argues the other side.
- Same risk for us: Anthropic also burns cash and raises at huge valuations. What would make us move again?
- Viewer consequence: keep the switching cost low. Abstract the model, keep your prompts and data portable.
- Budget: about 15 minutes. Exit cue: "so here's what we actually changed."

### Planned Short S0 — OpenAI will burn $278 billion

- Working title: OpenAI Will Burn $278 Billion. Should You Build on It?
- Point: the numbers say OpenAI has to keep raising just to pay its compute bills.
- Open: the FT number and the $50B vs $70B run rate.
- Challenge: OpenAI is growing fast and has backers who can't let it fail.
- Payoff: the one rule we follow so a vendor failure doesn't take us down.
- Capture: Segment 0; keep "these are forecasts and panel estimates" inside the cut.
- After recording: coverage and exact start/end unverified; verify against the video/VTT.

## Segment 1 — We scaled down our Codex sub

### Question and opening cue

Open on the plan page. "We cut our Codex subscription. Here's why we're happier on Claude now."

### Hosts to fill

- Old plan and new plan, monthly cost each.
- The one job that moved from Codex to Claude, and why it went better.
- What Codex is still kept for, if anything.

### Conversation cues

- Host challenge: is this the model, the tooling around it, or habit? Would you switch back if Codex shipped a better model next week?
- Viewer consequence: most people pay for two or three AI subscriptions. How do you decide which one to cut?
- Budget: about 8 minutes. Exit cue: "and the Claude one now effectively costs us nothing. Here's how."

### Planned Short S1 — We cut our Codex plan

- Working title: We Downgraded Codex. Here's Why.
- Point: one concrete reason, from our own work, for moving spend to Claude.
- Open: the plan page and the price difference.
- Challenge: Mitchell or Vincent argues the case for keeping Codex.
- Payoff: what we kept and what we cut.
- Capture: Segment 1; name Codex and Claude at the start; exit after the verdict.
- After recording: coverage and exact start/end unverified; verify against the video/VTT.

## Segment 2 — "My Claude Max costs $0"

### Question and opening cue

"My Max plan costs $0." Then the honest version straight away: the plan is $200 a month, and Anthropic now gives Max 20x **$200 of API credit every month**. We were already spending that much on the API, so for us the subscription nets out to zero.

### What to put on screen

1. Billing page showing the plan and the credit (redact card and account details).
2. Anthropic's page on monthly API credits for Max and Team ([Help Center](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans), [platform docs](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers)).

### Keep the caveat beside the claim

- It is only "free" if you would spend $200 a month on the API anyway. Otherwise you are paying $200 for the plan and getting credits you may not use.
- Credits work on the API, Playground, Managed Agents and the Agent SDK. They do **not** cover interactive Claude Code, extra app usage, or Bedrock/Vertex.
- They expire at the end of each billing cycle; no rollover.

### Hosts to fill

- What the API credit pays for in our businesses (which product or pipeline).
- Last month: how much of the $200 credit was used.

### Conversation cues

- Host challenge: is this Anthropic being generous, or locking us in so we never test another API?
- Budget: about 8 minutes. Exit cue: "now the bot we can't stop talking about."

### Planned Short S2 — My Claude Max costs $0

- Working title: My $200 Claude Plan Costs Me $0
- Point: the API credit cancels the fee if you already spend it on the API.
- Open: billing page and Anthropic's credit page.
- Challenge: it is not free if you don't use the API; and it doesn't cover Claude Code.
- Payoff: who this deal is actually good for.
- Capture: Segment 2; keep the caveat inside the cut.
- After recording: unverified; verify against the video/VTT.

## Segment 3 — Grok Bot is still winning in the EU

### Question and opening cue

"Grok Bot is still winning in Europe, because it's the only one we can buy." Muse is US and Canada only, Gemini Spark excludes the EEA, dots was blocked on Pro in the EU when we covered it on 6 Oct.

### Posts to pull up, in order

1. [@bot](https://x.com/bot/status/2108609764766908772): "Grok Bot now has its own email. Bot can use it to sign up for services, contact businesses for you, or schedule time with someone." [@elonmusk](https://x.com/elonmusk/status/2108612939842511217) amplified it.
2. [9to5Mac](https://9to5mac.com/2026/10/09/grok-bot-just-got-its-own-email-address-heres-how-to-claim-yours/): ask Bot or tag @bot to claim an `@mail.grokbot.com` address.
3. [Notebookcheck](https://notebookcheck.net/Meta-Muse-Wonder-Developers-get-it-now-the-Muse-app-skips-Europe.1422810.0.html): Muse app "only available in the U.S. and Canada"; Gemini Spark excludes the EEA, Switzerland and the UK.

### The warning: don't post your bot's email

- Vincent has **not tried the email yet**; say that.
- An address on a public page gets mailed by everyone: spam, people testing it, and anyone trying to talk your bot into doing things. Every inbound mail is something the bot reads and may act on, and that work costs usage.
- xAI has not documented who can mail the bot, filtering, or limits. Musk's "Grok Bot detects scam emails" is a claim, not a spec.
- Rule we would follow: give the address only to the services you sign it up for; never in a bio, a post or on stream. Blur it if it shows up live.

### Conversation cues

- Host challenge: is "winning" just being the only option? Would we still pick it if Muse launched here tomorrow?
- Budget: about 10 minutes. Exit cue: "speaking of things you shouldn't let into your work: slop."

### Planned Short S3 — Don't post your AI bot's email

- Working title: Your AI Bot Has an Email. Don't Post It.
- Point: a public bot address invites anyone to give your bot work, and you pay for it.
- Open: the @bot announcement.
- Challenge: Mitchell: isn't that what spam filters are for?
- Payoff: the one rule for sharing the address.
- Capture: Segment 3.
- After recording: unverified; verify against the video/VTT.

## Segment 4 — No more slop code in our projects

### Question and opening cue

"We ask our bot to clean up the slop, and our code gets smaller, better and cheaper to work on." Open on a before/after diff.

### What to put on screen

1. The cleanup prompt or skill we use (one screen).
2. One real repo: lines of code before and after, files removed, a diff of one cleaned file.
3. If measured: tokens for the same task on the repo before and after cleanup.

### Hosts to fill

- Which repo, how many lines removed, and what kind of slop (dead code, duplicate helpers, over-long comments, unused deps).
- Whether anything broke and how you caught it (tests, review).
- The token saving only if you measured it; otherwise frame it as the reasoning: a smaller codebase means less context for every future prompt.

### Conversation cues

- Controversial claim to test: **AI-written slop costs you twice: once to write it and again on every prompt that has to read it.** Strongest opposing case: cleanup runs burn tokens too, and an agent "cleaning" code can delete things that mattered.
- Viewer consequence: when do you schedule a cleanup pass, and who checks it?
- Budget: about 12 minutes. Exit cue: "if we have time, let's build something."

### Planned Short S4 — Slop code costs you twice

- Working title: AI Slop Code Is Costing You Tokens
- Point: cleaning up AI-written code makes it smaller and cheaper to keep working on.
- Open: the before/after line count.
- Challenge: cleanup can break things and costs tokens too.
- Payoff: how often we run it and what we check after.
- Capture: Segment 4.
- After recording: unverified; verify against the video/VTT.

## Segment 5 — Optional: a short live build

### Question and opening cue

Only if a tool is ready and dry-run. Candidates that fit the episode:

- A tiny "slop meter": a script that reports lines, duplicate functions and unused exports for a repo, run before and after a cleanup.
- A Claude API script running on the Max credit, to show what the "$0" pays for.

### Conversation cues

- Promise nothing on air that hasn't run once before the show. If it fails live, keep it and explain.
- Budget: up to 10 minutes; skip if running late.

- If it airs, add a Short card for it after recording.

## Segment 6 — Why we'd take an agent over a junior

### Question and opening cue

Short, because we've covered agents vs juniors before. Vincent's take: Grok Bot is a junior team, much cheaper, working 24/7. Receipt: Anthropic's own report says agents log about 6 hours for every employee hour there ([16 Oct](https://www.anthropic.com/research/employment-at-anthropic)), and junior technical hires fell from 27% to 9%. One company, self-reported.

### Hosts to fill

- The three jobs Grok Bot does for you every week that you'd otherwise hire for.

### Conversation cues

- Host challenge (Mitchell): a junior learns the business and grows into a senior; an agent resets. What do you lose?
- Budget: about 6 minutes. Exit cue: close.

### Planned Short S5 — My junior team is a bot

- Working title: Why I'd Hire Grok Bot Over a Junior
- Point: cheaper, always on, for the jobs we'd give a junior.
- Open: the weekly task list.
- Challenge: Mitchell's case for the junior.
- Payoff: which jobs still need a person.
- Capture: Segment 6.
- After recording: unverified.

## Close

- One line each: "here's how we'd keep the business running if our main AI provider disappeared tomorrow."
- Then: the one change from today a viewer should make this week.
- Bridge to next week: Vincent self-hosts Genfeed live. Disclose it is Vincent's product.
- CTA: brief, end only. "We do this every week, hit subscribe so you don't miss it."
