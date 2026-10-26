# Thumbnail options — 2026-10-27

Asset: livestream. Title not locked. Story: **"Models are a commodity. The harness is yours."** (talking points, PR #149).

YouTube's thumbnail test does not run on scheduled live streams. Pick one for the live, then test all three on the archive once it is eligible: https://support.google.com/youtube/answer/16391400

## Direction (Vincent, 26 Oct) — supersedes the 20 Oct direction below

- **Topic first, no host faces.** "Nobody knows us yet", so the thumbnail sells the topic, not the hosts. No people at all.
- Livestream keeps the **red asterisk**; videos stay white/black.
- Generate with Codex imagen on Vincent's Mac.

## Livestream requirements

1920x1080, predominantly monochrome charcoal backdrop, the official Genfeed logo in its own colours (exact file from the Genfeed repo or brand folder, never redrawn), the exact red asterisk (`apps/app/public/brand/asterisk-red.svg`) composited after generation at x1704, y864, 144x144, bottom-right 12 percent kept empty in the plate. Any text is a Space Grotesk Bold layer set afterwards, not generated. 320px check for every export.

**Disclosure:** Genfeed is Vincent's product. The art must not look like an outside endorsement or a sponsor slot.

## Generation

Codex CLI image tool on Vincent's Mac. References: the 13 Oct live thumbnail for house style and the official Genfeed logo. **No host photos.**

Output folder: `~/Desktop/thumbnails/2610/261027/livestream/`, named `genfeed-harness-<a-swap|b-harness|c-toolbox>-v1.png` plus the signed `.jpg`.

Shared prompt base (no people):

> Generate ONE image with your image generation tool (do not answer in text). 16:9 landscape YouTube livestream thumbnail, photographic, cinematic lighting, high contrast, readable at phone size. BACKGROUND: dark charcoal, predominantly monochrome black and grey; the only saturated colour is the official logo and the small highlights named below. REFERENCE IMAGES in order: image 1 is a previous thumbnail from this channel showing the house style (use its lighting and finish only, not its people); image 2 is the official Genfeed logo. NO PEOPLE, no faces, no hands. LOGO LOCK: reproduce the logo exactly as its reference, do not redraw or add letters. Keep the bottom-right corner (the last 12 percent of width and height) empty dark background, nothing in it. Keep the upper-left 40 percent by 20 percent plain dark (a text layer goes there). NO text, no letters, no numbers, no watermark.

## A — The swap (live default)

- **Hypothesis:** the thesis in one picture: the model is the swappable part, the rig around it stays.
- **Viewer inference:** "models come and go; what you build around them is what matters."
- **Composition:** a heavy dark machined rig in the centre-right with the Genfeed logo glowing on it; a slot in its middle where a small glowing core is being slid out, and a row of identical blank grey cores lined up beside it, waiting. Text layer: `MODELS ARE RENTED`.
- **Concept prompt:**

> CONCEPT A, the swap. Centre-right, a solid dark machined metal rig, like a high-end engine block or server chassis, with the official Genfeed logo glowing on its front exactly as the reference. In the middle of the rig an open slot; a small glowing white cylindrical core is halfway slid out of it. To the left, a neat row of four identical blank grey cores standing on the dark surface, unlit, interchangeable. Soft rim light on the rig. All surfaces blank of writing.

- **Small-size check:** the logo and the half-ejected core read at 320px; `MODELS ARE RENTED` readable.

## B — The harness

- **Hypothesis:** "harness" made literal reads instantly and is unusual for an AI thumbnail.
- **Viewer inference:** "the thing around the AI is the product."
- **Composition:** a small plain glowing orb (the model) held in the centre of a large, intricate dark harness of cables, rails and connectors that fans out to output tiles (a product photo, a video frame with a play icon, a social post card). Genfeed logo top-centre. Text layer: `THE HARNESS IS YOURS`.
- **Concept prompt:**

> CONCEPT B, the harness. In the centre a small plain glowing white orb, about 8 percent of the frame width. Around it, filling most of the frame, a large intricate dark harness of braided cables, metal rails and connectors that holds the orb and fans out to the right into three floating tiles of finished media in natural colour: a product photo, a short video frame with a play icon, a social media post card, all blank of writing. The official Genfeed logo, exactly as the reference, glows at the top centre. The harness is far more detailed and larger than the orb.

- **Small-size check:** the orb-versus-harness size contrast must read at 320px; cut tiles if cluttered.

## C — The toolbox

- **Hypothesis:** Vincent's opening (the toolbox gives the agent its tools) as an object people already understand.
- **Viewer inference:** "an open-source toolbox for an AI agent."
- **Composition:** an open dark metal toolbox lit from inside, with the Genfeed logo on its lid; instead of tools, glowing media objects in the trays (a camera lens, a film strip, a microphone, a post card). Text layer: `OPEN SOURCE`.
- **Concept prompt:**

> CONCEPT C, the toolbox. Centre, a large open dark metal toolbox with cantilever trays, lit warmly from inside. The official Genfeed logo, exactly as the reference, on the lid. In the trays, instead of hand tools, small glowing objects for media: a camera lens, a strip of film, a studio microphone, a blank social post card. Everything blank of writing.

- **Small-size check:** the box shape and logo read at 320px.

## Default if the test is inconclusive

Keep A.

## Superseded: 20 Oct concepts (hosts on screen)

Kept for the record; replaced by Vincent's 26 Oct no-faces direction above.

## A — The studio (live default)

- **Hypothesis:** showing the studio making real media sells "AI studio" at a glance.
- **Viewer inference:** "a full AI content studio, and it's open source."
- **Composition:** both hosts in front of a large dark monitor wall showing a node-based workflow canvas: connected nodes feeding into a grid of generated output tiles (product photos, short video frames, a voice waveform, a social post card). The Genfeed logo glows top-centre on the wall. Vincent pointing at it, proud; Mitchell impressed. Exact text `OPEN SOURCE` as a layer in Space Grotesk Bold, white, upper left.
- **Concept prompt:**

> CONCEPT A, the studio. Vincent chest-up at the left, grinning proudly and pointing at a large dark wall-size screen behind and between the hosts; Mitchell chest-up at the right, impressed grin, looking at it. The screen shows a dark node-based workflow editor: rounded rectangular nodes connected by thin glowing lines, flowing into a grid of finished media tiles: a product photo, a short video frame with a play icon, an audio waveform, a social media post card. Tiles are in natural colour, everything else monochrome. The official Genfeed logo, reproduced exactly as the reference, glows at the top centre of the screen. All tiles and nodes are blank of writing: no letters, no numbers, no UI text. Keep the upper-left 35 percent by 18 percent of the frame plain dark background (a text layer goes there). No text in the image.

- **Small-size check:** the logo, the media tiles and both faces read at 320px; `OPEN SOURCE` readable.

## B — The real studio (after the dry run)

- **Hypothesis:** the actual Genfeed UI is the strongest proof.
- **How to make it:** use `genfeed-selfhost-b-terminal-base-plate-v2` (empty centre) and composite a **real screenshot of the running Genfeed studio** from Vincent's dry run (workflow canvas or generated results, secrets blurred), plus the exact Genfeed logo and `OPEN SOURCE` text layer. Never generate a fake UI.
- **Small-size check:** crop to the most visual part (generated media), not menus.

## C — Everything from one brief

- **Hypothesis:** one logo exploding into every media type says "studio" without UI.
- **Viewer inference:** "one open-source tool makes all of this."
- **Concept prompt:**

> CONCEPT C, one brief, every format. The official Genfeed logo, reproduced exactly as the reference, glows at the centre, about 18 percent of the frame width. Bursting outward from it in a fan: floating tiles of finished media in natural colour (a product photo, a short video frame with a play icon, a portrait image, an audio waveform, a social post card), all blank of writing. Vincent at the left and Mitchell at the right, both excited, watching the tiles fly past. Charcoal monochrome background. Keep the upper-left 35 percent by 18 percent plain dark. No text in the image.

- Text layer `OPEN SOURCE`, as in A.
- **Small-size check:** the logo stays the focal point at 320px; reduce the tile count if it reads as clutter.

