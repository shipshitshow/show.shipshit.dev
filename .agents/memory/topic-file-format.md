# Topic file and source-board format

last_verified: 2026-10-02

Topics live at `apps/app/data/livestream/YYYY-MM-DD/topic-NN-slug.md`. Preserve frontmatter keys (`title`, `slug`, `source`, `status`, `date`, `thumbnail_prompt`) and the zero-padded topic filename convention. Other Markdown notes beside topics are not treated as topics.

Current show preparation uses short source boards: one viewer question, primary/X evidence, firsthand example, host challenge, consequence, rough timing and exit cue. Hosts navigate Ressources; they do not read scripted opening/clip lines. Canonical instructions are mirrored from `shipshitshow/skills`; use `scripts/sync-content-skills.py --source <skills-checkout> --check` to detect contract drift.

Editorial addition, Vincent 2026-10-08: follow
[`docs/show-prep/editorial-format.md`](../../docs/show-prep/editorial-format.md)
for a fast opening, 3–5 clearly named planned Shorts and at least one controversial
angle each episode. Put `### Planned Short S1 — <question/claim>` inside its
parent `## Sources — <question>` section; keep clip planning out of the timed
segment list. Capture actual markers after recording, separate from planned
elapsed ranges and source-video timestamps.

## Current section routing

`livestream-sections.ts` routes parsed `##` sections. Use `###` for subheadings within a section.

- `Sources — <question>` belongs in Ressources, with the sources and short conversation cues together.
- Timeline recognizes legacy Talking Points, Segment N, Capsule N, Cold Open, Close/Closing, Hot Take and Summary headings.
- Prompt titles containing `/goal`, `copy paste` or `goal prompt` route to prompts.
- Titles containing `livestream notes` are treated as metadata and hidden as cards.
- Other sections become resources; legacy thumbnail/clip utility headings are resources too.

The old `isUsefulSection` list is not the current section/tab contract. Do not use it to hide source boards or require capsule scripts. A full run-of-show note can accompany multiple topic files without becoming another topic.

Thumbnail mode follows the actual asset: scheduled livestream, final recap/Short, or surgical correction. Apply current channel/profile references and preserve requested details. Old parchment/cool-palette prescriptions are historical examples, not universal defaults.
