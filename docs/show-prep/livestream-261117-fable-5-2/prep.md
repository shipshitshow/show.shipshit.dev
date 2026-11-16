# Livestream Tue 2026-11-17: Fable 5.2 (DRAFT, pending YouTube trend data)

Status (2026-11-16, Vincent's decision): BACKUP. Only one stream airs Tuesday. Brian's guest stream is the plan; this Fable 5.2 stream takes the same slot if Brian can't make it. No separate slot. Nothing scheduled or published.
Facts: see [verified-facts.md](verified-facts.md). Every number below is from Anthropic's own docs/launch post unless marked.

## Angle (operator + head-to-head)
**Is Fable 5.2 worth 2x the price of Opus 5.5 for running a real business?**
One central founder question. Not a benchmark show: benchmarks are only the evidence for the question, and the hosts bring their own use.

Viewer payoff: leave knowing when to pay $8/$40 (Fable 5.2) vs $4/$20 (Opus 5.5), and which tasks justify it.

First useful point inside ~45 s: "Anthropic's own table shows Fable 5.2 at High effort tying Opus 5.5 on FrontierCode (45.3% vs 45.5%) while costing double."

## Title options (Title Case, <=45 chars, no "[LIVE]")
1. Is Fable 5.2 Worth Double Opus 5.5? (35)  <- recommended
2. Fable 5.2 Costs 2x Opus. Worth It? (35)
3. Do You Need Fable 5.2 To Run A Business? (41)

## Description (project format)
Anthropic's Fable 5.2 costs twice as much as Opus 5.5, and its own benchmarks barely separate them at the same effort level.

Is the premium model worth it for a founder running a real business?

We're discussing what Fable 5.2 changes for operators, where Opus 5.5 is enough, and what we'd actually pay for.

Bring your questions to the chat.

#AI #Anthropic #Fable52

(Hashtags are a placeholder; trend data may change them. Hook should not promise a demo unless one is ready.)

## Talking points (outline, sources named)
1. What shipped (Nov 9): `claude-fable-5-2`, 1M context, 128K output, $8/$40; Opus 5.5 is $4/$20. Source: platform.claude.com model docs.
2. Anthropic's own positioning: Fable for "power use cases", Opus 5.5 for daily tasks (Dianne Penn via CNBC).
3. The benchmark picture, and where it stops mattering: FrontierCode 2.0 49.1 (Xhigh) vs 45.5; at High effort 45.3 vs 45.5. FrontierSWE v2 69.9 vs 62.3. Remote Labor Index 41.3 vs 21.3. AutomationBench (business workflows) 51.4 vs 42.5, with Gemini 4 Carbon ahead at 53.9. All Anthropic-reported; its footnote says outside evaluators did not review the post.
4. The 1,000-agent Fermat's Last Theorem formalization (30 h vs 11 days; Opus 5.5 reached 26% in 18 h). One run, agents were handed a sketch and 47 proved lemmas. What a founder can and can't take from a lab result.
5. Cost math for operators: where 2x on output tokens is noise (rare high-value runs) and where it hurts (always-on agents). Fast mode $16/$80.
6. Gotchas for builders: adaptive thinking can't be turned off, forced tool use returns 400, no temperature, 30-day retention unless ZDR approved.
7. The uncomfortable part: METR (Nov 5) estimates Anthropic's progress ~1.9x faster (CI 1.5-2.8x), mostly AI-driven, with most informative evidence redacted by Anthropic; both models voice suspicion of being evaluated more than any recent model. What it means for building on a model that changes every few months.
8. Hosts' real use: [HOST INPUT NEEDED: what Vincent and Mitchell actually run on Fable 5.2 vs Opus 5.5. Do not claim results we have not seen. Brian reportedly edited his Nov 11 tutorial with early access, so it may come up.]
9. Verdict segment: each host picks one task they'd pay 2x for and one they wouldn't; disagreement stays natural.

## Short candidates (3-5; each = one take, open on the take in 2 s, <60 s, source segment in brackets)
1. "Don't pay double for Fable 5.2. At High effort it ties Opus 5.5." [pt 3] Caveat to keep: Anthropic's numbers, FrontierCode only; Fable leads elsewhere.
2. "The 1,000-agent proof is a lab result, not a business result." [pt 4] Opposing view: it still shows what long-horizon agent work is becoming.
3. "The model is not the IP, the harness is. Rebuild when the model changes." [pt 5/7] Ties to Vincent's kept take; METR shows the cycle is accelerating.
4. "Anthropic says it, METR says it: the lab is being sped up by its own models." [pt 7] Keep as reporting, not a prediction.
5. "On business-workflow benchmarks Gemini 4 Carbon beat Fable 5.2." [pt 3] AutomationBench 53.9 vs 51.4; Anthropic's own table.

## Thumbnail plan (livestream = red, hosts facing lens, Codex imagen, same size/height at left and right edges, topic fills background, no text, no mics, red * top-right)
Not rendered yet; needs the Mac Studio. Concepts to render:
A. A heavy red scale tipping between two metallic cubes (premium vs everyday).
B. Hosts flanking a giant red vault door slightly open ("harness is the IP").
C. Split background: gold-bar stack vs grey ingot stack in high-contrast red/black (2x cost).
Open: whether to put a famous figure between the hosts in greyscale (candidate: Dario Amodei; check with Vincent first).

## Still to do
- YouTube trend check (Studio, yt-dlp; see issue).
- Thumbnail renders (Studio).
- Confirm host-experience inputs. No public scheduling without Vincent's decision card.
