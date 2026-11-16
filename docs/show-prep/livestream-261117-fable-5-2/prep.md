# Livestream Tue 2026-11-17: Fable 5.2 (DRAFT, pending YouTube trend data)

Status (2026-11-16, Vincent's decision): BACKUP. Only one stream airs Tuesday. Brian's guest stream is the plan; this Fable 5.2 stream takes the same slot if Brian can't make it. No separate slot. Nothing scheduled or published.
Facts: see [verified-facts.md](verified-facts.md). Every number below is Anthropic's own claim (docs/launch post, re-checked 2026-11-16) unless marked, and none of it was independently reviewed.

## Angle (operator + head-to-head)
**Is Fable 5.2 worth 2x the per-token price of Opus 5.5 for running a real business?** (Anthropic claims lower cost per task at matched scores; does that hold for operators?)
One central founder question. Not a benchmark show: benchmarks are only the evidence for the question, and the hosts bring their own use.

Viewer payoff: leave knowing when to pay $8/$40 per MTok (Fable 5.2) vs $4/$20 (Opus 5.5), and which tasks justify it.

First useful point inside ~45 s: "Fable 5.2 costs double per token, but Anthropic says at High effort it scores about the same as Opus 5.5's best on FrontierCode (45.3% vs 45.5%) for roughly half the cost per task. Anthropic's own claim; we'll test whether that holds for a real business."

## Title options (Title Case, <=45 chars, no "[LIVE]")
("Double" / "2x" means the per-token price. Anthropic claims lower cost per task, so keep the hook as a question, not a claim.)
1. Is Fable 5.2 Worth Double Opus 5.5? (35)  <- recommended
2. Fable 5.2 Costs 2x Opus. Worth It? (35)
3. Do You Need Fable 5.2 To Run A Business? (41)

## Description (project format)
Anthropic's Fable 5.2 costs twice as much per token as Opus 5.5, yet Anthropic says it matches Opus 5.5's best coding score at roughly half the cost per task.

Is the premium model worth it for a founder running a real business?

We're discussing what Fable 5.2 changes for operators, where Opus 5.5 is enough, and what we'd actually pay for.

Bring your questions to the chat.

#AI #Anthropic #Fable52

(Hashtags are a placeholder; trend data may change them. Hook should not promise a demo unless one is ready.)

## Talking points (outline, sources named)
1. What shipped (Nov 9): `claude-fable-5-2`, 1M context, 128K output, $8/$40; Opus 5.5 is $4/$20. Source: platform.claude.com model docs.
2. Anthropic's own positioning (launch post): Fable for the "most ambitious, open-ended technical work"; start most coding and knowledge work on Opus 5.5, "our strongest daily driver". Fable can also be the Advisor or Orchestrator for smaller models.
3. The benchmark picture, and where it stops mattering (Fable 5.2 vs Opus 5.5, Opus at its best effort): FrontierCode 2.0 49.1% (Xhigh) vs 45.5%; at High effort 45.3% vs 45.5% for roughly half the cost per task. FrontierSWE v2 69.9% vs 62.3%. Remote Labor Index 41.3% (High) vs 21.3%. AutomationBench (business workflows) 51.4% vs 42.5%, with Gemini 4 Carbon ahead at 53.9%. On AA-Briefcase Elo, Opus 5.5 is ahead (1800 vs 1785). All Anthropic-reported; its footnote says the outside evaluators (UK AISI, Frontier Design, METR) did not review the post or system card.
4. The 1,000-agent Fermat's Last Theorem formalization (30 h vs 11 days; Opus 5.5 reached 26% in 18 h). One run, agents were handed a sketch and 47 proved lemmas. What a founder can and can't take from a lab result.
5. Cost math for operators: per-token price is 2x ($8/$40 vs $4/$20), but Anthropic claims lower cost per task at matched scores (FrontierCode about half at High effort, WANDR about 40% at Medium; its own evals). Where 2x is noise (rare high-value runs) and where it could hurt (always-on agents; host opinion, not tested). Fast mode $16/$80 for up to 2.5x speed.
6. Gotchas for builders: adaptive thinking can't be turned off, forced tool use returns 400, omit temperature/top_p/top_k, 30-day retention unless ZDR approved.
7. The uncomfortable part: METR (Nov 5) estimates Anthropic's progress ~1.9x faster (CI 1.5-2.8x), mostly AI-driven, with most informative evidence redacted by Anthropic (METR not re-read 2026-11-16, re-check before quoting); Anthropic's launch post says both models voice suspicion of being evaluated more than any recent model. What it means for building on a model that changes every few months.
8. Hosts' real use: [HOST INPUT NEEDED: what Vincent and Mitchell actually run on Fable 5.2 vs Opus 5.5. Do not claim results we have not seen. Brian reportedly edited his Nov 11 tutorial with early access, so it may come up.]
9. Verdict segment: each host picks one task they'd pay 2x for and one they wouldn't; disagreement stays natural.

## Short candidates (3-5; each = one take, open on the take in 2 s, <60 s, source segment in brackets)
1. "'Fable 5.2 costs 2x' is the wrong number: per token yes, per task Anthropic says about half." [pt 3/5] Caveat to keep: Anthropic's claim from its own evals (FrontierCode at High effort vs Opus 5.5 at its best, 45.3% vs 45.5%); we haven't tested it on our workloads.
2. "The 1,000-agent proof is a lab result, not a business result." [pt 4] Opposing view: it still shows what long-horizon agent work is becoming.
3. "The model is not the IP, the harness is. Rebuild when the model changes." [pt 5/7] Ties to Vincent's kept take; METR shows the cycle is accelerating (METR figures not re-checked 2026-11-16).
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
