# Transcript checks

How to read the repo's transcripts when preparing a board or reviewing a stream. Applies to `apps/app/data/transcripts/clean/*.txt`, which the scripts in `../scripts/` read.

## Scripts

Run from the repository root.

| Script | Use |
| --- | --- |
| `skills/prep/scripts/audit-transcripts.sh [dir]` | Flags warm-up and logistics in the first 80 lines of each transcript. Treat it as a quick triage, not a score: a transcript can pass and still open late. |
| `skills/prep/scripts/extract-live-voice.sh [pattern]` | Pulls lines matching a pattern from the last eight livestream transcripts, for how the hosts phrase things when talking naturally. |
| `skills/prep/scripts/show-context.sh [topic-file]` | Lists transcript coverage, the latest transcripts and recent topic files. |

## What to read for

- **Time to the first claim.** Find where the title's topic is first named and where the viewer's question is answered. The audit's target is the topic stated inside the first minute of speech.
- **Where the hosts differ.** Look for turns that push back or disagree, against turns that only open with "yeah", "yes" or "exactly".
- **Stories against read-aloud sources.** Firsthand material that arrives late is a reordering job for the next board.
- **Silence.** Long stretches without speech in live builds.
- **The firsthand best moment.** Candidate for the first sentence or a Short.

## Limits

- Transcripts are YouTube auto-captions with word timing. Names and numbers need checking before they go on a board. Common ASR misses: Genfeed, Grok, Claude, PHP, Cloudflare.
- Fourteen transcripts from 19 August to 21 October are auto-translated captions, not the original English. Do not quote from them or measure speech from them.
- The corpus covers what the repo holds. It is text, not video: do not claim anything about the picture, framing or on-camera delivery from it.
- Counting the first word of each turn is a heuristic. Read the figure as direction.
