---
name: linkedin
description: Turn Ship Shit Show episodes into LinkedIn-ready B2B distribution — post drafts in the plain-language buyer register, UTM-tagged links, per-host variants, cadence, and publish tracking. Use when writing or rewriting a linkedin_post, crossposting an episode or build to LinkedIn, drafting lead-gen copy for professionals who don't follow AI, tagging links for LinkedIn/X attribution, or logging what was published where.
---

# LinkedIn Pipeline

Use this skill to convert a finished episode (topic file + transcript + published flagship video) into the LinkedIn distribution set. LinkedIn is the show's primary lead channel: the reader is a professional who wants AI outcomes and does not follow AI news. Every post is proof-of-competence aimed at inbound, not reach farming.

## Quick Start

1. Load the episode context: topic file `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`, clean transcript in `apps/app/data/transcripts/clean/`, and the published flagship/livestream URLs.
2. Read **Audience & Register** below before writing a single line. It overrides the show's on-air voice.
3. Draft the post set (Build Recap, Playbook, Lesson) using the **Post Set** contracts.
4. Tag every link with the **UTM convention**. No untagged links, ever.
5. Write the primary post into the topic's `linkedin_post` generated field; put variants and the cadence plan in internal topic sections (see **Where Output Goes**).
6. Run the **Quality Gate** checklist. Fix failures before handing anything back.
7. After posts go live, record URLs and dates per **Publish Tracking**.

## Source Priority

Prefer local sources in this order:

1. Current topic markdown: title, thesis, sources, talking points, `## The Live Build` notes.
2. Clean transcript of the episode: `apps/app/data/transcripts/clean/*.txt` — mine it for the real problem statement, the moment the build worked, and concrete numbers.
3. Published asset metadata: flagship YouTube title/description, playbook page URL.
4. Recent topic prep for continuity: `apps/app/data/livestream/YYYY-MM-DD/topic-*.md`.
5. External sources only to verify a claim that will appear in the post.

Do not invent metrics, build times, customer stories, or results. If the build partially worked, say what worked and what didn't — the honesty is the differentiator.

## Audience & Register

The reader runs or works in a normal business. They have heard "AI will change everything" and have no idea what to do about it. They will hire whoever demonstrates competence in language they understand.

Register rules — these override `references/brand-voice.md` from the talking-points skill:

- **No swearing.** On-air voice swears occasionally; LinkedIn copy never does.
- **No insider abbreviations.** Spell everything out on first mention, then simplify:
  - "4.8", "Fable" → "Claude Fable 5, Anthropic's newest AI model" → then "the model"
  - "MCP" → "a connector that lets the AI drive our tools"
  - "agentic workflow" → "the AI running multi-step work on its own"
  - "we forked it" → "we took the open-source code and built on top of it"
  - "CLI", "repo", "PR", "token costs" → avoid or translate ("the code", "the change", "usage costs")
- **Outcome first, tooling second.** Lead with the business problem and the result. Name the model/tool once, as evidence of currency, never as the headline.
- **First person, direct, concrete.** Same honesty as the show — what broke, what it cost, what shipped — minus the jargon and the bravado.
- **Never beg.** No "agree?", no "follow for more", no engagement-bait questions as the closer. The CTA is the artifact or the conversation.

Litmus test: would a marketing-agency owner who has never opened a terminal understand every sentence and want to reply? If not, rewrite.

## Post Set (per episode)

Three posts per episode, published from **personal profiles** (Vincent and Mitchell), not a company page. Same story, different angles — never the same text on both profiles.

### 1. Build Recap — day the flagship publishes

Contract:

- **Hook line** (< 200 characters, survives the "see more" fold): the problem + the surprising result. No links, no hashtags, no setup.
- Problem as the reader experiences it (missed calls, manual invoicing, unusable handoffs).
- What was built live, in one hour, in plain language. Name the model once.
- The honest result: what works, what's rough, what it would take to run for real.
- CTA: link to the flagship or published artifact + "reach out if this is your problem."

### 2. Playbook — flagship day +2

- How-we-did-it walkthrough compressed to 5-8 short lines: decision points, not commands.
- Links to the playbook page (once it exists) or the flagship with a timestamp.
- CTA: "the full walkthrough is public — steal it."

### 3. Lesson — flagship day +4

- One transferable insight from the build, framed for the reader's business ("the expensive part wasn't the AI, it was X").
- May repurpose the episode's hot take **after** translating it to the buyer register.
- Light or no link; this one builds the profile, not the click.

An optional pre-stream announcement post is allowed when the topic has broad pull, but it never replaces the three above.

## Formatting Contract

- Short lines, one idea per line, blank line between beats. No walls of text.
- 0-3 hashtags maximum, all niche (`#aiautomation` tier, never `#ai`).
- One link per post, placed at the end of the body. If a post underperforms badly, retest with the link in the first comment — but change one variable at a time.
- No @-mentions of tools/companies unless a reply from them is genuinely useful.
- Emoji: sparing, structural at most (arrows, checkmarks), never decorative strings.

## UTM Convention

Every link published to LinkedIn carries:

```
?utm_source=linkedin&utm_medium=social&utm_campaign=ep-<NN>-<slug>
```

- `<NN>` is the episode number, `<slug>` the topic slug from frontmatter.
- The same campaign value is used on X posts with `utm_source=x` — campaign identifies the episode across channels.
- PostHog on the published artifacts reads these; untagged links are invisible leads. This is a hard gate, not a style preference.

## Where Output Goes

- **Primary post (Vincent's Build Recap)** → the topic's `linkedin_post` generated field (`TopicGeneratedContent` in `packages/types/src/livestreams.ts`), via the app UI or by editing the topic file. Preserve frontmatter and existing sections.
- **All three posts + per-host variants + schedule** → an internal `## LinkedIn Pipeline` section in the topic file (internal sections are parsed but not shown in the talking-points panel; `##` only at section level, `###` inside — see `.agents/memory/topic-file-format.md`).
- Mitchell's variants shift the angle (his client/agency lens), not just the wording.

## Quality Gate

Run before returning drafts. All must pass:

- [ ] Hook line under 200 characters, zero jargon, no link.
- [ ] Jargon scan: no bare model versions, no MCP/CLI/repo/agentic/RAG without translation.
- [ ] Every claim traceable to the transcript, topic file, or a named source.
- [ ] Honest-result line present — no demo-ware framing of a partial build.
- [ ] CTA present and concrete (artifact link or "reach out"), never engagement bait.
- [ ] Every link UTM-tagged with the correct episode campaign.
- [ ] Read-aloud test in the buyer register: no sentence a non-technical operator would stumble on.

## Publish Tracking

After each post goes live:

1. Record the post URL and publish date in the episode's distribution checklist in the app (issue #17). Until that ships, append them to the `## LinkedIn Pipeline` section of the topic file.
2. Weekly, copy each post's impressions/reactions/comments from the LinkedIn UI into the checklist's manual metrics fields (issue #20). Mark entries as manual — never fabricate numbers the platform didn't show.
3. When an inbound arrives that traces to a post, log it against the episode (issue #21).
