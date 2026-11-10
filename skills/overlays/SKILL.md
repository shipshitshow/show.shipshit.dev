---
name: overlays
description: Add AI-illustrated motion graphics, subtitles and overlays to a plain recorded video, from reference-style asset sheets through previewed iterations.
---

# Illustrated overlays

## Channel context

Use the user's channel profile and actual source asset. For Ship Sh*t Show, read [the bundled profile](references/channel-profile.md); viewers using another channel should provide their audience, voice, formats, links and visual references. A profile is context, not permission to publish, upload footage, buy generation or contact a partner.

For the bundled show, use the canonical kit's editing rules and inventory linked in the profile as the established house reference. Keep text native/editable and record kit revision, logo hash, fonts and approved overrides. Generated boards are design references, not source footage, authorized replacement likenesses or finished overlays. Place the asterisk exactly as [the placement table](https://github.com/shipshitshow/vault/blob/master/brand/placement.md) says, from the same three SVG masters; never redraw it or pick a corner or size by eye.

## Locked edit style for Ship Sh*t Show (load it first)

Before any graphic, read [the edit rules](https://github.com/shipshitshow/vault/blob/master/brand/editing.md), and in a checkout of the show repo `docs/show-prep/edit-style.md` (Vincent's decisions of 3 to 5 November 2026). They override the generic steps below wherever they differ. Do not invent a house style when asking for a reference: this is it.

- No text title cards, no topic-label cards between segments, no lower-third topic labels. Graphics are illustrations, real screenshots and the red slash-stinger wipe.
- Hard cuts in and out. No fades to black, no dissolves, no alpha fades on overlays. Motion inside an animation is fine; the cut into and out of it is hard.
- No zoom or push-in on the hosts. Zoom on screen content only when it lands on a specific point.
- B-roll is animated SVG generated with Codex CLI, not static images with a slow push-in. Plan the whole list before rendering: one animation per idea change, and no more than about a minute of talking without one. Real screen captures stay still.
- Generated art has no text, no faces and no brand logos, uses charcoal with a muted red, and is logged in the episode's `assets/manifest.json` with prompt, tool, date and rights. A real logo or screenshot comes from a supplied file.
- For a Short, build the animation for 9:16 with its subject centred, so a vertical crop keeps it. A 16:9 crop that misses the subject is rejected.
- Captions are native and editable: white with the spoken word in show red `#E83B3B`, corrected grammar and ASR names. Never all red, never a box. The Shorts values are in the edit style.
- Show the b-roll list and one finished sample to Vincent before rendering the rest.

Start from the plain recording and the approved cut map, not a pre-styled edit. Read the existing project manifest. Time every graphic to the words actually spoken, using the edited transcript or captions from the final timeline rather than full-stream timestamps.

For another channel, fix a style reference first: a clip or stills with known rights. State its palette, type, motion, transitions and layout in words before building. If none exists, ask for one; do not invent a house style.

Split the work by what each tool does well. Typography, subtitles, layout, tracking, transitions and timing are native editable layers in the editor. Detailed or realistic illustration (objects, places, maps, characters, backgrounds) is generated as images (for Ship Sh*t Show: as animated SVG, see above); text and simple shapes alone rarely carry a point that needs a picture, so treat a first pass of only those as a draft, not a result.

For the illustration step, list the visuals each transcript beat needs, then write one prompt per asset sheet in the reference style: isolated items on a plain ground so they can be cut out, plus vertical backgrounds when the format needs them, at a resolution that survives scaling. Generate with the channel's image tool. For Ship Sh*t Show the default is Codex image generation; use Genfeed when the asset belongs in the show's brand or org library. Generation can bill and a library upload publishes to an account, so each needs the user's go-ahead for that run. Logos, real people and facts shown on screen must come from supplied or licensed files, not from a generated likeness. Upscale or refine weak sheets before use, and record prompt, tool, model, date and rights with the asset.

Keep assets under the project's `assets/` per the folder contract and reference them instead of duplicating. Import sheets as separate layers and animate the cut-outs against the dialogue; never flatten a whole design into one image. Grade or desaturate the host clip as an editable effect when the graphics need it, and use a split layout only when the format calls for it. A generated reference is approximated, not reproduced, so judge the result on screen; a reference still beats none.

For overlays that must follow a subject or camera, inspect the real footage at the placement and tracked motion. When perspective or placement keeps coming back wrong, give a rough marked-up frame of the intended plane instead of repeating the text instruction.

Preview before a full render and correct at the preview. Iterate with spoken or written notes, and expect more than one pass. Check subtitle legibility, every number and name against the source, sync with the dialogue and the cut joins. Report technical checks separately from a watch-through review, and keep the review pending when no one has watched it. Hand cuts to recap, audio to dialogue, folders and versions to library, and derive title and thumbnail briefs from the final edit.

## Current editor

Tesseract, through its installed plugin and CLI. Read its motion and video guidance for operations and verify the pinned CLI version once per session; do not copy its schema or assume API names. If it is unavailable, prepare the style brief, asset-sheet prompts and beat list and report the limitation.
