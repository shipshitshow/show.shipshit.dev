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

- Date: Tue 27 Oct 2026. Start time and YouTube link: **not set yet.** Title not locked.
- **Viewer question:** "Can a founder run their own AI content agent on their own machine, and what does it actually cost and take?"
- **Format:** live demo by Vincent, Mitchell as the skeptical first-time user. Show the install, the first generation and one real post from brief to scheduled draft.
- **Disclosure, say it in the first minute:** Genfeed is Vincent's product. This is a founder showing his own tool, not a review.
- **Demo rule:** only promise on air what has run end to end in a dry run. If a step fails live, keep the failure and explain it; do not cut to a pre-recorded "it works" without saying so.
- **Vincent to fill before the show:** dry-run date and machine (OS, CPU, RAM; Apple Silicon runs the amd64 image under emulation, slower); install time from command to login; which provider keys you will use; the one real brief you will run; what one generation cost in provider spend.
- **Mitchell to fill:** what you would want a content agent to do for your business, and what would make you not trust it.

### What the docs say (read 19 Oct)

- **What it is:** open-source AI studio and content agent. A brief plus brand context becomes video, image and post drafts; you review, then publish or schedule to connected channels. MCP server and Claude, Claude Code and Codex support.
- **License:** [AGPL-3.0-or-later](https://github.com/genfeedai/genfeed.ai), except packages with their own notice.
- **Install:** `npx @genfeedai/create my-genfeed` (Node 24), or the checksummed release bundle with Docker Compose ([installation](https://docs.genfeed.ai/self-host/installation)).
- **Requirements:** Docker Engine 24+ with Compose v2; about 10 GB disk, 15 GB recommended; ports 3000 (web), 3010 (API), 3014 (MCP) free; **no GPU** ([system requirements](https://docs.genfeed.ai/self-host/system-requirements)).
- **What runs locally:** one `genfeed` container (web, API, workers, files, notifications, MCP, embedded Redis) plus PostgreSQL with pgvector ([architecture](https://docs.genfeed.ai/self-host/architecture)).
- **What leaves your box:** model calls go to providers with your keys. OpenRouter is required for text; Replicate, fal and ElevenLabs for media and voice. "Self-hosting has no Genfeed credits." Prompts and media sent to a provider leave the deployment.
- **Known gap to check in the dry run:** the docs say the email sign-up path for the first user "was read from code and not tested end to end on a clean install".

### How to read the references

- The docs are Genfeed's own; requirements CPU and RAM are not published yet (one measured machine: 8 CPUs, 15 GiB).
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
- Capture: Segment 2.
- After recording: unverified; fill [X] from the recording only.

### Planned Short S3 — What does one AI post actually cost?

- Working title: What One AI-Made Post Really Costs
- Point: provider spend for one brief, shown from the provider dashboards.
- Open: the provider billing pages after the run.
- Challenge: the cost is not the tokens, it is the review time.
- Payoff: cost per usable post, not per generation.
- Capture: Segment 4.
- After recording: unverified; verify against the video/VTT.

## Cold Open — Facts card

- Open-source (AGPL), runs with Docker, no GPU, about 10-15 GB disk.
- Three ports: web 3000, API 3010, MCP 3014.
- Bring your own keys: OpenRouter for text, Replicate, fal, ElevenLabs for media and voice.
- Records and files stay local; model calls go to providers.
- Vincent built it. Disclose.

## Segment 1 — Why self-host a content agent?

### Question and opening cue

Open on the finished result from the dry run: one brief, the drafts it made, ready to schedule. Then: "we'll build this from zero, live, on a clean machine."

### Conversation cues

- Mitchell's challenge: why would a founder run their own instead of paying for Cloud?
- Viewer consequence: data ownership, cost control, and the work of keeping it running.
- Budget: about 5 minutes. Exit cue: "let's install it."

## Segment 2 — Install, live

### What to put on screen

1. Docs requirements page.
2. Terminal: `npx @genfeedai/create my-genfeed` (or the release bundle). Show the checksum step.
3. `curl http://localhost:3010/v1/health`, then first user and login at `localhost:3000`.

### Conversation cues

- Hide secrets: use a fresh `.env` with throwaway keys, or blur. Never show real API keys on stream.
- Fallback if the image pull is slow: talk through the architecture page while it downloads.
- Budget: about 12 minutes. Exit cue: "it's running. now make it do something."

## Segment 3 — Keys, brand and what leaves the box

### What to put on screen

1. Adding the OpenRouter key; mention media keys.
2. Brand context setup.
3. Architecture page: local vs provider calls.

### Conversation cues

- Controversial claim to test: **"self-hosted AI" is mostly self-hosted plumbing; the intelligence is still rented.** Strongest opposing case: owning the workflow, brand memory and data is the part that compounds; models are interchangeable.
- Budget: about 10 minutes. Exit cue: "now a real brief."

## Segment 4 — One real brief to a scheduled draft

### What to put on screen

1. The brief (a real Ship Sh!t Show post, for example the Tuesday episode announcement).
2. The drafts it produces; host review on air; edit what is wrong.
3. Schedule to a connected channel, or stop at draft if no channel is connected for the stream. Do not publish live without deciding beforehand.
4. Provider billing after the run.
5. Optional: connect Claude Code to the MCP server at `localhost:3014` and run the same brief from the terminal.

### Conversation cues

- Mitchell: would you post this as-is? What would you change?
- Budget: about 15 minutes. Exit cue: close.

## Close

- One line each: who should self-host this, and who should not.
- Links: repo, self-host docs. CTA brief, end only.
