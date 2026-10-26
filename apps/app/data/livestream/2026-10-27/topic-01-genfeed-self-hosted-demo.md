---
title: "I Self-Host Genfeed, an Open-Source AI Studio"
slug: "genfeed-self-hosted-demo"
source: "genfeed.ai homepage, docs.genfeed.ai self-host pages (installation, system requirements, architecture), github.com/genfeedai/genfeed.ai (AGPL-3.0-or-later), read 19 Oct"
status: "draft"
date: "2026-10-27"
announcement_tweet: null
thumbnail_prompt: null
---

## Sources — Livestream Notes

- Date: Tue 27 Oct 2026, 15:00 CET (14:00 UTC), right after the Show HN post goes up. YouTube link: **not set yet** (growth#20). Title not locked; working title still fits since the install stays in.
- **Viewer question:** "Can a founder run their own AI content agent on their own machine, and what does it actually cost and take?"
- **Format (Vincent, 26 Oct):** pitch first, because viewers must be convinced of the play before they care how it runs. Then demo the output (one brief to drafts, host review, a correction turn). Only then the self-hosted process: install, keys, what leaves the box. Vincent drives, Mitchell is the skeptical first-time user.
- **Disclosure, say it in the first minute:** Genfeed is Vincent's product. This is a founder showing his own tool, not a review.
- **Demo rule:** only promise on air what has run end to end in a dry run, and say which instance (local or Cloud) is on screen. If a step fails live, keep the failure and explain it; do not cut to a pre-recorded "it works" without saying so.
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

### Planned Short S2 — From install to first post

- Working title: I Installed an AI Content Agent in [X] Minutes
- Point: the real time from command to a scheduled draft. Only use the number measured live.
- Open: the terminal and the login screen.
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

## Segment 1 — The play: why a founder would want a content agent they own

### Question and opening cue

Open on a finished result from the dry run: one brief, the drafts it made. Then: "before the how, why would a founder bother with this?"

### Conversation cues

- Vincent makes the case in founder terms: what content work it takes off the founder, what stays human (review, approval; nothing publishes until approved). No invented results or numbers.
- Mitchell's challenge: why not just use ChatGPT or Claude directly, or pay for Cloud?
- Viewer consequence: owning the workflow, brand memory and data vs renting everything.
- Only after Mitchell says "ok, show me": exit cue "let's see what it makes."
- Budget: about 8 minutes.

## Segment 2 — Output demo: one real brief to drafts

### What to put on screen

1. The brief (a real Ship Sh!t Show post, for example the Tuesday episode announcement). Rehearsed brief was "Trailhead Notebook"; the episode post has not been rehearsed.
2. Ask for drafts one at a time (only draft 1 shows in the chat UI).
3. Host review on air. Expect the first output to break the format rules (rehearsal: every time); show the correction turn instead of promising the brief enforces format.
4. Stop at draft. Scheduling, Approve, image render and connected channels are unverified; do not publish or schedule live without deciding beforehand.
5. Say which instance is on screen.

### Conversation cues

- Mitchell: would you post this as-is? What would you change?
- Budget: about 14 minutes. Exit cue: "now, how do you run this yourself?"

## Segment 3 — The self-hosted process

### What to put on screen

1. Docs requirements page.
2. Terminal: `npx @genfeedai/create my-genfeed` (or the release bundle). Show the checksum step. Show a stack pre-pulled before going live if the image pull is slow (9.5 GB, amd64 only, emulated on Apple Silicon: 87 s pull and about 2 min to healthy on the rehearsal machine).
3. `curl http://localhost:3010/v1/health`, then first user and login at `localhost:3000` (sign-up was broken on v0.2.13; re-check on the release used; fallback is the curl sign-up from the tester guide).
4. Keys: OpenRouter key; mention media keys. Never show real API keys; use a throwaway `.env` or blur.
5. Architecture page: local vs provider calls.
6. Optional: connect Claude Code to the MCP server at `localhost:3014`, only if verified in the dry run.

### Conversation cues

- Controversial claim to test: **"self-hosted AI" is mostly self-hosted plumbing; the intelligence is still rented.** Strongest opposing case: owning the workflow, brand memory and data is the part that compounds; models are interchangeable.
- Provider spend: show only from the provider dashboard after the run, if checked.
- Budget: about 18 minutes. Exit cue: close.

## Fallbacks

- Pre-generated drafts saved in a text file on the stream machine.
- Stack already up before going live, plus the recorded install run.
- Finished backup render and full rehearsal recording (growth backup plan; backup render not done yet, depends on growth#17).
- If a step fails live, keep the failure and explain it; say it if you cut to a recording.

## Close

- One line each: who should self-host this, and who should not.
- Links: genfeed.ai/self-hosted and the repo. CTA brief, end only.
