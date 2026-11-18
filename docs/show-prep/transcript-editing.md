# Transcript editing

Vibe editing in the app: read the transcript, highlight what to cut, and the
recut script cuts the video from your marks. The page is
`show.shipshit.dev/library/edits` (Library, Edits).

## Using the page

- Highlight text to cut it. Highlight text that is already cut to bring it
  back. Click one word to toggle just that word.
- On a phone or tablet, select text and use the Cut selection or Restore bar.
- Cut by category (dropdown) cuts or restores a whole category across the
  transcript: Fillers, Stutters, Repeats, Reactions, Handovers, French. The
  underline on a word says why it was suggested.
- Delete all stutters and "like" cuts every stutter and repeat plus filler
  "like" (a "like" with a comma after it, as in "like, I wanted"). It keeps
  "I was like, ..." quotes. The dropdown next to it switches to every "like",
  including real uses ("looks like"). It always works on the whole transcript,
  not just the section on screen, and Undo takes it back.
- Cuts save as you go (Saved shows in the corner). Undo, Reset to suggestions,
  Read clean (hides the cut words) and Copy cuts are in the toolbar. Cmd or
  Ctrl+Z also undoes.
- The section dropdown moves through the transcript: the sections the file
  names, or ten-minute blocks.

The app marks fillers (uh, um, hmm), words cut off mid-way (`can't-`), words
said twice, `go ahead <name>` handovers and one-word reactions (Yeah. Mm-hmm.)
when the pushed file leaves them unmarked. It never marks "you know",
"I mean" or "kind of": those are your call.

## Pushing a transcript

The page shows transcripts pushed to storage. Push one from the machine that
has the word-level transcript (the Studio):

```bash
bun run --cwd apps/app edits:push 261117-brian /absolute/path/transcript.json          # check only
bun run --cwd apps/app edits:push 261117-brian /absolute/path/transcript.json --commit # local data/edits
PRODUCER_STORAGE=redis VERCEL_ENV=production \
  bun run --cwd apps/app edits:push 261117-brian /absolute/path/transcript.json --commit
```

The id is lowercase letters, digits, dots and hyphens. Pushing again replaces
the transcript and keeps the cuts saved for that id. Locally the data goes to
`apps/app/data/edits/` (git ignores it: recordings are private); in production
it goes to the Upstash Redis in chunks. The API (`PUT /api/edits/<id>`) takes
the same JSON from a signed-in producer.

### File format

```json
{
  "title": "Brian stream, 17 Nov",
  "speakers": ["Brian", "Mitchell", "Vincent"],
  "sections": [{ "title": "Cold open", "from": 0, "to": 311 }],
  "words": [
    [6312, 2401.051, 2401.611, "can't-", 0, "S", 232],
    [6313, 2401.611, 2401.851, "I", 0, "", 232]
  ]
}
```

A word is `[idx, start, end, text, speaker, category, turn]`:

- `idx`: whole number, unique, stable. Cuts refer to it.
- `start`, `end`: seconds in the source recording (the mp4 clock).
- `speaker`: index into `speakers`.
- `category`: `F` filler, `S` stutter, `D` repeat, `H` handover, `R` reaction,
  `E` French, or `""` to let the app suggest one.
- `turn`: a counter; a new turn starts a new speaker block.
- `sections` is optional: `from` and `to` are word `idx` values, inclusive.

## What the recut script reads

Copy cuts (or `GET /api/edits/<id>`, `cuts` field) gives:

```json
{
  "version": 1,
  "updated": "2026-11-18T09:00:00.000Z",
  "edited": true,
  "cutWords": 71,
  "cutSeconds": 30.4,
  "idx": [6312, 6313],
  "ranges": [{ "a": 2401.051, "b": 2401.611, "text": "can't-" }]
}
```

`idx` are the cut word indexes. `ranges` merge neighbouring cut words (less
than two seconds apart) into source-time spans `a` to `b`, so the recut script
can drop each span from the timeline. The cuts never change the transcript:
restoring a word only removes its index.
