---
name: livestream-live-cues
description: Turn local episode notes into a live host cue sheet with elapsed-time segments, ordered source links, speaking cues and transitions. Use before or during a stream, including next-segment, skip and running-late requests.
---

# Livestream live cues

Help Vincent and Mitchell navigate the show while talking naturally. The existing
`shipshitshow-talking-points` skill prepares the source board; this skill condenses
that board for use on air. Give the host the next useful cue immediately.

## Invocation

Examples:

- `$livestream-live-cues` — prepare today's cue sheet from local episode notes.
- `$livestream-live-cues 2026-10-06, 85 minutes` — use a specific episode and budget.
- `$livestream-live-cues next; we're 35 minutes in, demos covered` — return the next card.
- `$livestream-live-cues skip the demo; 12 minutes left` — compress the remaining show.
- `$livestream-live-cues links for the money segment` — return only that segment's links.

## Find the episode

Resolve the repository root, then use the supplied file/date or the active episode
already established in this chat. Otherwise look for today's date in the user's
timezone under `apps/app/data/livestream/YYYY-MM-DD/topic-NN-*.md`.
If there are no notes for today, list the nearest prepared dates and ask which to
use through the available structured question tool. Do not quietly use an old
episode. Read all selected topic files and any existing `live-cues.md` or
run-of-show note; use title options only to resolve a locked episode title.

Read `.agents/memory/topic-file-format.md` and
`.agents/memory/product-marketing-context.md` when present. The existing topic's
viewer question, order, budgets, must-cover items and cut priorities take precedence
over a new editorial plan. Keep its links, uncertainty and firsthand limitations.
Do not treat thumbnail, distribution or clip-planning sections as extra segments.

Use a supplied duration first, then the episode's stated duration. If neither
exists, offer a clearly labelled 60-minute draft. Do not invent a start time or
stream URL. Keep elapsed stream timing separate from source-video timestamps.

## Prepare the cue sheet

Use [the cue-sheet shape](references/cue-sheet.md). Save a companion
`apps/app/data/livestream/YYYY-MM-DD/live-cues.md` without changing the topic files.
Keep existing actual timing and host updates when refreshing that file. Label the
date, source files, planned total, last presented card and last reported live position. A generated
schedule is a plan, not evidence of what aired.

Put a compact timeline first, then a card for each segment:

- **Open:** one to three clickable direct links in order, with what to show on each
  page. Keep existing source numbers where available so hosts can jump back to the
  full board. Put remaining links under a small backup list rather than hiding them.
- **Say:** two or three short conversational cues: the question, actual experience
  to contribute and the viewer consequence. Use prompts rather than invented host
  quotes, personal results or a monologue to read. Offer a short suggested line
  only when the host asks for wording; distinguish it from a sourced quote.
- **Ask:** one useful co-host or chat question, preserving real disagreement.
- **Move on:** a short transition and the next segment.
- **Watch:** only the material caveat for that card, beside the affected cue/link.

Make planned time ranges contiguous and sum to the declared total, including the
opening, close and any buffer. Preserve explicit segment budgets where possible;
explain any adjustment needed to fit the total. Reserve the close when shortening
the show. Put optional tangents in a parking lot.

Use local evidence first. During initial preparation, verify changing facts that
will be stated as current (prices, availability, quotas, laws, metrics) with primary
sources when tools allow. Attribute reported claims and retain their caveats. If a
claim or timestamp cannot be checked, mark it `CHECK BEFORE SAYING` or omit the
claim; a copied URL is not a fresh verification. Do not present estimates as costs
actually incurred or planned demo outcomes as results.

Keep the first screen usable immediately. Open the saved Markdown in the local
editor when available and return its path with the compact timeline, rather than
reprinting every card in chat.

## Help during the stream

For `next`, `where are we`, `skip`, `running late` or a segment name, use the cue
sheet and the host's latest report. A named current segment or completed item
overrides the schedule; elapsed time alone gives a **planned** position, not proof
that earlier segments aired. Never infer the stream start from the computer clock.

Return **Now / Open / Say / Ask / Move on / Next** for the current or next requested
segment. Aim for one screen (roughly 150 words); answer a links-only request with
just the ordered links and essential caveats. Do not regenerate the whole episode
or start a research sweep. If a new current claim needs checking, verify only that
claim or leave it out and give a safe discussion cue immediately.

When the host reports progress or cuts, update the same cue sheet's live position
and remaining plan. Mark an item covered only when the host says it was covered.
With a remaining-time budget, sum the remaining ranges to that budget, state the
cuts, and keep the closing answer. If the allotted time is exhausted, give the
closing card instead of another full segment. Bare `next` advances from the last
reported current segment, or otherwise the last presented card. If neither exists,
start with the opening and label that assumption. Record the presented-card cursor
separately from confirmed coverage; showing a card does not mean it aired.

## Demo handling

Carry over the episode's readiness requirements and fallback. An available link
to a vendor demo does not establish that our demo is ready. If the live task or
recording is unconfirmed, mark the slot conditional and provide a discussion
fallback. Do not launch a demo, connect an account, send a message or publish from
a request for live cues. Use only supplied or confirmed firsthand experience.

## Final check

Can the host find the next link and cue in a glance? Do ranges fit the budget?
Are planned, actual and source-video times distinct? Did uncertain facts and demo
conditions survive condensation? Does the close answer the episode's viewer question?
