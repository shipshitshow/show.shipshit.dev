# Title patterns: Ship Sh*t Show

Source: the channel audit of 10 Nov 2026 (77 items on the main channel, YouTube Data API inventory fetched 9 Nov 2026, plus the 3-point title test in the audit ratings). Views are descriptive snapshots at unequal upload ages, with no impressions or click-through rate, so every pattern below is a hypothesis to test, not a rule that titles cause views. Medians are over main-channel livestreams (n=39) and edited videos (n=30) over 60 seconds. Re-run `scripts/analyze-vault-performance.js` before leaning on a number.

## Why the first words matter

YouTube search drove 26% of main-channel views, home and subscription feeds 48%, the Shorts feed 9% and suggested videos 4% (audit, 10 Nov 2026). Search at a quarter of all views means the title names the tool or model people type ("Claude Code", "Grok Bot", "OpenClaw", "Opus 5.5") in its first words, next to the stake. The 45-character limit in [the channel profile](channel-profile.md) is the owner's choice and stays a hard check.

## What has worked

| Pattern | Examples (characters) | Evidence |
| --- | --- | --- |
| Head-to-head: `A vs B` | GPT 5.4 vs Claude Opus 4.6 (26), GPT 5.5 vs Opus 4.7 (19) | Edited videos with "vs": median 850 views (n=2) against 152 for the rest. Livestreams: 188 (n=7) against 52. The only A-graded livestream is a head-to-head. |
| Tool + outcome, in the first person or about the viewer | Grok Bot Finds Customers While I Sleep (38), Claude Code Channels Killed OpenClaw (36) | Both are in the top seven edited videos (681 and 1,261 views). |
| `Tool: stake` | Moltbook: An AI Social Network Disaster (39), pstack: How Poteto Uses Grok Bot (32) | Edited videos with a colon: median 364 (n=8) against 111. Livestreams: 88 against 47. |
| A claim about the viewer's business | Your SaaS Will Get Hacked. Do This Now! (39), Your NPM Packages Are Compromised (33) | Top-seven edited video for the first. Business and operator-use topics lead the channel. |
| How-to with a named tool | How To Install OpenClaw on Discord (34) | Median 342 views (n=3) against 119. |

## What has not worked

| Pattern | Examples | Evidence |
| --- | --- | --- |
| News with no stake or reason to click | Fable 5 Is Back!, Fable 5 is Gone!, Fable 5: One More Week! | 7 to 30 views each. Titles that name Fable: median 11 for edited videos (n=3), 36 for livestreams (n=4). |
| A vague topic label | The State of AI Engineering in 2026, AI Is the Future of Open Source | 11 views each. |
| An exclamation mark standing in for a stake | Fable 5 Is Back!, OpenAI ChatGPT Images 2.0 Is VERY Good! | Edited videos ending in "!": median 24 (n=5) against 154. Livestreams show the opposite (132 against 65), so treat it as unproven. An exclamation mark is not a stake. |
| A question with no tension | Is Meta Muse Wonder Any Good? | Edited videos ending in "?": median 44 (n=2). Questions fit a livestream whose answer is still open (see below). |

Length: titles over 45 characters had higher medians (livestreams 434, n=3), but they predate the one-line rule of 6 Nov 2026 and are older videos, so the audit does not support either direction. Keep the 45 limit as the owner's rule, not as a performance finding.

## Formulas to draft from

1. `<Model/Tool A> vs <B>` for two named things that compete in a real test.
2. `<Tool> <does outcome> <stake>`, for example "Grok Bot Finds Customers While I Sleep". Verb first after the tool, no filler.
3. `<Tool>: <stake in 3 to 5 words>`, for example "Moltbook: An AI Social Network Disaster".
4. `Your <thing> <risk or opportunity>` when the viewer's business is the subject.
5. `Is <X> Dead?` only for a livestream whose answer is not yet known. The recap, cut after the answer exists, states the answer.

## Checks before a title goes to the user

1. Count every candidate. 40 characters or fewer is the aim, 45 is the limit. Report the count next to each title.
2. The tool, model, company or product is in the first three words, unless the title is a claim about the viewer's business.
3. There is a stake, outcome or verb. Cut "Is Back", "Is Here", "Update" and "Everything to Know" when nothing else is there.
4. No "[LIVE]" in a livestream title (owner rule).
5. An exclamation mark is allowed only when the claim is already in the words.
6. The video delivers the promise inside the first minutes. Check the transcript or the board; never promise an outcome the recording does not show.
7. Spell-check names, versions and model identities against the source. A live title once read "OpenAI Will Bo Bankrupt Before 2030".
8. The recap title and thumbnail differ from the livestream's. Example: livestream "Opus 5.5 vs GPT-6 Sol vs Grok 4.7" (33), recap "Opus 5.5: Anthropic Won" (23). See [the description template](description-template.md).
9. A Short's title states its one take in plain words; it is not on-screen text. See the Shorts section of the template.
