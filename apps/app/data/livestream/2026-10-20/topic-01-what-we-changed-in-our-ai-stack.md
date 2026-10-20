---
title: "OpenAI vs Anthropic: Game Over?"
slug: "what-we-changed-in-our-ai-stack"
source: "Silicon Carne 'OpenAI au cœur de la bulle IA' (YouTube vjANwplght0, 19 Oct, French auto-captions), Financial Times via Reuters/The Star (cash burn, 18-19 Sep), TechCrunch citing the FT (run rate, 8 Oct), The Information via TradingKey (Q1 2026 figures and compute commitments, 16 Jun), OpenAI funding announcement (Mar), Mitchell's lineup (via Vincent, 19 Oct), hosts' own billing and usage, Anthropic monthly API credits for Max and Team (announced 7 Oct, Help Center and platform docs), Developers Digest summary (8 Oct), @bot and @elonmusk Grok Bot email posts (9 Oct), 9to5Mac (9 Oct), Notebookcheck on Muse skipping Europe (Oct), our 6 Oct Grok Bot vs Dots vs Muse board, Anthropic 'How employment is changing at Anthropic' (16 Oct)"
status: "in_progress"
date: "2026-10-20"
announcement_tweet: null
thumbnail_prompt: null
---

## Sources — Livestream Notes

- Date: Tue 20 Oct 2026. YouTube livestream (public viewing link): https://youtube.com/live/XCyY0VDiRps. Start time: confirm (previous shows started at 14:00 CEST).
- **Spine (Vincent, 20 Oct): OpenAI's money problem.** OpenAI forecasts **$278B of negative free cash flow from 2026 to 2030** (FT). Its run rate is about **$50B, not the $70B** investors had been passed (FT, 8 Oct). It has up to **$665B of compute commitments** (The Information). We already moved our spend from Codex to Claude. The live question: **if you build on OpenAI, what happens to your business if it can't pay its bills?**
- **Mitchell's five stories stay as the segments** (and the Shorts). The OpenAI segment opens the show and frames them: every segment is a way we cut dependency or cost.
- **Viewer question:** "OpenAI might not be able to pay for what it promised. Should founders still build on it?"
- **Format:** opening segment on the OpenAI numbers (about 15 minutes), then Mitchell's segments of 8–12 minutes each. Re-name the subject at the start of every segment so each cut stands alone. Tie each one back to the spine: S1 is the switch, S2 where the money went, S3 the hedge (never one lab), S4 fewer tokens means less exposure to one vendor's pricing, S5 the stakes (your agents' vendor risk is your business risk).
- **Title locked (Vincent, 20 Oct):** `OpenAI vs Anthropic: Game Over?`. No `[LIVE]` prefix.
  - "Game over" stays a question: the board's numbers show cash burn and a funding gap, not a collapse. Answer it on air.
  - "Taking over" receipts: Anthropic Q2 revenue $11.5B vs OpenAI $6.7B (Reuters and Bloomberg, via The Next Web); the panel's 10x vs 3.3x growth this year (14:31) and ~80% vs ~50% enterprise revenue (29:01). Run rates are measured differently (gross vs net), say so.
- **Careful with "Codex will be sunset":** that is our speculation. Nobody we found reports it. The Silicon Carne panel says the opposite: Codex made an "excellent turnaround" and is taking share from Anthropic (19:01, 23:31, 29:01). Frame it as a question ("if OpenAI has to cut, what goes first?"), and let Mitchell argue that Codex is fine.
- **Not in this episode:** no benchmarks. Everything is our own usage and bills.
- **Hosts to fill before the show (each segment lists its own fields):** the Codex plan change, the Claude bill screenshot, the Grok Bot email test, one before/after slop cleanup.
- **Thumbnail:** `stack-a-swap-v2`, used on the live. X drafts not made.

### How to read the references

- Most of this episode is **our own experience**. Say "for us" and show the screen; do not generalise to "Codex is worse" or "Claude is free".
- The Claude Max API credit facts come from Anthropic's Help Center and platform docs as summarised by Developers Digest; open Anthropic's page on air before quoting the numbers.
- **X posts:** "verified" means the post was fetched on 20 Oct and the note matches its text. The rest come from web search results; open them before putting them on screen. Posts marked "older" predate October.
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

### X posts on the OpenAI numbers (posts marked verified were checked 20 Oct; open the others before showing)

- Run rate, $50B vs $70B (8–9 Oct):
  - [@unusual_whales](https://x.com/unusual_whales/status/2108243062275326314): verified, 428k views. Annualized revenue approaching $50B, about $20B below the widely reported $70B, per the FT.
  - [@wallstengine](https://x.com/wallstengine/status/2108238659690643933): verified, 414k views. Near $50B at end of September; the gap comes from calculation methods vs Anthropic.
  - [@KobeissiLetter](https://x.com/KobeissiLetter/status/2108254363525284081): verified, 367k views. Oracle falls more than 5% on the report.
  - [@lisaabramowicz1](https://x.com/lisaabramowicz1/status/2108242872470319492): verified, Bloomberg's Lisa Abramowicz. One FT story drops Oracle 5% and pulls Nvidia, AMD and Microsoft down: how leveraged tech is to the labs.
  - [@goodalexander](https://x.com/goodalexander/status/2110780667218808911): verified, 15 Oct. "Is CoreWeave Going to Die", the CoreWeave selloff.
  - [@Cointelegraph](https://x.com/Cointelegraph/status/2108258540028645800): same story, crypto/markets audience.
  - [@coinbureau](https://x.com/coinbureau/status/2108240181153378717): the $20B gap.
  - [@petergostev](https://x.com/petergostev/status/2108251986457993712): the gross vs net explanation; use it for the caveat.
  - [@tickerplus](https://x.com/tickerplus/status/2108247488780001724): verified. Their tracking had OpenAI at $50.44B while $70B was circulating.
  - [@gnoble79](https://x.com/gnoble79/status/2108287612729569718): verified, George Noble. "Another nail in the coffin of the AI trade", the bubble take.
  - [@ARKInvest](https://x.com/ARKInvest/status/2109741266783359166): ARK's read on the revenue numbers.
- Cash burn, $278B (18–21 Sep):
  - [@businessline](https://x.com/businessline/status/2101252967957414143): verified but low reach. $278B of cash burn 2026–2030. Show the FT article instead.
  - [@HedgieMarkets](https://x.com/HedgieMarkets/status/2102059399854346302): the burn vs revenue math.
  - [@revoAIution](https://x.com/revoAIution/status/2102250032250658888): the burn in one chart.
  - [@scmallaby](https://x.com/scmallaby/status/2101255517872046200): Sebastian Mallaby gives OpenAI about a 50/50 chance of running out of money by next summer. A strong opinion, not a forecast.
- Q1 figures from The Information: [@wallstengine](https://x.com/wallstengine/status/2067156982197625260) (Jun, older).
- The new raise:
  - [@FT](https://x.com/FT/status/2099983566016794629): "OpenAI weighs funding round at $1.2tn valuation before IPO" (Sep).
  - [@unusual_whales](https://x.com/unusual_whales/status/2100099384839115180): WSJ, talks at more than $1.2T.
  - [@srimuppidi](https://x.com/srimuppidi/status/2100299710623789414): The Information, OpenAI wants $1.5T.
  - [@NextFinAI](https://x.com/NextFinAI/status/2105006836344881162) and [@HedgieMarkets](https://x.com/HedgieMarkets/status/2105074896271257857): Bloomberg, a $30B bridge round at $1.4T after the IPO slipped to 2027.
  - [@wallstengine](https://x.com/wallstengine/status/2107218141927592319): UAE funds (MGX) and BlackRock in talks to anchor it.
- Anthropic "taking over":
  - [@business](https://x.com/business/status/2088412904924000708): verified, Bloomberg (14 Aug). Anthropic tells investors Q2 revenue jumped at least 14x.
  - [@AndrewCurran_](https://x.com/AndrewCurran_/status/2088381621024239731): verified, 87k views. Q2 above $11.5B, positive adjusted operating income.
  - [@kimmonismus](https://x.com/kimmonismus/status/2110564228251763079): verified, 15 Oct. Anthropic reportedly expects a $110B run rate by end-2026.
  - [@wallstengine](https://x.com/wallstengine/status/2089438774149456217): verified. Anthropic run rate $9B (end 2025) to $47B (May) to $65B+ (July); $11.5B quarter (Aug).
  - [@kimmonismus](https://x.com/kimmonismus/status/2089440269762445635): the same Bloomberg numbers, with positive adjusted operating income.
  - [@FirstSquawk](https://x.com/FirstSquawk/status/2090026168619847880): OpenAI Q2 $6.7B (+18%) vs Anthropic $11.6B, more than doubled.
  - [@rohanpaul_ai](https://x.com/rohanpaul_ai/status/2096644731371667965): Anthropic's 14.8 GW of compute deals, up to $517B over a decade. Anthropic has its own bills too.
  - [@JackFarley96](https://x.com/JackFarley96/status/2089443200603705730): "40B ARR from OpenAI, 65B from Anthropic". The gross vs net caveat applies.

### Articles on the OpenAI numbers

- [Bloomberg Tax on the FT report](https://news.bloombergtax.com/artificial-intelligence/openais-annualized-revenue-nears-50-billion-ft-says): annualized revenue nears $50B.
- [TIKR](https://www.tikr.com/blog/coreweave-stock-fell-nearly-8-in-a-day-on-an-openai-revenue-report-heres-why-its-borrowing-model-raises-the-stakes): CoreWeave fell nearly 8% in a day on the report, and why its borrowing raises the stakes.
- [SiliconANGLE, 14 Oct](https://siliconangle.com/2026/10/14/shares-of-oracle-neoclouds-drop-on-coreweave-debt-concerns/): Oracle and neocloud shares drop on CoreWeave debt concerns.
- [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/nasdaq-composite-jolted-openai-stumble-134226671.html): the Nasdaq jolted by the OpenAI stumble.
- [AI Magazine on Reuters](https://aimagazine.com/news/how-anthropics-revenue-run-rate-topped-us-65bn): how Anthropic's run rate topped $65B.

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

### X posts on Codex vs Claude Code (posts marked verified were checked 20 Oct)

- For the switch:
  - [X trending, "Developers Shift to Anthropic's Claude Code Over OpenAI's Codex"](https://x.com/i/trending/2106906183432880196): X's own summary (Oct).
  - [@theo](https://x.com/theo/status/2112035326625730981): verified, 19 Oct, 114k views. Over 60% of T3 Code users who used Codex also used Claude Code. Lead with this one.
  - [@morganlinton](https://x.com/morganlinton/status/2111165657228439828): verified, 16 Oct. "Claude Code is on an absolute tear"; his usage goes up every week.
  - [@DrSerunjogiEmma](https://x.com/DrSerunjogiEmma/status/2103894556651528248): why they moved to Claude Code.
- Mitchell's side, Codex is fine:
  - [@kimmonismus](https://x.com/kimmonismus/status/2109539203487060168): GPT-6.1 Sol in Codex goes from 272K to 500K context.
  - [@reach_vb](https://x.com/reach_vb/status/2109543080609165508): OpenAI's Vaibhav Srivastav, 500K default "at no extra charge across Codex & ChatGPT Work". OpenAI staff, so it's their pitch.
  - [@theo](https://x.com/theo/status/2105063015712465094): verified, 180k views. "GPT-6.1 Sol still crushes", much better in Codex.
  - [@ArtificialAnlys](https://x.com/ArtificialAnlys/status/2105025585332605357): verified, 166k views. GPT-6.1 Sol is 1 point below Astra at under a quarter of the cost per task. A benchmark, so only as Mitchell's counterpoint.
  - [@SPAC89](https://x.com/SPAC89/status/2107061260533526624): Codex x20 at $200 gives about 18B tokens a month. Compare with our usage.
  - [X trending, "OpenAI Hints at Ultrafast GPT-6.1 Sol Upgrade for Codex"](https://x.com/i/trending/2106326789635113149).
  - [@unclebobmartin](https://x.com/unclebobmartin/status/2054970327592042661) and [@soumitrashukla9](https://x.com/soumitrashukla9/status/2050608491799232987): older (May), people preferring Codex.
- [@sdrzn](https://x.com/sdrzn/status/2049229185206599683): older (May), "the era of free tokens" ending. Ties to S0: subsidised plans are what a cash-burning lab cuts first.

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

### X posts on the Max API credit (posts marked verified were checked 20 Oct)

- [@ClaudeDevs](https://x.com/ClaudeDevs/status/2108228391404966005): verified, 728k views. $100 on Max 5x, $200 on Max 20x, up to $500 pooled on Team, any model. Show this first.
- [@addyosmani](https://x.com/addyosmani/status/2108860029982163013): what it means for builders.
- [@kimmonismus](https://x.com/kimmonismus/status/2107930870871158874): "OpenAI: your turn."
- [@Khazix0918](https://x.com/Khazix0918/status/2107918094220083326): verified, 109k views, Chinese. "Bigger than Haiku 5.5": how do other labs compete?
- [@VaibhavSisinty](https://x.com/VaibhavSisinty/status/2109954832539029796): verified. Shows the new API credits section in his own billing settings.

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
4. [@bot](https://x.com/bot/status/2108609769003245647): "To claim your inbox, just ask Bot or tag @bot on X. Admins must enable it for their team."
5. [@ericzakariasson](https://x.com/ericzakariasson/status/2110057450850435451): Grok Bot 0.70.2, each bot claims an address at `@mail.grokbot.com` and drafts emails for you; Figma, Notion and Canva as live cards.
6. [@debs_obrien](https://x.com/debs_obrien/status/2110477175069798427): one address per account, all your bots share it, and it's permanent. Strongest support for the warning: you can't rotate it if it leaks.
7. [@melvindvivas](https://x.com/melvindvivas/status/2107545810351370324): "It can send and receive emails."
8. [X trending, "Grok Bot Gains Dedicated Email for Independent Actions"](https://x.com/i/trending/2108921878865727956).
9. [@every](https://x.com/every/status/2104997866909618589): verified. Every compares 7 personal agents (Dots, Gemini Spark, Grok Bot and others).
10. [@mikepat711](https://x.com/mikepat711/status/2097484133123432630): verified (Sep). First thoughts on Muse from a daily Grok Bot user.
11. Muse not in Europe, unverified (no verified post on EU availability turned up; say it verbally): [@wolfofharcourt](https://x.com/wolfofharcourt/status/2100300340000120916) ("Muse still not available in Europe. FFS!"), [@juanbuis](https://x.com/juanbuis/status/2105647552792346988) ("muse isn't available in the EU"), [@tavitag203](https://x.com/tavitag203/status/2097426720001286622) (US only, runs in a Meta cloud VM).

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

### X posts on slop and code volume (posts marked verified were checked 20 Oct)

- Anthropic's Scion (14 Oct), the scale of AI-written code: merges went from about 2,500 a day in May to 30,000+ in September, so they replaced git.
  - [@AnthropicAI](https://x.com/AnthropicAI/status/2110047081414987957): verified, 8.3M views. The original post. Show this first.
  - [@aakashgupta](https://x.com/aakashgupta/status/2110246725965504719): verified, 201k views. Roughly one merge every three seconds.
  - [@ziv_ravid](https://x.com/ziv_ravid/status/2110099051320320073): verified, 146k views. Skeptical of the merge metric: "how the post would read without the PR".
  - [@mark_k](https://x.com/mark_k/status/2110063589583188224): "Git has become a bottleneck".
  - [@minchoi](https://x.com/minchoi/status/2110091675955548255): 7 engineers, 5 months, 200x less infrastructure.
  - [@VaibhavSisinty](https://x.com/VaibhavSisinty/status/2110098334581170678) and [@RoundtableSpace](https://x.com/RoundtableSpace/status/2110230366644502781): the details (100 GB main-branch history).
  - [@scaling01](https://x.com/scaling01/status/2110099899274670340): an estimate of what that merge volume means.
  - Challenge: more code merged isn't better code. That's the slop argument.
- The slop debate:
  - [@mitchellh](https://x.com/mitchellh/status/2052397933522506079): verified (May, older), 219k views. Mitchell Hashimoto: "AI slop is good, actually", as long as you know when to clean it up. Best opposing case.
  - [@sdrzn](https://x.com/sdrzn/status/2077121290440454467): verified (Jul). SlopCodeBench: agents gradually turn codebases into slop over sequential tasks.
  - [@tomshardware](https://x.com/tomshardware/status/2074851068794867831): verified (Jul). A "Slopfix" team charges $10k a week to delete AI code bloat, using agents.
- Cleanup tools people use:
  - [@bcherny](https://x.com/bcherny/status/2074997570317779038): Boris Cherny (Claude Code) on `/checkup`.
  - [@DeeperThrill](https://x.com/DeeperThrill/status/2010894030087860271): a `/deslop` command (Jan, older).
  - [@antoniosarosi](https://x.com/antoniosarosi/status/2060508689916916094): on AI slop in codebases.
  - [@jasonzhou1993](https://x.com/jasonzhou1993/status/2038215854584906078): RTK, cutting the tokens agents spend reading output (older). Supports "less context, fewer tokens".

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

### X posts on agents vs juniors (posts marked verified were checked 20 Oct)

- [@spicey_lemonade](https://x.com/spicey_lemonade/status/2111535250467905664): verified, 713k views. "Anthropic is on track to stop hiring technical juniors by 2027". The viral take; the report says 27% to 9%, not zero.
- [@luke_drago_](https://x.com/luke_drago_/status/2111906641490894967): verified, 315k views. "The first phases of pyramid replacement are happening at Anthropic".
- [@PeterMcCrory](https://x.com/PeterMcCrory/status/2111197595943256119): verified, report co-author. Staff expect faster, broader AI progress than the public does.
- [@incprodmon](https://x.com/incprodmon/status/2111491277405462717): verified. Quotes the report.
- [@alphabatcher on X](https://x.com/alphabatcher/article/2111127503217549816): "Grok Bot got Claude and a $30 plan", what is real and what to set first. Useful for what the "junior team" costs.

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
