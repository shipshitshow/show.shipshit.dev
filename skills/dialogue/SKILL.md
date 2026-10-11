---
name: dialogue
description: Improve dialogue in an edit with recording-specific treatment, sync verification and an honest listening review.
---

# Dialogue treatment

## Channel context

Use the user's channel profile and actual source asset. For Ship Sh!t Show, read [the bundled profile](references/channel-profile.md); viewers using another channel should provide their audience, voice, formats, links and visual references. A profile is context, not permission to publish, upload footage, buy generation or contact a partner.

Inspect the actual recording: levels, clipping, room sound, noise, overlapping voices and music. Read the existing project recipe. Use recording-specific treatment; a historical Premiere preset or one episode's timing offset is not a universal default.

Apply only supported operations within the edit request. External tools/libraries require availability and authorization; do not install or bill a cloud denoiser implicitly. Preserve source audio. Record processing chain, parameters, tool versions and how mastered audio rejoins the native timeline.

Measure export metadata and relevant loudness/peak values when tools are available. Listen to representative speech, difficult passages and changed joins; inspect lip sync across the timeline. Music must not obscure dialogue and must have a usable license/source. Measurement alone does not establish clean speech, natural tone or sync.

Save treatment notes and verified/unverified results with the version/final manifest. If listening is unavailable, state that directly and keep subjective approval pending. Do not describe noise removal or smooth joins as proved by a successful render.

## Current editor

Tesseract, through its installed plugin and CLI. Read its audio guidance for supported operations and verify the pinned CLI version once per session; do not assume an operation exists. If it is unavailable, write the treatment plan and report the limitation.
