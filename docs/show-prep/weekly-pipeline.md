# Weekly pipeline: from topic to published

One page for each week's episode, from choosing the topic to your OK on the
private uploads. Each step names the rule it follows instead of restating it.
When a rule changes, change it at its source, not here.

| Rule | Source |
|---|---|
| Episode opening, Shorts angles, the debatable question | [editorial-format.md](editorial-format.md) |
| Which takes become Shorts (hot takes, never features) | [product marketing context](../../.agents/memory/product-marketing-context.md) |
| Shorts and recap edit style (locked 5 Nov 2026) | [edit-style.md](edit-style.md) |
| Asterisk asset, colour, size and position for every format | [vault brand/placement.md](https://github.com/shipshitshow/vault/blob/master/brand/placement.md) |
| Thumbnail art and covers | `skills/thumbnails` (art not locked yet, see "Open" below) |
| Editing workspace layout | [editing/README.md](../../editing/README.md) |
| Upload safety | `scripts/youtube-upload.ts` (private by default) |

**Vincent signs off at five points:** the topic board, the recap transcript and
plan, one sample Short, the thumbnails, and the private uploads before they go
public. Nothing else waits on him.

## 1. Before recording (by the day before)

1. Pick one founder question with a business outcome
   ([growth checklist](growth-checklist.md)).
2. Build the source board and talking points with `$prep`, then save the draft:
   `bun run show:prep save --store local --file <draft.json> --if-revision new`
   ([local-show-preparation.md](../local-show-preparation.md)).
3. Name 3–5 Shorts angles inside the segments, each with a claim, evidence,
   the opposing read and a payoff. Carry their cues into `$cues`.
4. Livestream thumbnail: red asterisk, per placement.md.
   - **Gate:** Vincent approves the board.

## 2. Record day

1. Stream. Then put the recording at `editing/projects/<YYMMDD>/raws/` on the
   Studio and create the projects:
   `python3 editing/scripts/workspace.py init <YYMMDD>/video`, plus
   one `init <YYMMDD>/shorts/<NN-slug>` per Short (this also creates
   `episode.json`).
2. Fill `episode.json` with the livestream ID.
3. Transcribe it to `raws/transcript.txt` and fix ASR names (Genfeed, Grok,
   Claude, PHP, Cloudflare).

## 3. Recap (16:9, about 10 min)

1. Write the edit plan with `$recap`: chapters, source ranges, the cold open,
   what gets cut, and the claims to protect.
   - **Gate:** Vincent approves the plan and transcript before rendering.
2. Render following edit-style.md. That means hard cuts only, no title cards,
   30–45 s of two-person talk before the first screenshare, and b-roll at least
   every minute. Loudness is two-pass.
3. Re-transcribe the render, check that the chapters match the final cut, and
   watch it once all the way through.
4. Put the result in `video/final/` (video, captions, chapters, title,
   description).

## 4. Shorts (9:16)

1. Plan with `$clips`. Match each angle from step 1.3 to its actual source
   range. Every Short has one take that lands in the first 2 s, ends on a
   clean payoff, and runs a length that fits the take (see "Open").
2. Render one sample with `editing/scripts/shorts/` (locked template, see its
   README).
   - **Gate:** Vincent OKs the sample, then cut the batch.
3. Re-transcribe every clip and check the joins by ear. When a claim belongs
   to a guest (numbers, timelines), add `HOLD.txt` until they confirm it.
4. Each `final/` keeps only `video.mp4`, `title.txt` and `description.txt`
   (plus `HOLD.txt`). Move old renders to the Trash, never `rm`.

## 5. Thumbnails and covers

1. Make the recap thumbnail and Shorts covers per `skills/thumbnails`. Place
   the asterisk per placement.md: white for edited video.
2. Review them in the Thumbnail Lab (`/labs/thumbnails`), checking them at
   real size.
   - **Gate:** Vincent approves.

## 6. Metadata and private upload

1. Write the title, description and chapters with `$metadata`
   (`bun run youtube:metadata`). Use first-person show voice.
2. Run `bun run youtube:upload --file <video> --meta <meta.json> --channel
   main|clips --dry-run`, then run the same command without `--dry-run`.
   Uploads go up private. The recap goes to main, the Shorts to clips.
3. Record each video ID in `episode.json` (`youtube.video`,
   `youtube.shorts.<slug>`).
   - **Gate:** Vincent checks the private uploads in YouTube Studio and makes
     them public himself, or says which to schedule. Never pass
     `--confirm-public` without his word for that exact upload.

## 7. After publishing

1. Add the transcript to `apps/app/data/transcripts/`, and add the livestream
   talking points if they're missing.
2. Post to LinkedIn and X with `$linkedin` and `$x`. A 16:9 demo can go to
   LinkedIn as it is.
3. After 7 days, compare views against the inventory median
   ([growth checklist](growth-checklist.md)).

## Open (5 Nov 2026)

- **Shorts length:** the 29 Oct rule says 30–50 s, but the 3 Nov batch runs
  21–30 s. Waiting on Vincent.
- **Shorts cover asterisk:** 96 px white at x768/y320, while the video uses
  120 px red at x940/y290. Waiting on Vincent to say whether to unify them.
- **Thumbnail art:** the current direction is photoreal, no text and famous
  faces only (never the hosts). Not locked yet. Rewrite `skills/thumbnails`
  once it is.
- **Edited-video watermark over screen shares:** proposed in placement.md, not
  confirmed.
