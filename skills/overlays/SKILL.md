---
name: overlays
description: Add AI-illustrated motion graphics, subtitles and overlays to a plain recorded video, from reference-style asset sheets through previewed iterations.
---

# Illustrated overlays

## Channel context

Use the user's channel profile and actual source asset. For Ship Sh!t Show, read [the bundled profile](references/channel-profile.md); viewers using another channel should provide their audience, voice, formats, links and visual references. A profile is context, not permission to publish, upload footage, buy generation or contact a partner.

For the bundled show, use the canonical kit's editing rules and inventory linked in the profile as the established house reference. Keep text native/editable and record kit revision, logo hash, fonts and approved overrides. Generated boards are design references, not source footage, authorized replacement likenesses or finished overlays.

Start from the plain recording and the approved cut map, not a pre-styled edit. Read the existing project manifest. Time every graphic to the words actually spoken, using the edited transcript or captions from the final timeline rather than full-stream timestamps.

Fix a style reference first: a clip or stills with known rights. State its palette, type, motion, transitions and layout in words before building. If none exists, ask for one; do not invent a house style.

Split the work by what each tool does well. Typography, subtitles, layout, tracking, transitions and timing are native editable layers in the editor. Detailed or realistic illustration (objects, places, maps, characters, backgrounds) is generated as images; text and simple shapes alone rarely carry a point that needs a picture, so treat a first pass of only those as a draft, not a result.

For the illustration step, list the visuals each transcript beat needs, then write one prompt per asset sheet in the reference style: isolated items on a plain ground so they can be cut out, plus vertical backgrounds when the format needs them, at a resolution that survives scaling. Generate with the channel's image tool. For Ship Sh!t Show the default is Codex image generation; use Genfeed when the asset belongs in the show's brand or org library. Generation can bill and a library upload publishes to an account, so each needs the user's go-ahead for that run. Logos, real people and facts shown on screen must come from supplied or licensed files, not from a generated likeness. Upscale or refine weak sheets before use, and record prompt, tool, model, date and rights with the asset.

Keep assets under the project's `assets/` per the folder contract and reference them instead of duplicating. Import sheets as separate layers and animate the cut-outs against the dialogue; never flatten a whole design into one image. Grade or desaturate the host clip as an editable effect when the graphics need it, and use a split layout only when the format calls for it. A generated reference is approximated, not reproduced, so judge the result on screen; a reference still beats none.

For overlays that must follow a subject or camera, inspect the real footage at the placement and tracked motion. When perspective or placement keeps coming back wrong, give a rough marked-up frame of the intended plane instead of repeating the text instruction.

Preview before a full render and correct at the preview. Iterate with spoken or written notes, and expect more than one pass. Check subtitle legibility, every number and name against the source, sync with the dialogue and the cut joins. Report technical checks separately from a watch-through review, and keep the review pending when no one has watched it. Hand cuts to recap, audio to dialogue, folders and versions to library, and derive title and thumbnail briefs from the final edit.

## Current editor

Tesseract, through its installed plugin and CLI. Read its motion and video guidance for operations and verify the pinned CLI version once per session; do not copy its schema or assume API names. If it is unavailable, prepare the style brief, asset-sheet prompts and beat list and report the limitation.
