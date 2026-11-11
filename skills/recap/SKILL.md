---
name: recap
description: Edit a livestream into a focused recap with natural dialogue, source-to-edit cuts and packaging based on the final timeline.
---

# Livestream recap

## Channel context

Use the user's channel profile and actual source asset. For Ship Sh*t Show, read [the bundled profile](references/channel-profile.md); viewers using another channel should provide their audience, voice, formats, links and visual references. A profile is context, not permission to publish, upload footage, buy generation or contact a partner.

For the bundled show, read the canonical kit's editing rules and asset inventory linked in the profile. Record the kit revision, logo hash, actual fonts and approved overrides in the project's supported manifest or handoff notes. Generated board scenes are not source footage. Place the asterisk exactly as [the placement table](https://github.com/shipshitshow/vault/blob/master/brand/placement.md) says, from the same three SVG masters; never redraw it or pick a corner or size by eye.

## Locked edit style (load it first, every time)

For Ship Sh*t Show, read [the edit rules](https://github.com/shipshitshow/vault/blob/master/brand/editing.md) before planning, and in a checkout of the show repo also `docs/show-prep/edit-style.md` (the build values and scripts). They record Vincent's decisions of 3 to 5 November 2026. If a note, an old project or this skill disagrees, those two files win. The rules that decide most edits:

- No text title cards and no topic-label cards, ever. Mark an idea change with b-roll, a real screenshot or the show's red slash-stinger wipe.
- Hard cuts only. No fade to black, no dissolves, no alpha fades on overlays. The slash-stinger is the one exception.
- No zoom or push-in on the hosts. Zoom on screen content only when it lands on a specific point.
- Key stats: when a host says a number that proves the point (a view count, impressions, a price), punch in hard on it on screen content, about 4x, with a fast eased push timed to the spoken word, then hard-cut back. This is the one planned exception to the no-zoom rule; never on the people.
- Opening: no greetings, no chit-chat, no filler. Open on the strongest lines from anywhere in the transcript (the central question, the bold answer, the counter-argument), not on the chronological start. The first words are never filler ("hmm", "yeah", "no no, I mean", "so") and no cut starts on a filler word; if a strong line begins with one, start on the next real word. The opening must flow into the conversation, not read as a trailer, and the first sentence should state the viewer promise (a claim plus the stake, under 15 seconds). Then 30 to 45 seconds of proper 50/50 two-person conversation before any screenshare, with the first useful point by about 45 seconds. On a topic board `## Cold Open` means the on-air first sentence (see the opening guide in the prep skill). The 50/50 layout is the default; screenshare only while something is shown.
- B-roll at least every minute of talking. Full-frame is fine. For the show it is animated SVG made with Codex CLI, one per idea change, planned before rendering (see `$overlays`). Not static images with a push-in.
- Dialogue cuts: drop back-channels ("yeah", "exactly", "mhm") and restarts, no subscribe ask before the first payoff, no blooper in the first 20 seconds, and keep the qualifications that make a claim accurate (see `$dialogue`).
- J and L cuts: at speaker turns and reactions let the audio lead the picture (J cut, the next shot's audio starts under the end of the previous shot) or trail it (L cut, the previous audio runs over the start of the next shot). The picture cut stays hard. Never land one mid-word, and never use one to hide a changed claim (see `$dialogue`).
- Captions: corrected grammar, spelling and ASR names (Grok, Claude, PHP, Cloudflare), even where that is no longer word for word.
- Show Vincent the edit plan and transcript before rendering, and one sample before cutting a batch.

Read the existing project manifest. Use the full-source transcript to select the viewer question, evidence and verdict. Keep disagreement and uncertainty where they change the answer. Select complete exchanges with enough context; do not manufacture a stronger claim by removing qualifications.

Build an edit brief and source-to-edit cut map before operations. The brief names the opening line (the viewer promise), the 50/50 opening, every chapter with its source range, one b-roll idea per idea change, what is cut and the claims to protect. Put the useful answer/proof early when it remains truthful; remove logistics, small talk, the countdown and redundant chronology. The recap is not a replay: it needs its own title and thumbnail concept, different from the livestream's (see `$metadata` and `$thumbnails`). Let actual dialogue determine cut boundaries. Review word joins, speaker reactions and audiovisual sync. Preserve the hosts' rhythm rather than imposing a uniform montage, and prefer stretches where the host speaking is looking at the lens and their energy is up over stretches where they read from a second screen.

Use the existing local folder/version contract. Native project, export, external mastering and caption timing must be reproducible from the manifest. Generate edited transcripts/captions/chapters from the final timeline, not full-stream timestamps. Recheck source meaning after changed cuts. Do not copy a one-recording sample offset to another project.

Return the editable project/export when requested plus cuts, final transcript, chapter cues and description context. Report technical checks separately from playback/listening review. Draft title/thumbnail briefs from the final edit; derive Shorts as complete points with their own clocks, using `$clips`. Shorts publish on the main channel and link the full episode.

## Current editor

Tesseract, through its installed plugin and CLI. Read its video guidance for operations and verify the pinned CLI version once per session; do not copy its schema or assume API names. If it is unavailable, prepare the brief and cut map and report the limitation instead of substituting another editor.
