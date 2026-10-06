---
title: "GitHub Is Dead. We're Rebuilding It With Codex."
slug: "github-is-dead-codex"
source: "OpenAI, GitHub, Linear, Mitchell Hashimoto, Theo (t3.gg), Fireship, Gergely Orosz, Aakash Gupta, Naval Ravikant, Tom Warren, CMU, FTC"
status: "in_progress"
date: "2026-05-06"
thumbnail_prompt: null
---

## Talking Points — Livestream Notes

### Segment Thesis

Okay, so this segment is about Livestream Notes.

### Talking Points

- [YouTube livestream](https://www.youtube.com/watch?v=11UOZiFBTRM)

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Cold Open — READ THIS

"In February, Wall Street erased two hundred eighty-five billion dollars from SaaS companies in forty-eight hours.

Biggest AI-triggered repricing in software history.

Everyone called it the SaaSpocalypse. Said SaaS was dead.

But here's what they got wrong — the software isn't dying. The code is.

Every line written before AI becomes a rewrite target.

Salesforce doesn't disappear. It gets rewritten.

ServiceNow doesn't disappear. It gets rewritten.

GitHub? Already happening — 85% uptime in April, merged code silently reverted, no CEO since last August.

And today we're going to watch Codex do it live.

The Great Rewrite isn't coming. It started."

## Summary

GitHub's April 2026 reliability collapse — 85% uptime, silent PR reversions, Copilot agent 97.5% failure rate — exposes the real problem: Microsoft absorbed GitHub, removed all independent leadership, and gave nobody the wheel. Meanwhile OpenAI's Codex (now GPT-5.5 powered) already solves real GitHub issues end-to-end autonomously and runs as a third-party agent inside GitHub itself. The episode argues every pre-AI legacy platform — GitHub, Salesforce, Oracle, COBOL — is now undiscovered bug reports that AI can read and rewrite. The Great Rewrite already started. GitHub is just the first domino developers can see.

## Talking Points — Segment 1: GitHub Is Dead

### Segment Thesis

Okay, so this segment is about Segment 1: GitHub Is Dead.

### Talking Points

- No CEO since Aug 2025. No replacement.
- Absorbed into Microsoft CoreAI under Julia Liuson.
- April: 85% uptime. 37 incidents Feb. 28 March.
- Merge Queue bug silently reverted shipped PRs.
- Copilot agent: 97.5% failure rate at peak.
- Hashimoto: *"no longer a place for serious work"* — 18-year user. Gone.
- **Hot take:** Microsoft tried to migrate infra to Azure AND ship AI features simultaneously. Can't do both. April is the result.

**Tweets to pull up:**
- Hashimoto: "Ghostty is leaving GitHub. I'm GitHub user 1299, joined Feb 2008... it's time to go." https://x.com/mitchellh/status/2049213597419774026
- Gergely Orosz: "WOW. Mitchell Hashimoto voting with his feet." https://x.com/GergelyOrosz/status/2049309531876859921
- Gergely Orosz: "Pull requests disappeared on GitHub... reliability has been beyond unacceptable." https://x.com/GergelyOrosz/status/2048834949667537369
- Akshat Bubna: "Didn't think Github's reliability could get worse, and then they ship a bug that randomly reverts previously merged commits." https://x.com/akshat_b/status/2047501765138928050
- Aakash Gupta: "GitHub had 37 incidents in February 2026 alone. Incident frequency up 23%." https://x.com/aakashgupta/status/2029067638966763692
- Tom Warren: "yesterday I reported on GitHub employee concerns about reliability and leadership, and then hours later GitHub suffered a catastrophic outage" https://x.com/tomwarren/status/2047596512293646521
- Theo: "Github has been down for most of the day. I'm so tired of this. Never been so ready to move on." https://x.com/theo/status/2048857171040121265
- Theo: "Github got me where I am today. That's why it's so hard to watch it die." https://x.com/theo/status/2049791698021253264

**YouTube reactions (react to these):**
- Theo (t3.gg): "The painful death of Github" https://www.youtube.com/watch?v=R7ex-Gt8dtw
- Fireship: "GitHub is having some major issues right now…" https://www.youtube.com/watch?v=d53Zk28esmU
- "Github are you joking?" https://www.youtube.com/watch?v=b13m-iuu4XU

**Pull up on stream (uptime data):**
- GitHub Historical Uptime Chart (2016–2026): https://damrnelson.github.io/github-historical-uptime/
- IncidentHub: GitHub outage history May 2025–Apr 2026: https://blog.incidenthub.cloud/github-reliability-outage-history-2025-2026
- The Register: GitHub struggling with three nines: https://www.theregister.com/2026/02/10/github_outages/
- Hashimoto blog (Ghostty leaving): https://mitchellh.com/writing/ghostty-leaving-github
- Dohmke departure: https://www.axios.com/2025/08/11/github-ceo-dohmke-step-down

#### → TRANSITION: Reliability → Integrity

"So GitHub can't keep your code safe. Merge queue silently reverts your work. But here's the thing — it's not just the infrastructure that's broken. The trust layer is broken too. Let me show you what I mean."

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Segment 1B: GitHub Stars Are Fraud

### Segment Thesis

Okay, so this segment is about Segment 1B: GitHub Stars Are Fraud.

### Talking Points

- People spend millions buying fake GitHub stars to raise VC money.
- CMU study: 6 million fake stars across 18,617 repos using 301,000 bot accounts.
- Cost: $0.03–$0.90 per star. Median star count at seed round: 2,850. That's $85–$285 to unlock $1–10M in funding. 117,000x ROI.
- 16.66% of all repos with 50+ stars involved in fake campaigns by July 2024.
- Detection: 50–81% of stargazers have zero followers, 25–38% have zero repos.
- FTC 2024 rule bans fake social influence metrics. $53,088 per violation. SEC already charged founders for inflating traction metrics.
- **Hot take:** GitHub can't keep its merge queue working, and it also can't tell real stars from bot farms. Platform is broken at every layer — reliability AND integrity.

**YouTube reaction:**
- "Why people spend millions on Github stars" https://www.youtube.com/watch?v=P6u0K3-z2p4

#### → TRANSITION: Broken Platform → What Replaces It

"So reliability is gone. Integrity is gone. Stars are fake, commits get reverted, Copilot fails 97% of the time. Now — what actually works? What's replacing this? Because something already is."

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Segment 2: Codex Rebuilds It

### Segment Thesis

Okay, so this segment is about Segment 2: Codex Rebuilds It.

### Talking Points

- GPT-5.5 dropped April 24. Powers Codex now.
- 82.7% Terminal-Bench. 58.6% SWE-Bench Pro. Best ever recorded.
- Solves real GitHub issues end-to-end. Single pass. No human.
- Already runs INSIDE GitHub as third-party agent.
- Assign issue → Codex fixes → opens PR. Done.
- OpenAI built Symphony: agent orchestrator that spawns one Codex agent per issue. Entire backlog in parallel.
- **Hot take:** GitHub is now just the input queue. Codex is the output machine. The platform is the legacy wrapper.

**Tweets to pull up:**
- Aakash Gupta: "Symphony spawns a Codex agent per issue. Each agent produces a PR." https://x.com/aakashgupta/status/2049027596273459435
- Alex Kotliarskyi (OpenAI): "Engineers at OpenAI experience the same problem — we can supervise about 3–5 coding agents. So we built Symphony." https://x.com/alex_frantic/status/2048827429708550407

**Articles (backup):**
- GPT-5.5: https://openai.com/index/introducing-gpt-5-5/
- Codex upgrades: https://openai.com/index/introducing-upgrades-to-codex/

#### → TRANSITION: Codex → Linear Proves the Thesis

"And it's not just OpenAI saying this. The tools AROUND GitHub already know what's happening. Linear just published something wild. Pull this up."

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Segment 2B: Linear Said the Quiet Part Out Loud

### Segment Thesis

Okay, so this segment is about Segment 2B: Linear Said the Quiet Part Out Loud.

### Talking Points

- Linear published "Next" — their vision for what comes after issue tracking. https://linear.app/next
- Their thesis: traditional issue tracking was designed for handoffs between humans. That model is dead.
- *"The process became the work."* Ceremony, not execution.
- Reality NOW: coding agents operate in 75% of Linear's enterprise workspaces. Agent-authored issues = 25% of all new issues.
- Linear building its own coding agent. Launching "Skills" — codifiable agent workflows. Automations triggered when issues enter system.
- They're not an issue tracker anymore. They're an agent orchestrator with a UI for humans to review.
- **Hot take:** Linear just told you the quiet part out loud. Issue trackers aren't for humans anymore. They're API surfaces for agents. GitHub didn't get the memo because GitHub has no CEO to read it.

**Pull up on stream:**
- Linear Next announcement: https://linear.app/next

#### → TRANSITION: Individual Tools → Systemic Collapse

"So GitHub is broken. Codex is replacing its core function. Linear is pivoting to agent orchestration. But zoom out. This isn't just GitHub. This is happening to EVERY legacy software platform simultaneously. And the market already priced it in."

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Talking Points — Segment 3: Everything Gets Rebuilt

### Segment Thesis

Okay, so this segment is about Segment 3: Everything Gets Rebuilt.

### Talking Points

- $2T SaaS market cap evaporated in 30 days (Jan-Feb 2026). Salesforce, ServiceNow, SAP down 40-50%.
- Naval Ravikant: "Pure software is uninvestable." SaaSpocalypse.
- Klarna CEO: "Systems of record will die in an agentic world."
- The math: instead of buying CRM for $49/seat, instruct agent to manage customers. SaaS layer = wrapper around what agent does directly.
- 800B lines COBOL. $3T daily commerce. Anthropic said "quarters not years" → IBM dropped 13.2% same day. Steepest since 2000.
- **Hot take:** Every pre-AI codebase is undiscovered bug reports. Codex can read them now.
- Microsoft paid $7.5B for GitHub. $13B into OpenAI. OpenAI built the tool killing GitHub. Microsoft funded both sides of its own destruction.

**Tweets to pull up:**
- Naval: "AI won't replace programmers, but make it easier for programmers to replace everyone else." https://x.com/naval/status/1875297712993964231
- Aakash Gupta: "$2 trillion in software market cap evaporated between January 15 and February 14, 2026." https://x.com/aakashgupta/status/2028207604011548781
- Adam Khoo: "SaaS sector facing Apocalypse. Salesforce, ServiceNow down 40-50%." https://x.com/adamkhootrader/status/2012083521024667879
- Vlad: "$2T wiped out from software stocks. SaaS multiples collapsed from 18.5x to 4.7x." https://x.com/vladsvitanko/status/2032814987291287796
- David Ondrej: "SaaS is dead. Agents killed it." https://x.com/DavidOndrej1/status/2019126831761572169
- Mario Nawfal: "Anthropic published a blog post and IBM instantly lost $31 billion in market cap." https://x.com/MarioNawfal/status/2026301588856545292
- Rohan Paul: "SaaSpocalypse in full swing. Death of the per-seat model." https://x.com/rohanpaul_ai/status/2026037568211751305

**YouTube reactions:**
- Fireship: "How AI is breaking the SaaS business model..." https://www.youtube.com/watch?v=cxcb55zr2Q8
- Klarna CEO: "SaaS is Dead: Why Systems of Record Will Die in an Agentic World" https://www.youtube.com/watch?v=P7vIRAFSXmk
- "SaaS Is Dead? AI Just Wiped $1 Trillion From Software Giants" https://www.youtube.com/watch?v=0j1QdcFTU7s
- Phong Le (Strategy CEO): "Why SaaS is Dead — AI's Takeover" keynote https://www.youtube.com/watch?v=tJNNhS_ThdU

#### → TRANSITION: To Close

"So let's land this. GitHub is broken at every layer. The tool replacing it was funded by the same company that broke it. And this pattern — legacy platform hollowed out by AI agents — is happening to every SaaS company on Earth simultaneously. Two trillion dollars says the market agrees."

### Host Notes

- Ask Mitchell:
- Pull up:
- Don't pretend:

## Tweets — Paste Live

**Tweet 1 — Segment 1:**
> GitHub has no CEO. Didn't replace Dohmke. Split leadership 3 ways across Microsoft. April 2026: 85% uptime. Merged code silently reverted. This is what happens when a corp absorbs a platform and removes all its leaders.

**Tweet 2 — Segment 2:**
> Codex solves real GitHub issues end-to-end. Automatically. One pass. 82.7% Terminal-Bench. GitHub is now just the input queue. Codex is the output machine.

**Tweet 3 — Linear:**
> Linear just said the quiet part out loud. 75% of their enterprise workspaces have coding agents. 25% of new issues are agent-authored. Issue trackers aren't for humans anymore. They're API surfaces for agents.

**Tweet 4 — Close:**
> Microsoft paid $7.5B for GitHub. Then $13B into OpenAI. OpenAI's Codex now runs inside GitHub and is making it irrelevant. Microsoft funded both the platform and the tool killing it. Funniest thing in tech right now.

## Close

"GitHub isn't dying because it's bad. It's dying because it's old and leaderless and the tool Microsoft funded to compete with it is better at GitHub's job than GitHub is. Linear already pivoted. The SaaS giants already lost two trillion. We're not waiting. We're rebuilding. With Codex."
