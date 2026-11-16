# Thumbnails and Shorts covers

Current template, set by Vincent on 12–15 Nov 2026. The first episode made with it
was 261111 "Video Editing Is DEAD": video Pq1ZjMIQ3rg (v11b), livestream 1bAWYklLcVo
(v8a) and its five Shorts. Vincent called them "really good". This replaces the
26 Oct "no host faces" rule. The audience doesn't know the hosts yet, so the
subject carries recognition and the hosts carry the podcast feel.

## Long-form (1280x720)

- **Layout** (the "Silicon Carne" reference):
  - Vincent left, Mitchell right, both very large at the far edges and cropped by
    the frame.
  - Same head size and same eye level: lower Vincent rather than raise Mitchell.
  - No empty dark band above the heads.
- **Hosts:** natural, relaxed and confident. They look at the viewer, or toward
  the subject when the episode calls for it. Never a coy tilted smirk on Vincent.
- **Middle:** a smaller greyscale scene of the subject person (Harcourt-style
  light) doing one readable topic action. Keep it to the subject plus one prop,
  with the prop facing the subject. Metaphors that don't read are out (an arm
  wrestle was rejected).
- **Background:** dark and gritty, with a large vivid topic graphic behind the
  subject so the colour separates it from the dark.
- **Livestream:** red rim light on the hosts and the red *, never a red flood.
- **Edited video:** monochrome with the white *.
- **One episode, two scenes:** the livestream and the video use different middle
  scenes, never a recolour of the same one.
- **No text.**

## Shorts covers (1080x1920)

- **Hosts:** one host big in front, looking at the viewer, with an expression that
  fits the take. Afraid for danger or a hack, attentive when an authority speaks,
  supportive when someone is treated unfairly, a confident grin for wins. Never
  depict anyone being hurt.
- **Behind:** the other host or the subject in greyscale, plus a simple topic
  graphic.
- **Asterisk:** always red, 120x120 at x880/y345, as on the 261111 covers.
- **Approved reference:** the 261111 "v3 exciting" set.

## Production

- **Generation:** generate the whole image in one Codex imagen pass, with up to
  five reference images.
  - Never paste a face onto an earlier render.
  - Never chain edits. An edit of an edit visibly loses quality. Start every
    change from the cleanest one-pass render.
  - Downscale once, uniformly.
- **Likeness references:** Vincent comes from `vincent-locked-3x3.png` and
  Mitchell from `mitchell-locked-3x3.png`. Both are on the Studio in
  `~/content/brands/shipshitshow/_assets/sources/hosts/`. Never use video frames
  for Vincent.
- **Logos and people:** real logos and profile pictures only, from the app CDN
  (Library › Assets, `cdn.shipshit.dev/shipshitshow/resources/`). Never generate
  a logo.
- **The *:** stamped once by script from the vault SVG master. Long-form is
  96x96 at x1120/y64.
- **Export:** JPG at quality 95 or higher, under 2 MB.
- **Script checks** (never load renders into context):
  - Likeness with YuNet+SFace against the sheet plus held-out frames: own 0.40
    or higher, other 0.25 or lower.
  - Face-size gap of 5% or less.
  - OCR finds no text.
  - The * zone stays readable.
- **Review page:** native aspect ratio, verified headless at 1440 and 390 px. Show
  only what's live and the new options, never old rounds.

## Storage

- **Masters:** the clean unstamped one-pass render of each final goes to
  `s3://cdn.shipshit.dev/shipshitshow/masters/{videos|livestreams|shorts}/<id>/`
  on the day it ships. Only validated finals go there, never candidates. Codex
  keeps raw outputs in `~/.codex/generated_images/` on whichever Mac ran it.
- **Finals:** kept in the Studio episode folder
  (`~/content/brands/shipshitshow/projects/<date>_<id>/out/video/thumbnails/`).
- **Desktop:** `~/Desktop/thumbnails` is no longer used. It was emptied on
  15 Nov 2026.
