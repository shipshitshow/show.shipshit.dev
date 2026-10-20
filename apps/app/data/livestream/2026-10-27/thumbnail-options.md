# Thumbnail options — 2026-10-27

Asset: livestream. Title held fixed: `I Self-Host My Own AI Content Agent, Live` (not locked yet; regenerate nothing if only the title changes, the art carries no text).

YouTube's thumbnail test does not run on scheduled live streams. Pick one for the live, then test all three on the archive once it is eligible: https://support.google.com/youtube/answer/16391400

## Livestream requirements

Same as `2026-10-20/thumbnail-options.md`: 1920x1080, natural-colour hosts (Vincent left, Mitchell right) on a predominantly monochrome charcoal backdrop, official logos in their own colours, the exact red asterisk composited at x1704, y864, 144x144, bottom-right corner kept empty in the generated plate, 320px check.

**Disclosure:** Genfeed is Vincent's product. The art must not look like an outside endorsement or a sponsor slot.

## Generation

Codex CLI image tool on Vincent's Mac. References: Vincent and Mitchell photos (paths in the 20 Oct file), the 13 Oct live thumbnail for house style, and the official Genfeed logo from the Genfeed repo or brand folder (use the exact file; do not let the generator invent one).

Output folder: `~/Desktop/thumbnails/2610/261027/livestream/`, named `genfeed-selfhost-<a-home-server|b-terminal|c-off-cloud>-v1.png` plus the signed `.jpg`.

Shared prompt base: as on 20 Oct, with the last reference image being the official Genfeed logo.

## A — The home server (live default)

- **Hypothesis:** "self-hosted" reads fastest as hardware on your own desk.
- **Viewer inference:** "he runs the whole thing on his own machine."
- **Composition:** Vincent left, proud grin, one hand on a compact glowing home server box on a desk; the Genfeed logo glows on its front. Mitchell right, arms crossed, sceptical half-smile.
- **Concept prompt:**

> CONCEPT A, the home server. Vincent chest-up at the left, grinning proudly, resting one hand on a compact dark home server box on a desk in front of him; the official Genfeed logo glows softly on the front panel of the box, reproduced exactly as the reference. Mitchell chest-up at the right, arms crossed, sceptical half-smile, looking at the box. Dark charcoal studio, small status lights on the box. No text.

- **Small-size check:** the box, the logo and both faces read at 320px.

## B — The terminal (only after the dry run)

- **Hypothesis:** real proof beats a metaphor for a demo show.
- **Viewer inference:** "they actually install it live."
- **How to make it:** generate the hosts looking and pointing at an empty centre, then **composite a real screenshot from Vincent's dry run** (the terminal running `npx @genfeedai/create`, or the running web UI with secrets blurred). Never generate a fake terminal or UI.
- **Concept prompt (base plate):**

> CONCEPT B, base plate. Vincent chest-up at the left edge and Mitchell chest-up at the right edge, both turned toward the centre, Vincent pointing at it, Mitchell leaning in with raised eyebrows. The CENTRE of the frame, from about 28 percent to 72 percent of the width and from 12 percent to 88 percent of the height, must be EMPTY smooth dark background with only a faint grey glow: no screens, no logos, no shapes, no text. No text anywhere.

- **Small-size check:** at 320px the screenshot must read as "a terminal" or "an app", not text soup. Crop to the biggest, clearest part.

## C — Off the cloud

- **Hypothesis:** a pull-it-down-from-the-cloud image sells ownership of your data.
- **Viewer inference:** "you don't need their cloud."
- **Composition:** the Genfeed logo being pulled down out of a grey cloud by Vincent, into a box on the desk; Mitchell watching, impressed.
- **Concept prompt:**

> CONCEPT C, off the cloud. A grey, monochrome cloud shape floats in the upper centre. Vincent at the left reaches up and pulls the official Genfeed logo, reproduced exactly as the reference, down out of the cloud toward a small dark box on the desk. Mitchell at the right watches with an impressed grin. No text.

- **Small-size check:** the logo must stay recognisable at 320px; if the cloud reads as smoke, simplify it.
- **Note:** self-hosting still calls model providers in the cloud (see the board). The image is about owning the app and data, which is accurate; don't add "no cloud" text.

## Default if the test is inconclusive

Keep A.
