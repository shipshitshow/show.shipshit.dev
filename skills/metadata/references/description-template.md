# Description template and post-publish steps: Ship Sh*t Show

Owner decisions, 2026: the livestream description format (Vincent, set in the project rules and used on the 9 Nov 2026 post), Shorts on the main channel (Vincent, 10 Nov 2026) and full-episode linking for every Short (Vincent, 9 Nov 2026). Voice and link rules stay in [the channel profile](channel-profile.md): first-person plural ("we", "us", "our"), no host introduction, no invented outcomes. Title rules are in [title patterns](title-patterns-by-channel.md).

## Livestream (before it goes live)

One short text. It is both the YouTube description and the LinkedIn post. Write it exactly in this order:

```
<Hook: one to two lines. The stake, the surprise or the claim, naming the tool.>

<One question the stream will answer.>

We're discussing <what we cover, in one to three clauses>.

Bring your questions to the chat.

#<Tag1> #<Tag2> #<Tag3>
```

Rules:

- The hook carries the stakes and names the tool or model. A hook that could open any AI stream ("Big week in AI") fails.
- One question, not two. If the stream's answer is open, say so in the question.
- "We're discussing..." and "Bring your questions to the chat." are fixed wording.
- Exactly three hashtags. At least one names the topic or the tool, because the livestream title may drop the term.
- No source list, no chapters (the stream has not happened), no host names, no footer. Keep citations on the talking-points board.
- Add the talking-points link only after the signed-out check described in the channel profile. If the page is not live, leave the URL out and report it outside the copy.
- Do not claim a guest's quote as our own. Attribute it or reword it.
- LinkedIn takes this text as it is. The LinkedIn skill then swaps insider terms for plain ones, drops any swearing and tags links; it does not write a second description.

## Recap or edited video (after the edit)

The recap is a different asset from the livestream. It gets a different title, a different thumbnail and a different description, and all three are checked against the livestream's before upload. Compare them side by side and change anything that matches.

```
<Hook: the answer or the surprise from the final edit, naming the tool. One to two lines.>

<Two to three lines on what the viewer sees and can reuse, taken from the final cut.>

CHAPTERS:
0:00 <chapter>
...

<Relevant source or example links, only if they appear in the edit.>

Subscribe so you don't miss the next build.
Follow us: https://x.com/shipshitdev
```

- No "Bring your questions to the chat." There is no live chat.
- The recap states the answer. A livestream titled "Is Video Editing Dead?" becomes a recap that says where the conversation landed, and only if the transcript supports it.
- Chapters come from the final edit's own transcript and clock, never the livestream's.
- Hashtags: three, as on the livestream, unless the owner asks otherwise. This is a house default, not a measured finding.

## Short

- First line of the description: the one take, in plain words, not a copy of the title.
- Second line: the full-episode link, `https://www.youtube.com/watch?v=<episode id>`, once the episode is public. While it is private or scheduled, leave the URL out of the copy and report it as pending.
- No chapters, no source list.
- Shorts go to the main channel (owner, 10 Nov 2026); the Clips channel is only kept. The profile's Clips line is historical until it is next updated.
- The first spoken line must make sense to a stranger. If it starts with "and", "but", "because", "that's why" or an "it" with no subject, pull a later line forward or choose another range (audit, 10 Nov 2026: Shorts with a context-dependent first line had a median of 151 views against 611 for those that open on a claim; a correlation on a small channel).

### Link every Short to its full episode

Do both, for every Short, as part of the upload, not afterwards:

1. The episode link in the description, as above.
2. Set the Short's **Related video** to the full episode. This is a YouTube Studio setting: Details tab, Related video, on desktop. Reports say the Short and the target must be on the same channel and that the YouTube Data API cannot set it (vendor documentation; not confirmed in YouTube's own API reference). Because Shorts and the episode are now both on the main channel, the same-channel condition holds. Until a script exists, list each Short's video ID with its episode ID for whoever does the Studio step, and tick each off in the upload notes.

If the full episode is not yet public, do the Related video step when it is, and keep the Short private until the owner approves publishing.

## After every livestream: chapters and tags

0 of 35 livestream archives had chapters and 30 of 35 had no tags (audit, 10 Nov 2026). Make this a step after every stream, once the archive has processed and a VTT exists:

1. Get the archive's raw VTT. Draft chapters with the chapters skill on the archive's own clock. The archive starts with the 30-second countdown, so the first chapter is `0:00 Countdown` until the Studio trim is done; do not shift timestamps to hide it.
2. Chapters must begin at 0:00, number at least three and each last at least ten seconds (recheck https://support.google.com/youtube/answer/9884579 before relying on this).
3. Write 5 to 10 tags: the tool and model names as people type them, the show name and common misspellings ("OpenClaw", "Open Claw"). YouTube says tags play a minimal role in discovery except for commonly misspelled content; do not stuff keywords (https://support.google.com/youtube/answer/146402).
4. Show the updated description and tags to the owner. Applying them changes a public video: run `bun run youtube:update <videoId> --description-file <file> --tags "<a,b,c>"` as a dry run first, then add `--apply` only with the owner's approval. The script backs up the old values.
5. Record the video ID and what was applied in the episode's notes.
