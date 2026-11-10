---
name: cues
description: Turn local episode notes into a live host cue sheet with elapsed-time segments, ordered source links, speaking cues and transitions. Use before or during a stream, including next-segment, skip and running-late requests.
---

# Cues

Help Vincent and Mitchell navigate the show while talking naturally. The existing
`prep` skill prepares the source board; this skill condenses
that board for use on air. Give the host the next useful cue immediately.

## Invocation

Examples:

- `$cues` — prepare today's cue sheet from local episode notes.
- `$cues 2026-10-06, 85 minutes` — use a specific episode and budget.
- `$cues next; we're 35 minutes in, demos covered` — return the next card.
- `$cues skip the demo; 12 minutes left` — compress the remaining show.
- `$cues links for the money segment` — return only that segment's links.

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
Sort multiple topic files by their zero-padded topic number unless an explicit show
order exists. State the selected episode date. These are local seed notes, which
may differ from dashboard edits; keep missing host experience as an explicit prompt.
Do not treat thumbnail, distribution or clip-planning sections as extra segments.
If hot takes are mapped to a segment, carry useful cues and their receipts/risks
into that card without prescribing lines to perform. Label them `Hot take #N`
separately from the numbered sources.

For new episode preparation, apply
[the show editorial format](../../docs/show-prep/editorial-format.md): a fast
opening, 3–5 clearly named planned Shorts and at least one controversial angle.
Carry the board's on-air structure into the sheet as well: the approved first
sentence, each host's stance, the story cue, a re-hook every 8–10 minutes, one
chat question per segment and the verdict close (see
[the segment playbook](../prep/references/segment-playbook.md)). If the board
lacks the first sentence or a host's stance, say so on the sheet and do not
write one for them.
Map candidates to source segments rather than adding timed slots. If the board
lacks them, propose narrow angles from its evidence and label missing experience
or proof; do not invent a host stance or silently rewrite a locked rundown.

Use a supplied duration first, then the episode's stated duration. If neither
exists, offer a clearly labelled 60-minute draft. Do not invent a start time or
stream URL. Keep elapsed stream timing separate from source-video timestamps.

## Prepare the cue sheet

Use [the cue-sheet shape](references/cue-sheet.md). Save a companion
`apps/app/data/livestream/YYYY-MM-DD/live-cues.md` without changing the topic files.
Keep existing actual timing and host updates when refreshing that file. Label the
date, source files, planned total, last presented card and last reported live position. A generated
schedule is a plan, not evidence of what aired.

Attach [the on-air checklist](../prep/references/on-air-checklist.md) at the top of
the sheet, under the header, so it is in front of the hosts while live. Then put a
compact timeline, then a card for each segment:

- **Story:** each host's firsthand story and number for this segment, as the
  board records it, or `No firsthand: ask`. Cue the topic, never invent the story.
- **Stance:** `Split`, `Agree` or `Open`, from the hosts' own one-line verdicts on
  the board. Where `Agree`, carry the sceptical customer's question into Ask.
- **Open:** normally one to three clickable direct links in order, with what to show on each
  page. Keep existing source numbers where available so hosts can jump back to the
  full board. Keep must-say caveats and essential counter-evidence in Open or Watch,
  even when this requires another link. Put remaining links under a small backup list.
- **Say:** two or three short conversational cues: the question, actual experience
  to contribute and the viewer consequence. Use prompts rather than invented host
  quotes, personal results or a monologue to read. Offer a short suggested line
  only when the host asks for wording; distinguish it from a sourced quote.
- **Ask:** one useful co-host question, preserving real disagreement.
- **Chat:** the one chat question to read aloud for this segment, planted if needed.
- **Re-hook:** at the planned elapsed time (every 8–10 minutes), one sentence on
  what is answered and what is still coming.
- **Move on:** a short transition and the next segment.
- **Watch:** material caveats, counter-evidence and hot-take risks, beside the affected cue/link.
- **Short S#**, where planned: working title, entry cue and payoff/exit cue. Carry
  the source and opposing interpretation in Open/Ask/Watch. A planned Short is an
  opportunity, not confirmed coverage or a scripted conclusion.

Start with an **Opening** card: the board's approved first sentence, said to the
lens right after the countdown (the first 30 seconds of every stream are a
deliberate countdown, not dead air), then the three questions by about 45 seconds.
Stream and audio checks and catch-up are not part of it: checks happen before
going live, catch-up goes after the verdicts. End with a **Close** card holding the
title's answer and one Monday-verdict per host. Make planned time ranges
contiguous and sum to the declared total. Explicitly allocate otherwise unbudgeted time to the close and buffer.
Preserve explicit segment budgets where possible;
explain any adjustment needed to fit the total. Reserve the close when shortening
the show. Use the episode's first cut when supplied; otherwise label the following
cut order as an assumption. Drop optional tangents and backup-source
discussion, then compress remaining segments around the viewer question. State the
chosen cuts. If a demo is dropped, follow the episode's fallback/time instructions
and explicitly reallocate its minutes; absent those instructions, give them to
core discussion and the close and label that allocation as a proposal.

Use local evidence first. During initial preparation, verify changing facts that
will be stated as current (prices, availability, quotas, laws, metrics) with primary
sources when tools allow. Attribute reported claims and retain their caveats. If a
claim or timestamp cannot be checked, mark it `CHECK BEFORE SAYING` or omit the
claim; a copied URL is not a fresh verification. Preserve source check dates; omit
stale engagement counts from speaking cues unless their dated snapshot matters.
Do not present estimates as costs
actually incurred or planned demo outcomes as results.

Keep the first screen usable immediately. Open the saved Markdown in the local
editor when available and return its path with the compact timeline, rather than
reprinting every card in chat.

## Help during the stream

For `next`, `where are we`, `skip`, `running late` or a segment name, use the cue
sheet and the host's latest report. A named current segment or completed item
overrides the schedule; elapsed time alone gives a **planned** position, not proof
that earlier segments aired. Never infer the stream start from the computer clock.

Return **Now / Story / Open / Say / Ask / Move on / Next**, plus **Re-hook** when
about 8–10 minutes have passed since the last one, and **Watch** whenever the card
has a material caveat, counter-evidence or hot-take risk, for the current or next
requested segment. Carry that context beside its affected cue or link even when
shortening the response; it outranks the word target. Aim for one
screen (roughly 150 words); answer a links-only request with
just the ordered links and essential caveats. Do not regenerate the whole episode
or start a research sweep. If a new current claim needs checking, verify only that
claim or leave it out and give a safe discussion cue immediately.

When the host reports progress or cuts, update the same cue sheet's live position
and remaining plan. Mark an item covered only when the host says it was covered.
With a remaining-time budget, sum the remaining ranges to that budget, state the
cuts, and keep the closing answer and both verdicts. If the allotted time is exhausted, give the
closing card instead of another full segment. Bare `next` advances from the last
reported current segment, or otherwise the last presented card. If neither exists,
start with the opening and label that assumption. Record the presented-card cursor
separately from confirmed coverage; showing a card does not mean it aired.

Preserve reported actual Short markers beside the candidate for the editor. Mark
them rough until checked against the recording/VTT; never reuse schedule ranges
as clip timestamps. Finish the point and its caveat before returning to chat or
moving on, with a brief pause when practical.

## Demo handling

Carry over the episode's readiness requirements and fallback. An available link
to a vendor demo does not establish that our demo is ready. If the live task or
recording is unconfirmed, mark the slot conditional and provide a discussion
fallback. Do not launch a demo, connect an account, send a message or publish from
a request for live cues. Use only supplied or confirmed firsthand experience.

## Final check

Can the host find the next link and cue in a glance? Do ranges fit the budget?
Are planned, actual and source-video times distinct? Did caveats, counter-evidence,
hot-take risks and demo conditions survive condensation? Does the close answer the
episode's viewer question?
Is the approved first sentence the first card, with no logistics ahead of it? Does
every segment carry a story cue, a stance and a chat question, and is a re-hook
planned every 8–10 minutes? Does the close hold one verdict per host? Is the
on-air checklist attached? Do planned Shorts have a named subject and a clear payoff/exit? Does new episode
prep include a debatable angle with evidence and an honest competing case?
