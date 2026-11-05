# Edit style: Shorts and recaps

Vincent's edit rules from the 261103 recap and Shorts (3–5 November 2026). These
apply to every edited video and Short from now on. Selection rules for which takes
become Shorts stay in [the editorial format](editorial-format.md) and the product
marketing context.

## Shorts (9:16, 1080x1920)

Reference: `editing/projects/261103/shorts/01-server-nobody-touches/final/video-v3c-sample.mp4`
on the primary checkout (media is gitignored).

**Frame**
- The person speaking fills the whole 9:16 frame: a static crop of their cam, face
  centred. No blurred background, no centred tile, no black bars.
- No zoom or punch-in on people.
- When two people speak, cut between their crops on the speaker turn. Do not move
  the crop.
- No title text on the video.

**Brand mark**
- Use the red six-arm asterisk, loaded from the canonical file
  (`brand/assets/asterisk-red.svg` in the vault, also
  `apps/app/public/brand/asterisk-red.svg`), unmodified. Never redraw it in code.
- Centre it at about x940, y290, about 120 px. That is top-right, but not at the
  very top.

**Captions**
- Bold, uppercase, 2–4 words per chunk. Cap height is about 60 px, bigger than the
  30 Oct Shorts.
- Centre the caption line horizontally at about y1480, the same place as the
  30 Oct Shorts.
- Words are white, and the word being spoken turns show red `#E83B3B`. Captions
  are never all red and never all white.
- Use a thin dark outline and no box.
- Time captions per word from word timestamps, snapped to real pauses, so they
  drop out when nobody speaks.
- Never end a chunk on a weak word ("the", "a", "to", "and", "of").
- Correct spelling and grammar even when the text no longer matches the voice
  word for word. Example: "the hackers is going into reverse engineering"
  becomes "the hackers are going to reverse engineer". Fix ASR names: Grok,
  Claude, PHP, Cloudflare.
- Keep the box at most about 960 px wide, with nothing below y≈1570.

**B-roll**
- Use 2–3 full-frame cutaways per Short, 2–3 s each, on the lines they illustrate.
  Hard cuts in and out.
- Crop or generate b-roll for 9:16 with the subject centred. A 16:9 crop that
  misses the subject is rejected. If the subject does not survive a vertical crop,
  generate a native 9:16 image.
- A slow 5% push-in is fine on illustrations. Real screen captures stay still.
- Captions and the asterisk stay on top of b-roll.

**Cut and audio**
- Open on the take in the first 2 s, end on a clean payoff, and add about 0.25 s
  after the last word.
- Cut points sit in silence, with 15–20 ms audio fades at joins only. No video
  fades.
- Loudness is −14 LUFS integrated, with true peak at or below −1 dBTP.
- Re-transcribe every finished clip to check the joins, then a person listens.

**Covers**
- No host faces. The cover style is still open. The AI-art covers (v3) and the
  flat vector covers (v4) were both parked on 5 Nov.

## Recaps (16:9)

- Never use text title cards or topic-label cards. Mark idea changes with b-roll,
  real screenshots and the show's existing red slash-stinger wipe.
- Use hard cuts only: no fade to black, no dissolves, no alpha fades on overlays.
- No zoom on people. Zoom on screen content only when it lands on a specific point.
- Open with 30–45 s of 50/50 two-person conversation before any screenshare.
- Never let more than about a minute of talking pass without b-roll. Full-frame
  b-roll is fine (v8e was chosen over the version that kept the hosts visible).
- Next episode: build b-roll as animated SVG made with Codex CLI, not static
  images. Plan one animation per idea change before rendering.
- Generated art has no text, no faces and no brand logos, uses charcoal with a
  muted red, and is logged in the episode's `assets/manifest.json`.
- Show the edit plan and transcript before rendering. Send one sample before
  cutting a batch.
