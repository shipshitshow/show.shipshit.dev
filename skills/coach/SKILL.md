---
name: coach
description: Review the latest livestream from its transcript and give each host a one-page scorecard with measured numbers, timestamped examples, three things to keep and three to change against the previous week. Use after a stream or when a host asks how they came across.
---

# Coach

Give each host honest, specific input on how they came across on air. The numbers
come from the transcript; the judgment comes from reading it. Nothing here scores
the hosts against each other, predicts views or says why viewers left.

## Invocation

- `$coach` — the latest livestream with a transcript, against the one before it.
- `$coach 2026-11-03` — a specific stream.
- `$coach Mitchell` — only that host's page.
- `$coach <file>` — a given transcript (YouTube `.vtt`, or text with `Vincent:` / `Mitchell:` lines).

## 1. Find the stream and last week's

Use the supplied stream, otherwise the latest livestream that has a transcript.
Read the show's channel profile for the host names, the transcript location and
the countdown. Take the previous livestream's transcript as "last week"; say which
two streams were compared. If a stream has no transcript, say so and stop; do not
score from the title or description.

## 2. Measure

Run the bundled script, never a recount by hand:

```bash
python3 -I scripts/coach_stats.py <this.vtt> --previous <last.vtt> --format md
python3 -I scripts/coach_stats.py <this.vtt> --previous <last.vtt>   # full JSON, with examples
```

It reports per host: share of words, pace, uh/um, "like", hedges and repeated
words, turns opening with agreement against turns with push-back, story turns
against read-aloud turns, chat mentions, shrug phrases, longest monologues, silence,
the first non-greeting turns after the countdown, and the last two minutes with
any call to action. Options: `--lane0 <host>`, `--flip-at <m:ss,...>`,
`--countdown <s>` (default 30), `--hosts A,B`.

**Who is speaking is an inference.** YouTube captions only mark that the speaker
changed. The script alternates two lanes and picks which host is which from the
hosts naming each other. Read `attribution` first:

- `confidence: low` (the usual case): every per-host number is indicative. Say so at
  the top of each page. Check the `spot_checks` against the recording or with the
  hosts; where a lane is wrong, rerun with `--lane0` or `--flip-at <time>` and
  say you did.
- A speaker-labelled transcript (`method: labels`) is the reliable input. Prefer
  one when it exists in the episode's folder.
- No `>>` markers (some captions have none): the script refuses. Ask for a labelled
  transcript; never guess the split.

Auto-captions drop some fillers and mishear names, so filler counts are a floor and
quotes are cleaned only for obvious ASR errors. Say that once.

## 3. Read the transcript

The script flags candidates; you decide. Read at least the first three minutes,
every flagged story, read-aloud, push-back and chat moment, and the last two
minutes. Judge against [the on-air standards](references/standards.md):

- **First real claim.** The first turn after the countdown that states what the
  episode is about and why a founder should care. A greeting, a tech check or a
  recap is not one. Report the time since going live, not the clock.
- **Agreement and push-back.** Count real disagreement or a question that moved the
  other host. Agreement that adds an example is fine; agreement that only echoes is
  the pattern to name. Do not ask hosts to manufacture disagreement.
- **Stories and sources.** A story is something that happened to the host, with a
  number or outcome. Read-aloud is a source read cold on screen. Note the best
  firsthand moment and how late it came.
- **Chat and close.** Was a viewer question taken? Did the close answer the
  episode's question in a sentence, and was the call to action brief and not
  begging?

The transcript cannot show eyes, framing, light or sound; do not comment on them.

## 4. Write the scorecards

Use [the scorecard shape](references/scorecard.md): one page per host, same rows,
numbers beside last week's, each judgment backed by a timestamp and a short quote
(20 words at most). Three to keep and three to change, each one an action the host
can try next week, tied to a moment in this stream. Open with what went well.

Rules:

- Describe what was said and what to try, not the person. No ranking of the hosts,
  no scores out of ten, no grade.
- Keep each host's page about their own talk. Where both hosts did the same thing
  (a slow open), say so on both pages.
- A difference of a few points or one stream is noise: call a change real only when
  it is large and the same direction shows in the examples.
- Do not claim an effect on views or retention. The numbers show what happened on
  air.
- Quotes are the hosts' words; never invent one, never paraphrase inside quote marks.
- The first 30 seconds are a deliberate countdown, not dead air. Measure from going
  live.

## 5. Save and share

Save one Markdown file per stream in the episode's working folder, outside any
public repository (for Ship Sh*t Show: `editing/projects/<YYMMDD>/coach.md`, which
git ignores). The scorecards are for the hosts; do not publish them, post them or
send them to anyone without the hosts' approval. If a page is wanted for sharing,
make a private one and give the link to the hosts only.
Return the path and the three biggest changes per host in chat, not every card.

## Final check

Does every judgment carry a timestamp? Is the attribution confidence stated? Were
both streams named? Is each "change" something a host can do on Monday? Is there
any claim about viewers, retention or intent the transcript cannot support?
