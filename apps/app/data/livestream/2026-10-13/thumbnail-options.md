# Thumbnail options — 2026-10-13

Asset: livestream. Title held fixed: `Muse Wonder: Better Than Fable 5.1 or Opus 5.5?`

YouTube's thumbnail test does not run on scheduled live streams. Pick one for the live; test all three on the archive once it is eligible (YouTube decides on watch time, not CTR alone): https://support.google.com/youtube/answer/16391400

**v3 (current), channel style:** both hosts, big glowing logos, excited, **no text**. Files are in `~/Desktop/thumbnails/2610/261013/livestream/` as `muse-wonder-better-than-fable-opus-<a-faceoff|b-benchmark|c-muse-reveal>-v3.png` and `.jpg`. v1 and v2 (text-based) in the same folder are superseded. Nothing has been uploaded.

Generated with the Codex CLI image tool (1672x941, scaled to 1920x1080). References: the 6 Oct live thumbnail (hosts, Muse M mark, style), the 29 Sep live thumbnail (hosts, Claude starburst, light rays), Vincent `~/Desktop/references/vincent/IMG_5598.JPG`, Mitchell `~/Desktop/thumbnails/pfps/mntll_nl/cn56n8gmq5rmw0cwp44ap7mqsw.jpg`. Wardrobe as in recent lives: Vincent black hoodie, Mitchell navy polo.

Logos: the Muse M mark as used on the 6 Oct thumbnail, and the Claude starburst as used on 29 Sep. Meta publishes no separate Muse Code logo that I could find.

Shared prompt base:

> Generate ONE image with your image generation tool (do not answer in text). 16:9 landscape YouTube livestream thumbnail, 1920x1080, photographic, cinematic lighting, dark background, high contrast, readable at phone size. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS anywhere in the image. REFERENCE IMAGES in order: image 1 and image 2 are previous thumbnails from this channel showing the two hosts and the house style: Vincent is the bald host with stubble on the left, Mitchell is the host with swept-back dark brown hair and blue eyes on the right. Image 1 also shows the Muse logo, the flowing white handwritten-style M mark. Image 2 also shows the Claude logo, the radiating starburst mark. Image 3 is a photo of Vincent, image 4 is a photo of Mitchell. IDENTITY LOCK: both hosts keep their exact faces from the references, natural skin, no beautification. WARDROBE: Vincent in a plain black hoodie, Mitchell in a plain navy polo. LOGO LOCK: reproduce the Muse M mark and the Claude starburst exactly as they appear in the references, do not redraw them into other shapes, do not add letters. MOOD: both hosts are genuinely EXCITED and hyped, big grins, eyebrows up, energetic, natural not cartoonish.

## A — Face-off (live default)

- **Hypothesis:** a head-to-head of the two marks matches the title's comparison and the channel's best-known format (the GPT vs Opus face-off).
- **Viewer inference:** "Meta's Muse vs Claude, settled."
- **Concept prompt:**

> CONCEPT A, the face-off. Vincent chest-up at the left edge, Mitchell chest-up at the right edge, both turned toward the centre with excited grins. In the centre, two large glowing logos facing off: on the left-centre the Muse M mark glowing electric Meta blue, on the right-centre the Claude starburst glowing warm orange, with a crackling burst of energy and sparks where the blue and orange glows collide in the middle. Dark background split by the two colours. No text.

- **Small-size check:** both marks and both faces read at 320px.

## B — The benchmark

- **Hypothesis:** real numbers are the proof people want before clicking a "better than" title.
- **Viewer inference:** "they'll walk through the actual scores."
- **How it was made:** Codex generated the hosts pointing at an empty centre; the panel is **composited from Meta's own chart image** (from @finkd's launch post), not generated, so every number is exact. Columns kept: Muse Wonder Full, Claude Fable 5.1, Claude Opus 5.5 (all "max"). Rows kept: Terminal-Bench 4.0-AA (Opus ahead), DeepSWE 1.1 (Wonder ahead), SWE-Marathon (Wonder ahead, marked xhigh), Artificial Analysis Index (Opus ahead). Two wins each way, so it does not cherry-pick. The red frame marks the Wonder Full column.
- **Concept prompt (base plate):**

> CONCEPT B, base plate for a scoreboard. Vincent chest-up at the left edge and Mitchell chest-up at the right edge, both turned toward the centre, looking at the centre with excited open-mouth grins as if reading great results, Vincent pointing at the centre. The CENTRE of the frame, from about 30 percent to 70 percent of the width and from 12 percent to 90 percent of the height, must be EMPTY smooth dark background with only a soft blue and red glow, nothing in it: no logos, no screens, no shapes, no text. No text anywhere.

- **Small-size check:** at 320px the table reads as a scoreboard and the red column stands out; the numbers are only legible at full size. This is the one thumbnail with text, and it is Meta's real chart.
- **Note:** these are Meta's numbers except the Artificial Analysis row. Say so on air.

## C — The reveal

- **Hypothesis:** pure hype, the giant mark with light rays, in the style of the 29 Sep live thumbnail. View counts across lives of different ages are not comparable, so this is a style choice, not a proven winner.
- **Viewer inference:** "Meta dropped something big."
- **Concept prompt:**

> CONCEPT C, the reveal. A huge Muse M mark glowing bright white with a blue edge glow floats high in the centre, casting dramatic volumetric light rays down onto the two hosts, like image 2. Vincent at the lower left and Mitchell at the lower right, both looking up at the glowing M with excited, amazed grins. Dark blue-black background with light beams. No other logos. No text.

- **Small-size check:** the M and both faces read at 320px.
- **Note:** it does not show Claude, so it carries less of the title's comparison.

## Default if the test is inconclusive

Keep A.

## After the test

Record the test date, the archive URL, what stayed fixed (title) and YouTube's actual result. An inconclusive test is inconclusive.
