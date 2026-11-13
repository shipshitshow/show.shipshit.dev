# Weekly pipeline: from topic to published

One page for each week's episode, from choosing the topic to your OK on the
private uploads. Each step names the rule it follows instead of restating it.
When a rule changes, change it at its source, not here.

| Rule | Source |
|---|---|
| Episode opening, one title one promise, stance check, Shorts angles, the debatable question | [editorial-format.md](editorial-format.md) |
| First sentence, segment shape, re-hooks, verdict close | `skills/prep` and `skills/hooks` (`opening-and-hooks.md`, `segment-playbook.md`) |
| What the hosts do on air | `skills/prep/references/on-air-checklist.md`, attached to the `$cues` run sheet |
| Which takes become Shorts (hot takes, never features) | [product marketing context](../../.agents/memory/product-marketing-context.md) |
| Shorts and recap edit style (locked 5 Nov 2026) | [edit-style.md](edit-style.md) |
| Asterisk asset, colour, size and position for every format | [vault brand/placement.md](https://github.com/shipshitshow/vault/blob/master/brand/placement.md) |
| Thumbnail art and covers (locked 6 Nov 2026) | `skills/thumbnails` and the channel profile in `shipshitshow/skills` |
| Titles: one line on the home feed (locked 6 Nov 2026) | channel profile in `shipshitshow/skills` (`$metadata`) |
| Editing workspace layout | [editing/README.md](../../editing/README.md) |
| Asterisk stamp on thumbnails | `bun run thumbnail:stamp` (reads the placement table) |
| Shorts render | `editing/scripts/shorts/` (locked template) |
| Upload safety | `scripts/youtube-upload.ts` (private by default) |

**Vincent signs off at five points:** the topic board, the recap transcript and
plan, one sample Short, the thumbnails, and the private uploads before they go
public. Nothing else waits on him.

## 1. Before recording (by the day before)

1. Pick one founder question with a business outcome
   ([growth checklist](growth-checklist.md)). Write the title's promise in one
   sentence; the show has at most three segments plus a close.
2. Build the source board and talking points with `$prep` and `$hooks`: the first
   sentence options, the segments, a story and a re-hook for each. Then save the draft:
   `bun run show:prep save --store local --file <draft.json> --if-revision new`
   ([local-show-preparation.md](../local-show-preparation.md)).
3. Name 3–5 Shorts angles inside the segments, each with a claim, evidence,
   the opposing read and a payoff. Carry their cues into `$cues`.
4. Before going live, Vincent and Mitchell each write a one-line verdict per
   segment and approve the first sentence. The board marks the segments where they
   differ. Nobody writes a view for a host.
5. Livestream thumbnail: red asterisk, per placement.md.
   - **Gate:** Vincent approves the board.

## 2. Record day

1. Check stream, audio and chat before going live, with `$cues` and the on-air
   checklist open. The countdown is deliberate; the first sentence follows it
   directly. Stream. Then put the recording at
   `~/content/brands/shipshitshow/projects/<YYYY-MM-DD>_<YYMMDD>/raw/` and create the projects:
   `python3 editing/scripts/workspace.py init <YYMMDD>/video`, plus
   one `init <YYMMDD>/shorts/<NN-slug>` per Short (this also creates
   `episode.json`).
2. Fill `episode.json` with the livestream ID.
3. Transcribe it to `raw/transcript.txt` and fix ASR names (Genfeed, Grok,
   Claude, PHP, Cloudflare).

## 3. Recap (16:9, about 10 min)

1. Write the edit plan with `$recap`: chapters, source ranges, the opening line,
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
   range. Every Short has one take that lands in the first 2 s and ends on a
   clean payoff. There's no fixed length: the take decides, under 60 s
   (Vincent, 5 Nov 2026), and the shortest cut that keeps the take wins. Run the
   first-line test on each range: a first line that starts with "and", "but",
   "because" or "that's why" gets a later line pulled forward or another range.
   Plan each cover with its cut (the subject of the take, colour varied across
   the batch).
2. Render one sample with `editing/scripts/shorts/` (locked template, see its
   README).
   - **Gate:** Vincent OKs the sample, then cut the batch.
3. Re-transcribe every clip and check the joins by ear. When a claim belongs
   to a guest (numbers, timelines), add `HOLD.txt` until they confirm it.
4. Each `final/` keeps only `video.mp4`, `title.txt` and `description.txt`
   (plus `HOLD.txt`). Move old renders to the Trash, never `rm`.

## 5. Thumbnails and covers

1. Generate the art with `$thumbnails`: no text, with the top-right corner
   left empty. Don't draw the asterisk in the art.
2. Stamp the asterisk from the real SVG master at the placement-table spot:
   `bun run thumbnail:stamp --in <art.png> --out <thumb.png> --kind live|video [--format landscape|shorts]`.
   Use `live` (red) for an actual livestream and `video` (white) for the
   recap. Shorts covers (`--format shorts`) always get the red mark at
   x880/y345 (the Short video mark sits higher, at y230).
3. Review them in Library > Thumbnails (`/library/thumbnails`), checking them at
   real size.
   - **Gate:** Vincent approves.

## 6. Metadata and private upload

1. Write the title, description and chapters with `$metadata`
   (`bun run youtube:metadata`). Use first-person show voice. The title fits one
   line on the home feed: 40 characters or fewer, 45 at most, take first.
   Spell-check it before upload.
2. Run `bun run youtube:upload --file <video> --meta <meta.json> --channel
   main|clips --dry-run`, then run the same command without `--dry-run`.
   Uploads go up private. The recap and the Shorts all go to main
   (Vincent, 10 Nov 2026). The clips channel still exists but isn't maintained.
3. Record each video ID in `episode.json` (`youtube.video`,
   `youtube.shorts.<slug>`).
4. Link each Short to the full episode: put the episode link in its
   description once the episode is live, and set the episode as its Related
   video in YouTube Studio.
   - **Gate:** Vincent checks the private uploads in YouTube Studio and makes
     them public himself, or says which to schedule. Never pass
     `--confirm-public` without his word for that exact upload.

## 7. After publishing

1. Add the transcript with `bun run transcripts:import --write` (files are
   keyed on the video id and `index.json` carries the title), and add the
   livestream talking points if they're missing.
2. Post to LinkedIn and X with `$linkedin` and `$x`. A 16:9 demo can go to
   LinkedIn as it is.
3. After 7 days, compare views against the inventory median
   ([growth checklist](growth-checklist.md)).
4. Run `$coach` on the stream's transcript for each host's one-page scorecard.
   It stays in the episode folder (`<media root>/projects/<YYYY-MM-DD>_<YYMMDD>/coach.md`), not in git.

## Open (6 Nov 2026)

- **Edited-video watermark over screen shares:** proposed in placement.md, not
  confirmed.
