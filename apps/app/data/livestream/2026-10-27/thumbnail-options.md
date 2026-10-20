# Thumbnail options — 2026-10-27

Asset: livestream. Title held fixed: `I Self-Host Genfeed, an Open-Source AI Studio` (not locked).

YouTube's thumbnail test does not run on scheduled live streams. Pick one for the live, then test all three on the archive once it is eligible: https://support.google.com/youtube/answer/16391400

## Livestream requirements

Same as `2026-10-20/thumbnail-options.md`: 1920x1080, natural-colour hosts (Vincent left, Mitchell right) on a predominantly monochrome charcoal backdrop, official logos in their own colours, the exact red asterisk composited at x1704, y864, 144x144, bottom-right corner kept empty in the generated plate, 320px check.

**Disclosure:** Genfeed is Vincent's product. The art must not look like an outside endorsement or a sponsor slot.

## Generation

Codex CLI image tool on Vincent's Mac. References: Vincent and Mitchell photos (paths in the 20 Oct file), the 13 Oct live thumbnail for house style, and the official Genfeed logo from the Genfeed repo or brand folder (use the exact file; do not let the generator invent one).

Output folder: `~/Desktop/thumbnails/2610/261027/livestream/`, named `genfeed-studio-<a-studio|b-real-ui|c-one-brief>-v1.png` plus the signed `.jpg`.

Shared prompt base: as on 20 Oct, with the last reference image being the official Genfeed logo.

## Direction (Vincent, 20 Oct)

The thumbnail is about **genfeed.ai** itself, and it must read as an **open-source AI studio**: a creative workspace that makes images, video, voice and posts from one place, that you own. The v1 home-server and cloud concepts are superseded; they sold "hardware" instead of the studio.

Anatomy (Vincent, 20 Oct: the arm in v1 C was broken): no reaching, lifting or holding poses. Hosts chest-up with natural arm positions only (pointing at most). Reject any output with a twisted, detached, extra or wrong-length arm, hand or finger at full size, not just at 320px.

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

## Default if the test is inconclusive

Keep A.
