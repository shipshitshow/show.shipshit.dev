---
title: "Muse Wonder: Better Than Fable 5.1 or Opus 5.5?"
slug: "muse-wonder-run-your-business"
source: "Vincent's own Muse Code test on a real codebase (Genfeed audit), @finkd launch post and chart (12 Oct), Meta newsroom, Meta Model API pricing and Muse Code subscriptions docs, @MetaforDevs launch thread, Artificial Analysis article and X post (12 Oct), VentureBeat, Hacker News 'Muse Wonder' thread, X posts verified via fxtwitter 13 Oct (@alexandr_wang, @SPAC89, @aipulseda1ly, @chetaslua, @kimmonismus, @RoundtableSpace), YouTube title scrape 13 Oct (yt-dlp), Anthropic 'Investigating unintended model actions' (9 Oct)"
status: "draft"
date: "2026-10-13"
announcement_tweet: null
---

## Sources — Livestream Notes

- Date: Tue 13 Oct 2026. YouTube livestream (public viewing link): https://youtube.com/live/M1EEEl4M6-4. Title locked (see the Title section at the bottom).
- **Viewer question:** "Meta says Muse Wonder is frontier and cheap. What does it actually cost to use on real work, in plan limits, tokens and data?"
- **The hook is Vincent's own result.** Vincent installed Muse Code and ran one audit prompt on Genfeed. It used about **50% of his plan**. Nobody I could find has published that. The public conversation is launch benchmarks and one-shot demos (3D scenes, SVGs), not what a real agentic audit burns.
- **Vincent to fill before the show (needed to make the title true):** which plan (Everyday $5, High $15, Power $50, Maximum $200); which model (Wonder or Wonder Full) and effort setting; whether the 50% was the **5-hour window or the weekly limit**; how long the run took; whether **Contributor mode** was on (see "Data" below); and a screenshot of the usage meter. Also note which repo and what the audit prompt asked, in one line. If the same audit was run on the model you normally use, say what that cost.
- **Not in this episode:** no leaderboard show; no claim that Muse Wonder is bad. The question is cost, limits, trust and where it fits.
- **Hosts' firsthand:** Mitchell to fill whether he has tried any Muse product. Do not imply first-hand use that has not happened.

### What is trending about Muse (13 Oct)

**YouTube, how Muse Wonder is being titled** (yt-dlp scrape, this-week filter; views change fast):

| Views | Channel | Title |
|---|---|---|
| 63K | Matthew Berman | Meta just dropped something insane... (Muse Wonder) |
| 52K | AI at Meta | Introducing Muse Wonder & Muse Wonder Full: frontier models for agentic tasks |
| 48K | Paul J Lipsky | Meta's New Muse Wonder Is Huge! |
| 37K | Bijan Bowen | Meta Muse Wonder Is HERE – Is THIS an Opus Competitor? |
| 33K | WorldofAI | Meta's Muse Wonder IS OPUS 5.5 LEVEL?! I Don't Think So... (Fully Tested) |
| 33K | Brock Mesarich | Meta Just Dropped Muse Wonder (Better Than Opus 5.5?) |
| 17K | Universe of AI | Meta's Muse Wonder Full Just BEAT Opus 5.5 and GPT-6 Astra! |
| 13K | Pat Simmons | Muse Wonder: No Hype Full Review & Testing (41 min) |
| 6K | Arena AI | Muse Wonder from Meta \| First Impressions (24 min, shows cost of each generation) |

Wider Muse titles: "I was WRONG about Meta's A.I.! (IT'S MUCH WORSE!)" 428K; "I Made Grok Bot, Dots & Muse Do the Same 3 Jobs (RAW RESULTS)" 154K; "I Made Meta's New AI Agent Negotiate With My Own AI Agent" 98K.

**Pattern (observation, not proof of what wins):** the Wonder videos pair the model name with **Opus 5.5** and a question or a test claim. The bigger Muse videos are **first-person experiments** ("I Made...", "I was WRONG..."). None of the Wonder videos I found leads with cost, plan limits or a real-codebase test. That is the open slot for a first-person result. Views are launch-day and not comparable across ages.

**X, what is moving** (counts read 13 Oct):

| Post | Why it matters |
|---|---|
| [@finkd](https://x.com/finkd/status/2109689305073614918) 12 Oct, ~387K views, 8.2K likes | The launch post and benchmark chart |
| [@ArtificialAnlys](https://x.com/ArtificialAnlys/status/2109697083519447118) 12 Oct, 364K views, 2.5K likes | Independent index: Wonder Full 56, Wonder 52 |
| [@alexandr_wang](https://x.com/alexandr_wang/status/2109734074223140987) 12 Oct, 96K views, 1.2K likes | Says they aimed at real-world tasks, not glamorous 3D demos |
| [@alexandr_wang](https://x.com/alexandr_wang/status/2109716422259781832) 12 Oct, 52K views, 440 likes | Quote-tweet of [@SPAC89](https://x.com/SPAC89/status/2109708774902571053): "best AI model in the world right now". The "usage limits are surprisingly generous" line is **SPAC89's words** on the $50 plan, not Wang's. SPAC89 is a small account (about 2.9K followers) |
| [@RoundtableSpace](https://x.com/RoundtableSpace/status/2109792481428574442) 12 Oct, 50K views | Relay: Meta docs for running Claude Code, Codex and OpenCode on Muse models by pointing the base URL at Meta. Second-hand; find Meta's own doc before saying it |
| [@chetaslua](https://x.com/chetaslua/status/2109706192721494130) 12 Oct, 36K views, 195 likes | Positive: fast, animation made purely in code |
| [@kimmonismus](https://x.com/kimmonismus/status/2109700228873908403) 12 Oct, 30K views, 807 likes | "60% cheaper than Fable 5.1" on list price. List price only |
| [@MetaforDevs](https://x.com/MetaforDevs/status/2109694066208518146) 12 Oct | Official: Wonder $4/$20 per 1M tokens; Wonder Full on the Power and the new Maximum plan |
| [@aipulseda1ly](https://x.com/aipulseda1ly/status/2109704067681563049) 12 Oct, 5K views | Negative: "pretty bad" on a 3D test. Says Wonder "charges Opus prices and lands 7th". Artificial Analysis's own cost figures say Wonder is **cheaper per task than Opus 5.5** ($4.52 vs $5.98), so check that claim |
| [Hacker News thread](https://news.ycombinator.com/item?id=50059115) 637 points, 341 comments | See "The bill" |

Also: a creator disclosed that Meta gave free preview access and that he paid for Opus 5.5 himself ([@scaling01](https://x.com/scaling01/status/2109761302398632255)). Sponsored and preview-access takes are mixed into the early coverage.

Search needs a login on X, so this is what search and direct post reads surfaced. It is not X's own trending list.

### How to read the references

- Benchmark figures from the chart in @finkd's post are **Meta's numbers**. Artificial Analysis (AA) figures are independent but largely launch-day and at max effort.
- Prices for Muse come from Meta's pages and AA. Prices for rival models come from aggregators and X posts; confirm on Anthropic's and OpenAI's pages.
- Wang's tweet and the "generous limits" tweet are different authors. Do not blur them on air.
- Everything about Vincent's run is Vincent's own report until the screenshot is on screen.

### Post order at a glance

1. Vincent's usage screenshot (open on it)
2. @finkd launch post and chart; @alexandr_wang "best model" quote-tweet
3. @ArtificialAnlys and the AA article
4. Meta Model API pricing; Muse Code subscriptions page
5. Hacker News thread
6. Meta Muse Code "Contributor mode" text
7. Arena first-impressions video; one skeptical and one positive tweet
8. Anthropic 9 Oct report (Active Focus tie-in)

## Sources — Open on the result

### Question and opening cue

Open with the screenshot and the result, in Vincent's words: one audit prompt, 50% of the plan. Then the viewer question: is this a bad plan, a bad model for this job, or just what agentic coding costs now?

### What to put on screen

1. **Vincent's usage meter** showing the plan and the percentage, and the prompt in one line. Redact repo names, tokens and anything private.
2. **The claim it is up against.** The "usage limits are surprisingly generous" post from [@SPAC89](https://x.com/SPAC89/status/2109708774902571053) on the $50 plan, amplified by Wang. One person's experience against another's.

### Conversation cues

- Host challenge: is half a plan for one audit outrageous, or is that what a deep audit costs on any model?
- Viewer consequence: how do you budget agent work when the meter, not the token price, is the real cost?
- Budget: about 6 minutes. Exit cue: "so the question for the rest of the show is what it costs and what you get."

## Sources — What Meta launched, and the claim

### Question and opening cue

What exactly did Meta ship, and what did its people say about it?

### Posts to pull up, in order

3. **@finkd** — https://x.com/finkd/status/2109689305073614918. One line and one chart. Meta newsroom: https://about.fb.com/news/2026/10/introducing-muse-wonder-models/. Wonder is on the Meta Model API and in Muse Code; Wonder Full is Muse Code subscribers only (Power and Maximum plans per [@MetaforDevs](https://x.com/MetaforDevs/status/2109694066208518146)); Wonder powers the Muse app "soon", subscribers first. Both models are proprietary with no downloadable weights, per VentureBeat, unlike the separate Muse Glimmer.
4. **Wang's claim** — https://x.com/alexandr_wang/status/2109716422259781832. "Might actually be the best AI model in the world right now" is a hedged personal view quoting a small account's testimonial. Then https://x.com/alexandr_wang/status/2109734074223140987, where he says the team aimed at real-world tasks and not 3D demos.
5. **Active Memory and Active Focus** — Meta says Wonder keeps working toward a hard goal, tries other approaches and checks in before important actions. Compare with Anthropic's 9 Oct report, which describes models working around blockers as a source of real-world incidents: https://www.anthropic.com/research/investigating-unintended-model-actions. Different companies and systems; the point is the tension. Ties to the agent loop Vincent saw if the run took many iterations.

### Conversation cues

- Controversial claim to test: **a model built to keep going until the job is done will use a lot of your plan doing it.** Strongest opposing case: Meta says it was tuned for real tasks, and a deep audit is exactly where you want it to keep going.
- Budget: about 8 minutes. Exit cue: "what they say it does versus what we saw it do."

## Sources — The chart and the independent numbers

### Question and opening cue

Is Wonder frontier on real work, according to someone other than Meta?

### The numbers

- **Meta's chart** (@finkd's post; Meta's numbers): Wonder Full leads on long-horizon coding (DeepSWE 79.0 vs Opus 5.5 74.2; SWE-Marathon 57.5 vs 46.3), memory, legal and automation. Opus 5.5 leads Terminal-Bench (59.6 vs 57.1), ProgramBench (70.5 vs 59.0), HealthBench and computer use. The Wonder Full SWE-Marathon cell is labelled "xhigh" while the column says "max"; check the model card for matched settings.
- **Artificial Analysis** (https://artificialanalysis.ai/articles/muse-wonder, 12 Oct, independent, max effort): Intelligence Index v4.3, **Wonder Full 56, Wonder 52**, up from Muse Spark 1.3 at 48. Per VentureBeat, Wonder Full ties Sonnet 5.5 and sits behind only Opus 5.5 at 58. Wonder Full is first on CritPt and GDP.pdf by narrow margins.
- **AA Coding Agents Index (max):** Wonder Full in Muse Code **68**, Claude Code with Sonnet 5.5 **68**, Claude Code with Opus 5.5 **66**, Wonder 63, Muse Code with Spark 1.3 54. That favours Meta; mention it fairly.
- **Weakness:** knowledge. AA-Omniscience: Wonder Full 30, Wonder 25, Opus 5.5 46, Sonnet 5.5 32. Hallucination rate is low (Wonder Full 23%, Wonder 27%).

### Posts to pull up, in order

- https://x.com/ArtificialAnlys/status/2109697083519447118 (364K views).
- Arena first-impressions video by Peter Gostev, with the cost of every generation: https://www.youtube.com/watch?v=w0fFiXLKmEI.
- One positive take ([@chetaslua](https://x.com/chetaslua/status/2109706192721494130)) and one negative ([@aipulseda1ly](https://x.com/aipulseda1ly/status/2109704067681563049)), then note both are one-shot demos, not agentic work.

### Conversation cues

- Strongest claim: **on the independent index Wonder Full is a real contender, and on agent coding tools it is level with Opus 5.5. The disagreement is cost, not intelligence.**
- Budget: about 10 minutes. Exit cue: "on paper it is there; the next question is what it costs to get that."

## Sources — The bill: tokens and limits, not list price

### Question and opening cue

The list price is the same as Opus 5.5. Why did one audit take half a plan?

### The numbers

- **List price (Meta, https://dev.meta.ai/docs/pricing-rate-limits):** `muse-wonder-1.0` $4 per 1M input, $20 per 1M output, $0.20 per 1M cached input; 1M context; Wonder Full has no per-token API price and is only in Muse Code subscriptions. Opus 5.5 is also $4/$20 per aggregators; confirm officially.
- **AA cost to run its index (max effort):** Wonder **$4.52 per task**, versus Opus 5.5 $5.98, Sonnet 5.5 $5.46, Fable 5.1 $7.63, GPT-6 Astra $3.26, Gemini 4 Argon $1.99, GPT-6.1 Sol $0.72, Spark 1.3 $1.60. So Wonder is cheaper than Opus 5.5 on this measure and costs far more than several others.
- **Why:** AA measured about **7.69M input tokens per task** for Wonder (6.44M for Wonder Full) against roughly 54K output. Input is about 76% of Wonder's cost. AA says Gemini 4 Argon, Sol and Astra use 2 to 7 times less input. In plain terms: it reads a lot.
- **Plans (Meta, https://dev.meta.ai/products/muse-code/):** Everyday $5 (10 to 50 prompts per 5 hours), High $15 (5x), Power $50 (20x, "the most powerful Muse models"), Maximum $200 (80x). Only Everyday's "10 to 50 prompts every 5 hours" is stated; @MetaforDevs says Maximum has the same five-hour and weekly resets. Meta's page does not explain how usage is counted, so ask Vincent which window his 50% was. **Contributor mode gives more usage in exchange for letting Meta train on your content** (next section).
- **Hypothesis for Vincent's run, not a finding:** a long agentic audit over a large repo re-reads a lot of context, which matches AA's heavy input-token profile. Vincent's usage log or a token count would confirm it.
- **HN voices (637 points, 341 comments, partial read):** one user called the $50 plan limits "okay-ish" and "not too generous", and reported a seven-iteration review-fix loop; others praised it as a daily driver. I did not find a post describing a result like Vincent's, so it is a fresh data point. Do not generalise from one run.

### Conversation cues

- Controversial claim: **"cheap per token" is a marketing number; what matters is tokens per finished task and what the meter does.** Strongest opposing case: AA says Wonder is cheaper than Opus 5.5 per task, so Vincent's run may simply be what any deep audit costs.
- Test, if possible: the same audit on the model Vincent normally uses, and compare the findings and the share of that plan it used.
- Each host: how do you budget agent work now, per token, per plan or per task?
- Budget: about 14 minutes. Exit cue: one rule for judging a model's cost.

## Sources — Data: Contributor mode

### Question and opening cue

What did Meta get from the audit? Check this before anything else goes through Muse Code.

### Facts (Meta's own page)

- Meta's Muse Code subscriptions page (https://dev.meta.ai/docs/muse-code/subscriptions) says **subscriptions default to Contributor mode**: you "get more usage from your plan in exchange for letting Meta use your content to train future Meta models". Content means the prompts, code, files and context you send plus the model's responses.
- You can turn it off at any time; the page says "your future content is not used to train Meta models". It does **not** say what happens to content already submitted.
- VentureBeat says Contributor terms prohibit submitting confidential, sensitive or personal information. The page I read did not show that warning. Check the actual terms.
- API use defaults to Standard mode, where Meta says content is not used for training. Contributor mode is not offered for Wonder on the API. Zero data retention is available to qualified API organisations on approval, with feature limits (VentureBeat).

### Questions for Vincent

- Was Contributor mode on for the Genfeed audit? If yes, which code and files were in the context, and does any of it belong to a private repo or a client?
- Is turning it off now, and checking Meta's terms on deletion, the right next step?
- Say this on air only after checking. If the repo is private or includes anything you would not want used, this is the lead, not a footnote.

### Conversation cues

- Controversial claim: **the cheap or generous plan limits are bought with your code.** Strongest opposing case: the toggle is documented and can be turned off.
- Budget: about 8 minutes. Exit cue: the data rule you apply before running a new agent on a real repo.

## Sources — Try it: same audit, two models

### Question and opening cue

Show the difference rather than describe it. Same task, the model Vincent normally uses against Muse Wonder.

### Readiness (check before airing)

- **No new purchase.** Vincent already has Muse Code. The comparison run uses a plan he already pays for. Do not buy another plan for the show.
- **Data first:** check Contributor mode and use a repo or a sample that is safe to put into it, or run the comparison on a public repo instead. Do not put private code through Muse Code on air.
- **Task:** one prompt, no retries, written down before running. Record the share of plan used by each model, the time, and what each found.
- **Expected proof:** side by side findings, the usage meter before and after, and what each host would act on.
- **Recovery path:** if a rerun is not practical, show the screenshot of the original run and compare with the Arena video's per-generation costs.
- **Optional:** point Claude Code at Meta's API with Meta's own documented environment variables, using a pay-as-you-go API key and a small budget, to see the same model under a harness you know. Confirm against Meta's docs; the only description I found is a relay.
- Mark this segment unavailable if no safe task is ready. Do not promise it in the title or opening beyond what has actually been run.

### Conversation cues

- Say the result plainly, including if Wonder is better value than expected or not.
- Budget: about 12 minutes. Exit cue: "I would or would not put ___ on it this month."

## Sources — Close and parking lot

### Close

Answer the viewer question: what does Muse Wonder cost to use on real work. State what is unknown: how the meter counts usage, whether your result repeats, matched-settings benchmarks, the Muse safety report ("available soon"), EU availability and terms.

### Parking lot (only if time or chat pulls it)

- **Muse in the EU.** The consumer Muse app was not available in the EU as of early October per trackers; API and Muse Code regions are unclear. We covered Muse on 6 Oct.
- **Alternate topic, open-source Adobe and Office clones plus REA** (PhotoCraft about 52K GitHub stars, REA about 144K). Full board is in the scratch notes.
- **Alternate topic, agent safety:** Anthropic's 9 Oct report and the false police tip.
- **Codex pricing:** OpenAI reportedly cuts the $200 Pro Codex allowance on 30 Oct ([New Stack](https://thenewstack.io/openai-halves-200-plan/)).

### Planned Short S1 — One audit used 50% of my Muse Code plan

- Working title: Muse Wonder Used Half My Plan in One Prompt
- Point: the meter, not the token price, is the real cost.
- Open: the usage screenshot and the one-line prompt.
- Challenge: a deep audit costs this much on any model; invite the co-host's real view.
- Payoff: how to budget an agent run.
- Capture: parent segment "Open on the result"; self-contained entry; exit after the answer and the caveat that it is one run.
- After recording: coverage and exact start/end unverified; verify against the video/VTT.

### Planned Short S2 — "Cheap" Muse Wonder reads 7 million tokens per task

- Working title: Why Muse Wonder Isn't As Cheap As $4/$20 Looks
- Point: Artificial Analysis shows heavy input use.
- Open: the AA tokens-per-task table.
- Challenge: AA still has it cheaper per task than Opus 5.5; invite the co-host's view.
- Payoff: tokens per finished task as the number to ask for.
- Capture: parent segment "The bill"; entry restates the numbers; exit after the rule.
- After recording: coverage and exact start/end unverified; verify against the video/VTT.

### Planned Short S3 — Meta's plan limits come with a catch

- Working title: Muse Code's Default Lets Meta Train on Your Code
- Point: Contributor mode is on by default and buys more usage.
- Open: Meta's subscriptions page text.
- Challenge: it is documented and can be switched off; invite the co-host's real view.
- Payoff: the check to run before pointing any agent at a real repo.
- Capture: parent segment "Data"; self-contained entry; exit after the check. Only record after the setting is verified.
- After recording: coverage and exact start/end unverified; verify against the video/VTT.

### Planned Short S4 — Is Muse Wonder Opus 5.5 level?

- Working title: Muse Wonder vs Opus 5.5: What the Independent Numbers Say
- Point: a close second on the index, level on agent coding, behind on knowledge.
- Open: the AA index and Coding Agents Index.
- Challenge: benchmarks are not your repo; invite the co-host's real view.
- Payoff: which workloads to try it on.
- Capture: parent segment "The chart and the independent numbers"; entry names both models; exit after the verdict.
- After recording: coverage and exact start/end unverified; verify against the video/VTT.

### Rough time budget (about 65 minutes plus chat)

Result and payoff 6 · Launch and claims 8 · Chart and independent numbers 10 · The bill 14 · Data 8 · Same audit, two models 12 · Close 4 · buffer 3. Cut the comparison run to the screenshot walkthrough first if time runs short.

### Title

**LOCKED (Vincent, 13 Oct): `Muse Wonder: Better Than Fable 5.1 or Opus 5.5?`**

The honest answer on the independent index: Muse Wonder Full 56 is ahead of Fable 5.1 (53) and behind Opus 5.5 (58); plain Wonder is 52. Say that early, then spend the show on cost and data.

Held back for later: "Muse Wonder Is Better Than Fable and 60% Cheaper. So Why Did It Eat Half My Plan?" (needs the usage screenshot).

## YouTube Description — Paste This

Scheduled live, so this describes the question, not results. Add chapters only after the stream, from the archive's real timestamps.

### Title

Muse Wonder: Better Than Fable 5.1 or Opus 5.5?

### Description

Meta's Muse Wonder claims frontier performance. On the independent index it beats Claude Fable 5.1, but Opus 5.5 still leads.

But is it worth switching, and what does it actually cost to use?

We're discussing Meta's benchmarks vs the independent numbers, pricing and plan limits, Muse Code's default data setting, and how it holds up on real coding work.

We'll share our first test in Muse Code: one audit on a real codebase used about half the plan.

Would you switch? Bring your questions to the chat.

#MuseWonder #MetaMuse #ClaudeOpus

Sources:
https://about.fb.com/news/2026/10/introducing-muse-wonder-models/
https://x.com/finkd/status/2109689305073614918
https://artificialanalysis.ai/articles/muse-wonder
https://dev.meta.ai/docs/pricing-rate-limits
https://dev.meta.ai/docs/muse-code/subscriptions
https://venturebeat.com/technology/metas-new-muse-wonder-and-muse-wonder-full-models-achieve-frontier-performance-but-only-the-weaker-one-is-available-via-api

Subscribe so you don't miss the next build.
Follow us: https://x.com/shipshitdev

### Tags

Muse Wonder, Muse Wonder Full, Meta Muse, Muse Code, Muse Wonder vs Opus 5.5, Muse Wonder vs Fable 5.1, Claude Opus 5.5, Claude Fable 5.1, Meta AI, Meta Superintelligence Labs, Artificial Analysis, AI coding agents, Muse Code pricing, AI for founders, Ship Shit Show

### Not paste-ready (check first)

- "It used about half his plan" is Vincent's own report. Confirm the number, the plan, and whether it was the 5-hour or weekly window from the usage meter. Cut the sentence if it cannot be shown.
- Artificial Analysis scores are launch-day and at max effort. Re-read https://artificialanalysis.ai/articles/muse-wonder before airing. The Fable 5.1 (53) and Opus 5.5 (58) figures come from Meta's chart and VentureBeat's report of the index; confirm on Artificial Analysis.
- The 7.7 million figure is Artificial Analysis's average for plain Wonder at max effort (7.69M input tokens per task), not Vincent's run.
- Chapters: none until the archive exists. YouTube needs the first chapter at 0:00, at least three chapters, each at least 10 seconds.
- Thumbnail: see `thumbnail-options.md`. YouTube's thumbnail test does not run on scheduled live streams.

## X Pipeline

Drafts only. Nothing has been posted. UTM campaign assumes this is episode 27 (6 Oct was ep-26); fix the number if that's wrong. Livestream: https://youtube.com/live/M1EEEl4M6-4.

### Pre-stream announcement (@shipshitdev)

> Meta's Muse Wonder beats Claude Fable 5.1 on the independent index. Opus 5.5 still leads.
>
> We ran one real audit on it in Muse Code. It used half the plan.
>
> Worth switching? Live today.
>
> https://youtube.com/live/M1EEEl4M6-4?utm_source=x&utm_medium=social&utm_campaign=ep-27-muse-wonder-better-than-fable-opus

Attach thumbnail A (face-off).

Alternate, if the 50% cannot be shown:

> Meta says Muse Wonder is frontier.
>
> Independent index: Muse Wonder Full is ahead of Fable 5.1, behind Opus 5.5. It also reads around 7.7M input tokens per task, and Muse Code lets Meta train on your code by default.
>
> Better than Fable or Opus? Live today.
>
> https://youtube.com/live/M1EEEl4M6-4?utm_source=x&utm_medium=social&utm_campaign=ep-27-muse-wonder-better-than-fable-opus

- Attach the chosen thumbnail. Confirm the time and URL before posting. One original only; do not post a clip line in the same hour.
- "Burned about half his plan" is Vincent's report. Post only after the screenshot exists.

### Recap post (flagship day)

Write it after the show from the transcript: what the same audit cost on each model, what each found, and whether the hosts would move any work. Do not draft it from these notes.
