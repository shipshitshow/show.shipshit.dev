---
title: "Stop Planning With Markdown. HTML Is Better."
slug: "html-new-markdown"
source: "Thariq Shihipar (Anthropic), Karpathy, Addy Osmani, Simon Willison"
status: "in_progress"
date: "2026-05-12"
thumbnail_prompt: null
---

## Talking Points — Livestream Notes

### Segment Thesis

Okay, so this segment is about Livestream Notes.

### Talking Points

- Title: **[LIVE] Stop Planning With Markdown. HTML Is Better.**
- [YouTube livestream](https://youtube.com/live/vI0VlQ5lULo)
- Format: talk + live build
- Build: GitHub Repo Roaster — paste any public repo URL, Claude reads it, outputs brutal HTML roast report
- Key moment: side-by-side markdown blob vs opening HTML in browser live

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Cold Open — Read This

> "An Anthropic engineer posted something this week that broke my brain."

> "He said: stop using markdown for Claude output. Use HTML instead."

> "I've been using markdown for everything. Every plan. Every code review. Every spec. Three years of markdown files."

> "So I tested it. He was right."

> "Today we're going to prove it live. We're building a tool that roasts your GitHub repos — and every single plan, spec, and output we generate will be HTML. No markdown."

> "Submit your repos in chat. Nothing will be safe."

## Sources — Pull These Up

**Thariq Shihipar** (Claude Code engineering lead, Anthropic)
- Tweet: https://x.com/trq212/status/2052811606032269638
- > *"HTML is the new markdown. I've stopped writing markdown files for almost everything and switched to using Claude Code to generate HTML for me. This is why."*
- 20 live examples: https://thariqs.github.io/html-effectiveness/
- Referenced on Simon Willison: https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/

**Karpathy cosign**
- https://x.com/karpathy/status/2053872850101285137
- > *"This works really well btw, at the end of your query ask your LLM to 'structure your response as HTML', then view the generated file in your browser. I've also had some success asking the LLM to present its output as slideshows, etc."*

**Addy Osmani** (Google Chrome)
- https://x.com/addyosmani/status/2052998409213358255
- > *"Move from Markdown to HTML and give AI a richer canvas to communicate output humans will actually read. Think plans, specs even throwaway editors."*

**Matt Pocock**
- https://x.com/mattpocockuk/status/2053065993241477227
- > *"This is super neat and I'll be trying this immediately"*

## Sources — YouTube Reactions — Pull Up

- [RoboNuggets — "Is HTML the New Markdown?" (4.8K views, May 11)](https://www.youtube.com/watch?v=BZzmBRYC_4s) — 4 levels of HTML usage with Claude Code, good visual reference
- [Deepify AI — "Is HTML the new markdown for AI output?" (1K views, May 10)](https://www.youtube.com/watch?v=IOpAJPb9Wqo)
- [AI Evening News — "Stop Asking Claude Code for Markdown" (May 10)](https://www.youtube.com/watch?v=b6QLKlABj-U)

## Talking Points — The History (5 min)

### Segment Thesis

Okay, so this segment is about The History (5 min).

### Talking Points

- Markdown became default AI output format during GPT-4 era — tiny context windows, every token counted
- Made sense then. 8K context. Minimize tokens. Markdown was efficient.
- Context windows are now 1 million tokens. Agents are powerful. Markdown is a bottleneck.
- Nobody updated the default. Everyone kept generating markdown blobs.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Why HTML Wins

### Segment Thesis

Okay, so this segment is about Why HTML Wins.

### Talking Points

- **Information density** — HTML packs tables, SVG, CSS, JavaScript, images, interactions into one file
- **Readability** — past 100 lines, markdown is effectively unreadable. HTML stays navigable.
- **Shareability** — HTML file = open in browser, share a link. Markdown = needs a renderer.
- **Two-way interaction** — HTML supports sliders, toggles, copy buttons, editors that pipe back to the agent
- **Joy factor** — reading well-crafted HTML is a different experience. Markdown brackets are noise.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Key Quote

### Segment Thesis

Okay, so this segment is about Key Quote.

### Talking Points

> *"There is almost no set of information that Claude can read that you cannot fairly efficiently represent with HTML. This makes it a highly efficient way for the model to communicate in-depth information to you and for you to review."*
> — Thariq Shihipar, Anthropic

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — The Prompt — Show Live

### Segment Thesis

Okay, so this segment is about The Prompt — Show Live.

### Talking Points

> Output HTML, neatly styled and using capabilities of HTML and CSS and JavaScript to make the explanation rich and interactive and as clear as possible.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Thariq's 20 Examples — Show These

### Segment Thesis

Okay, so this segment is about Thariq's 20 Examples — Show These.

### Talking Points

Live at https://thariqs.github.io/html-effectiveness/ — pull up the most impressive:
- `03-code-review-pr.html` — annotated PR diff, color-coded by severity
- `13-flowchart-diagram.html` — interactive deploy pipeline
- `09-slide-deck.html` — keyboard-navigable presentation
- `18-editor-triage-board.html` — drag-and-drop ticket organizer
- `15-research-concept-explainer.html` — interactive concept teaching with live ring

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — The Live Build — GitHub Repo Roaster

### Segment Thesis

Okay, so this segment is about The Live Build — GitHub Repo Roaster.

### Talking Points

- Paste any public GitHub repo URL
- Claude reads the code
- Outputs brutal HTML roast report with: shame score (0–100), hall of shame, color-coded crime categories, "What were they thinking?" section
- The product IS the HTML output — no separate frontend needed
- Chat submits repos live = infinite content

**Step 1 — Show the old way (2 min)**
- Ask Claude to plan the app in markdown. Show the blob. Read it out. Point out how bad it is to navigate.

**Step 2 — Same prompt, HTML output (2 min)**
- Re-prompt with HTML instruction. Open the file in browser. Let the audience react.

**Step 3 — Build the roaster (15 min)**
- Use HTML output for every plan step. Claude Code builds the tool. Show HTML specs, HTML architecture docs, HTML progress reports as it builds.

**Step 4 — First roast (live)**
- Start with a famous repo: `left-pad` (4 lines of code, broke the internet) or `is-odd` (npm package, 500M downloads)

**Step 5 — Open chat**
- Take 3–5 submissions from chat. Roast live.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — The Build Prompt

### Segment Thesis

Okay, so this segment is about The Build Prompt.

### Talking Points

> Build a GitHub repo roaster. Given a public GitHub repo URL: fetch the repo structure and key files using the GitHub API, analyze the code for naming crimes, architectural disasters, copy-paste evidence, dead code, security issues, unnecessary complexity, then output a single self-contained HTML file with a shame score (0–100), hall of shame (worst 5 offenders with code snippets), color-coded crime categories, "What were they thinking?" section with specific quotes from the code, and a shareable styled report that opens in any browser. Output your implementation plan as HTML first, then build it.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Closing Take

> "Every plan we made today was HTML. Every spec. Every review. Open in browser, readable immediately, shareable instantly."

> "Markdown made sense when tokens were expensive. Tokens aren't expensive anymore."

> "The format was wrong. The tool was right all along."

> "Submit your repos in chat."

## Tweets — Paste Live

> Anthropic's Claude Code engineer said stop using markdown for AI output. Use HTML. Karpathy agreed. We're testing it live today — building a GitHub repo roaster where every plan, spec and output is HTML. Submit your repos in chat.

> Side by side: Claude markdown plan = wall of brackets nobody wants to read. Claude HTML plan = opens in browser, styled, navigable, shareable. Same prompt. Completely different experience.

> [repo name] just got roasted by Claude. HTML report. Shame score: [X]/100. Share this.

## Talking Points — Host Notes

### Segment Thesis

Okay, so this segment is about Host Notes.

### Talking Points

- Push on: the browser open moment. Let it breathe. Let audience react.
- Avoid: don't over-explain HTML. Everyone knows what a browser is.
- Pull up: Thariq's 20 examples BEFORE the build — sets expectations.
- If build breaks: roast the broken code live. That's content too.
- Keep chat open for repo submissions from first mention.

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:
