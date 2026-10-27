---
title: "Genfeed.ai: We're Launching Our Open-Source AI Content Studio"
slug: "genfeed-self-hosted-demo"
source: "genfeed.ai homepage, docs.genfeed.ai self-host pages (installation, system requirements, architecture), github.com/genfeedai/genfeed.ai (AGPL-3.0-or-later), read 19 Oct"
status: "in_progress"
date: "2026-10-27"
announcement_tweet: null
thumbnail_prompt: null
---

## Sources — Livestream Notes

- Date: Tue 27 Oct 2026, 15:00 CET (14:00 UTC), right after the Show HN post goes up. YouTube: https://www.youtube.com/watch?v=1CFi5rzc2bU Title locked by Vincent, 26 Oct: "Genfeed.ai: Launching Our Open-Source AI Content Studio".
- **Viewer question:** "Can a founder run their own AI content agent on their own machine, and what does it actually cost and take?"
- **Format (Vincent, 26 Oct):** pitch first, because viewers must be convinced of the play before they care how it runs. Then demo the output (one brief to drafts, host review, a correction turn). Only then the self-hosted process: install, keys, what leaves the box. Vincent drives, Mitchell is the skeptical first-time user.
- **Disclosure, say it in the first minute:** Genfeed is Vincent's product. This is a founder showing his own tool, not a review.
- **Demo rule:** only promise on air what has run end to end in a dry run, and say which instance (hosted Playground or local) is on screen. If a step fails live, keep the failure and explain it; do not cut to a pre-recorded "it works" without saying so.
- **Vincent to fill before the show:** which instance runs the demo and its release (growth plan says v0.2.15, untagged on 24 Oct; the only rehearsal was v0.2.13 self-hosted); dry-run date; which provider keys you will use; the one real brief you will run; what one generation cost in provider spend.
- **Mitchell to fill:** what you would want a content agent to do for your business, and what would make you not trust it.

### What the docs say (read 19 Oct)

- **What it is:** open-source AI studio and content agent. A brief plus brand context becomes video, image and post drafts; you review, then publish or schedule to connected channels. MCP server and Claude, Claude Code and Codex support.
- **License:** [AGPL-3.0-or-later](https://github.com/genfeedai/genfeed.ai), except packages with their own notice.
- **Install:** `npx @genfeedai/create my-genfeed` (Node 24), or the checksummed release bundle with Docker Compose ([installation](https://docs.genfeed.ai/self-host/installation)).
- **Requirements:** Docker Engine 24+ with Compose v2; about 10 GB disk, 15 GB recommended; ports 3000 (web), 3010 (API), 3014 (MCP) free; **no GPU** ([system requirements](https://docs.genfeed.ai/self-host/system-requirements)).
- **What runs locally:** one `genfeed` container (web, API, workers, files, notifications, MCP, embedded Redis) plus PostgreSQL with pgvector ([architecture](https://docs.genfeed.ai/self-host/architecture)).
- **What leaves your box:** model calls go to providers with your keys. OpenRouter is required for text; Replicate, fal and ElevenLabs for media and voice. "Self-hosting has no Genfeed credits." Prompts and media sent to a provider leave the deployment.
- **Rehearsal facts to talk from (growth rehearsal, 23 Oct, v0.2.13, one Mac Studio, one run):** install healthy in about 2 min after an 87 s pull; images 9.5 GB; app container about 4.6 GiB RAM idle; sign-up and agent chat (port 3011) were broken then, fixed after v0.2.13 and not yet re-checked. Say these as "one measured machine", not as a guarantee.

### How to read the references

- The docs are Genfeed's own; requirements CPU and RAM are not published yet (one measured machine: 8 CPUs, 15 GiB).
- Links on air and in the description: https://genfeed.ai/self-hosted and https://github.com/genfeedai/genfeed.ai, not the homepage (it sells Cloud).
- "Data stays on your infrastructure" means records and files; generation still goes to third-party providers. Say both halves on air.

### Planned Short S1 — Self-hosted AI still phones home

- Working title: "Self-Hosted" AI Still Sends Your Prompts Out
- Point: you can own the app and the data, but the models are still someone else's API.
- Open: the architecture page, local vs provider calls.
- Challenge: you can point it at your own ComfyUI or local infrastructure; is that worth it for a small team?
- Payoff: when self-hosting is worth it, and when Cloud is the honest answer.
- Capture: Segment 3.
- After recording: unverified; verify against the video/VTT.

### Planned Short S2 — From install to first post (only if an install is recorded separately)

- Working title: I Installed an AI Content Agent in [X] Minutes
- Point: the real time from command to a scheduled draft. Only use the number measured live.
- Open: the running stack and the login screen.
- Challenge: Mitchell: would a non-technical founder get this far?
- Payoff: what it took, honestly.
- Capture: Segment 3.
- After recording: unverified; fill [X] from the recording only.

### Planned Short S3 — What does one AI post actually cost?

- Working title: What One AI-Made Post Really Costs
- Point: provider spend for one brief, shown from the provider dashboards.
- Open: the provider billing pages after the run.
- Challenge: the cost is not the tokens, it is the review time.
- Payoff: cost per usable post, not per generation.
- Capture: Segment 2.
- After recording: unverified; verify against the video/VTT.

## Cold Open — Facts card

- Open-source (AGPL), runs with Docker, no GPU, about 10-15 GB disk.
- Three published ports: web 3000, API 3010, MCP 3014 (WebSocket 3011 was not published in v0.2.13; fixed since).
- Bring your own keys: OpenRouter for text, Replicate, fal, ElevenLabs for media and voice.
- Records and files stay local; model calls go to providers.
- Vincent built it. Disclose.

## Segment 1 — The play: models get better, your harness and context are what you own

### Question and opening cue

Open on a finished result from the dry run: one brief, the drafts it made. Then, in one minute: the toolbox gives the agent its tools, automation workflows drive the agentic workflow, and that is what lets you add more automation and more guardrails. Then: "why does this matter if the models keep getting better?"

### The pitch (Vincent's thesis, 26 Oct)

- **Models will get better and cheaper. That is not your edge, everyone gets the same models.** What you need is your own harness (the workflow around the model) and your own context (brand, voice, product knowledge, past content). That is what turns a generic model into content that sounds like your business, and it is the part you keep when you swap models.
- **Why Genfeed:** it is that harness and context layer, open-source, so a founder can own it. Use it to produce content for your business, including B2B content (founder posts, product explainers, episode and launch posts).
- **The toolbox (Vincent, 26 Oct; opening of the show):** the harness has two parts. The **toolbox** gives the agent its tools. The **workflows in automation** then drive the agentic workflow, which unlocks more automation and more guardrails. Say it as a direction Vincent wants to develop, not as a shipped feature. **Unverified:** what of the toolbox and automation workflows exists in Genfeed today (the docs I read only mention the MCP server and Claude/Claude Code/Codex support); Vincent to state exactly what is live vs planned before air, and show only what is live.
- **The ask, said once and briefly:** Vincent wants viewers to use Genfeed to sell content to B2B. Disclose first that Genfeed is his product. Keep it to the style rule (value, not begging, CTA at the end); do not repeat the ask in every segment.
- **Guardrails:** no claim that Genfeed content has sold to or converted B2B buyers unless there is a measured, sourced example; no "models will" predictions presented as fact (frame as Vincent's view). The B2B angle is the thesis for the show, and the demo should show it: use a B2B-style brief (see Segment 2).

### On screen: AI content is taking over (X posts, checked 27 Oct)

- [@levelsio, 8 Aug 2026](https://x.com/levelsio/status/2086056496920506723) (~1.07M views): Dead Internet Theory: Stack Overflow questions gone, Reddit and X replies taken over by AI bots, "there is no real content anymore on the internet", so no fresh training data either.
- [Forbes, 13 Oct 2025](https://x.com/Forbes/status/1977831724789682499): Reddit co-founder Alexis Ohanian says much of the content posted online is AI-generated, not human-created.
- [Bearly AI on Adam Mosseri's essay, 31 Dec 2025](https://x.com/bearlyai/status/2006474217206985085) (~683k views): the head of Instagram: by 2026 "authenticity" will be infinitely reproducible, and AI will produce far more content than humans.
- [Kelly Hungerford, 16 Jun 2026](https://x.com/KDHungerford/status/2066763959063986347): AI agent web traffic has passed human traffic (links a news story; check the source before quoting a number).
- Counterpoint for Mitchell: [@0xPia, 12 Aug 2026](https://x.com/0xPia/status/2087546245648683163): if creators stop posting, we all watch AI recycle the same content forever, or humans adapt and find new formats.
- How to use: the hook "all internet content will be AI-generated" is our prediction; these posts show others see the same trend. None of them proves a percentage.

### Conversation cues

- Mitchell's challenge: if models keep improving, why not just prompt ChatGPT or Claude, or pay for Cloud?
- Vincent: context and harness compound, prompts don't; and which one buys B2B attention?
- Exit cue once Mitchell says "ok, show me": "let's see what it makes."
- Budget: about 8 minutes.

## Segment 1b — My growth advisor: Nevo's Brain (about 5 minutes)

Vincent, 27 Oct: he is setting up Nevo's Brain as his growth bot / advisor. Disclose that it is someone else's product and free, and that Vincent has no tie to it beyond using it (confirm before air).

### What to put on screen

1. [Nevo David's post, 14 Oct 2026](https://x.com/wickedguro/status/2110347509948146070) (~1.05M views): Postiz passed $3M ARR, growing about $3k MRR a day; credits distribution, not product (37k GitHub stars, weekly launches, three Product Hunt #1s, creator content); gives away his "brain" for free at nevo.md. Says @trust_mrr verifies the numbers.
2. [nevo.md](https://nevo.md/): "Nevo's Brain", a free MCP server for Claude, ChatGPT, Cursor, Codex and others. Four parts: niche radar (audiences big competitors miss), hype antenna (early trends), tactics board (channels that work now), growth engine (trial-to-paid, churn). Setup: add the URL as a custom connector (Claude) or `mcp add` (Claude Code, Codex), sign in with email + 6-digit code. Signing in subscribes you to his newsletter.
3. If connected before air: ask it one real Genfeed launch question live, and show the answer.

### Conversation cues

- Why it fits the thesis: it is a harness plus context (one founder's playbook) plugged into any model. Same idea as Genfeed for content.
- The Genfeed launch plan already follows Nevo's 0-to-$3K playbook (weekly r/selfhosted posts, star CTAs).
- Mitchell's challenge: is one founder's playbook advice for everyone? The page's examples are all Postiz; it does not show results for other users.
- All numbers are Nevo's own claims (page says "verified by TrustMRR"; the MRR chart is partly read off Stripe "to the nearest $500"). Say "he says".

## Segment 2 — Output demo: one real brief to drafts, in the Playground

Vincent, 26 Oct: the content demo runs in the Genfeed Playground, https://app.genfeed.ai/playground (the hosted app), not in the self-hosted stack. Nothing from the growth rehearsal covers it: that was the **Agent** page on a self-hosted v0.2.13 install. Dry-run the Playground before the show and say on air that this is the hosted app, while Segment 3 is about running your own.

### What to put on screen

1. The brief: a B2B-style one that supports the pitch (for example a founder post for a B2B product, or the Tuesday episode announcement). Pick and test it in the dry run; no brief has been written down or tested for the Playground yet.
2. Drafts in the Playground. Unknown until dry-run: whether it shows all drafts at once, whether outputs break format rules (the Agent page did every time), what a run costs in credits.
3. Host review on air; if the output misses the rules, show the correction turn instead of hiding it.
4. Stop at draft unless scheduling/publishing is tested and decided beforehand.

### Conversation cues

- Mitchell: would you post this as-is? What would you change?
- Budget: about 14 minutes. Exit cue: "now, how do you run this yourself?"

## Segment 3 — The self-hosted process (walkthrough, no live install)

Vincent, 26 Oct: no live install of the 9 GB Docker image. The content demo (Segment 2) runs in the hosted Playground. Here we explain the process and show the pieces, nothing is pulled on air.

### What to put on screen

1. Docs requirements page (Docker, 10-15 GB disk, no GPU, ports).
2. The install commands as text or the docs page (`npx @genfeedai/create my-genfeed`, or the checksummed release bundle). Say the rehearsal numbers as one machine: 87 s pull and about 2 min to healthy, image 9.5 GB, amd64 only, emulated on Apple Silicon. Be honest that it is a big image; that is part of the self-host trade-off.
3. If a local stack is brought up before going live to show: `curl http://localhost:3010/v1/health`, then the logged-in app. Say it was brought up before the stream. Not required for the content demo.
4. Keys: where the OpenRouter key goes; mention media keys. Never show real keys; use a throwaway `.env` or blur.
5. Architecture page: local vs provider calls.
6. Optional: connect Claude Code to the MCP server at `localhost:3014`, only if verified in the dry run.

### Conversation cues

- Controversial claim to test: **"self-hosted AI" is mostly self-hosted plumbing; the intelligence is still rented.** This is the Segment 1 thesis seen from the other side: the model is rented and will keep changing; the harness, brand memory and data are what you own.
- Provider spend: show only from the provider dashboard after the run, if checked.
- Budget: about 12 minutes. Exit cue: close.

## Demo prompts (draft, UNTESTED in the Playground)

Written 26 Oct for the dry run. The only brief ever run was the "Trailhead Notebook" one on the self-hosted Agent page; these have not been run anywhere. Edit freely.

### Brief (B2B founder post, about the thesis)

```
Write 3 LinkedIn posts for a B2B founder audience (founders and small-team operators who sell to other businesses).

Point: models keep getting better and cheaper for everyone, so the model is not your edge. Your edge is your own harness (the workflow around the model) and your own context (brand, voice, product knowledge, past content). Genfeed is an open-source content agent built around that idea. I built it, so say "I built" in the post.

Rules:
- First person, plain and direct, no corporate speak, no hashtags, no emojis, no exclamation marks.
- 400 characters or fewer per post. Short paragraphs with a blank line between them.
- Do not claim results, revenue, leads, customers or numbers of any kind.
- Do not say the content sells or converts. Say what the tool does.
- End with one line pointing to genfeed.ai/self-hosted and github.com/genfeedai/genfeed.ai. No "like and subscribe", no "comment below".
- Give me one draft at a time; start with draft 1.
```

### Correction-turn prompts (use whichever the first output needs)

- Format: `Shorten it to 400 characters or fewer, keep short paragraphs with a blank line between them, and remove any hashtags, emojis and exclamation marks.`
- Claims: `Remove any claim about results, sales, leads or conversions. Describe only what the tool does.`
- CTA: `End with exactly one line linking genfeed.ai/self-hosted and github.com/genfeedai/genfeed.ai, nothing else.`
- Voice: `Rewrite in first person as the founder who built it, direct, no marketing language.`

### Notes for the dry run

- Check whether the Playground shows one draft or several, and ask for them one at a time if it shows only one.
- The rehearsal (Agent page) dropped a "do not claim" rule when the orchestrator shortened the brief. Check that the claims rule survives; if not, put it in the correction turn on air.
- Record the credits or spend of the run from the provider/Genfeed billing view if it can be read; do not quote a number until it is.
- Genfeed's own docs say nothing publishes until you approve; confirm this in the Playground before saying it on air.

## Fallbacks

- Pre-generated drafts saved in a text file on the stream machine.
- Optional local stack, pre-pulled before going live (nothing is pulled on air), plus the recorded install run if one exists.
- Finished backup render and full rehearsal recording (growth backup plan; backup render not done yet, depends on growth#17).
- If a step fails live, keep the failure and explain it; say it if you cut to a recording.

## Close

- One line each: who should self-host this, and who should not.
- Links: genfeed.ai/self-hosted and the repo. CTA brief, end only.
