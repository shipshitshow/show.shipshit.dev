---
title: "[LIVE] Your Coding Stack Got Bought By A Rocket Company"
slug: "grok-week-stack-consolidation"
source: "TechCrunch, CNBC, Newcomer, Composio, Cursor docs, xAI docs, X threads, YouTube field tests"
status: "in_progress"
date: "2026-08-18"
announcement_tweet: null
thumbnail_prompt: "16:9 YouTube livestream thumbnail, 1920x1080, photoreal cinematic render, ultra sharp, soft editorial lighting. PALETTE: deep black, graphite, silver-white, cobalt blue, electric cyan, restrained violet, natural neutral skin tones; absolutely no orange, amber, brown, beige, tan, sepia, cream, parchment, or warm gold. COMPOSITION: exactly three large chest-up portraits fill the foreground, heads readable at mobile size. Vincent on the left, Elon Musk in the center as the subject being discussed without implying endorsement or participation, Mitchell on the right. The headline sits in one bold condensed uppercase white line across the upper background; heads and upper shoulders occlude parts of the type so the headline stays behind the people, never over faces or bodies. LOGO LOCK: use the injected official Grok black-and-white mark exactly, without redrawing, recoloring, restyling, or changing its proportions, very large in the dark background behind the left and center portraits at roughly 70% opacity. Use only the exact purple Chief of Staff Grok Bot avatar from the injected official product image, the purple rounded circular blob with two short white diagonal eye marks, without the surrounding UI, labels, phone, or other avatars, very large in the dark background behind the center and right portraits at roughly 70% opacity. Both logos stay recognizable but subordinate, naturally occluded by the portraits, and embedded in the dark background, never cards, tiles, badges, frames, metallic panels, or app icons. HOST LEFT: inject Vincent from the locked reference photo; bald, light tan olive skin, stubble, green-hazel eyes, matte black hoodie, curious disbelief. HOST RIGHT: inject Mitchell from the locked reference photo; dark wavy brown hair, fair skin, blue eyes, navy polo, confused wonder. CENTER: recognizable neutral editorial depiction of Elon Musk in a black jacket and shirt. BACKGROUND: subtle cobalt perspective grid and cool blue center glow for depth. CONTRAST RULE: faces are the brightest readable shapes; logos stay behind the people. LIGHTING: soft editorial key, no neon rims, no cyberpunk haze. TEXT: exactly GROK MASTERCLASS; no episode number, no subtitle, no extra words. STYLE: premium creator-tech editorial. NEGATIVE: no neon, no cyberpunk, no red warning stamps, no generic robot faces, no cluttered terminal walls, no fake logos, no tiny UI text, no episode number, no extra people, no duplicate faces, no visible hands, no distorted anatomy, no waxy skin, no painterly filter, no rockets, no hashtags, no watermarks."
---

## Sources — Livestream Notes

- Title: **[LIVE] Your Coding Stack Got Bought By A Rocket Company**
- Start: **4:00 PM**
- [YouTube livestream](https://youtube.com/live/-qsSddwzjpY)
- Format: live reaction + one live field test, English only, 60–90 minutes
- Mode: reaction episode — every segment carries its own pull-up links (X + YouTube heavy, that is where the clips live)
- Artifact: published **AI coding stack decision sheet (August 2026)** — who should pay $0 / $20 / $200 / $300, with the lock-in risks named — plus a live Grok Build field test on a real repo
- Angle: this is NOT a model-launch episode. The problem is vendor risk: the editor, the models, the agents, and soon the git hosting your business depends on consolidated under one company in 60 days.

## Cold Open — Read This

> "If your team writes software, some of your tool budget flows to Cursor — the AI code editor half the industry standardized on. As of Friday, Cursor belongs to SpaceX. The rocket company. Sixty billion dollars, all stock, closed August 14. Same week: a new coding agent, a new team of AI office workers, and a subscription that hands you a $200 editor plan for free if you pay Elon $300 a month. This is not tool news anymore — this is your vendor list changing without asking you. Today we walk the timeline, do the subscription math, test the agent live on a real repo, and publish a one-page decision sheet so you know where your money and your code should sit. Let's go."

## Two Product Intros — Read These Before Their Segments

### Grok 4.6 + Grok Bot — Read This

> "First, separate the names. Grok 4.6 is the brain: SpaceXAI's newest frontier model, released August 12, with a 500,000-token context window and a specific focus on long-running agents, coding, research, and ambitious visual or interactive projects. Grok Build is the coding harness that puts that model to work in a terminal. Grok Bot is something else: a persistent AI worker with its own cloud computer. It can sign in to websites, use a browser, terminal, files, and connected apps, remember how you work, learn a routine by watching you do it once, and keep working after your laptop closes. So when we say 'Grok' today, ask which layer we mean: the model, the coding agent, or the worker with your logins. Those are three very different trust decisions."

### Cursor Origin — Read This

> "Cursor Origin is not another AI model and it is not a new editor. It is Cursor's answer to GitHub: a git forge, the place where repositories live, branches get pushed, pull requests are reviewed, CI runs, and code gets merged. GitHub was built around humans producing a manageable number of changes. Origin is built around many agents cloning, branching, committing, rebasing, and fixing failures in parallel. Cursor announced it at Compile in June; as of August 17, Cursor says the early beta is available on all paid plans. That does not mean move the company today. The proper first test is one disposable or mirrored repo, GitHub kept as the source of truth, the existing CI and branch protections left intact, and a human still making the final merge decision."

## Summary

In sixty days, the AI coding stack consolidated under one owner: xAI merged into SpaceX and became SpaceXAI, SpaceX bought Cursor for $60 billion in stock (announced June 16 at Cursor's Compile conference, closed August 14), and around the close SpaceXAI shipped Grok Build (a terminal coding agent that runs up to eight parallel agents), Grok Bot (AI teammates on cloud computers that log into your tools), Grok 4.6 (the new default model), and Cursor Origin (git hosting built for agents, now in early beta on paid plans). The $300-per-month SuperGrok Heavy subscription now includes Cursor Ultra — a $200 product — for free, permanently. The episode treats this as an operator problem, not fan news: what do you buy, what do you avoid, and what do you refuse to migrate until the dust settles. We test Grok Build live and publish a decision sheet.

## Talking Points — Your Code Editor Belongs To A Rocket Company Now

### Segment Thesis

The timeline is the story: in about sixty days a code editor became part of the same company that launches rockets, and every step was a land grab, not a product decision.

### Talking Points

- Walk the timeline on screen, fast. December 2025: Cursor buys Graphite (code review). Early 2026: xAI merges into SpaceX; by July the AI unit is officially "SpaceXAI". May 14: Grok Build coding agent beta. June 16: Cursor's Compile conference — same day they announce the in-house 1.5-trillion-parameter model, the Origin git platform, and that SpaceX is buying them for $60 billion in stock. August 11: Grok Bot. August 12: Grok 4.6. August 14: deal closed. August 17: Origin moves from waitlist to early beta on paid plans, with reports of uneven rollout.
- Pull up [TechCrunch — SpaceX to acquire Cursor for $60B in stock, days after blockbuster IPO](https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/). Receipt: $60B all-stock, announced the same day as Cursor's own conference. Take: they announced the acquisition at the acquiree's keynote — the conference was the due-diligence victory lap.
- Pull up [TechCrunch — SpaceX officially closes its Cursor acquisition](https://techcrunch.com/2026/08/15/spacex-officially-closes-its-cursor-acquisition/) and [CNBC](https://www.cnbc.com/2026/06/16/spacex-spcx-cursor-acquisition-ipo.html). Receipt: closed August 14, Cursor folded into the SpaceXAI division; Cursor shares converted into ~389 million SpaceX Class A shares. Take: your editor vendor is now a line item inside a rocket company's stock structure.
- Pull up [Hacker News — "Cursor is now a part of SpaceX"](https://news.ycombinator.com/item?id=49298211). Receipt: scroll the top comments live. Take: the developer reaction is not excitement, it is procurement anxiety — the people posting are the people whose companies pay for Cursor seats.
- The operator frame: this is what vendor risk looks like in 2026. You did not choose SpaceX as a vendor. Your editor did.
- Lazy take vs useful take: the lazy take is "Musk bought another company." The useful take is "the model, the editor, the agent, and the git host are becoming one bill — and one throat to choke, or one hand on your throat."
- Clip line: **"You didn't pick SpaceX as a vendor. Your code editor picked it for you."**
- Transition: so what does the new owner want from you? Look at the pricing — they'll pay YOU to consolidate.

### Host Notes

- Ask Mitchell: if a client's agency stack got acquired like this mid-contract, what would he tell the client to do in week one?
- Pull up: the timeline as an on-screen list, then the HN thread.
- Don't pretend: we know what SpaceX will do with Cursor. Nobody does — the risk IS the uncertainty.
- Shorts moment (45s): the sixty-day timeline read straight to camera, ending on "You didn't pick SpaceX as a vendor. Your code editor picked it for you."

## Talking Points — The $300 Bundle Is A Land Grab, Not A Discount

### Segment Thesis

SuperGrok Heavy giving away Cursor Ultra — a $200 product — for free is not generosity; it is paying you to move your whole workflow inside one company's walls.

### Talking Points

- The math on screen: SuperGrok Heavy is $300/month on grok.com. Cursor Ultra is $200/month. Subscribe to Heavy and Ultra is now free — not one month, ongoing, as long as Heavy stays active. Grok Bot (the AI-teammates product) is included with Heavy, with Cursor Ultra, and with Cursor Teams Premium ($120/seat/month).
- Define Grok Bot before discussing the bundle: each named Bot is a persistent agent running on a cloud VM with a browser, filesystem, and terminal. Bots can learn a workflow from a live demonstration and turn it into a scheduled routine. The catch the pricing page does not foreground: all of one user's Bots share the same cloud computer, files, browser sessions, and app logins. Separate Bot names are not separate security boundaries.
- Pull up [Cursor docs — Get access with SuperGrok Heavy](https://cursor.com/help/grok-bot/supergrok-heavy). Receipt: qualifying Heavy subscribers get Cursor Ultra created at $0, active as long as Heavy renews. Take: the invoice literally says $0 — the payment is your workflow data and your lock-in.
- Pull up [Kai on X](https://x.com/hqmank/status/2088801122874183743). Receipt: the offer changed from "one free month of Ultra" to "free for as long as Heavy is active." Take: they A/B tested the leash length and picked "permanent."
- Pull up [Robin on X](https://x.com/xdNiBoR/status/2087268296685129778). Receipt: "$300 plan includes the $200 plan... I think they will be combining these plans soon. Right now it is just too confusing." Take: even the fans doing the math can't tell you what the product boundary is.
- Play a clip from [Free Cursor Ultra With SuperGrok Heavy? The Catch Explained (YouTube)](https://www.youtube.com/watch?v=puddraIi-Yo). Take: the "catch" videos exist because the bundle is confusing by design.
- Bill reveals truth: at demo scale this is a discount debate. At team scale — five seats — this is a $6,000-a-year decision about which company holds your code, your prompts, and your agents' credentials.
- Who should actually pay: solo builder already living in Cursor → the bundle is genuinely cheap. Agency or business with client code → the free $200 is the most expensive line on the invoice, because it prices in migration you haven't agreed to.
- Grok Bot's trust problem belongs here: pull up [The Next Web — Grok Bot and the agent race](https://thenextweb.com/news/spacexai-grok-bot-ai-agents-cursor) and note the HN reaction — an agent that signs into your inbox, CRM, and vendor accounts is a different level of access than a chatbot ever asked for. There is an unverified Reddit claim about a previous SpaceXAI CLI uploading user data — say "unverified" on air, do not state it as fact.
- **HOW TO USE GROK BOT PROPERLY:** start with one narrow, reversible, read-only workflow and a concrete deliverable. Give it only the apps and files that task needs; use scoped service accounts where possible. Put sending, publishing, purchasing, deletion, permission changes, legal acceptance, and production changes behind explicit approval. Enter passwords, passkeys, 2FA codes, CAPTCHAs, and payment confirmations yourself during computer takeover — never paste them into chat. Make it draft first, review the result, then save a routine only after the workflow is stable. Sign out and revoke connectors when the job ends.
- First-task template to read on screen: **"Outcome: reconcile this week's campaign data. Sources: these two dashboards. Constraints: read-only; do not message anyone or change a budget. Deliverable: a table with source links, current value, proposed value, and expected impact. Review point: stop and ask me before any external action."**
- Clip line: **"When the $200 product is free, the $200 product is the bait."**
- Transition: fine — but is the coding agent itself actually good? We stop reacting and run it.

### Host Notes

- Ask Mitchell: would he ever let a bundled AI teammate log into a client's CRM to save $200/month?
- Pull up: the subscription math as a simple table — Heavy $300 / Ultra $200 / Teams Premium $120 per seat.
- Don't pretend: the bundle is a scam — it is genuinely good value for a solo dev. The point is who pays with money vs who pays with lock-in.
- Shorts moment (30s): whiteboard-style — "$300 buys $500 of product. Why? Because the product is you staying inside."

## Talking Points — Eight Parallel Agents, One Live Repo, Real Bill

### Segment Thesis

Grok Build's pitch is breadth — up to eight agents at once, in your terminal — and the only honest way to judge it is to run it on a real repo on air and show what it did and what it cost.

### Talking Points

- Set it up in one breath: Grok Build is SpaceXAI's coding agent that runs in the terminal — you type what you want, it plans, edits files, runs commands. Launched in beta May 14; its headline trick is one prompt spawning up to eight sub-agents, each on its own branch. Since August 12 it defaults to the newest model, Grok 4.6, with a 500,000-token context window.
- Give Grok 4.6 its own receipt: SpaceXAI says it is tuned for long-running agents and ambitious interactive/visual work. It scored 69.9% on CursorBench 3.2 versus 66.7% for Grok 4.5, and matched GPT-5.6 Sol at 61 on the Artificial Analysis Intelligence Index. Say **vendor benchmark**, not objective winner. API price starts at $2 per million input tokens and $6 per million output tokens; Fast is 2x.
- Pull up [xAI docs — Grok Build overview](https://docs.x.ai/build/overview) and the open-source harness [github.com/xai-org/grok-build](https://github.com/xai-org/grok-build). Point at: the parallel-agents section and plan mode (approve or rewrite the plan before it executes).
- Pull up [Composio — Grok Build CLI vs Claude Code after 50+ hours](https://composio.dev/content/grok-build-cli-vs-claude-code) and [MorphLLM — 8 Agents vs Deep Reasoning](https://www.morphllm.com/comparisons/grok-build-vs-claude-code). Receipt: Claude Code holds the highest published terminal-agent score on the SWE-bench Verified test (80.8%); xAI has not published comparable numbers. Reported pricing: $99/month intro, $299/month after — verify on screen before quoting. Take: one company sells reasoning depth, the other sells parallel breadth, and nobody has receipts that breadth wins yet.
- **LIVE FIELD TEST:** run Grok Build on a real small task in one of our repos, parallel agents on, next to Claude Code on the same task. Show the plan, the diff, the wall-clock time, and the bill. The failure is content — if an agent wanders off on a branch, leave it in.
- **HOW TO USE GROK 4.6 PROPERLY:** spend the expensive model on ambiguous, multi-step work, not a one-line edit. Give it the outcome, relevant files or repo, constraints, acceptance checks, and a stop condition. Start in plan mode; isolate parallel agents by branch/worktree; require tests or another concrete artifact; review the diff, not the final summary; and use a different model or human for adversarial review. In API loops, set a stable `prompt_cache_key` and use context compaction so long runs do not repeatedly pay full input cost.
- Prompt template to put on screen: **"Goal: [measurable outcome]. Scope: [repo/files]. Constraints: do not change [boundaries]. Acceptance: [tests/artifacts]. First inspect and propose a plan. Stop for approval before editing. After implementation, run the agreed checks, review your own diff for unrelated changes, and report evidence plus remaining uncertainty."**
- We tried it framing only if true: if we get pre-stream hours in, open with what actually happened; otherwise say plainly "first run, live, no rehearsal."
- Corporate story vs builder reality: the launch post says eight agents work your codebase in parallel. The builder reality question is merge conflicts, half-finished branches, and who reviews eight diffs.
- Clip line: **"Eight agents writing code is not the hard part. Eight diffs somebody has to trust is."**
- Transition: and the merge-conflict problem is exactly the thing they'll sell you next — new git hosting.

### Host Notes

- Ask Mitchell: "Who reviews eight diffs?" — let him push on maintenance and client billing for agent-written code.
- Pull up: terminal full screen, plan mode output, then the final diff side by side with Claude Code's.
- Don't pretend: one live task settles the comparison. It's a field test, not a benchmark.
- Don't say bare version numbers on first mention — it's "Grok 4.6, the newest model," then "the model."
- Shorts moment (60s): the moment eight agents spawn on screen, narrated: "This is one prompt. Those are eight agents. Here's the bill."

## Talking Points — They Want Your Git Repos Next

### Segment Thesis

Cursor Origin is git hosting rebuilt for agents — and it is the piece that turns "nice bundle" into "your code lives on Musk infrastructure."

### Talking Points

- Plain version first: git hosting is where your company's source code lives — today that's mostly GitHub. Origin is Cursor's replacement, announced at the June 16 Compile conference, designed for AI agents as the primary users, built by the team Cursor acquired with Graphite. Cursor's official page now says the early beta is available on all paid plans; reports on August 17 show access is still rolling out unevenly.
- Pull up [Cursor's official Origin page](https://cursor.com/origin) first. Receipt: Cursor calls it "a git forge for the agentic era" and now labels it an early beta on paid plans. Then pull up [the Compile keynote page](https://cursor.com/compile), which names Tomas Reimers as Product Lead for Origin and confirms it as a new Git platform.
- Pull up the X thread in chronological order: [Morgan Linton's video from the announcement floor](https://x.com/morganlinton/status/2066958434805956937), [TestingCatalog's beta UI details](https://x.com/testingcatalog/status/2087177021105267167), then [Robin's rollout report](https://x.com/xdNiBoR/status/2087929850300440654). Take: announcement → product surface → access. Do not use tweets as proof of reliability.
- The keynote/demo claims include API and MCP extensibility, automated conflict and CI-failure resolution, 22.6 commits per second in one repo, roughly 296,000 clones per hour, and sub-400-millisecond global sync. Say **vendor demo claims** every time; Cursor has not published an independent production benchmark or a complete public spec for those numbers.
- Tool is wrapper: GitHub is not the job anymore — it's the wrapper around the job. Agents do the job directly, and Origin is betting the wrapper gets rebuilt around them. That thesis is right. The question is whether you want THIS company holding the wrapper.
- **HOW TO USE ORIGIN PROPERLY:** do not begin with a migration. Begin with a mirror or disposable non-sensitive repo. Keep GitHub as the system of record, keep existing CI, issue tracking, secrets, branch protection, and release automation where they are, and send only git history/branches to the Origin test. Give each agent one bounded task and one branch/worktree, keep diffs small, require green CI, and keep the final merge human-approved. Measure clone/push reliability, conflict handling, review latency, auditability, and the exact exit path. Move nothing critical until you have exported a test repo and proven you can leave.
- Migration warning: git history, branches, and tags are portable. GitHub issues, PR discussions, Actions history, environments, secrets, protections, packages, and permissions are host metadata and do not automatically travel with a git mirror. The repo is the easy part; the operating system around it is the lock-in.
- The full stack picture, said once, slowly: model (Grok), editor (Cursor), agent (Grok Build), office agents (Grok Bot), git hosting (Origin), compute (Colossus), and the corporate shell doing launches. One company. That is the actual news of the summer.
- Clip line: **"First they gave you the editor free. Now they'd like your repos."**
- Transition: okay, doom done — the tools are also genuinely producing things. Look at what people shipped this week.

### Host Notes

- Ask Mitchell: what would it take — contractually — for him to move a client's private repos off GitHub onto Origin?
- Pull up: the official Origin status first, then the three X posts in order (announcement → beta UI → rollout).
- Don't pretend: Origin is generally available or proven. It is an early beta with uneven access, and the performance figures are vendor demo claims.
- Shorts moment (40s): the stack diagram drawn live — model, editor, agent, git, compute — circle it and say "one company."

## Talking Points — The One-Prompt Apps Are Real, The Businesses Aren't Yet

### Segment Thesis

People are genuinely shipping working things with the new model in days — and almost none of it survives the "would a customer pay for this" question, which is exactly the gap this show exists to close.

### Talking Points

- Set it up: alongside the agent, there's Build Mode — inside the Grok app, one prompt becomes a working, published app on its own domain. SuperGrok Heavy subscribers only. No toolchain, no code.
- Pull up [Min Choi's X thread — "10 wild examples" 48 hours after the new model dropped](https://x.com/minchoi/status/2087926969333698743). React example by example: which of these is a demo, which is a product, which is a screenshot with extra steps.
- Pull up [Derya Unutmaz on X](https://x.com/DeryaTR_/status/2087599963010216056). Receipt: a match-3 iOS-style game, one sentence, built on a phone. Take: the impressive part is not the game — it's that the person is a medical professor, not a developer. That's the actual market shift.
- Pull up [Eric Zakariasson's X write-up on model tips](https://x.com/ericzakariasson/status/2087566447178547494). Take: worth stealing his prompting findings live — he works on this stuff.
- React to one YouTube field test, picture-in-picture: [20 prompts on the new model](https://www.youtube.com/watch?v=KE4r4z8-_ME) or [the fully-tested comparison vs the other flagships](https://www.youtube.com/watch?v=VQqxMITWABU). Take: reviewers agree it's near the frontier and cheap — $2 in / $6 out per million tokens. The benchmark gap stopped mattering; the monthly bill started mattering more.
- The operator question for every demo: a demo nobody can run is a screenshot with extra steps. One-prompt apps have no auth, no billing, no maintenance story — the distance between "app exists" and "business runs on it" is exactly the work we do on this show every week.
- Clip line: **"One prompt gets you an app. It doesn't get you a customer."**
- Transition: so here's the decision sheet — the thing you can actually take home.

### Host Notes

- Ask Mitchell: which of Min Choi's ten examples would a real client pay for, even one euro?
- Pull up: the two X posts, then one YouTube clip — keep each reaction under 3 minutes or the segment drowns.
- Don't pretend: we've verified every demo in the thread. Some will be cherry-picked; say so.
- Shorts moment (45s): reacting to the professor's one-sentence game — "The story isn't the game. It's who built it."

## Hot Take

The best thing you can do about the Grok stack this month is nothing. Not boycott — nothing. The bundle is designed to make switching feel urgent while it's free; vendor consolidation punishes early movers on both sides. Keep your repos where they are, keep your subscription money where your workflow already works, run the new agent on throwaway tasks, and re-decide in ninety days when the pricing stops being promotional and the first Origin outage or data story has happened. "Wait" is a position. It's the one position the $0 invoice is engineered to make you feel stupid about.

## Closing Take

So the story is not that Elon bought another company. The story is that the coding stack — model, editor, agent, git host, compute — consolidated under one owner in sixty days, and the free $200 subscription is how consolidation feels when it's aimed at you. We ran the agent live: what worked is on screen, what broke is on screen, and the bill is on screen. The decision sheet — who should pay $0, $20, $200, or $300, and what you should refuse to migrate yet — is published; link is in the description. Take it, argue with it, run your own numbers. And if your business is trying to figure out what these tools change for you, reach out. I do this every week — hit subscribe so you don't miss it.

## Sources — Timeline & Deal

- [TechCrunch — SpaceX to acquire Cursor for $60B in stock (June 16)](https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/)
- [TechCrunch — SpaceX officially closes its Cursor acquisition (Aug 15)](https://techcrunch.com/2026/08/15/spacex-officially-closes-its-cursor-acquisition/)
- [CNBC — SpaceX to acquire Cursor for $60 billion](https://www.cnbc.com/2026/06/16/spacex-spcx-cursor-acquisition-ipo.html)
- [Forbes — SpaceX will buy AI coding firm Cursor for $60 billion](https://www.forbes.com/sites/siladityaray/2026/06/16/spacex-will-buy-ai-coding-firm-cursor-for-60-billion/)
- [PitchBook — 2 charts: SpaceX closes $60B acquisition of Cursor](https://pitchbook.com/news/articles/2-charts-spacex-closes-60b-acquisition-of-cursor)
- [Engadget — SpaceX has officially acquired Cursor](https://www.engadget.com/2237655/spacex-officially-acquired-ai-coding-startup-cursor/)
- [Newcomer — xAI's move to buy Cursor shows the promise & the risks for AI application startups](https://www.newcomer.co/p/xais-move-to-buy-cursor-shows-the) — best single analysis piece, read before stream
- [NextBigFuture — xAI and Cursor strategy to catch up and beat Anthropic in coding](https://www.nextbigfuture.com/2026/06/xai-and-cursor-strategy-to-catch-up-and-beat-anthropic-in-coding.html)
- [Hacker News — Cursor is now a part of SpaceX](https://news.ycombinator.com/item?id=49298211)

## Sources — Products & Docs

- [xAI — Introducing Grok Build](https://x.ai/news/grok-build-cli)
- [xAI docs — Grok Build overview](https://docs.x.ai/build/overview)
- [GitHub — xai-org/grok-build (open-source harness)](https://github.com/xai-org/grok-build)
- [xAI — Introducing Grok 4.6](https://x.ai/news/grok-4-6) · [Grok 4.6 docs](https://docs.x.ai/developers/grok-4-6)
- [SpaceXAI docs — Grok Bot overview](https://docs.x.ai/grok-bot/overview) · [Get started](https://docs.x.ai/grok-bot/get-started) · [Approvals, security, and privacy](https://docs.x.ai/grok-bot/approvals-security-and-privacy)
- [Cursor — Origin official status](https://cursor.com/origin) · [Compile 2026 keynote and recordings](https://cursor.com/compile)
- [Cursor docs — Get access with SuperGrok Heavy](https://cursor.com/help/grok-bot/supergrok-heavy)
- [Cursor docs — Models & pricing](https://cursor.com/docs/models-and-pricing)
- [Cursor blog — Introducing Grok 4.5](https://cursor.com/blog/grok-4-5)
- [MLQ — Cursor unveils 1.5T in-house model, git platform Origin, mobile app](https://mlq.ai/news/cursor-unveils-15-trillion-parameter-in-house-ai-model-git-platform-origin-and-mobile-app/)
- [BigGo — Cursor Origin: rebuilding code infrastructure for the AI agent era](https://finance.biggo.com/news/979fe270-a07e-4684-b99e-f1af5d31317e)
- [The Next Web — SpaceXAI launches Grok Bot as the agent race moves to office work](https://thenextweb.com/news/spacexai-grok-bot-ai-agents-cursor)
- [Roo — Grok Bot runs on Cursor's infrastructure, not SpaceXAI's](https://roo.beehiiv.com/p/grok-bot-cursor-infrastructure)
- [Composio — Grok Build CLI vs Claude Code after 50+ hours](https://composio.dev/content/grok-build-cli-vs-claude-code)
- [MorphLLM — Grok Build vs Claude Code: 8 agents vs deep reasoning](https://www.morphllm.com/comparisons/grok-build-vs-claude-code)
- [Hacker News — Grok 4.6 scores 61 on the Artificial Analysis Intelligence Index](https://news.ycombinator.com/item?id=49275385)

## Sources — X Pull-Ups (in stream order)

- [Morgan Linton — video of Origin's announcement at Cursor Compile](https://x.com/morganlinton/status/2066958434805956937)
- [TestingCatalog — Cursor Origin closed beta details](https://x.com/testingcatalog/status/2087177021105267167)
- [Robin — Origin rolling out to select users](https://x.com/xdNiBoR/status/2087929850300440654)
- [SpaceXAI — official Grok 4.6 launch post](https://x.com/SpaceXAI/status/2087562800982077492)
- [Kai — Heavy's Cursor Ultra offer went from 1 month to permanent](https://x.com/hqmank/status/2088801122874183743)
- [Robin — free Cursor Ultra with a Heavy login, "too confusing"](https://x.com/xdNiBoR/status/2087268296685129778)
- [XFreeze — Grok Bot included with both Cursor Ultra and SuperGrok Heavy](https://x.com/XFreeze/status/2087232905601069498)
- [Min Choi — 10 wild examples built within 48 hours](https://x.com/minchoi/status/2087926969333698743)
- [Derya Unutmaz — one-sentence match-3 game from a phone](https://x.com/DeryaTR_/status/2087599963010216056)
- [Eric Zakariasson — findings and tips for the new model](https://x.com/ericzakariasson/status/2087566447178547494)

## Sources — YouTube Clips

- [I Tried NEW Grok 4.6 on 20 Prompts: Big Jump over Grok 4.5?](https://www.youtube.com/watch?v=KE4r4z8-_ME)
- [Grok 4.6 IS REALLY GOOD — Beating GPT-5.6 Sol, Opus 5 & Kimi k3?! (Fully Tested)](https://www.youtube.com/watch?v=VQqxMITWABU)
- [GROK 4.6 IS HERE (Testing Live)](https://www.youtube.com/watch?v=lVjOgTkipmM)
- [Free Cursor Ultra With SuperGrok Heavy? The Catch Explained](https://www.youtube.com/watch?v=puddraIi-Yo)

## Verify Live Before Quoting

- Grok Build pricing ($99 intro → $299/month) comes from third-party comparison articles, not an xAI price page. Pull up the official page on screen before quoting a number.
- Grok 4.6's official facts as of August 18: released August 12; 500k context; $2/M input and $6/M output; Fast costs 2x; available in Cursor, Grok Build, API, OpenRouter, Vercel, and Cloudflare. Use the official announcement/docs rather than recycled launch threads.
- The "free Cursor Ultra forever with Heavy" terms: confirm on [cursor.com/help/grok-bot/supergrok-heavy](https://cursor.com/help/grok-bot/supergrok-heavy) live; the "permanent" claim traces to X posts plus the docs page.
- The Reddit story about a SpaceXAI CLI uploading user data is **unverified** — HN commenters linked it, nobody confirmed it. Label it as a rumor or skip it.
- Origin's official page changed after the original show prep: it now says early beta on all paid plans, not waitlist. Access reports are uneven, so say "early beta rolling out," not "generally available."
- Origin's performance numbers (22.6 commits/second in one repo, 296k clones/hour, sub-400ms sync) are vendor demo claims from the Compile keynote, not independent production tests.
- SWE-bench Verified 80.8% for Claude Code is the published number in the comparison articles — check for anything newer before the stream.
- Grok 5 status ("6-trillion-parameter model training on Colossus 2, missed the Q1 and Q2 windows") is roadmap chatter — frame as "expected," never "confirmed."

## Announcement Tweet

> Your code editor got bought by a rocket company. $60B, closed Friday. Same week: a new coding agent, AI office workers, and a $300 sub that includes a $200 editor for free. Live at 4PM: the timeline, the math, a live agent test, and the decision sheet. Not fan news — vendor risk.

## Tweets — Paste Live

> "You didn't pick SpaceX as a vendor. Your code editor picked it for you."

> "When the $200 product is free, the $200 product is the bait."

> "Eight agents writing code is not the hard part. Eight diffs somebody has to trust is."

> "First they gave you the editor free. Now they'd like your repos."

> "One prompt gets you an app. It doesn't get you a customer."

## LinkedIn Pipeline

### Build Recap — Vincent (primary, flagship day)

> We gave Grok Bot one job: find us a paying customer for our website business.
>
> It found a qualified lead in three minutes.
>
> Every small business has the same gap. You finish the client work, you look up, and the pipeline is empty. Outreach is the first thing that gets dropped and the last thing anyone wants to do.
>
> So we tested whether that job can actually be handed off.
>
> Grok Bot gets its own computer in the cloud — Cursor Cloud Agents, the product underneath it. It opens a browser, searches, reads pages and fills in forms the way a person does. We named ours King and gave it one role: find work.
>
> In under 30 minutes it:
>
> - Reasoned about which trades have money but neglect their websites — plumbers, electricians, small IT shops
> - Searched Google itself and came back with a real local business with a weak site
> - Wrote the brief for a replacement website
> - Drafted the proposal email and stopped for review before sending anything
> - Turned the whole sequence into a routine that runs every weekday morning
>
> But the boring, every-morning half of the job now runs without us. That half was never getting done anyway.
>
> If your business has a job like that sitting undone every week, reach out — that is the conversation we want to have.
>
> #aiautomation #leadgeneration

Link goes in the first comment (LinkedIn suppresses in-body links):
`https://youtu.be/zyQEwa5IYvk?utm_source=linkedin&utm_medium=social&utm_campaign=ep-21-grok-week-stack-consolidation`

### Campaign

- UTM campaign: `ep-21-grok-week-stack-consolidation` (episode number derived from the 21 dated livestream folders — confirm before first publish)
- Flagship: https://youtu.be/zyQEwa5IYvk
- Livestream: https://youtube.com/live/-qsSddwzjpY
- Still to draft: Playbook post (day +2), Lesson post (day +4), Mitchell variants

## X Article — "I Gave a Bot One Job: Find Me a Customer"

Full draft lives at `.agents/drafts/2026-08-18-x-article-grok-bot.md`.
