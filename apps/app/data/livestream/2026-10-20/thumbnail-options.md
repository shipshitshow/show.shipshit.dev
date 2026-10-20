# Thumbnail options — 2026-10-20

Asset: livestream. Title held fixed: `We Cut Codex, Our Claude Max Costs $0 and Grok Bot Has Email`

YouTube's thumbnail test does not run on scheduled live streams. Pick one for the live, then test all three on the archive once it is eligible (YouTube decides on watch time, not CTR alone): https://support.google.com/youtube/answer/16391400

## Livestream requirements (vault brand kit, 16 Oct)

- 1920x1080 export (16:9). Hosts in natural colour, Vincent left and Mitchell right, against a **predominantly monochrome charcoal backdrop**. Official topic logos keep their own colours; no coloured background washes.
- **Livestream signature:** the exact red six-arm asterisk (`apps/app/public/brand/asterisk-red.svg`, same file as `vault/brand/assets/asterisk-red.svg`, sha256 `5e0db98a…`) composited after generation, never generated. At 1920x1080 it sits at x1704, y864, 144x144 (the 1280x720 token x1136/y576, 96x96, scaled 1.5x; 72px right and bottom insets). No box, dot, waves or second copy.
- Logos are production layers: reproduce the official mark from a reference, or composite it, never a redrawn look-alike.
- Text is optional. Keep any text short and spelled exactly as written below.
- Check every export at 320px wide for likeness, logo accuracy and the signature.

## Generation

Codex CLI image tool on Vincent's Mac, as for the 13 Oct thumbnails. References in order:

1. Vincent: `~/Desktop/references/vincent/IMG_5598.JPG`
2. Mitchell: `~/Desktop/thumbnails/pfps/mntll_nl/mntll_nl.jpg`
3. 13 Oct live thumbnail v3 A, house style: `~/Desktop/thumbnails/2610/261013/livestream/`
4. Official logos: OpenAI knot (Codex), Claude starburst, xAI Grok mark. Reuse the files from the 29 Sep and 6 Oct thumbnails where they exist.

Output folder: `~/Desktop/thumbnails/2610/261020/livestream/`, named `stack-<a-swap|b-zero-bill|c-bot-inbox>-v1.png` plus the signed `.jpg`.

Shared prompt base:

> Generate ONE image with your image generation tool (do not answer in text). 16:9 landscape YouTube livestream thumbnail, photographic, cinematic lighting, high contrast, readable at phone size. BACKGROUND: dark charcoal, predominantly monochrome black and grey; the only saturated colours are the hosts' natural skin and the official logos. REFERENCE IMAGES in order: image 1 is a photo of Vincent, the bald host with stubble and hazel eyes; image 2 is a photo of Mitchell, the host with swept-back brown hair and blue eyes; image 3 is a previous thumbnail from this channel showing the house style; the remaining images are official logos. IDENTITY LOCK: both hosts keep their exact faces from images 1 and 2, natural skin, no beautification. WARDROBE: Vincent in a plain black hoodie, Mitchell in a plain navy polo. LOGO LOCK: reproduce each logo exactly as its reference, do not redraw or add letters. Keep the bottom-right corner (the last 12 percent of width and height) empty dark background, nothing in it. NO other text, no watermark, no extra people.

## A — The swap (live default)

- **Hypothesis:** the clearest promise is the first claim in the title: we dropped Codex for Claude.
- **Viewer inference:** "they switched, and they'll say why."
- **Composition:** Vincent chest-up left, Mitchell chest-up right, both grinning. Centre-left, the OpenAI knot small, desaturated grey and falling away into shadow; centre-right, the Claude starburst large, in its official orange, softly glowing. No text.
- **Concept prompt:**

> CONCEPT A, the swap. Vincent chest-up at the left edge and Mitchell chest-up at the right edge, both turned toward the centre with confident grins. In the centre two logos: on the left-centre the OpenAI knot logo, small, fully desaturated grey, tilting and dropping into shadow; on the right-centre the Claude starburst logo, about 25 percent of the frame width, in its official orange, with a soft warm glow. No text.

- **Small-size check:** both faces and the bright starburst read at 320px; the grey knot may only read as "the old one", which is fine.

## B — The $0 bill

- **Hypothesis:** a surprising number pulls the click, and the title already carries it.
- **Viewer inference:** "how is a $200 plan free?" The episode answers it, with the API credit caveat.
- **Composition:** both hosts leaning in, amazed, at a huge white "$0" in the centre with the Claude starburst small beside it.
- **Exact text:** `$0`
- **Concept prompt:**

> CONCEPT B, the zero bill. Vincent at the left and Mitchell at the right, both leaning toward the centre with amazed, delighted open-mouth grins. In the centre, huge bold white characters "$0" in a heavy condensed sans serif, about 35 percent of the frame height, crisp and readable. Small Claude starburst logo in official orange just above the top right of the "$0". The only text in the image is exactly "$0".

- **Small-size check:** "$0" must be the first thing read at 320px. If the generator misspells or adds characters, generate the plate without text and set "$0" in Space Grotesk Bold as a layer.
- **Note:** keep the caveat on air: it nets to $0 only because the $200 API credit covers API spend we already had.

## C — The bot inbox

- **Hypothesis:** a funny, specific warning (don't post your bot's email) is more clickable than a stack list.
- **Viewer inference:** "something went wrong with Grok Bot's email."
- **Composition:** the xAI Grok mark centre, a flood of white envelopes pouring out of it toward Mitchell, who is shielding himself; Vincent laughing.
- **Concept prompt:**

> CONCEPT C, the bot inbox. In the centre the xAI Grok logo, white, about 20 percent of the frame width. A chaotic flood of plain white paper envelopes bursts out of it toward the right. Mitchell at the right edge raises his hands to shield himself from the envelopes, wide-eyed; Vincent at the left edge laughs. Envelopes are blank, no writing, no addresses. No text.

- **Small-size check:** the envelope flood and both faces read at 320px; the Grok mark must stay recognisable.
- **Note:** Vincent hasn't tried the email yet; the thumbnail shows the risk we warn about, not something that happened.

## Default if the test is inconclusive

Keep A.

## After the test

Record the test date, the archive URL, what stayed fixed (title) and YouTube's actual result. An inconclusive test is inconclusive. After saving a signed thumbnail in Studio, add the video ID to `apps/app/src/lib/data/branded-thumbnails.json`.

## Generated (20 Oct)

Codex CLI image tool on the Mac Studio, 20 Oct. In `~/Desktop/thumbnails/2610/261020/livestream/`, each a 1920x1080 `.png` plus a signed `.jpg`; nothing uploaded.

- A: `stack-a-swap-v2` (v1 failed: fist in the signature corner). Claude mark is a generic 12-ray starburst, not the exact shape; composite the official mark before upload.
- B: `stack-b-zero-bill-v1`. Text is exactly "$0". Same Claude mark caveat.
- C: `stack-c-bot-inbox-v1`.
- Mitchell's polo sits behind the asterisk on most; legible, but the corner is not bare backdrop.
