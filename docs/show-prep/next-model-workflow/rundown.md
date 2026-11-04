# Cheaper AI. More Agents. What Actually Ships?

Draft, unscheduled. About 45 minutes; flexible budgets, sources and conversational cues. Viewer decision: when should I add agents, and how do I know the extra work helped?

Vincent's follow-up on October 2: the cost of Opus 5.5, Sonnet 5.5 and Sol 6.1 is allowing the hosts to use more agents than before. That is firsthand experience, not a measured price comparison or proof of higher throughput. No task counts, spend logs or Mitchell follow-up have been supplied. Do not invent those results. This follows the recording of September 29, published September 30. The later Sol 6.1 discussion is new context; the previous recording's Sol/Luna 6 claims are historical.

## Sources — More agents became possible. What changed? (0–5 minutes)

### Open first

[Last show's promised follow-up, full stream 45:30](https://www.youtube.com/watch?v=uSuqoiEaB1k&t=2730s), then a real task or PR the hosts can open. Start with the changed behavior and its constraint before a release timeline.

### Cues

- Vincent: what can you delegate now that you held back before—research, implementation, review, or independent attempts?
- Open one task. Which parts ran together? Which output was kept, and which was discarded?
- Mitchell: has cheaper usage changed your workflow too, or are you still keeping Opus on the project you were finishing?
- State the unresolved question: more agents are affordable to us; are they delivering more checked work?

Exit: a concrete task and the viewer decision. If no new task is ready, say that and use the checked local preparation workflow below; retain the question rather than announcing a result.

## Sources — Spend the capacity on the right work (5–16 minutes)

### Open first

[Latest recap: plan/build/verify, around 03:17](https://www.youtube.com/watch?v=WOTzkAWvb0w&t=197s) and [the previous full stream's proposal, 34:33](https://www.youtube.com/watch?v=uSuqoiEaB1k&t=2073s). These locate prior host statements; they do not establish current vendor pricing.

### Task board to fill from the opened artifact

Task/input → work that can run independently → shared dependencies → model/effort actually used → outputs → human fixes → checks → retained result. Add elapsed time and usage only from reliable records. Compare the same task if both routes were actually run; otherwise describe one case and its limits.

### Cues

- Where did you add agents first? Which tasks had separate inputs and files, so workers could make progress together?
- Which task needed one owner because the workers shared a dependency or kept editing the same thing?
- Did lower model cost move the bottleneck into attention, integration, usage limits or verification?
- Vincent: why Sonnet or Sol for this worker? Mitchell: when does staying with Opus simplify the whole job?
- Distinguish API spend, subscription capacity and elapsed time. Avoid treating a subscription allowance as a token price.

Exit: one conditional rule for adding a worker. Keep model announcements to the facts that change that rule. Use one sourced X post if it challenges the case; select its exact link before going live.

## Sources — The coordination bill (16–25 minutes)

### Open first

[Older pstack workflow recap](https://www.youtube.com/watch?v=1ZbR2qie8rk), [manager drift in the latest recap around 03:02](https://www.youtube.com/watch?v=WOTzkAWvb0w&t=182s), and [define done around 07:11](https://www.youtube.com/watch?v=WOTzkAWvb0w&t=431s).

### Cues

- More agents also means more messages, duplicated context and competing edits. Show the smallest real example where that ate the benefit.
- What happens when the orchestrator implements the worker's job and stops checking the overall result?
- What would you remove before adding another worker: an unnecessary handoff, an overlapping task, or a missing acceptance condition?
- Which proof makes "done" useful? Open a check, a deployed result or the artifact itself.
- Ask chat for one task that looked done but failed a check. Take two examples and apply the same task board.

Exit: one ownership boundary and one proof requirement viewers can reuse. An unmeasured case stays a hypothesis; do not manufacture a savings percentage.

## Sources — Product demo: prepare this show locally (25–34 minutes)

### Fixture and readiness

Use `docs/show-prep/next-model-workflow/draft.json` and this source board. The demo shows the local workflow through `bun run show:prep`: `context`, `preview`, `save`, `get`. Use a disposable absolute `SHOW_PREP_DIR` and local storage. Show inputs, changed fields, saved text and revision. No paid model call is needed for the command demonstration.

Command rehearsal passed on Mac Studio on 2026-10-02: September 29 context returned one topic; preview showed nine draft fields; save/get returned identical content and revision, with no Restream event. Capture JSON is under `/Users/decod3rslabs/.codex/artifacts/show-local-prep-20261002/` (`demo-context.json`, `demo-preview.json`, `demo-save.json`, `demo-readback.json`). This verifies the command portion; record a screen fallback and rehearse transitions before broadcast.

### Proof to show

Local Codex/Claude reads repo skills and previous episode → produces cues/metadata → previews → saves an episode draft. Open the saved JSON. Explain the boundary: it is an episode record, not yet the app's cohost topic-card screen (#57). Restream MCP is the separate scheduling connection; demonstrate it only after account authorization, exact destinations and a time are agreed and rehearsed.

### Recovery

Capture the command rehearsal before broadcast. If a live command fails, show that capture and the saved JSON. If there is no usable capture, drop the slot and use the opened task board. Do not troubleshoot OAuth or consume unavailable Claude quota on air.

Exit: viewers know the source files and commands to reuse. Link the public skills and example; avoid a tour of unrelated dashboards.

## Sources — Make the decision and close (34–45 minutes)

### Open first

[Different host choices, latest recap around 10:12](https://www.youtube.com/watch?v=WOTzkAWvb0w&t=612s). Check whether today's case changes those choices.

### Cues

- For the next task, would you add a worker, improve the input, or improve the check? Why?
- What task will each host try next, and what artifact will make the outcome inspectable?
- What did today's evidence fail to establish about cost or speed?
- Take remaining chat questions for about seven minutes. End with the practical rule, the unresolved experiment and the public resources.

Record actual segment times after broadcast for the recap editor. Candidate recap: one task, the cost/coordination tradeoff, the disagreement and the checked result. Do not stretch it to include the whole release timeline.

## Sources — Packaging

- Recommended title: **Cheaper AI. More Agents. What Actually Ships?** Experience and an open question; no unmeasured performance claim.
- Variant B: **Opus, Sonnet, Codex: Where We Add More Agents** — model/workflow continuity; keep only if all three appear in the discussion.
- Variant C: **More AI Agents. More Work—or More Chaos?** — coordination tension. Use the real failure/recovery, without staging a quote.
- Thumbnail hypotheses: A, one task branching to agents and returning to a checked output, text "MORE AGENTS?"; B, hosts weighing three model/role cards, text "WHO DOES WHAT?"; C, tangled handoffs versus one clear owner, text "COORDINATION COST". Reuse the channel thumbnail skill for assets and its three distinct compositions. Avoid fabricated spend numbers or logos implying endorsement.
- Working tag list: AI agents, multi agent workflows, agent orchestration, Claude Opus 5.5, Claude Sonnet 5.5, GPT 6.1 Sol, Codex, Claude Code, AI coding, pstack, Ship Sh*t Show. Refine against the actual recording; tags are metadata, not evidence of reach.

## Sources — Before going live

- Open one actual task/result, or use the checked local workflow. Mitchell's usage/results remain a host input.
- Verify exact current model names and any numerical prices against official sources and actual account records. The archived ASR is unreviewed; do not promote old numbers into current claims.
- Rehearse the command demo and capture a fallback. Live model comparisons require available capacity and a real shared task.
- Select only primary/X links needed for the chosen case. Keep source passages open and budget the transitions.
- Choose time/timezone, stream source and connected destinations separately. Save the returned event ID after scheduling; this draft has no event.
- After broadcast, log timing and demo/transition failures. Review matched-age recap performance when retention and the ongoing A/B test have usable data.

## Sources — Parking lot

Release chronology; all-provider benchmarks; subscription speculation; unrelated AI videos; partner/workshop pitches. Reintroduce one only if it changes the viewer's decision about adding an agent.
