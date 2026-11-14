# Take-picker

`pick.py` reads an episode transcript and ranks the best candidate Shorts ("takes"): self-contained 20 to 90 s stretches that start on a claim, end on a finished sentence and carry a number or a named thing. Each candidate converts straight into a `short.json` `segs` entry for `../shorts/` (see its README). It is a first pass for the owner's Gate 1 review (vault `brand/editing.md`), not a replacement for it. Text only: no network, no media read (unless `--silence`), no video rendered. Stdlib Python. Run it on the Mac Studio.

```bash
python3 editing/scripts/takes/pick.py <episode> --speakers S1=vincent,S2=mitchell      # reads raw/words.json, else raw/transcript_clean.txt
python3 editing/scripts/takes/pick.py <episode> --transcript raw/words.json --turns raw/transcript_clean.txt --silence
python3 -m unittest discover -s editing/scripts/takes -p 'test_*.py'                    # tests (also run in CI)
```

`<episode>` is the episode folder or its id (`<YYMMDD>`, via `workspace.py`). Output: `<episode>/out/takes/takes.json` (`--out` to change) plus a ranked table on stdout.

## Inputs

| Input | Timing | Notes |
|---|---|---|
| whisper.cpp `-oj` JSON, run with `-ml 1 -sow` (or a list of `{w, s, e}`) | measured per word | best; no speakers, so add `--turns` |
| `[MM:SS] S1: text` clean transcript | estimated (turn starts are exact to a second, words are spread at speaking rate) | carries speakers; candidates are flagged `timing-estimated`, so check the cut points |
| `--turns FILE` with a word-level `--transcript` | measured | labels each word with the speaker of the turn it falls in |

`--silence` (ffmpeg `silencedetect` on `raw/<id>.mp4`) or `--silences FILE` (JSON `[[start, end], ...]`) snaps cut points into real pauses: start about 0.12 s before the first word, end up to 0.35 s after the last. Without it, cuts sit 0.12 to 0.15 s outside the words and never cross a neighbouring word. Re-run `shorts/align.py` on the result for frame-exact joins as usual.

## How it picks

1. Split into sentences (punctuation, speaker change, or a long pause).
2. Every run of consecutive sentences 20 to 90 s long is a candidate (`--min-len`, `--max-len`; the rulebook's 45 to 90 s and the `clips` skill's "shortest cut that keeps the take" both fit inside, full length score for 25 to 60 s). Leading `so / and / yeah / um / I mean` are trimmed from the first sentence; short reactions from the other speaker ("Yeah.") are cut out of the Short and left in the gap.
3. Score 0 to 100, deterministic, from the `clips` rubric:

| Component | Points | What it looks for |
|---|---|---|
| hook | 20 | the first-line test (does not start on and/but/because/it/this, not a reaction), a claim in the first line (opinion marker, number or named target), lands in under about 22 words, no hedge opener |
| opinion | 22 | density of verdicts and contrarian markers (dead, never, nobody, "is the new", "stop doing", "you should", ...) |
| specificity | 14 | numbers, named things, measurable nouns (bill, tokens, repo, ...) |
| self-contained | 14 | no references back ("like you said", "earlier"), no context-dependent opening, no stream meta |
| cleanliness | 10 | fillers and stutters per 100 words, share of one-word reactions, ping-pong speaker changes |
| ending | 10 | finished sentence, a landing line, no dangling connective, and the next sentence does not continue the thought (`mid-thought-end` flag) |
| length | 10 | 25 to 60 s full, falling to half at the hard limits |

   Penalties: stream meta (-6 each, max 3), walkthrough language (-5 each, max 3), engagement bait (-10). Filler-heavy windows are scaled down further. Greetings, subscribe asks and goodbyes are never selected.
4. Greedy ranking with overlap suppression (picks share at most 20% of the shorter one). `--exclude 0:00-1:30` skips a span (countdown, outro).

The word lists and weights are constants at the top of `pick.py`; change them there and update the tests.

## Output

```json
{
  "episode": "261111", "source": "raw/261111.mp4",
  "transcript": { "file": "words.json", "timing": "word", "words": 5999, "duration": 2505.0 },
  "candidates": [
    { "rank": 1, "id": "t01", "score": 90.0, "start": "39:55", "end": "40:34", "a": 2395.3, "b": 2434.1, "duration": 35.1,
      "speaker": "S1", "speakers": ["S1", "S2"], "hook": "if you see that on your TikTok, you just close the account ...",
      "quote": "...", "text": "...", "components": { "hook": { "score": 1.0, "points": 20.0 } },
      "penalties": {}, "reasons": ["+first line stands alone", "+opinion markers x5 (...)"], "flags": ["two-speakers"],
      "short": { "source": "raw/261111.mp4", "segs": [ { "a": 2395.3, "b": 2412.98, "layout": "A", "tile": "vincent" } ] } }
  ]
}
```

`short` is the paste-ready part of a `short.json`: `source` and `segs` in source seconds. With `--speakers S1=vincent,S2=mitchell` a single-speaker take gets `layout: A` with that host's `tile`; a take with both hosts gets `layout: B`, `default_speaker` and `speaker_turns` in clip seconds. Add `splits`, `tail`, `chunks` and `broll` by hand as usual. Flags: `timing-estimated`, `lead-trimmed`, `mid-thought-end`, `open-end`, `two-speakers`, `walkthrough`, `engagement-bait`.

## Optional LLM judge (off by default)

Nothing calls a model unless you pass `--judge-cmd "<command>"`. The command gets JSON on stdin, `{"rubric": "...", "candidates": [{"id", "text", "hook", "duration"}]}` (transcript text only, never media), and must print `{"scores": {"t01": {"score": 0-100, "note": "..."}}}`. The final score is `(1 - w) * heuristic + w * judge` (`--judge-weight`, default 0.5); the heuristic score stays in `heuristic_score`. `--judge-pool` (default 15) sets how many heuristic picks the judge sees. The picker does not ship a judge; wire any CLI or script that follows the protocol.

## Limits

- Heuristics read text, not delivery. A candidate can score well and still be flat on camera; listen before cutting.
- Word lists are English and tuned to this show's vocabulary; whisper errors pass straight through into `hook` and `text`.
- Estimated timing (turn-level transcripts) can be a second or two off; use a word-level transcript or `--silence` for cuts you intend to keep.
- Reviewing the list is still Gate 1: the owner picks the Shorts.
