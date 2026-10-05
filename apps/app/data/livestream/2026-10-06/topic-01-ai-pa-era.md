---
title: "[LIVE] The AI PA Era: Are You Even Busy Enough For One?"
slug: "ai-pa-era"
source: "OpenAI DevDay 29 Sep (dots launch, Altman on compute cost, demo stall), Meta Muse launch 8 Sep (CNBC, PBS, PitchBook), Anthropic S-1 coverage (Fortune, CNBC/Reuters, Yahoo Finance), Anthropic Economic Index (Jan and Mar 2026), Trending Topics EU availability piece, dots pricing coverage, Grok Bot availability coverage, Nate Herk and Futurepedia dots tests, YouTube trend scrape 5 Oct (yt-dlp), our 18 Aug and 1 Sep Grok Bot streams"
status: "in_progress"
date: "2026-10-06"
announcement_tweet: null
thumbnail_prompt: "16:9 YouTube livestream thumbnail, 1920x1080, photographic, subtle film grain, indie rock gig-poster energy, readable at mobile size. REFERENCE IMAGES, in order: (1) a portrait photo of Vincent, the bald host with stubble and hazel eyes. (2) a portrait photo of Mitchell, the host with swept-back brown hair and blue eyes. IDENTITY LOCK: both hosts keep the exact faces from references (1) and (2), natural skin, no beautification. WARDROBE: Vincent in a plain black hoodie, Mitchell in a plain navy polo. COMPOSITION: the two hosts chest-up at the left and right edges, sceptical expressions, looking at the camera. Between them, a single glowing desk with an empty office chair and an open laptop showing a blank screen, under a hard spotlight on a dark stage; a large wall clock above the desk reads late at night. The scene says an assistant waiting for work that never comes. PALETTE: black, warm ivory, natural skin tones, with red (#ff2d20) as the only accent, on the clock hands and the laptop's small status light. TEXT: no text, letters, numbers, logos or captions anywhere in the image; the clock has plain tick marks, no numerals. NEGATIVE: no watermark, no extra people, no robot faces, no invented brand marks, no clutter."
---

## Sources — Livestream Notes

- Date: Tue 6 Oct 2026. Start time, YouTube and Restream links: **not created yet.** Previous shows started at 14:00 CEST; confirm.
- Format: discussion plus one live Grok Bot demo. 60–75 minutes.
- **Viewer question:** "Everyone is selling me a 24/7 AI assistant. Do I have 24/7 of work for it, and will these products even last?"
- **Spine:** the PA era arrived in eight weeks: Grok Bot (11 Aug beta), Muse (8 Sep), dots (29 Sep). Every one of them is sold as always-on. Take coding out, and most founders do not have a day's worth of tasks to hand over, let alone a week. That is a problem for the buyer (paying $100/month for an assistant that waits) and for the seller (an always-on agent burns compute even when it has little to do). The labs that can afford it are the ones whose money comes from coding.
- **EU is a talking point, not the headline:** Muse is not available here, dots is blocked on Pro here, Grok Bot works. One short segment.
- **Not in this episode:** no Muse or dots hands-on. Neither host has access (EU). Do not imply first-hand use. No VPN workaround on stream.
- **Firsthand (Vincent to fill before the show):** what Grok Bot actually does for you week to week, and how many hours of non-code work it gets. The 1 Sep notes record Dr Eggbot installed on stream and Escoffier drafting mail with sending held. They also list Chief of Staff, Inbox Manager and Calendar Scheduler as setups *not* to clone. Do not present those as yours.
- **Firsthand (Mitchell to fill):** his own non-code weekly admin, roughly in hours. That is the honest test of "busy enough".
- Thumbnails and X posts: the prompt in the frontmatter is provisional. Run the `thumbnails` and `x-pipeline` skills.

### Why this topic (trend read, 5 Oct)

View counts come from a yt-dlp scrape on 5 Oct, not the Data API. The API key is IP-restricted and returned 403 from the MacBook. Small-account and age effects apply.

| Video | Channel | Uploaded | Views |
|---|---|---|---|
| [Introducing dots](https://www.youtube.com/watch?v=uXspbC2srEQ) | OpenAI | 29 Sep | 645K |
| [OpenAI Dots Failed Live on Stage](https://www.youtube.com/watch?v=a_jihWpd8cc) | SAMTIME | 2 Oct | 678K |
| [Anthropic IPO: "This is a dog of a company"](https://www.youtube.com/watch?v=XLXn0Ut8adM) | The Tech Report | 2 Oct | 532K |
| [The dots demo, take two](https://www.youtube.com/watch?v=fHEIw5CcN5U) | OpenAI | 1 Oct | 459K |
| [I Tested OpenAI's Dots vs. Meta's Muse](https://www.youtube.com/watch?v=BvvfZKKz4Yo) | Nate Herk | 30 Sep | 354K |
| [I Tested OpenAI's New Personal Assistant Agent: DOTS](https://www.youtube.com/watch?v=V_1Vn2WfpEY) | Futurepedia | 29 Sep | 201K |
| [OpenAI DevDay: Dots, Agents & $100B Opportunities](https://www.youtube.com/watch?v=Y_RevX5yMq8) | Greg Isenberg | 29 Sep | 174K |
| [Anthropic's $2 Trillion IPO Is A Joke](https://www.youtube.com/watch?v=n7pfT5hNrdk) | Sasha Yanshin | 4 Oct | 137K |

- The dots and Muse videos are launch coverage and first impressions: what it can do, not whether you have enough for it to do. Nobody we found asks the "busy enough" question.
- Lab-economics scepticism is pulling big numbers separately (the Anthropic IPO videos). This episode joins the two.
- Our own history: [How to Use Grok 4.6, Grok Bot & Cursor Origin Together](https://youtu.be/zyQEwa5IYvk) is our best recent stream (676 views). [How The SpaceX Team Ships Grok Bot](https://www.youtube.com/watch?v=LbCRcGRLYaU) (1 Sep) sits at 106.

## Sources — The PA era, in eight weeks

### Question and opening cue

Three always-on assistants shipped since August, each with its own computer, each sold as working while you sleep. Cue: what each one is for, in one line.

### Evidence to open

- **Grok Bot** (11 Aug, beta): a desktop agent with a terminal that can learn a task by watching you. From $20 (Cursor Pro) or $30 (SuperGrok). [Comparison: AIMultiple](https://aimultiple.com/always-on-agents)
- **Muse** (8 Sep): reads email, books travel and appointments, fills forms, negotiates, and pays with your card. Free tier (card required, 100M tokens/week), Power $20/month, Maximum $100/month. US first. [CNBC](https://www.cnbc.com/2026/09/08/meta-personal-ai-agents-public-reckoning-privacy-safety.html) · [PBS](https://www.pbs.org/newshour/nation/meta-launches-personal-ai-agent-muse-to-help-with-everyday-tasks)
- **dots** (29 Sep): each dot runs on GPT-6 Astra with its own cloud computer and browser, and works 24/7 toward a responsibility you give it. OpenAI's examples: monitor bug reports, prepare a budget cycle, move an app off a retiring API. One dot included with Pro ($100). [9to5Google](https://9to5google.com/2026/09/29/openai-dots-agent/) · [OpenAI launch video](https://www.youtube.com/watch?v=uXspbC2srEQ)
- Framing from the comparison sites: Muse runs errands, dots run business software, Grok Bot runs workflows. [Memeburn](https://memeburn.com/openai-dots-vs-meta-muse-vs-grok-bot-three-always-on-agents-built-for-three-different-jobs/)

### Conversation cues

- Notice OpenAI's own examples: two of the three are engineering jobs. Even the vendor reaches for code.
- Budget: about 8 minutes. Exit cue: "So take the code away. What's left?"

## Sources — Take away coding. What's left?

### Question and opening cue

The core of the episode. Cue: coding is the one job that genuinely fills 24 hours (tests, refactors, migrations, retries). What else in your business does?

### Evidence to open

- **Coding dominates real usage.** In Anthropic's Economic Index, Computer and Mathematical tasks are about a third of Claude.ai conversations and nearly half of first-party API traffic. On Claude.ai the coding share peaked at 40% (Mar 2025) and fell to 34% (Nov 2025) as coding moved to the API and Claude Code. [Economic Index, Jan 2026](https://www.anthropic.com/research/anthropic-economic-index-january-2026-report) · [Economic Index, Mar 2026](https://www.anthropic.com/research/economic-index-march-2026-report)
- **Claude Code alone passed $2.5B run-rate revenue** (Anthropic, Feb 2026). Coding is the use people pay heavily for. [Yahoo Finance on the S-1](https://finance.yahoo.com/technology/ai/articles/anthropic-prepares-ipo-reporting-42-164047677.html)
- **The vendor's own demo task was code-shaped.** OpenAI's stage demo asked a dot to prep an app for launch. [Startup Fortune](https://startupfortune.com/openai-launches-dots-to-rival-metas-muse-and-it-stumbles-on-stage/)
- Firsthand (hosts fill in): each host's real non-code weekly admin, in hours. Inbox, calendar, invoices, sales follow-up, research, content.

### Conversation cues

- Host challenge: is "always-on" just batch work with better marketing? A founder's admin comes in bursts (Monday inbox, month-end invoices), not around the clock.
- The other side: monitoring jobs (leads, mentions, bug reports, prices) do run all day. Is that enough to justify a dedicated agent?
- Consequence for viewers: before paying, list a week of tasks you would actually hand over. If it is under a few hours, a chat assistant or a scheduled task does the same for less.
- Budget: about 15 minutes. Exit cue: "And if users don't have the work, who pays for the idle time?"

## Sources — Who pays for the idle time?

### Question and opening cue

Business sustainability from the seller's side. An always-on agent with its own computer costs money whether or not it has work. Cue: can the labs afford to sell this, and what happens to the price when they stop subsidising it?

### Evidence to open

- **Altman, on stage at DevDay:** called dots a "really compute heavy product" and said a free tier is a "someday" goal. Dots tiers run from $100 (Pro) to $500. Verify the quote against the keynote before reading it. [Yahoo Finance: the consumer agent race](https://finance.yahoo.com/technology/ai/articles/consumer-ai-agent-race-five-115316091.html) · [BigGo: dots will stay paid](https://finance.biggo.com/news/996cb7b60a12954d)
- **Meta gives Muse away** (100M tokens/week free) and can subsidise it from ads. Reported 2.5M US downloads by 23 Sep. VCs told PitchBook startups cannot compete with a free agent. [PitchBook](https://pitchbook.com/news/articles/metas-muse-is-a-free-agent-vcs-say-startups-cant-compete)
- **Anthropic's S-1** (leaked/reported 28–29 Sep): 2025 revenue about $4.6B, operating loss about $8.06B. The headline $42B net loss is mostly a roughly $34B accounting charge on convertible financing, not cash burned; say that on air. Reports say Q2 2026 revenue was $11.5B and operating profit positive for a second quarter; verify before quoting. [Fortune](https://fortune.com/2026/09/29/anthropic-ipo-s-1-prospectus-income-statement/) · [CNBC/Reuters](https://www.cnbc.com/2026/09/28/anthropics-ipo-prospectus-shows-sweeping-ai-vision-surging-costs-reuters.html)
- **Rhodium Group** (mid-Sep): seven largest Chinese AI developers about $10.7B ARR combined, against OpenAI about $40B and Anthropic about $65B. Secondary coverage. [Quartz](https://qz.com/china-ai-companies-revenue-openai-anthropic-rhodium-091726)

### Conversation cues

- Host challenge: Meta can afford idle agents because Muse is an ad and data play. OpenAI charges because it cannot. Anthropic has not shipped a PA at all and makes its money on code. Which model survives?
- Our own position: we both run our businesses on Claude. What would an IPO change about pricing and limits for us?
- Consequence for viewers: a subsidised price is a temporary price. Do not build a process around a free tier.
- Budget: about 12 minutes. Exit cue: "And from where we sit, half of this isn't even on sale."

## Sources — Talking point: from Europe, you mostly can't buy one

### Evidence to open

- **Muse:** US and Canada only, no EU date. Reported reasons are the DMA (combining Facebook, Instagram, WhatsApp and Messenger data) plus GDPR and the AI Act; that is press attribution, not a Meta statement. [Trending Topics](https://www.trendingtopics.eu/dots-muse-siri-ai-europe/)
- **dots:** Pro users in the EEA, Switzerland and the UK are excluded. OpenAI says Business Premium gets dots in all supported regions, EU included. Business Premium is reported at $125/seat monthly ($100 annual) with a two-seat minimum, so roughly $120–150/month for one dot. Secondary; check OpenAI's pricing page. [MindStudio](https://www.mindstudio.ai/blog/chatgpt-dots-pricing-access) · [eesel](https://www.eesel.ai/blog/openai-dots-pricing)
- **Grok Bot:** no published regional restriction; access follows the plan. [Grok Bot availability](https://www.tryagentsonic.com/articles/grok-bot-availability-countries)

### Conversation cues

- Is the EU block protecting us (an agent that pays with your card and reads your WhatsApp) or just leaving European founders behind? Let the hosts disagree.
- Budget: about 5 minutes.

## Sources — Demo: Grok Bot as our PA

### Readiness (check before 13:30)

- Machine: MacBook Pro, Grok Bot.app (as on 1 Sep). Confirm the plan is active and the app launches.
- **Task: Vincent to choose one real, low-risk, non-code PA job.** The point is to test the "busy enough" question, so pick admin, not code. Suggestions: prep a briefing for tomorrow's meetings from the calendar, or triage the last 24 hours of a non-sensitive inbox into a summary with draft replies.
- Hard rule: **no sending.** Drafts only, the same mail hold as 1 Sep. No customer names or private inboxes on screen.
- Expected proof: a finished briefing or draft list on screen, plus how long it took. Then the question: how many times a week would you actually need this?
- Recovery: if it stalls, say so and switch to the backup. A stall on air is fine; OpenAI's own demo stalled.
- Backup: a pre-recorded run of the same task, recorded today. If neither a live run nor a recording exists, drop this slot and let the discussion run long.
- Budget: about 15 minutes.

## Sources — What we would never hand a PA

- **Dots stalled live at DevDay.** Holly Li's dot stopped responding on stage, and the stream audio cut at the same moment. OpenAI's Thibault Sottiaux blamed rolling out all the updates at the same time. [Hugging News](https://huggingnews.com/ai/update-openai-blames-dots-demo-failures-on-simultaneous-updates-53c443c1) · [OpenAI's retake](https://www.youtube.com/watch?v=fHEIw5CcN5U)
- **Muse pays with your card and negotiates for you.** Where is the money line?
- **NVIDIA Open Agent Safety Platform** (28 Sep): an external layer to limit what agents can do. NVIDIA's claim about a Hugging Face incident is unverified; do not state it as fact. [NVIDIA](https://nvidianews.nvidia.com/news/open-agent-safety-platform)
- Cue: each host names one job they would never hand over, and why. Read access first, then drafts, only then actions. About 8 minutes.

## Sources — Close and parking lot

### Close

- Answer the viewer question: the PA era is real for people with enough repeatable work, mostly code and monitoring. For most founders' admin, a few hours a week does not justify an always-on agent yet. Each host says whether they would pay for one today.
- State the unknowns: whether dots and Muse prices hold once subsidies end, Anthropic's actual IPO terms, and no hands-on from us with dots or Muse.

### Parking lot (only if time or chat pulls it)

- **The plan squeeze.** Reported ChatGPT Pro allowance cut for new subscribers (existing ones from 29 Oct), a new $500 tier, and Claude Code weekly limits about 17% lower from 14 Sep. Secondary sources only; verify before quoting. Fits the sustainability segment if chat asks.
- **Claude Code Mods** (1 Oct): TypeScript hooks that rewrite prompts, block tools and replace the UI. They run unsandboxed. Big on YouTube ([Theo](https://www.youtube.com/watch?v=D8PikZ1KhUo), Chase AI, Nate Herk).
- **Gemini 4 Argon** (30 Sep): limited release, $2/$10 per million tokens. [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)
