# Edit style: Shorts and recaps

Vincent's edit rules from the 261103 recap and Shorts (3–5 November 2026). These
apply to every edited video and Short from now on. Selection rules for which takes
become Shorts stay in [the editorial format](editorial-format.md) and the product
marketing context. The same rules are in the
[vault edit rules](https://github.com/shipshitshow/vault/blob/master/brand/editing.md)
and the `recap`, `overlays`, `dialogue` and `clips` skills load them first; change
a rule in both places.

Shorts publish on the main channel. The clips channel is kept but not maintained
(Vincent, 2026-11-10).

## Shorts (9:16, 1080x1920)

Status: locked. Vincent approved this template on 5 Nov 2026 ("that's way better",
then "the * is fine, lock it bigger", then white captions with the spoken word in
red). All five 261103 Shorts are built on it. Change it only when Vincent asks.

Reference: `projects/2026-11-03_261103/out/shorts/01-server-nobody-touches/final/video.mp4`
in the media root `~/content/brands/shipshitshow` (media is gitignored). The build scripts
are tracked in `editing/scripts/shorts/` (`align.py` for caption timing, `build.py` for the
render, `finalize.py` for loudness; see its README); reuse them for the next episode
instead of re-deriving the layout.

**Frame**
- The person speaking fills the whole 9:16 frame: a static crop of their cam, face
  centred. No blurred background, no centred tile, no black bars. On the 261103
  recording that is a 259x460 crop of the cam column, scaled to 1080x1920. A
  side-by-side two-up (Short 4) uses a 579x1030 crop of the speaker's half.
- No zoom or punch-in on people.
- When two people speak, cut between their crops on the speaker turn. Do not move
  the crop.
- No title text on the video.

**Brand mark**
- Use the red six-arm asterisk, loaded from the canonical file
  (`brand/assets/asterisk-red.svg` in the vault, also
  `apps/app/public/brand/asterisk-red.svg`), unmodified. Never redraw it in code.
- Centre it at x940, y290, 120 px. That is top-right, but not at the very top.
  Vincent asked for it bigger and then said to lock it, so do not move or resize
  it per Short. It sits above the cam and b-roll but under nothing.

**Captions**
- Bold, uppercase (Arial Bold), 2–4 words and at most about 19 characters per
  chunk. Cap height is about 62 px, bigger than the 30 Oct Shorts. Drop to 58 or
  54 px only when a chunk would not fit.
- Centre the caption line horizontally at about y1480, the same place as the
  30 Oct Shorts.
- Words are white, and the word being spoken turns show red `#E83B3B`. Captions
  are never all red and never all white.
- Use a thin dark outline (about 3 px) and a soft shadow, and no box.
- Time captions per word from word timestamps (whisper small.en on the Short's own
  audio), snapped to real pauses (ffmpeg `silencedetect`, −32 dB, ≥0.2 s), so they
  drop out when nobody speaks. The highlight steps word by word inside a chunk.
  The timing is heuristic: a person still checks it by ear.
- Never end a chunk on a weak word ("the", "a", "to", "and", "of").
- Correct spelling and grammar even when the text no longer matches the voice
  word for word. Example: "the hackers is going into reverse engineering"
  becomes "the hackers are going to reverse engineer". Fix ASR names: Grok,
  Claude, PHP, Cloudflare.
- Keep the box at most about 920 px wide, with nothing below y≈1570.

**B-roll**
- Use 2–3 full-frame cutaways per Short, 2–3 s each, on the lines they illustrate.
  Hard cuts in and out. Pick them from the episode's `video/assets/` library and
  match the picture to the spoken line (a server image on a line about servers).
  The first 261103 sample failed because the cutaway was not on the server at all.
- Crop or generate b-roll for 9:16 with the subject centred. A 16:9 crop that
  misses the subject is rejected. If the subject does not survive a vertical crop,
  generate a native 9:16 image.
- No push-in or zoom on b-roll. Real screen captures stay still.
- From the next episode, b-roll is animated SVG made with Codex CLI (Vincent,
  5 Nov 2026), planned before rendering, one animation per idea change. The
  261103 Shorts used static images with a push-in; do not copy that.
- Captions and the asterisk stay on top of b-roll.
- Check that the asterisk does not hide the subject. It overlaps rack and
  server-grid art in a few 261103 frames; move the crop centre, not the asterisk.

**Cut and audio**
- Open on the take in the first 2 s, end on a clean payoff, and add about 0.25 s
  after the last word.
- First-line test: the first spoken line makes sense to a stranger. If it starts
  with "and", "but", "because", "that's why", "so" or an "it" with no subject,
  pull a later line forward or pick another range. Check it against the final
  audio.
- No fixed length: the take decides, under 60 s (Vincent, 5 Nov 2026). Prefer the
  shortest cut that keeps the take: Shorts of 60 words or fewer had a median of
  517 views against 294 for longer ones (audit of 10 Nov 2026, a correlation on a
  small channel).
- Prefer ranges where the speaker on the 9:16 crop looks at the lens with energy
  over ranges where they look down or at a second screen.
- Cut points sit in silence, with 15–20 ms audio fades at joins only. No video
  fades.
- Loudness is −14 LUFS integrated, with true peak at or below −1 dBTP. Run
  two-pass loudnorm (I=−14, TP=−1.5, LRA=11); after AAC encoding the 261103 Shorts
  measured −14.1 to −14.5 LUFS and −1.3 to −1.4 dBTP.
- Re-transcribe every finished clip to check the joins, then a person listens.
- A claim that belongs to one guest (numbers, timelines) is held until that guest
  confirms it. Put the reason in `HOLD.txt` next to the video, as with 261103
  Short 4.

**Files**
- Each Short's `final/` folder keeps only `video.mp4`, `title.txt` and
  `description.txt` (plus `HOLD.txt` when held). Move samples, older renders and
  work files to the Trash; never `rm`.

**Covers**
- The cover carries the same red asterisk as the Short video, 120 px, but
  lower: centred at x940/y405 (box x880/y345), because the Shorts grid crops
  the top of the cover (Vincent, 2026-11-07; vault placement table). The
  video mark stays at y290. Stamp it with
  `bun run thumbnail:stamp --format shorts`.
- No host faces. The cover style is still open. The AI-art covers (v3) and the
  flat vector covers (v4) were both parked on 5 Nov.
- The cover shows the subject of the take (a person or company only when the
  take is about them), and the covers of one batch differ in colour so they can
  be told apart. Plan the cover in the same pass as the cut.
- Each Short sets its full episode as the YouTube Related video (Studio) and links
  it in the description once the episode is live.

## Recaps (16:9)

- Never use text title cards or topic-label cards. Mark idea changes with b-roll,
  real screenshots and the show's existing red slash-stinger wipe.
- Use hard cuts only: no fade to black, no dissolves, no alpha fades on overlays.
- No zoom on people. Zoom on screen content only when it lands on a specific point.
- Cold open: the strongest 15–20 s first (the 5 Nov recap is the model), then
  30–45 s of 50/50 two-person conversation before any screenshare. The cold open
  must flow into the conversation.
- Dialogue cuts: drop back-channels ("yeah", "exactly") and restarts, keep every
  qualification that makes a claim accurate, no subscribe ask before the first
  payoff, no blooper in the first 20 s.
- Never let more than about a minute of talking pass without b-roll. Full-frame
  b-roll is fine (v8e was chosen over the version that kept the hosts visible).
- Build b-roll as animated SVG made with Codex CLI, not static images. Plan one
  animation per idea change before rendering.
- The recap gets its own title and thumbnail concept, different from the
  livestream's.
- Generated art has no text, no faces and no brand logos, uses charcoal with a
  muted red, and is logged in the episode's `assets/manifest.json`.
- Show the edit plan and transcript before rendering. Send one sample before
  cutting a batch.
