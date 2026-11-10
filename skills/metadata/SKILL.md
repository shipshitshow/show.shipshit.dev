---
name: metadata
description: Draft transcript-grounded YouTube titles, descriptions, chapters and tags for livestreams, edited videos and Shorts.
---

# YouTube metadata

## Channel context

Use the user's channel profile and actual source asset. For Ship Sh*t Show, read [the bundled profile](references/channel-profile.md); viewers using another channel should provide their audience, voice, formats, links and visual references. A profile is context, not permission to publish, upload footage, buy generation or contact a partner.

Identify the format, publication stage and exact asset. An upcoming live uses its source board with tentative claims; a completed stream uses its transcript; a recap or Short uses the final edit's own transcript and clock. Do not copy full-stream chapters into an edit.

Read relevant channel examples and the supplied analytics. The optional [vault analyzer](scripts/analyze-vault-performance.js) summarizes archived formats and patterns; its view counts are descriptive snapshots, not causal ranking. Use `--channel livestreams|videos|shorts|all`. Do not infer a pattern wins from an incomplete archive or unequal upload ages.

Preserve a title already chosen by the user unless alternatives are requested. Otherwise produce a small, genuinely distinct title shortlist and a recommendation grounded in the delivered value. Keep important words legible when truncated. Apply the channel profile's title length rule; for Ship Sh*t Show every title fits one line on the home feed (40 characters or fewer, 45 at most), so count characters for each candidate and report them. Avoid invented outcomes, release dates, model identities, certainty or sensational claims the video does not establish. If the source contradicts the proposed angle, explain that and offer an accurate angle.

Apply the channel profile’s narrator and format-specific link-placement rules. Return the final title and description in separate plain-text copy blocks, with a human opener, practical takeaways, verified chapters when relevant, appropriate links and the user's channel footer. Keep source-verification notes and pending-link warnings outside those blocks. Keep speculation and time-sensitive prices attributed and dated. For published assets, check current title/link details if browsing is available; do not overwrite historical transcript claims.

Chapters must use actual edit timestamps, begin at 0:00, and satisfy YouTube's current chapter requirements. Omit uncertain chapters rather than invent them. Supply a focused comma-separated tag list plus `youtube_tags` YAML when requested. Tags primarily help spelling/ambiguity; do not promise reach from keyword stuffing.

## Packaging by format

- **Titles.** Draft from [the title patterns](references/title-patterns-by-channel.md): head-to-head, tool plus outcome, tool plus stake, and the checks (character count, tool in the first words, a stake, no "[LIVE]", spelling). Search drove a quarter of main-channel views, so name the tool.
- **Descriptions.** Follow [the description template](references/description-template.md). A livestream description is one short text in a fixed order (hook with stakes, one question, "We're discussing...", "Bring your questions to the chat.", three hashtags) that also serves as the LinkedIn post. A recap differs from its livestream in title, thumbnail and description, and all three are checked against the livestream's before upload.
- **Shorts.** Shorts go to the main channel. Every Short links its full episode in the description and sets it as the Short's Related video, as part of the upload.
- **After every stream.** Add chapters from the archive's VTT and 5 to 10 focused tags once the archive has processed. Applying them to a public video needs the owner's approval.

Use [the output contract](references/output-template.md). Recommend packaging tests as hypotheses. Recheck current [YouTube title/thumbnail testing](https://support.google.com/youtube/answer/16391400?hl=en) before describing availability or a winning metric. Publication and platform changes require the user's authorization.
