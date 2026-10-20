---
title: "WTF Is Loop Engineering?"
slug: "wtf-is-loop-engineering"
source: "Claude Code loops, Codex Automations, Forward Future Loop Library, VincentShipsIt loops, Boris Cherny interviews, Ship Shit Show automation stack"
status: "in_progress"
date: "2026-06-23"
thumbnail_prompt: "16:9 YouTube livestream thumbnail, 1920x1080, photoreal cinematic render, ultra sharp, soft editorial lighting. PALETTE: warm parchment cream background, muted beige, ivory, soft brown shadows, natural skin tones, black hoodie and navy polo. No red warning color, no neon, no cyberpunk, no dark terminal wall. COMPOSITION: recreate the clean parchment Ship Shit Show live-thumbnail composition. Two hosts are large, chest-up/upper-torso, cropped by the left and right edges, occupying roughly 35% of the frame each. Their heads are large and readable at mobile size. Center between them: a flat parchment natural-history-style automation emblem, occupying 32-36% of the frame, slightly higher than their hands. The emblem shows a delicate engraved pocket-watch/cron dial with circular loop arrows and small stacked pull-request cards as icon shapes only, no readable words or code. Hosts frame the emblem without covering it. HOST LEFT: bald man, light tan olive skin, stubble, green-hazel eyes, black hoodie. Large head and shoulders fill the left side from lower-left edge to mid-height. He looks upward/inward toward the automation emblem with curious disbelief, eyebrows raised, mouth slightly open. One hand visible near bottom-center, palm up as if presenting the emblem. HOST RIGHT: man with dark wavy brown hair slicked back, navy blue polo. Large head and shoulders fill the right side from lower-right edge to mid-height. He looks upward/inward toward the emblem with confused wonder, eyebrows raised, mouth slightly open. Both hands visible near bottom-right/center in a subtle wait-what gesture. BACKGROUND: plain warm parchment paper texture, soft vignette, subtle studio shadow. No AI UI, no documents, no warning stamp, no tech graphics, no cyberpunk panels. CONTRAST RULE: hosts are large and dominant. Faces clearly readable at 120px. The center automation emblem remains fully visible and centered. Keep clear separation between host heads, hands, and emblem. LIGHTING: soft warm studio lighting from front, gentle shadows, slight highlight around the center emblem. Calm, premium, mysterious. BRANDING: top-right episode number '#19', clearly readable in muted dark brown/grey, same top-right placement. TEXT: none except '#19'. STYLE: photorealistic hosts, subtle wondering expressions, natural-history museum poster vibe, clean premium YouTube livestream thumbnail, readable at mobile size."
---

## Sources — Livestream Notes

- Title: **[LIVE] WTF Is Loop Engineering?**
- Time: 2pm, Tuesday June 23, 2026.
- [YouTube livestream](https://youtube.com/live/vZZRx4g6tcs)
- Format: reaction + tool walkthrough + live implementation of one automation-loop draft.
- Angle: do not make this a generic "loops are cool" episode. Show the actual stack: scheduler, worktree, skills, state, connectors, verification, PR boundary.
- Core promise: by the end, viewers should understand what to put around cron so an AI agent can do useful software work without becoming scheduled slop.

## Cold Open — Read This

> Everyone is asking whether AI loops are just cron jobs now.
>
> Yeah. Kind of.
>
> But that is the least interesting part.
>
> Cron only wakes the agent up. The real stack is the harness around it: Codex Automations, Claude `/loop`, Claude Routines, worktrees, skills, state files, GitHub PRs, CI, Sentry, review agents, and a hard stop before the thing deploys or deletes anything.
>
> Boris Cherny is already saying he does not prompt Claude the old way anymore. Theo tried loops and ended up with loops that create sub-loops. Forward Future launched a Loop Library. We built our own practical loops repo because ideas are not enough.
>
> Today we are not just talking about loops.
>
> We are showing the tools that make the cron job write code without burning the repo down.

## Summary

AI loops are not a new prompt genre. They are the beginning of an automation stack for software work. The hot topic is "cron jobs that build software," but the operator question is what sits around cron: scheduled triggers, isolated worktrees, reusable skills, durable state, duplicate detection, verification, PR-only writes, and human approval boundaries. Forward Future's Loop Library is useful as a catalog of loop ideas. `VincentShipsIt/loops` is the practical layer: Codex Automation templates, Claude scheduled-task prompts, routine drafts, and safety contracts that turn a vague loop into a reviewable software worker.

## Hot Take

The lazy take is: **AI loops are just cron jobs.**

The useful take is: **cron is the heartbeat; the harness is the product.**

If your "loop" does not have isolated execution, state, duplicate detection, verification, a stopping condition, and a safe write boundary, you did not build an autonomous engineer. You built a scheduled prompt with admin permissions.

## Talking Points — Cron Is The Heartbeat, Not The Product

### Segment Thesis

Okay, so the stream is about the automation stack, not the word "loop."

### Talking Points

- Start with the uncomfortable version: a loop without verification is just scheduled slop.
- Pull up Addy Osmani's [Loop Engineering](https://addyosmani.com/blog/loop-engineering/) for the trend frame: the human stops manually re-prompting and designs the repeatable feedback path instead.
- Pull up Business Insider's June 20 writeup, [What Are Loops? AI Engineering Tips](https://www.businessinsider.com/what-are-loops-ai-engineering-tips-2026-6), as the mainstream receipt that this left dev Twitter and hit business media.
- Pull up Lenny's [How to Design AI Agent Loops, Schedules, and Routines](https://www.lennysnewsletter.com/p/how-to-design-ai-agent-loops-schedules) for the simple taxonomy: heartbeat loops, cron loops, hook loops, goal loops.
- The tool stack is the actual content: scheduler, execution surface, repo instructions, durable state, connectors, worktree isolation, checks, PRs, and explicit human boundaries.
- Hot take: if someone says "I have a loop" but cannot show the state file, the stop condition, and the verification command, they have a vibes machine.
- Clip line: **"Cron wakes the agent up. The harness decides whether it is allowed to touch the repo."**
- Transition: Boris is the reason this feels hot right now, because he moved the conversation from prompting agents to writing loops that prompt agents.

### Host Notes

- Ask Mitchell: what is the first repeated task he would actually schedule?
- Pull up: Addy first, then Lenny's taxonomy if chat needs definitions.
- Don't pretend: cron is bad. Cron is fine. The missing piece is the operating contract around it.

## Talking Points — Boris Moved From Prompting To Loop Writing

### Segment Thesis

Boris is useful here because he is not selling a prompt trick. He is describing a workflow layer above the agent.

### Talking Points

- Pull up Sequoia's [Anthropic's Boris Cherny: Why Coding Is Solved, and What Comes Next](https://www.youtube.com/watch?v=SlGRN8jh2RI). Clip cue: around **7:50**, Boris explains `/loop` as Claude using cron to run repeat jobs every minute, every five minutes, daily, or whatever cadence.
- Same Sequoia clip: he says he has loops babysitting PRs, fixing CI, auto-rebasing, keeping CI healthy, fixing flaky tests, and clustering Twitter feedback every 30 minutes.
- Pull up WorkOS / Acquired Unplugged, [Claude Code & the Future of Engineering](https://www.youtube.com/watch?v=RkQQ7WEor7w). Clip cue: around **11:37**, he says he does not prompt Claude the same way anymore; loops are doing the prompting.
- Pull up CNBC's [Head of Claude Code on the future of work and productivity](https://www.youtube.com/watch?v=kRgdkOw82F0). This is the mainstream-business version: agents running while he thinks about product and next steps.
- Pull up Lenny's [Boris Cherny interview](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) for the long version: Claude Code origin, daily PR volume, unlimited token culture, and why coding skills still matter until the abstraction fully moves.
- Hot take: "prompt engineering" was the first abstraction. "Loop engineering" is the next one. But the next one needs ops discipline, not better wording.
- Clip line: **"The job is moving from writing prompts to writing the worker's operating system."**
- Transition: and Anthropic is not leaving this as folklore. Claude Code now has actual product primitives for it.

### Host Notes

- Pull up the video chapter list if YouTube chapters appear. The Sequoia video has a "Boris Personal Workflow" chapter starting around 6:50.
- Keep quote usage short. Paraphrase the rest.
- Ask Mitchell: is this coding, management, DevOps, or all three?

## Talking Points — Claude Code Productized The Loop Stack

### Segment Thesis

Claude Code's interesting feature is not chat. It is that the agent is becoming scriptable, schedulable, and able to orchestrate other agents.

### Talking Points

- Pull up official Claude docs: [Run prompts on a schedule](https://code.claude.com/docs/en/scheduled-tasks). This is `/loop`: session-scoped scheduled work using cron-like timing.
- Pull up [Routines](https://code.claude.com/docs/en/routines). This is the server-side/cloud version: scheduled, GitHub-triggered, or API-triggered work that can run without you staring at the terminal.
- Pull up [`/goal`](https://code.claude.com/docs/en/goal). This is the "keep working until the condition is satisfied" primitive.
- Pull up [Dynamic workflows](https://code.claude.com/docs/en/workflows). This is the spicy part: Claude can generate an orchestration script, spawn subagents, and verify the result.
- Pull up [Agent teams](https://code.claude.com/docs/en/agent-teams), [Subagents](https://code.claude.com/docs/en/sub-agents), and [Worktrees](https://code.claude.com/docs/en/worktrees). These are the primitives that keep the work parallel and less destructive.
- Pull up Anthropic's [Enabling Claude Code to work more autonomously](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously) for the product framing: checkpoints, subagents, hooks, background tasks, Agent SDK.
- Hot take: Claude is not trying to be your IDE. It is trying to become the runtime for software work.
- Clip line: **"The next IDE is not an editor. It is a scheduler with taste and permissions."**
- Transition: Codex is attacking the same problem from the repo-worktree side.

### Host Notes

- Demo path: docs first, then immediately show a real template so it does not become documentation reading.
- Ask Mitchell: what would he let `/loop` do locally, and what should only run as a PR routine?
- Don't pretend: unattended does not mean trusted. The whole point is designing limits.

## Talking Points — Codex Automations Are The Repo Worker

### Segment Thesis

Codex Automations are the cleanest way to show this as repo work: schedule, worktree, prompt, model, checks, PR boundary.

### Talking Points

- Pull up OpenAI's [Codex Automations](https://developers.openai.com/codex/app/automations) docs. The important terms are schedule, Triage inbox, cloud execution, codebase targeting, and automation prompt.
- Pull up OpenAI's [Codex best practices](https://developers.openai.com/codex/learn/best-practices). Key frame: `AGENTS.md` and skills define how work should be done; automations define when the work wakes up.
- Pull up your repo: [VincentShipsIt/loops](https://github.com/VincentShipsIt/loops). This is where the theory becomes copy-paste operational templates.
- Show [`codex/automations/recent-commit-review/automation.toml`](https://github.com/VincentShipsIt/loops/blob/master/codex/automations/recent-commit-review/automation.toml). This is the money demo: daily review, baseline SHA, commit inventory, duplicate PR search, worktree hard gate, focused fix, validation, PR-only output.
- Show [`codex/automations/feature-implementation/automation.toml`](https://github.com/VincentShipsIt/loops/blob/master/codex/automations/feature-implementation/automation.toml). This is one ready issue per run, board inspection, duplicate branch/worktree/PR checks, branch from trunk, tests, PR, no merge.
- Show [`codex/automations/board-hygiene/automation.toml`](https://github.com/VincentShipsIt/loops/blob/master/codex/automations/board-hygiene/automation.toml) if you want a metadata-only example that is safer than code writing.
- Hot take: a strong automation prompt looks boring because it is mostly constraints. That is good. Autonomy is 20% "do the thing" and 80% "do not touch the wrong thing."
- Clip line: **"The useful prompt is not the clever sentence. It is the operating contract."**
- Transition: Forward Future is the loop idea catalog. Your repo is the implementation harness.

### Host Notes

- Pull up the TOML and point at: `kind = "cron"`, `rrule`, `execution_environment = "worktree"`, `status = "PAUSED"`, and the forbidden actions.
- Say explicitly: start paused, run manually once, inspect output, then enable.
- Don't pretend: the template starts as a draft. You still replace placeholders with verified repo facts.

## Talking Points — Forward Future Catalogs Loops, We Operationalize Them

### Segment Thesis

Forward Future is useful for patterns. `VincentShipsIt/loops` is useful for making those patterns safe enough to run.

### Talking Points

- Pull up [Forward Future Loop Library](https://signals.forwardfuture.ai/loop-library/). Receipt: the public catalog says **61 loops** and was updated **June 22, 2026**.
- Pull up [Forward-Future/loop-library](https://github.com/Forward-Future/loop-library). Explain the split: public website catalog plus optional installable skill.
- Pull up the Berman video, [7 INSANE loops you need to try right now](https://www.youtube.com/watch?v=F4a8aMLb678). Clip cue: opening defines loops; later sections demo docs sweep, architecture satisfaction, logging, production errors, full product evaluation.
- Pull up Theo's [I guess we're writing loops now?](https://www.youtube.com/watch?v=iJVJwmCKW9o). Clip cue: around **12:00-14:00**, he moves from one PR to dynamic workflows where loops create sub-loops based on the problem.
- Use the contrast: Forward Future answers "what loops exist?" Your repo answers "what fields does a safe loop need before I let it run?"
- Your required contract is the part to highlight: surface, trigger, tools, state/dedupe, safe writes, forbidden actions, prompt, output, failure mode, manual test.
- Hot take: loop content will get commoditized fast. The edge is the harness, the state, the permissions, and the review boundary.
- Clip line: **"The loop idea is free. The safe harness is the product."**
- Transition: now build one live so viewers see the fields, not just the links.

### Host Notes

- Pull up: Forward Future website first, then your README.
- Don't dunk on Forward Future. The catalog is useful. The point is that a catalog entry is not permission to run unattended work.
- Ask Mitchell: which published loop would he trust first: docs sweep, PR babysitter, production error sweep, or CI repair?

## Talking Points — Live Demo: Turn A Chore Into A Worker

### Segment Thesis

The live implementation should prove the harness: take one recurring chore and turn it into a bounded automation draft.

### Talking Points

- Demo target: build a project-specific draft from the `VincentShipsIt/loops` install prompt, not a live enabled schedule.
- Pull up [`prompts/install-in-agent.md`](https://github.com/VincentShipsIt/loops/blob/master/prompts/install-in-agent.md). This is the copy-paste installer for a repo: read `AGENTS.md`, README, package scripts, issue/PR conventions, then create `.agents/loops/` drafts.
- Pull up [`skills/loop-writer/SKILL.md`](https://github.com/VincentShipsIt/loops/blob/master/skills/loop-writer/SKILL.md). This is the skill that keeps future loops bounded and platform-specific.
- Implement live: create or adapt one automation draft for **recent commit review** or **board hygiene**. Pick recent commit review if you want code-review drama; pick board hygiene if you want a safer first loop.
- Talk through the fields while editing: surface, trigger, connectors/tools, state/dedupe, safe writes, forbidden actions, prompt, output, failure mode, manual test.
- Show the safety gates: no deploys, no merges, no production data, no source checkout edits, use worktree, search existing PRs before creating a new one, update baseline only after successful review.
- Hot take: the schedule is the least important line in the file. The important lines are the ones that say when to stop.
- Clip line: **"A good coding loop spends more words saying stop than saying go."**
- Transition: close by giving viewers the operator rule.

### Host Notes

- Keep the demo scoped. One draft, not five.
- If chat asks "can this really run while I sleep?", answer: yes, after manual run, scoped permissions, and review-only output.
- Don't enable anything live unless you explicitly decide to do that on stream.

## Talking Points — Thumbnail Prompts

### Segment Thesis

There are two thumbnail styles: live-stream branding before the show, and recap-video packaging after the edit has a clear hook.

### Talking Points

- **Livestream thumbnail style:** two large hosts, warm parchment editorial background, centered source asset/emblem, top-right episode number, no text except `#19`.
- **Recap video thumbnail style:** one dominant proof visual from the edit, big 2-5 word text, no episode number, hosts optional and secondary.
- Use the frontmatter `thumbnail_prompt` for the scheduled live.
- Use the recap prompt below after the stream, once the edit is about the actual result or strongest take.

**Livestream Thumbnail Prompt**

```text
16:9 YouTube livestream thumbnail, 1920x1080, photoreal cinematic render, ultra sharp, soft editorial lighting.

PALETTE
Warm parchment cream background, muted beige, ivory, soft brown shadows, natural skin tones. Black hoodie and navy polo. No red warning color, no neon, no cyberpunk, no dark terminal wall.

COMPOSITION
Recreate the clean parchment Ship Shit Show live-thumbnail composition. Two hosts are large, chest-up/upper-torso, cropped by the left and right edges, occupying roughly 35% of the frame each. Their heads are large and readable at mobile size. Center between them: a flat parchment natural-history-style automation emblem, occupying 32-36% of the frame, slightly higher than their hands. Hosts frame the emblem without covering it.

CENTER ASSET
The centered emblem shows a delicate engraved pocket-watch/cron dial with circular loop arrows and small stacked pull-request cards as icon shapes only. Keep it flat, parchment-toned, elegant, and natural-history poster style. No readable words. No code. No company logos. Do not turn it into a terminal screenshot.

HOST LEFT
Bald man, light tan olive skin, stubble, green-hazel eyes, black hoodie. Large head and shoulders fill the left side from lower-left edge to mid-height. He is looking upward/inward toward the automation emblem with curious disbelief, eyebrows raised, mouth slightly open. One hand visible near bottom-center, palm up as if presenting the emblem.

HOST RIGHT
Man with dark wavy brown hair slicked back, navy blue polo. Large head and shoulders fill the right side from lower-right edge to mid-height. He is looking upward/inward toward the emblem with confused wonder, eyebrows raised, mouth slightly open. Both hands visible near bottom-right/center in a subtle wait-what gesture.

BACKGROUND
Plain warm parchment paper texture, soft vignette, subtle studio shadow. No AI UI, no documents, no warning stamp, no tech graphics, no cyberpunk panels.

CONTRAST RULE
Hosts are large and dominant. Faces clearly readable at 120px. The center automation emblem remains fully visible and centered. Keep clear separation between host heads, hands, and emblem.

LIGHTING
Soft warm studio lighting from front, gentle shadows, slight highlight around the center emblem. Calm, premium, mysterious.

BRANDING
Top-right episode number: "#19". Make it clearly readable, in muted dark brown/grey, same top-right placement.

TEXT
None except "#19".

STYLE
Photorealistic hosts, subtle wondering expressions, natural-history museum poster vibe, clean premium YouTube livestream thumbnail, readable at mobile size.
```

**Recap Video Thumbnail Prompt**

```text
16:9 YouTube video thumbnail, 1920x1080, high-contrast editorial tech thumbnail, ultra sharp, readable at mobile size.

CONCEPT
Edited recap video packaging for the livestream topic "The Cron Job That Writes Code." Sell the strongest outcome: AI agents are becoming scheduled software workers, but the harness decides whether they are useful or dangerous.

COMPOSITION
One dominant central proof visual: a clean dark terminal/automation dashboard showing a cron schedule arrow feeding into a git pull request card, green test checks, and a worktree branch diagram. Keep UI elements large and symbolic, not tiny real code. Optional small host reaction crop on one side, secondary to the proof visual.

TEXT
Big readable title text: "CRON WRITES CODE". Optional small secondary text: "AI LOOP STACK". No episode number.

VISUAL DETAILS
Show the automation stack as 4 readable icon labels or large blocks: SCHEDULE, WORKTREE, TESTS, PR. Use strong contrast, clean dark UI, cream/cyan accents, one restrained warning accent only if needed. Make the PR/checks/result obvious at mobile size.

STYLE
Premium edited-video thumbnail, high-energy but clean, not a livestream poster. Strong proof visual, big readable text, sharp UI, no fake company logos, no generic robot face, no tiny screenshots, no cluttered code wall.
```

### Host Notes

- Live uses frontmatter prompt.
- Recap/video uses the second prompt after the edited hook is known.
- If the recap angle changes after the stream, rewrite the recap text around the result, not the planned topic.

## Close — Final Take

The story is not "everyone is using cron jobs now."

The story is that software work is becoming schedulable.

The people who win are not the ones with the cleverest one-shot prompt. They are the ones who can turn repeated work into a bounded worker: wake up, inspect current state, act in isolation, verify, report, open a PR, and stop.

Cron is old. The new part is the AI worker behind it.

## Sources — Hot Tech And Clips

- [Sequoia: Anthropic's Boris Cherny - Why Coding Is Solved, and What Comes Next](https://www.youtube.com/watch?v=SlGRN8jh2RI) — strongest Boris loop clip. Pull around 7:50 for `/loop`, cron, PR babysitting, CI repair, Twitter feedback clustering, and Routines.
- [WorkOS: Boris Cherny - Claude Code & the Future of Engineering](https://www.youtube.com/watch?v=RkQQ7WEor7w) — best thesis clip. Pull around 11:37 for the shift from prompting Claude to writing loops that prompt Claude.
- [CNBC: Head of Claude Code on the future of work and productivity](https://www.youtube.com/watch?v=kRgdkOw82F0) — mainstream business framing: agents doing work while humans think about next steps.
- [Lenny's Podcast: Head of Claude Code - What happens after coding is solved](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens) — long-form Boris interview and Claude Code origin/product principles.
- [Every: How to Use Claude Code Like the People Who Built It](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it) — Boris + Cat Wu practical workflow notes: plan mode, settings, hooks, subagents, migrations.
- [Latent Space: Claude Code - Anthropic's Agent in Your Terminal](https://www.latent.space/p/claude-code) — earlier Boris/Cat Wu interview on CLI, memory, automation, and non-interactive mode.
- [Pragmatic Engineer: How Claude Code is built](https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built) — team/product context around Claude Code and subagents.
- [Code with Claude 2026 Opening Keynote](https://www.youtube.com/watch?v=GMIWm5y90xA) — official Anthropic conference backdrop.
- [Simon Willison liveblog: Code with Claude 2026](https://simonwillison.net/2026/May/6/code-w-claude-2026/) — quick pull-up notes if the keynote has no captions.
- [Matthew Berman: 7 INSANE loops you need to try right now](https://www.youtube.com/watch?v=F4a8aMLb678) — Forward Future Loop Library launch/demo video.
- [Theo: I guess we're writing loops now?](https://www.youtube.com/watch?v=iJVJwmCKW9o) — useful skepticism-to-adoption arc and dynamic sub-loop framing.

## Sources — Tool Docs

- [Claude docs: Run prompts on a schedule](https://code.claude.com/docs/en/scheduled-tasks) — `/loop` and scheduled local session work.
- [Claude docs: Routines](https://code.claude.com/docs/en/routines) — cloud/server-side repeated work with schedule, GitHub, and API triggers.
- [Claude docs: /goal](https://code.claude.com/docs/en/goal) — keep working until a verifiable condition is met.
- [Claude docs: Dynamic workflows](https://code.claude.com/docs/en/workflows) — generated orchestration scripts and parallel subagent workflows.
- [Claude docs: Agent teams](https://code.claude.com/docs/en/agent-teams) — coordinating multiple specialized agents.
- [Claude docs: Subagents](https://code.claude.com/docs/en/sub-agents) — delegation primitive for scoped work.
- [Claude docs: Worktrees](https://code.claude.com/docs/en/worktrees) — isolation for parallel code changes.
- [Anthropic: Enabling Claude Code to work more autonomously](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously) — official product framing for checkpoints, subagents, hooks, background tasks, and Agent SDK.
- [Anthropic: When AI builds itself](https://www.anthropic.com/institute/recursive-self-improvement) — strategic context: Claude writing Anthropic code and recursive acceleration of software work.
- [OpenAI Codex docs: Automations](https://developers.openai.com/codex/app/automations) — scheduled Codex runs against codebases.
- [OpenAI Codex docs: Best practices](https://developers.openai.com/codex/learn/best-practices) — repo instructions, skills, and agent operating guidance.

## Sources — Repos And Demo Targets

- [Forward Future Loop Library website](https://signals.forwardfuture.ai/loop-library/) — public loop catalog; pull up count and categories.
- [Forward-Future/loop-library](https://github.com/Forward-Future/loop-library) — repository with website and installable loop-library skill.
- [Forward Future catalog JSON](https://signals.forwardfuture.ai/loop-library/catalog.json) — machine-readable catalog if you want to show agents can consume it.
- [VincentShipsIt/loops](https://github.com/VincentShipsIt/loops) — your practical loop-template repo.
- [VincentShipsIt loops README](https://github.com/VincentShipsIt/loops/blob/master/README.md) — source positioning: templates/prompts for Codex Automations, Claude Routines, recurring loops.
- [Recent commit review Codex automation](https://github.com/VincentShipsIt/loops/blob/master/codex/automations/recent-commit-review/automation.toml) — best live template to explain baseline state, worktree gate, validation, PR boundary.
- [Feature implementation Codex automation](https://github.com/VincentShipsIt/loops/blob/master/codex/automations/feature-implementation/automation.toml) — one ready issue per run with duplicate search and worktree isolation.
- [Board hygiene Codex automation](https://github.com/VincentShipsIt/loops/blob/master/codex/automations/board-hygiene/automation.toml) — safer metadata-only loop.
- [Loop writer skill](https://github.com/VincentShipsIt/loops/blob/master/skills/loop-writer/SKILL.md) — future-proofing skill for drafting/auditing loops.
- [Install-in-agent prompt](https://github.com/VincentShipsIt/loops/blob/master/prompts/install-in-agent.md) — copy-paste live implementation prompt.

## Tweets — Paste Live

> Everyone is asking whether AI loops are just cron jobs now. Kind of. But cron only wakes the agent up. The real question is what you put around it: worktrees, skills, state, CI, PRs, and stop conditions.

> A bad AI loop is just a scheduled prompt with admin permissions.

> Cron wakes the agent up. The harness decides whether it is allowed to touch the repo.

> The useful prompt is not the clever sentence. It is the operating contract.

> The loop idea is free. The safe harness is the product.

> A good coding loop spends more words saying stop than saying go.

> Tonight: Codex Automations, Claude `/loop`, Claude Routines, Forward Future Loop Library, and the practical templates we use to make AI workers run without burning down the repo.
