---
name: tesseract-thumbnails
description: Create and revise Ship Shit Show recap thumbnails with original host likeness, current channel examples, exact brand marks and a reproducible prompt archive.
---

# Show recap thumbnails

Read the show's current canonical rules at the repository's skills/thumbnails/SKILL.md and the available imagegen skill. Use the built-in image generation tool; use a CLI/provider fallback only when explicitly authorized. Recaps use one host plus a strong logo/result and bold short headline; they are not the two-host livestream template.

## Inputs and likeness

Establish the topic and verdict from the actual edited transcript. Use the user's chosen host; when unspecified, inspect the last edited-video thumbnail and alternate hosts rather than assuming. Shared original PFPs are assets/pfps/mitchell.jpg and vincent.jpg; their canonical sources are the show's Desktop thumbnail PFP folders.

Inspect the original PFP and at least three relevant channel examples before designing. Use originals for face identity, channel examples for composition/typography and exact logo assets for brand silhouettes. Label those input roles separately. Do not let a style-reference face become the subject.

When a face degrades after revisions, rebuild from the original high-resolution PFP instead of generating another generation of the already-generated face. A permitted expression change must preserve facial geometry, age, hair and eyes. Prefer natural detail and neutral light; avoid etched wrinkles, crunchy sharpening, waxy smoothing, invented teeth or a sticker-like cutout. Do not claim original pixels were preserved when generation changed them.

Keep integration simple: one strong portrait, one logo/result, a short headline and one model/version group if needed. Use natural hair edges, a restrained edge light and a coherent dark background. Avoid extra panels, diagonal dividers, flare beams and redundant labels unless the requested concept calls for them. Preserve the approved wording and brand palette through unrelated revisions.

## Copy and branding

Use exact full model names in title/description context; thumbnail text can be simplified when requested, such as a single “5.5” beside a recognizable brand mark. Make the result legible at 320×180. For a historical verdict, keep past-tense wording when requested; don't silently turn it into a current ranking.

Use the supplied flat logo silhouette, preserving irregular rays/gaps rather than inventing a generic star or flower. If a white transparent asset is invisible in preview, inspect its alpha diagnostic while telling the generator to use only the symbol. Never insert the diagnostic caption/card.

Follow the requested palette; when using a product brand's colors, verify authoritative brand tokens. Anthropic's verified October 1 example is clay #D97757, ivory #FAF9F5/#F0EEE6 and slate #141413. Do not impose that palette on unrelated episodes.

## Generation and delivery

For surgical edits, list what changes and what stays. For a likeness/layout rebuild, explicitly use the original PFP as identity source and the selected layout only for architecture. Inspect all local inputs before calling image generation. Generate separate variants when requested and review every variant; don't substitute a contact sheet for individual usable files.

Keep native generated originals and standalone prompts. Save selected 1920×1080 JPG and PNG siblings in ~/Desktop/thumbnails/<YYMM>/<YYMMDD>/video/, using the recording date. Save prompts, manifests and useful intermediates in that dated folder's sources/. Generated thumbnails remain outside this repo.

Inspect at full size and 320×180 for likeness, headline spelling, logo shape, clipping, face/logo separation and palette. Prefer a fresh original-photo rebuild for a poor face; don't pile more sharpening onto it.

Record the selected external JPG/PNG paths in the media project's final/manifest.json external_artifacts. Give the actual file links and saved prompt, and identify the generation tool. Do not upload to YouTube or replace the channel thumbnail without authorization.
