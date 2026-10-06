---
title: "[LIVE] Stop Paying For AI. Use OpenRouter Stealth & Free Models."
slug: "zero-dollar-youtube-distiller"
source: "OpenRouter free model catalogue, OpenRouter rate-limit documentation, OpenCode 1.18.23, yt-dlp, ffmpeg"
status: "in_progress"
date: "2026-08-25"
announcement_tweet: null
thumbnail_prompt: "16:9 YouTube livestream thumbnail, 1920x1080, photoreal cinematic render, ultra sharp, soft editorial lighting. PALETTE: deep graphite black, crisp white, brushed silver, natural skin tones, restrained electric cobalt edge accents; the official acid-lime OpenRouter color appears only on the exact logo and central zero-cost symbol; no orange, amber, beige, brown, sepia, or parchment. COMPOSITION: two identity-locked hosts large chest-up and cropped by the left and right edges, each roughly 32-35% of frame, framing one centered payoff. LOGO LOCK: preserve the injected current OpenRouter lime geometric OR mark and lowercase white openrouter wordmark exactly as a flat raster asset; do not recreate, redesign, misspell, or add punctuation. CENTER ASSET: the exact OpenRouter logo floats above one huge polished circular cost dial reading $0, with a few small dark model cards fanning behind it; cards are purely graphic with no readable model names; the logo and $0 are the instant mobile-size read. HOST LEFT: preserve Vincent from the injected reference photo exactly, bald with light tan olive skin, stubble, green-hazel eyes, black shirt or hoodie, skeptical delighted expression, one palm-up presenting gesture toward the $0 dial. HOST RIGHT: preserve Mitchell from the injected reference photo exactly, dark slicked-back hair, fair skin, blue eyes, navy outer layer, surprised impressed expression, subtle pointing gesture toward the $0 dial. BACKGROUND: deep matte graphite editorial studio with very subtle routing lines and abstract model-card silhouettes receding into darkness; no readable UI and no terminal wall. CONTRAST RULE: host faces, exact OpenRouter logo, and $0 dial are large, separated, and instantly readable at mobile size. LIGHTING: soft cinematic frontal studio key light, natural skin, crisp silver edge lighting, subtle cobalt separation. TEXT: only the exact official lowercase openrouter wordmark and one large $0 symbol; no headline, slogan, model names, captions, episode number, or number badge. STYLE: premium high-contrast creator-tech editorial thumbnail, photoreal cinematic render, ultra sharp, uncluttered. NEGATIVE: no episode number, no neon scene, no red warning stamps, no generic robot faces, no dollar bills, coins, cash piles, or money rain, no fake logos, no YouTube branding, no tiny UI text, no terminal walls, no extra people, no duplicated faces, no distorted hands, no watermark."
---

## Sources — Livestream Notes

- Title: **[LIVE] Stop Paying For AI. Use OpenRouter Stealth & Free Models.**
- Build: a YouTube distiller — link in, transcript and ranked clips out — written entirely by free OpenRouter models
- Shape: a small **local web UI**, not a bare CLI. Paste a link, watch the transcript land, watch clip cards pop in as they finish encoding.
- Start: **4:00 PM**
- [YouTube livestream](https://youtube.com/live/eYGDOk2HsOg)
- **Demo machine: the Mac Studio.** All pre-show checks must be run there, not on the laptop.
- Format: live build, English only, 60–90 minutes
- Artifact: a public repository anyone can clone and run on a free API key
- Harness: **plain OpenCode 1.18.23 in the terminal.** Model set to a `:free` OpenRouter route on camera.
- Hard rule for the episode: **no paid model touches this build.** Not for planning, not for review, not for the rescue.
- Free model catalogue: https://openrouter.ai/models?max_price=0
- Free variant filter: https://openrouter.ai/models?variant=free
- Rate limits: https://openrouter.ai/docs/api-reference/limits
- **Availability is per-model and moves.** Probed this morning: `stealth/ox-alpha`, `cohere/north-mini-code:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `minimax/minimax-m3:free`, `nvidia/nemotron-3.5-lightning:free` and `openrouter/free` all answered. `z-ai/glm-5.2:free` and `poolside/laguna-s-2.1:free` returned 429 from the upstream provider. Re-probe before going live.
- Test subject: `https://www.youtube.com/watch?v=QoQjddWCnKA` — Composer 2.5 livestream, 47:20
- Privacy rule: public videos and a public repository only. Free routes are the cheapest tier of a shared service — assume prompts are retained. Nothing from Mantella, no client work, no private repository.
- Never show `.env` values, `~/.local/share/opencode/auth.json`, or the OpenRouter key on camera.

## Cold Open — Read This

> "Everybody telling you to buy a Mac Mini to run local models is solving a problem you do not have. There are twenty-one models on OpenRouter right now that cost zero dollars per token. Some of them have a million tokens of context. Some of them take video. One of them takes audio. And I have never paid for a single token on any of them. So today there is one rule: no paid model touches this build. Not for the plan, not for the review, not when it breaks and I want to cheat. A free model writes every line. And what it is building is the thing that means you never have to watch a YouTube video again — paste a link, and you watch the transcript land and the clips pop in one by one. The four moments actually worth your time, cut and ready. Including this one. I am building the tool that makes this stream optional, live, on this stream. Let's go."

## Summary

The local-model crowd says you need hardware. You do not. OpenRouter currently lists 419 models and 21 of them are free, including several with 1M context and video or audio input. This episode enforces one constraint — no paid model, at any step — and builds a YouTube distiller under it: `yt-dlp` pulls the transcript for free, a free 1M-context model reads the whole thing in one request, and `ffmpeg` cuts the clips. The model never touches a video file and never sees a frame it does not need to, which is why the whole thing runs inside a free tier. The output is a small local web page, so the thing the audience sees is clip cards appearing as each one finishes, not a terminal scrolling past. The honest segment is the asterisk: free is 20 requests a minute and 50 a day until you have bought $10 of credit once, ever, at which point it is 1,000 a day forever. The second honest segment is that free routes go down, which is why the fallback ladder is declared before the first prompt instead of improvised after the first 429.

## Talking Points — You Do Not Need The Mac Mini

### Segment Thesis

The "run it local" advice is real advice for a real problem, and it is not the problem most people asking about it actually have.

### Talking Points

- Pull the live catalogue on camera. 419 models on OpenRouter today. **21 of them are free.** Not free trials — zero per million in and zero per million out.
- Read a few off the list with their context windows so the scale lands. Two at 1M+ context with video input. One with audio input. A 550B-parameter model at 1M context. A model whose entire purpose is code.
- The hardware pitch is: spend €800–2,000, get privacy and no rate limits, accept a smaller model. That is a genuine trade and some people should take it.
- The trade nobody prices honestly: the free hosted tier gives you frontier-class context and multimodality on a machine you already own, today, for nothing.
- If your work is public — open source, your own content, side projects — the privacy argument that justifies the hardware does not apply to you.
- Clip line: **"Twenty-one free models. You are not compute-poor, you are catalogue-illiterate."**
- Transition: before anyone screenshots that and calls it free, here is what free actually costs.

### Host Notes

- Ask Mitchell to argue the other side properly: when is buying the hardware genuinely right?
- Pull up: the OpenRouter model list filtered to free, sorted by context.
- Don't pretend: free routes match paid frontier models on quality. They do not, consistently. They are good enough for a defined job, and this episode defines the job.

## Talking Points — Free Is $10, Once

### Segment Thesis

The free tier has exactly one gate, almost nobody mentions it, and it is the difference between a working build and hitting a wall at minute twenty.

### Talking Points

- The documented limits: **20 requests per minute** on free routes, for everybody.
- The daily limit is the part that matters: **50 requests per day** if you have purchased under $10 of credit in your account's lifetime. **1,000 per day** once you have crossed $10, ever.
- 50 a day is nothing. An agentic coding loop burns 50 requests before the first feature compiles. That is where people try this, fail in ten minutes, and conclude free models are useless.
- So the honest headline is not "free forever." It is **"$10 once, then free forever."** I bought credit a while back, my lifetime spend is about twelve cents, and I am on the 1,000-a-day tier.
- 1,000 requests a day is a real working budget. It is more than I use in a normal build session.
- The rate limit is also an architecture constraint, and a good one — it forces you to stop spraying requests and start batching. The design in this build is shaped by it.
- Clip line: **"Free is not free. Free is ten dollars once. Nobody tells you that and it is why you gave up."**
- Transition: the limit is requests, not tokens, so the whole design question becomes how few requests can do the job.

### Host Notes

- Pull up: the rate limits documentation page. Read the two numbers off the screen, do not paraphrase from memory.
- Confirm on camera which tier we are on before the build starts. If it is 50/day, the build changes shape live and we say so.
- Don't show: the key, the account page with billing details, or the key's spend limit.

## Talking Points — The Model Never Watches The Video

### Segment Thesis

This runs inside a free tier because the expensive work was designed out, not because the model is cheap.

### Talking Points

- Step one costs zero requests: YouTube already made the transcript. `yt-dlp` pulls the auto-captions, and the `json3` format carries **per-word millisecond timings** for free. No transcription model, no whisper, no audio processing.
- Step two is one request: the whole 47-minute transcript is roughly 15K tokens, and the free models we are using take 256K to 1M. The entire video fits in a single call with room to spare.
- Step three costs zero requests: `ffmpeg` does the cutting. The model returns timestamps, not video.
- Add it up: one video, one request. At 1,000 requests a day that is a thousand videos, for nothing, on a laptop.
- The general rule this is teaching: put the model where judgment is needed and nowhere else. Every step that is deterministic should be a tool, not a token.
- Optional stretch that inverts the whole thing: one of the free models takes **audio input** at 1M context. Feed it the audio and there is no transcript step at all. We try it if there is time.
- Clip line: **"One video, one request. The model never sees a single frame."**
- Transition: architecture is settled, so now pick the model that has to write it.

### Host Notes

- Pull up: the `json3` output with per-word timings visible, so people can see the free timing data is real.
- Ask Mitchell: where would you have been tempted to put a model that does not need one?
- Don't pretend: sentence-level accuracy from auto-captions is perfect. It mangles names and jargon. Say so.

## Talking Points — Which Free Model Can Actually Code

### Segment Thesis

Not all twenty-one are contenders; picking correctly and naming the fallback ladder before you start is most of the skill.

### Talking Points

- The shortlist and why each is on it: a code-specific model, a 550B model at 1M context, a multimodal 1M model in case the build needs eyes later, and the anonymous stealth route that is free while it is being evaluated.
- Set the model in OpenCode on camera so everyone can see the route is a `:free` one. That is the receipt for the whole episode.
- **Free routes go down.** This is the part nobody warns you about. I probed eight of them this morning and two came back 429 — and that is not my account limit, that is the upstream provider throttling a pool that thousands of people are sharing for nothing.
- Which two are down changes hour to hour. So the correct move is not "pick the best free model." It is "have a ladder and a probe."
- The cheapest insurance is `openrouter/free` — an auto-router that spreads across free routes and fails over for you. When a specific route is throttled, that one usually still answers.
- The fallback ladder is declared **before** the first prompt, not after it fails. First choice, second choice, third choice, and the trigger condition for switching.
- The trigger for switching is not "the output is bad." It is specific: a 429, two consecutive failures on the same step, or a loop with no file written.
- What free models actually cost you: more turns, weaker instruction-following on long chains, and worse recovery when they go wrong. You pay in patience instead of money.
- The mitigation is scope, not prompting tricks. Small steps, one file at a time, verify after each. That is also just how you should drive a paid model.
- Clip line: **"Free models do not have a price. They have a queue, and you are in it with everybody else."**
- Second clip line: **"You do not pay for free models with money. You pay in turns."**
- Transition: rules set, model picked, ladder declared — it either builds or we watch it fail on free tokens.

### Host Notes

- Pull up: the probe output showing which routes answered and which 429'd. Live availability data is the whole point of this segment.
- Say the model id out loud when you set it. Chat will hold us to it.
- Ask Mitchell: at what point does waiting in a free queue cost more than the API bill would have?
- Don't pretend: we benchmarked all 21. We probed availability and shortlisted on context, modality, and stated purpose.

## Talking Points — The Tool That Makes This Stream Optional

### Segment Thesis

The honest test of a distiller is running it on content the audience can check you on, and the only content that qualifies is ours.

### Talking Points

- The product in one sentence: paste a link, get back what the video actually said and the handful of moments worth watching.
- Not a summary. Summaries are the lazy version and everybody has one. The output is a brief plus **timestamped clips you can jump to or play**, because the moment matters more than the paraphrase.
- Show it as a page, not a terminal. Paste the link, the transcript lands, then clip cards pop in one at a time as each finishes encoding. Watching the thing work is half the product.
- Run it on our own Composer 2.5 stream — 47 minutes — and read out what it says the video is about.
- Then the uncomfortable part: run it on a stream where I know the good moments, and see whether it found them or invented them.
- Say the obvious joke before chat does: this is a YouTube video about not watching YouTube videos, and I am building the tool that means you did not need to be here.
- The real use case is not skipping content you like. It is the twelve tabs of forty-minute conference talks you were never going to open.
- Clip line: **"I am building the thing that makes this stream optional, live, on this stream."**
- Transition: ship it public so anyone with a free key can run it tonight.

### Host Notes

- Ask Mitchell to pick a video live from chat if the first run works. Unrehearsed input is the strongest proof we can give.
- Pull up: the distiller output next to the actual video timeline.
- Don't pretend: it will not replace watching something you care about. Say what it is for.

## Closing Take

There are twenty-one models on OpenRouter that cost nothing, and the only real gate is ten dollars once. No hardware, no local rig, no monthly bill. We put that under a hard rule tonight — no paid model at any step — and built a working tool anyway, because the trick was never the model. The trick was refusing to spend a request on anything a transcript or ffmpeg could do for free. The repository is public, it runs on a free key, and you can clone it before this stream ends. If you have been putting off building something because you thought the AI bill was the blocker, that was never the blocker. If the blocker is that you do not know where to put the model and where to put a tool, that is a conversation worth having — reach out.

## Operator Card

### Live Build Order

- **1 · Vincent:** show the 21 free models, the rate-limit page, and confirm our daily tier on camera.
- **2 · Vincent:** set OpenCode to a `:free` route on screen. Declare the fallback ladder out loud.
- **3 · Free model:** plan the distiller. Read-only.
- **4 · Free model:** build step 1 — `yt-dlp` transcript extraction with word timings. Zero requests.
- **5 · Free model:** build step 2 — the single-request distill call returning brief plus ranked moments.
- **6 · Free model:** build step 3 — `ffmpeg` clip cutting from returned timestamps. Zero requests.
- **7 · Free model:** build step 4 — the local web UI. Paste box, live progress, clip cards.
- **8 · Free model:** review its own work. **Still no paid model.**
- **9 · Vincent:** run it on the Composer 2.5 stream, then on a video from chat.
- **10 · Free model:** stretch — burned subtitles, or the audio-input path with no transcript step.
- **11 · Everyone:** no keys, no private repositories, no client work on camera.

### Live Progress

- [ ] Free catalogue and rate limits shown
- [ ] Daily tier confirmed on camera
- [ ] Availability probe run on camera
- [ ] `:free` route set in OpenCode, ladder declared
- [ ] Plan done
- [ ] Transcript extraction works
- [ ] Single-request distill returns valid JSON
- [ ] Clips cut and playable
- [ ] Web UI works, clip cards pop in
- [ ] Ran on a video from chat
- [ ] Repository public
- [ ] Stretch attempted

## Pre-show Checklist

### Blocking — Confirm The Daily Tier

The whole episode's budget depends on this. Free routes are 20 requests/minute for everyone, but the daily cap is 50 if lifetime credit purchased is under $10 and 1,000 at or above it. Confirm which side we are on **before** the stream, not during it.

```bash
curl -s -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/key
```

`is_free_tier: false` means credit has been purchased on the account. If the daily allowance turns out to be 50, the build shape changes and we say so on air rather than quietly failing.

### Blocking — Probe Which Free Routes Are Actually Up

Free routes are a shared pool and the upstream providers throttle them without warning. A 429 here is **not** the account limit — it is everyone else using the same free pool. Which routes are down changes hour to hour, so run this in the last 30 minutes before going live and set the ladder from the result, not from this document.

```bash
for M in stealth/ox-alpha cohere/north-mini-code:free nvidia/nemotron-3-ultra-550b-a55b:free minimax/minimax-m3:free nvidia/nemotron-3.5-lightning:free openrouter/free z-ai/glm-5.2:free; do
  C=$(curl -s -o /dev/null -w "%{http_code}" -m 45 https://openrouter.ai/api/v1/chat/completions \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"$M\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}")
  echo "$C  $M"
done
```

Eight requests, one token each. Run it on camera — the probe output **is** the segment.

### Resolved — ffmpeg With Subtitle Support

Stock homebrew ffmpeg has no `libass`, no `freetype`, no `drawtext`. **`ffmpeg-full` 9.0.1_1 is installed on the Studio.** The trap: it is **keg-only**, so it does not replace the stock `ffmpeg` symlink. Without the PATH line, `ffmpeg` still resolves to the build with no subtitle filters and the burn step fails silently.

```bash
brew install ffmpeg-full
echo 'export PATH="/opt/homebrew/opt/ffmpeg-full/bin:$PATH"' >> ~/.zshrc
```

```bash
ffmpeg -hide_banner -filters | grep -E "subtitles|drawtext"
```

Verified on the Studio: `which ffmpeg` → `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`, all three filters present, and both a `drawtext` clip and a `{\k}` karaoke `.ass` clip encoded end-to-end through `h264_videotoolbox` at 1080x1920. The subtitle stretch is no longer a stretch — the render chain is proven.

### Demo Machine — The Mac Studio

**The demo runs on the Mac Studio, not the laptop.** Everything below was probed on the Studio itself. Do not trust a laptop check for a Studio demo.

**Green on the Studio:**

| Tool | Version |
|---|---|
| `bun` | 1.3.14 |
| `yt-dlp` | 2026.08.19 |
| `ffmpeg` | `ffmpeg-full` 9.0.1_1 on PATH — `libass`, `drawtext`, `h264_videotoolbox` |
| `node` | v26.7.0 |
| `gh` | 2.98.0 |
| `opencode` | 1.18.23 at `~/.opencode/bin/opencode` |

- OpenRouter authenticated on the Studio, **17 free routes** visible in `opencode models`, including `minimax/minimax-m3:free` — every model on both ladders is present
- `OPENROUTER_API_KEY` exported in the demo shell, **73 chars**, and confirmed authenticating over HTTP (`200` on `stealth/ox-alpha` and `openrouter/free`)
- Account confirmed from the Studio: `is_free_tier: false`, lifetime usage ~$0.12 → **1,000 requests/day tier**
- 218 GB free disk — video downloads are not a concern

**All three blocking items are cleared.** Recorded here because each one fails in a way that looks like something else on camera:

1. **`OPENROUTER_API_KEY` was not exported** — it was set in OpenCode's own auth store, not the shell. That is the nastiest of the three: the agent authenticates fine and writes working code, while the tool it just wrote dies on a missing key. Now sourced from `~/.zshrc`. Verify before going live, and never echo the value on camera:

   ```bash
   [ -n "$OPENROUTER_API_KEY" ] && echo "set (${#OPENROUTER_API_KEY} chars)" || echo "NOT SET"
   ```

2. **`ffmpeg` had no libass** — fixed with `ffmpeg-full` plus the PATH line above. Keg-only, so the install alone does nothing.

3. **`opencode` was behind** — now 1.18.23, matching the laptop, and `minimax/minimax-m3:free` is back in the catalogue.

### Verified Green — Both Machines

- OpenRouter lists **419 models, 21 free**
- `json3` auto-captions confirmed carrying per-word millisecond timings — **no whisper needed**
- `yt-dlp 2026.08.19` working against our own channel
- Same key, probed from both machines minutes apart, returned **different** availability — `poolside/laguna-s-2.1:free` was 429 on the laptop and 200 from the Studio. Transient shared-pool throttling, confirmed twice. **This is the segment. Show both results side by side.**

### Free Model Shortlist — Set On Camera

| Route | Context | Input | Probed this morning | Job |
|---|---|---|---|---|
| `stealth/ox-alpha` | 1,048,576 | text+image+video | **up** | **Primary — writes the code.** Free while under evaluation; expires without notice. |
| `cohere/north-mini-code:free` | 256,000 | text | **up** | Fallback 1 — purpose-built code model |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 1,000,000 | text | **up** | Fallback 2 — 550B, 1M context |
| `openrouter/free` | 200,000 | text+image | **up** | Fallback 3 — auto-router, fails over across free routes on its own |
| `minimax/minimax-m3:free` | 1,048,576 | text+image+video | **up** | **Runtime distiller — whole transcript, one call** |
| `nvidia/nemotron-3.5-lightning:free` | 1,000,000 | text | **up** | Distiller fallback |
| `z-ai/glm-5.2:free` | 256,000 | text | **429** | Was the pick until it throttled. Re-probe. |
| `poolside/laguna-s-2.1:free` | 262,144 | text | **429** | Re-probe. |
| `thinkingmachines/inkling:free` | 1,048,576 | text+image+audio | not probed | Stretch — audio in, no transcript step |
| `google/gemma-4-31b-it:free` | 262,144 | text+image+video | not probed | Vision fallback |

### Fallback Ladder — Declare Before The First Prompt

**Coding ladder:**

1. `stealth/ox-alpha`
2. `cohere/north-mini-code:free`
3. `nvidia/nemotron-3-ultra-550b-a55b:free`
4. `openrouter/free` — the "just keep going" option, it routes around throttled pools for you

**Runtime distiller ladder:** `minimax/minimax-m3:free` → `nvidia/nemotron-3.5-lightning:free` → `openrouter/free`

**Switch trigger:** a 429 from the provider, two consecutive failures on the same step, or a loop of 90 seconds with no file written. Not "the output looks weak."

**On Ox Alpha:** it is anonymous and free because someone is evaluating it on us. It can be withdrawn mid-stream with no warning. That is exactly why the ladder exists, and it is a good on-air moment if it happens — say what it means rather than quietly switching.

### Secrets — Never Paste Values On Stream

- `OPENROUTER_API_KEY`: needed as an environment variable, separate from OpenCode's stored auth. Say: "The OpenRouter key is already exported."
- Never open `~/.local/share/opencode/auth.json` on camera.

```bash
[ -n "$OPENROUTER_API_KEY" ] && echo "OPENROUTER_API_KEY set (${#OPENROUTER_API_KEY} chars)" || echo "NOT SET"
```

### Hard Privacy Rule

- Public videos and a public repository only.
- Free routes are the cheapest tier of a shared service. Assume prompts are retained.
- Nothing from Mantella, no client repository, no private path on camera.

### Open Before The Stream

- Terminal with OpenCode ready in an empty directory for the new repository.
- The OpenRouter free-model list, filtered and sorted by context.
- The OpenRouter rate-limits documentation page.
- The Composer 2.5 stream in a tab.
- A second video ready in case chat does not supply one.
- This producer page on the second screen.

## Definition Of Done

### Minimum Viable Build

- A new **public** repository, first commit made on stream.
- **No paid model used at any step.** Planning, building, and review all on `:free` routes.
- `yt-dlp` transcript extraction with word timings, costing zero model requests.
- The full transcript distilled in **exactly one** model request.
- Output is a written brief plus ranked moments with start and end timestamps and a reason each.
- `ffmpeg` cuts the ranked moments into playable files, costing zero model requests.
- A **local web UI**: paste a URL, live progress for each stage, and clip cards that appear as each clip finishes encoding, each playable inline.
- Response is validated before use; malformed output fails cleanly with a readable error.
- Runs end to end from a single command with only `OPENROUTER_API_KEY` set.
- The CLI still works standalone. The UI is a shell over it, not a rewrite — if the UI breaks live, the engine still demos.
- README states the $10-once gate plainly, because that is the thing that stops people.
- All user-facing strings English.

### Stretch

- Burned karaoke subtitles from `json3` word timings via `ffmpeg-full`.
- 9:16 vertical static crop. No faked face tracking.
- The audio-input path: skip the transcript step entirely using a free audio-capable route.
- Request counter printed at the end of every run, so the free budget stays visible.

## Architecture Reference

### The Request Budget Is The Architecture

| Step | Cost | Tool |
|---|---|---|
| Fetch video and captions | 0 requests | `yt-dlp` |
| Parse `json3` into word-timed text | 0 requests | local |
| Distill to brief plus ranked moments | **1 request** | free OpenRouter route |
| Cut clips at returned timestamps | 0 requests | `ffmpeg` |
| Burn subtitles (stretch) | 0 requests | `ffmpeg-full` |
| Serve the UI and stream progress | 0 requests | `Bun.serve` + SSE |

One video costs one request. At 1,000 per day that is 1,000 videos.

### Suggested Layout

```text
src/fetch.ts        yt-dlp wrapper — video + json3 captions
src/transcript.ts   json3 -> word-timed transcript
src/distill.ts      single OpenRouter request, schema-validated response
src/clips.ts        ffmpeg cutting from timestamps
src/pipeline.ts     the engine — orchestrates the four steps, emits progress events
src/render.ts       stretch — .ass karaoke + vertical crop
src/cli.ts          one command, one link (thin wrapper over pipeline.ts)
src/server.ts       Bun.serve — POST a URL, SSE progress, serve clip files
public/index.html   the whole UI, one file, no framework, no build step
README.md           setup, the $10-once gate, the request budget
```

### Why A UI And Not Just A CLI

- The interesting moment is clips appearing. A terminal cannot show that; a page can.
- It is not extra model requests. The UI is deterministic front-end code over the same pipeline.
- It is one HTML file and one `Bun.serve` handler. No React, no bundler, no build step — that is the point, and it keeps the live build inside the time budget.
- `pipeline.ts` emits progress events; the CLI prints them, the server forwards them over SSE. Same engine, two faces.

### Later, Not Tonight

The ranking logic here can be lifted into the genfeed `clip-analyze` pipeline later. Do not build inside genfeed tonight — the zero-cost story only reads clearly in a standalone repository someone can clone in one command.

## 60–90 Minute Run Of Show

- **0 · Intro · Vincent · 4 min:** 21 free models, no hardware needed, the one rule.
- **1 · The $10 asterisk · Vincent · 5 min:** rate limits, confirm our tier live.
- **2 · The probe · Vincent · 4 min:** which free routes are up right now, live on camera.
- **3 · Architecture · Vincent and Mitchell · 5 min:** why this fits in one request.
- **4 · Model pick · Vincent · 3 min:** set the `:free` route on camera, declare both ladders.
- **5 · Plan · free model · 8 min.**
- **6 · Build transcript step · free model · 12 min.**
- **7 · Build distill step · free model · 15 min.**
- **8 · Build clip step · free model · 10 min.**
- **9 · Build the UI · free model · 12 min.**
- **10 · Run it · Vincent · 8 min:** our stream in the UI, then a video from chat.
- **11 · Ship it · Vincent · 3 min:** repository public, link in chat.
- **12 · Stretch · free model · remaining:** subtitles or the audio-input path.

If the clock is tight, cut the stretch first and the chat-supplied run second. **Never cut the UI** — it is the only segment that produces a watchable clip.

## Copy Paste Prompt — P1 Plan The Distiller

```text
READ-ONLY. Do not write code yet.

We are building a small standalone TypeScript tool called a YouTube distiller. Paste a YouTube link and you get back what the video actually said, plus the handful of moments worth watching, cut and playable.

It has TWO faces over ONE engine:
- src/pipeline.ts is the engine. It runs the four steps below and emits progress events as it goes.
- src/cli.ts prints those events to the terminal.
- src/server.ts (Bun.serve) forwards those events to a browser over SSE and serves the finished clips.
The UI is a single static HTML file. No React, no bundler, no build step.

HARD CONSTRAINT that shapes the entire design:
This runs on OpenRouter's FREE tier. The limit is 20 requests per minute and 1,000 per day. The limit is on REQUESTS, not tokens. Therefore:
- Processing one video must cost EXACTLY ONE model request.
- Every deterministic step must be a local tool, never a model call.

Pipeline:
1) yt-dlp downloads the video and the English auto-captions in json3 format. ZERO model requests.
   json3 gives per-word millisecond timings: absolute word time = event.tStartMs + segment.tOffsetMs.
2) Parse json3 into a word-timed transcript locally. ZERO model requests.
3) ONE request to an OpenRouter free route with the ENTIRE transcript. A 47-minute video is roughly 15K tokens and the model has 1M context, so it fits in one call. Ask for:
   - a short written brief of what the video actually covers
   - 3-5 ranked moments, each with startSeconds, endSeconds, a hook title, and a reason
   - strict JSON, validated before use
4) ffmpeg cuts the ranked moments into playable files. ZERO model requests.

Runtime model: minimax/minimax-m3:free
If it returns 429, fall back to nvidia/nemotron-3.5-lightning:free, then openrouter/free. Free routes are a shared pool and get throttled by the upstream provider. Make the model id a single configurable constant so switching it is a one-line change, not a search-and-replace.
Key: process.env.OPENROUTER_API_KEY. Never log it, never print it, never write it to disk.

Rules:
- Bun, not npm. bun.lock, never package-lock.json.
- Strict TypeScript. No any - use unknown plus type guards. No @ts-ignore without an explanatory comment.
- No heavyweight dependencies. yt-dlp and ffmpeg are shelled out to.
- English only.

Produce a plan with:
A) File layout and what each file owns.
B) The exact json3 parsing approach.
C) The single request: message shape, and the JSON schema you will demand back.
D) Validation and what happens on malformed output.
E) Failure handling: missing key, yt-dlp failure, no captions available, rate limited (429), model timeout.
F) A request counter so the user always sees how much of the free budget a run used.
G) The progress event shape that pipeline.ts emits, and how both the CLI and the SSE endpoint consume it.
H) MVP cut line for a 90-minute live build, and what is explicitly deferred. Assume the UI takes about 12 minutes and must not be cut.

Output structured markdown. No code yet. End with a numbered build checklist.
```

## Copy Paste Prompt — P2 Build The Transcript Step

```text
Build step 1 only. Do not build the distill step yet.

This step must cost ZERO model requests.

1) src/fetch.ts - shell out to yt-dlp:
   - download video capped at 1080p
   - download English auto-captions in json3 format
   - clear errors if the video is private, age-gated, or has no captions

2) src/transcript.ts - parse json3 into a word-timed transcript:
   - absolute word time = event.tStartMs + segment.tOffsetMs
   - skip events with no segs and segments that are only whitespace
   - expose both a plain-text transcript and the word-timed array

3) A small test with a fixture json3 file. Assert word timings are absolute and monotonically non-decreasing.

Strict TypeScript, no any, Bun. Print the files changed and the command to run this step alone against a real URL.

Stop after this step.
```

## Copy Paste Prompt — P3 Build The Single-Request Distill

```text
Build step 2. This is the ONLY step that calls a model, and it must be exactly ONE request per video.

src/distill.ts:
1) Take the full transcript from step 1.
2) Send ONE request to OpenRouter:
   - model: minimax/minimax-m3:free
   - key from process.env.OPENROUTER_API_KEY
   - the entire transcript in the request; do not chunk, do not loop, do not summarize in passes
3) Demand strict JSON back:
   {
     "brief": "string, what the video actually covers",
     "moments": [
       { "startSeconds": number, "endSeconds": number, "hookTitle": "string", "reason": "string" }
     ]
   }
4) Validate the response against that shape before returning it. On malformed output, fail with a readable error that includes what was wrong - never a raw dump of the whole response.

Failure handling, all required:
- missing OPENROUTER_API_KEY: fail fast with a clear message, never a stack trace containing config
- HTTP 429: say plainly that the free daily or per-minute limit was hit, and print the limit numbers
- timeout: fail cleanly, do not retry more than once
- never log the key or the full transcript

Print a request counter at the end: how many model requests this run used. It must say 1.

Strict TypeScript, no any, Bun. Print files changed and the command to run the full pipeline so far.
```

## Copy Paste Prompt — P4 Build The Clip Cutter

```text
Build step 3. ZERO model requests.

src/clips.ts:
1) Take the ranked moments from step 2.
2) Cut each one from the downloaded video with ffmpeg, to half-second precision.
3) Name output files by rank and a slugified hook title.
4) Default to native aspect ratio. Do not crop yet.
5) Encode with h264_videotoolbox.

src/pipeline.ts:
- orchestrates fetch -> transcript -> distill -> clips
- emits a typed progress event at each stage boundary and after each individual clip finishes encoding
- event shape: { stage, status, message, clip? } where clip carries rank, hookTitle, startSeconds, endSeconds, filePath
- takes an onProgress callback; it does no printing of its own

src/cli.ts:
- one command taking one YouTube URL and an optional clip count (default 4)
- calls pipeline.ts and prints each progress event as it arrives
- prints the brief, the ranked moments with timestamps, the output paths, and the request count

Print the exact ffmpeg command before running it so it is visible on stream.

Strict TypeScript, no any, Bun. Then run the whole thing end to end on:
https://www.youtube.com/watch?v=QoQjddWCnKA
```

## Copy Paste Prompt — P5 Build The Web UI

```text
Build step 4. ZERO model requests. This is presentation only - do not touch the pipeline logic.

src/server.ts using Bun.serve:
- GET  /            -> serve public/index.html
- POST /api/distill -> body { url, clipCount }. Starts a run. Returns a runId immediately, does not block.
- GET  /api/events/:runId -> Server-Sent Events. Forward every pipeline progress event as it arrives.
- GET  /clips/:file -> serve a finished clip file with the right content type and range support so it can play inline.

public/index.html - ONE file, no framework, no bundler, no build step, no CDN:
- a URL input and a Distill button
- a stage list that lights up as events arrive: Fetching -> Transcript -> Distilling -> Cutting
- the brief rendered as text as soon as the distill event lands
- a clip grid BELOW it. Each clip card appears the moment its clip finishes encoding, one at a time, not all at the end.
- each card shows rank, hook title, the timestamp range, the reason, and an inline <video> playing the actual cut file
- a request counter in the corner showing how many model requests this run used

Styling: dark background, one accent colour #ff2d20, system font stack. Cards fade in as they arrive. Keep it under 200 lines of CSS. Do not make it fancy - make the clip cards big and the arrival obvious, because this is being watched on a stream.

Constraints:
- The UI is a shell over the existing pipeline. src/cli.ts must still work unchanged after this step.
- Never send OPENROUTER_API_KEY to the browser. The key stays server-side. Verify this explicitly.
- No outbound requests from the page. No fonts, no analytics, no CDN scripts.
- Strict TypeScript on the server, no any, Bun.

Print the command to start it and the localhost URL.
```

## Copy Paste Prompt — P6 Self Review

```text
Review your own uncommitted work. You are still on a free route - no paid model is reviewing this.

Check:
1) Is OPENROUTER_API_KEY ever logged, printed, serialized, written to disk, or included in an error message or stack trace?
2) Does processing one video cost EXACTLY ONE model request? Trace every network call and prove it. If there is a retry path, does it double-count?
3) Any outbound call to a host other than openrouter.ai and YouTube via yt-dlp?
4) Is the model response validated before use, or is it trusted?
5) Failure handling present for: missing key, no captions, 429, timeout, malformed JSON?
6) Strict TypeScript honoured - no any, no unexplained @ts-ignore?
7) Bun only - is there a package-lock.json or yarn.lock anywhere? There must not be.
8) Does the README state the $10-once free-tier gate plainly?
9) Does the browser ever receive OPENROUTER_API_KEY, in any response body, header, inline script, or source map? Trace it and prove it does not.
10) Does the /clips/:file route allow path traversal outside the output directory? Check for ../ handling.
11) Does src/cli.ts still work after the UI was added?

Output:
- Summary, 2-3 sentences
- Blocking issues
- Non-blocking improvements
- Explicit GO / NO-GO for making the repository public

Short prioritized fix list. Do not rewrite the tool.
```

## Copy Paste Prompt — P7 Stretch, Audio Input With No Transcript

```text
Stretch only. Attempt this only if the MVP runs end to end and there is time left.

Invert the pipeline: skip the transcript step entirely.

1) Extract the audio track from the downloaded video with ffmpeg.
2) Send the audio directly to a free audio-capable route: thinkingmachines/inkling:free (1M context, text+image+audio input).
3) Ask for the same JSON shape as the distill step: brief plus ranked moments with timestamps.
4) Compare against the transcript-based result on the same video and print both side by side.

Still exactly one model request. Still a free route. Print the request count.

If the audio payload is too large, say so plainly and stop rather than chunking into multiple requests - chunking breaks the one-request rule the whole build is built on.
```

## Live Test Script

### A · Show The Receipts First

- Free model list on screen — `?variant=free`, 21 of them.
- Rate-limit page on screen, both numbers read out loud.
- Confirm our daily tier with the key endpoint, key masked.
- Run the availability probe. Read out which routes are up and which are 429.
- Set the `:free` route in OpenCode on camera.

### B · Run It On Our Own Stream — In The UI

```bash
bun run src/server.ts
```

- Open the page. Paste the Composer 2.5 URL. Hit Distill.
- **Stop talking and let it run.** The stages lighting up and the clip cards popping in is the shot. Do not narrate over it.
- Read the brief out loud once it lands. Ask Mitchell whether that is actually what the video was about.
- Play the top clip inline in the page.
- Point at the request counter. It says 1.

### B2 · Prove The Engine Is Real

```bash
bun run src/cli.ts "https://www.youtube.com/watch?v=QoQjddWCnKA" --clips 4
```

- Same engine, no UI. Shows the page is a shell, not the product.

### C · Run It On A Video From Chat

- Take a link from chat, unrehearsed.
- Paste it into the UI. Same run, new URL.
- This is the proof that survives editing, so do not skip it if there is time.

### D · Ship It

- Make the repository public on stream.
- Drop the clone command in chat.

## On-stream Recovery

- **Hit the 50/day limit mid-build:** the tier check failed us. Say it plainly, show the 429, and explain the $10-once gate — it is a better segment than a clean build. Continue with the remaining budget on smaller steps.
- **20 requests/minute exceeded:** we are spraying requests. Slow down, batch, and point out that the constraint is doing its job.
- **The route 429s mid-build:** this is the expected failure, not a disaster. Show the error, say plainly that it is the upstream provider throttling a shared free pool and not our account limit, and step down the ladder on camera. If two in a row are throttled, switch to `openrouter/free` and explain that it routes around dead pools for you.
- **Ox Alpha disappears mid-stream:** it is an anonymous evaluation route and it can be pulled with no notice. Say what that means — you were the free eval traffic — and step to `cohere/north-mini-code:free`. Good segment, not a failure.
- **The free model loops with no file written:** 90-second rule. Name it, stop it, move to the next model in the ladder on camera.
- **The free model produces prose instead of JSON:** show the validation catching it. That is the failure handling working. Tighten the prompt, do not switch models yet.
- **All three code models fail on the same step:** the step is too big. Split it, do not blame the tier. Say that out loud.
- **No captions on the chat-supplied video:** expected failure path. Show the clear error, then pick another link.
- **yt-dlp blocked:** local transcripts already exist in `apps/app/data/transcripts/`. Fall back to a local file and keep going.
- **Tempted to reach for a paid model:** do not. The rule is the episode. Failing on free tokens is the honest result and better content than quietly winning on paid ones.
- **The UI is not done and time is running out:** ship the CLI, then build the UI as the stretch instead of subtitles. The page is the clip-worthy moment, so it outranks every other stretch item.
- **The tool says the key is missing but OpenCode works fine:** classic Studio trap. OpenCode reads its own stored auth; the tool reads `OPENROUTER_API_KEY` from the environment. Export it and re-run. Do not debug the tool.
- **SSE does not connect:** do not debug transport live. Poll a status endpoint every second instead. The audience cannot tell the difference and it costs two minutes, not fifteen.
- **A private path appears on camera:** stop, close it, move on.

## Success Criteria

### Must Have

- [ ] The 21 free models and both rate-limit numbers were shown on screen.
- [ ] Our daily tier was confirmed live before the build.
- [ ] The availability probe was run on camera and the results read out.
- [ ] A `:free` route was set in OpenCode on camera and the ladder declared out loud.
- [ ] **No paid model was used at any step, including the review.**
- [ ] Transcript extraction ran at zero model requests.
- [ ] One video was processed in exactly one model request.
- [ ] Clips were cut and at least one played on stream.
- [ ] The web UI ran and clip cards appeared one at a time on camera.
- [ ] The CLI still worked after the UI was added.
- [ ] It ran on a video supplied by chat.
- [ ] The repository is public and the clone command was shared.
- [ ] No key, no private repository, and no client work appeared on camera.

### Stretch

- [ ] Burned karaoke subtitles from free word timings.
- [ ] The audio-input path ran with no transcript step.
- [ ] Request counter printed on every run.

## Tweets — Paste Live

> "There are 21 models on OpenRouter that cost zero dollars per token. Some have a million tokens of context. You do not need to buy a Mac Mini to use AI. Building live, right now, with a hard rule: no paid model touches this."

> "Free is not free. Free is $10 once. Under $10 lifetime credit you get 50 requests a day, which is why you tried free models, hit a wall in ten minutes, and gave up. Over $10 it is 1,000 a day, forever."

> "One video. One request. The model never sees a single frame. yt-dlp does the transcript for free, ffmpeg does the cutting for free, and the model only does the part that needs judgment. That is the whole trick."

> "Probed 8 free OpenRouter routes this morning. 6 up, 2 throttled. Free models do not have a price, they have a queue, and you are in it with everyone else. Bring a fallback ladder or do not bother."

> "I am building the tool that means you never have to watch a YouTube video again. Live. On a YouTube video. Which you are currently watching. Think about that."
