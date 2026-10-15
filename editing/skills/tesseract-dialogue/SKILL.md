---
name: tesseract-dialogue
description: Clean recorded livestream dialogue locally, repair microphone clicks, mix a restrained music bed, and verify levels and synchronization for Tesseract delivery.
---

# Dialogue cleanup and quiet music

Read the installed Tesseract speech-cleanup and audio/timing references. Use local audio processing on derivatives; preserve the raw recording. Diagnose each speaker/segment separately. Room reverb, steady hiss, plosives, clicks and clipping need different treatments.

## Processing and timing

Start with restrained denoise, optional dereverb, high-pass/parametric EQ, compression and light de-essing. Adjust to the recording, not a promised “studio podcast” preset. Exclude embedded demos and intentional music when speech processing would damage them.

Read [references/dialogue-profile.md](references/dialogue-profile.md) for the measured local example and reproduction evidence. NARA-WPE was an external local dependency, not a bundled native Tesseract dereverb effect. Document tool/version, filters, parameters, wet mix, bypass ranges, gain and alignment. Do not describe a generic EQ/compression chain as a proprietary vocal-enhancer plugin.

Preserve sample rate, channel layout and sample count when replacing source audio. Measure processing latency with correlation on clean speech and compensate the derivative. Measure the source audio/video offset and the encoded output separately; neither a prior episode's 25 ms WPE correction nor 1024 AAC samples is a default.

For clicks/crackle, locate the affected source range, process with handles, and crossfade/ease boundaries. Compare matched-loudness before/after samples with music muted. Avoid stronger denoise on the whole conversation to chase a brief impulse. Do not infer “noise removed” from the percentage of changed samples. Broader handling noise or clipping may require a different repair.

## Music

Resolve the actual track and its provenance. Use original local synthesis, supplied cleared assets or a track with verified usage terms. Do not silently download random stock music or claim a licence without evidence. Save the source WAV in assets/audio and provenance in its accompanying notes.

For very quiet music under the whole conversation, use roughly 20–23 dB below dialogue RMS as a starting point, check opening/middle/ending and adjust by ear. Use a separate native Audio layer with editable gain/ducking, short smooth attack/release and entrance/exit fades. Mute the bed under embedded demos that already contain music. Dialogue leads picture pacing; a quiet ambient pad should not force beat edits.

An authored gain envelope is ducking, not a native sidechain-compressor claim. Preserve the dialogue-only and mix comparisons under outputs/previews.

## Verification and claims

Use two-pass loudness mastering when appropriate; around -15 LUFS and a -2 dBTP target are the prior recap starting point. Measure the final encoded file, since encoding can change peaks. Check full decode, source/processed waveform behavior, multiple speech synchronization points and subtitles after timing corrections.

Actually audition before/after and the final mix when the environment supports audio input/playback review. If it does not, state “listening unavailable” and keep subjective quality, residual distortion and complete crackle removal unverified. A waveform, ASR result or meter cannot substitute for listening.

Save outputs/audio-treatment.md and processing evidence in outputs/work. Include limitations in the bundle manifest. Do not guarantee studio sound from numerical checks.
