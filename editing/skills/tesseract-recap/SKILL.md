---
name: tesseract-recap
description: Turn local livestream footage into a clean Tesseract recap with natural dialogue, chapter pans, source cut timestamps, and both full and edited transcripts.
---

# Livestream recap delivery

Use tesseract-projects for folders. Apply the installed Tesseract video skill for CLI setup, native authoring, timeline clocks, motion and rendering; preserve the user's choice of Tesseract rather than Premiere. Do not substitute cloud editing or generative video.

## Understand the recording

Read the entire source transcript and inspect footage at relevant moments before choosing the thesis. Extract a full-source transcript into raws/transcript.{txt,md,srt,vtt}. Keep the recording date, model names/versions, speakers' actual experience and conclusions straight. Distinguish a recorded verdict from a current model ranking or later product release. Correct recurring technical-name errors against the footage/context without inventing speech.

For a requested 10–15-minute recap, keep the useful argument and conclusion, cut setup/repetition/dead air, and retain context that makes the claims understandable. Preserve source time separately from recap time. Keep every included source in/out range and removal decision in an edit plan under outputs/work.

## Natural dialogue and chapters

Filler removal is contextual. Remove redundant “like,” “but,” false starts, repeated words and pauses only when the sentence remains natural. Keep meaningful conjunctions, hesitations that convey intent, quiet word endings and breaths. Use word-level ASR alignment and opened source waveforms as cut candidates, then review each splice. A transcript match alone does not prove a clean audible edit.

Use native footage layers with stable IDs, activeRange for destination timing and sourceRange for source selection. Align cuts to the actual source frame grid. Preserve eyelines and intentional camera/screen changes. The current recap preference is a short leftward chapter pan, around 400 ms as a starting point, with no title card. Use meaningful chapter boundaries, not a transition on every sentence. Tune the duration to the edit.

Keep video and source audio coupled until intentionally replacing the dialogue with an aligned derivative. Save separate editable audio layers for processed dialogue and music. Use tesseract-dialogue for audio decisions.

## Transcripts, cuts and delivery

Extract the edited transcript from the rendered recap. Reuse an earlier edited transcript only after establishing that speech and timing did not change; state that provenance. Never present the source transcript as the recap transcript. Save outputs/transcript.{txt,md,srt,vtt}.

Create outputs/cuts.csv and cuts.md with chapter starts plus source/recap in/out timestamps. Record skipped fillers separately so the edit can be reconstructed. Embed selectable English subtitles and chapter markers in the MP4 without burning a full transcript onto the picture. Retain a full-length subtitled source copy under outputs when useful.

Save title/description context with the thesis, recording date, factual qualifications and chapter list. Generate copy only from what the edit actually says. Probe dimensions and FPS rather than relying on an export label. Check native project inspection, full decode, subtitle cue count/text, chapter order and duration, meaningful frame samples and delivery audio synchronization. Record evidence under outputs/work and a readable filmstrip under outputs/previews.

Do not copy an episode's AAC offset or audio latency as a universal setting; measure it on the new render. Mark listening unavailable if it actually is. Preserve that limit in the manifest.

Promote the matching output bundle to final with the project helper. Provide the stable video/project links, both transcript locations and preview-cut timestamps.

## Local example

The September 29 recap is in projects/260929-recap. Its final/cuts.csv, raws/transcript.md, final/transcript.md and outputs/work edit plans demonstrate the source/edit distinction. Its historical episode scripts contain hardcoded timings; adapt them for a new episode rather than executing them blindly.
