# Fable 5.2: verified facts (checked 2026-11-15, benchmarks and launch-post claims re-checked 2026-11-16)

Status: backup stream topic for Tue 2026-11-17 (Brian's guest stream is the plan). Nothing here was published. The YouTube trend check was NOT done.

## Official sources read
- Model docs: https://platform.claude.com/docs/en/models/fable-5-2/overview (re-read 2026-11-16)
- Anthropic launch post: https://anthropic.com/claude-fable-and-mythos-5-2 (Nov 9, edit note Nov 11; re-read in full 2026-11-16, table read from the page's own HTML, not a summary). Every number from it is Anthropic's own claim. Its footnote 5: UK AISI, Frontier Design and METR tested the model before release, but none of them reviewed the contents of the post or the system card, and they do not necessarily agree with its claims.
- METR: https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment/ (not re-read on 2026-11-16)
- Press (secondhand, not re-checked on 2026-11-16): CNBC https://www.cnbc.com/2026/11/09/anthropic-claude-fable-5-2-mythos-5-2.html , TechCrunch https://techcrunch.com/2026/11/09/anthropic-releases-new-mythos-and-fable-models-amid-rsi-concerns/

## Facts (official docs, confirmed 2026-11-16)
- Model ID `claude-fable-5-2`, released Nov 9, 2026, retirement not sooner than Nov 9, 2027.
- 1M context, 128K max output, adaptive thinking always on (default effort high). Knowledge cutoff Jun 2026.
- $8 in / $40 out per MTok; cache read $0.20; 5m cache write $10, 1h cache write $16; batch 50% off. Anthropic says this is a lower price than Fable 5.1.
- Fast mode (launch post): up to 2.5x faster token generation at $16 / $80 per MTok.
- Opus 5.5: $4/$20, default effort medium (docs comparison table).
- Launch post positioning (first-party): Fable and Mythos are "best for the most ambitious, open-ended technical work"; for most coding and knowledge tasks Anthropic recommends starting with Opus 5.5, "our strongest daily driver", and moving up to Fable/Mythos or down to Sonnet 5.5/Haiku 5.5 as needed. Fable 5.2 can act as Advisor (smaller models consult it) or Orchestrator (it delegates to smaller models). The "power use cases" vs "daily tasks" wording attributed to Dianne Penn comes from CNBC and was not re-checked.
- Mythos 5.2 is the same underlying model with fewer cyber/biology safeguards, limited to verified organizations.
- Fable safeguards: classifiers block high-risk cyber (pen testing, exploit generation, binary-based vulnerability work) and most research biology, with fallback responses from Opus 4.8 (cyber) or Opus 5 (biology). Anthropic reports about 55% fewer blocks than Fable 5.1 (about 60% fewer cyber, 40% fewer biology), from early testing.
- Needs 30-day data retention and isn't available under ZDR unless Anthropic authorizes it (Enterprise Frontier Safeguards is the ZDR-compatible path, private beta). Forced tool use (`tool_choice` any/tool) returns 400. Omit `temperature`, `top_p`, `top_k` (some values return 400).

## Benchmarks: Anthropic's own table, as published (checked against the post's HTML 2026-11-16)
Columns: Fable 5.2 / Fable 5.1 / Opus 5.5 / GPT-6 Astra / Gemini 4 Carbon. All numbers are Anthropic's own claims, not independently reviewed. Table note: "All scores show each model's highest-available effort unless otherwise noted." Scores for Fable 5.2, Fable 5.1 and Opus 5.5 are with safeguards on unless noted. So Opus 5.5's 45.5 on FrontierCode is its best (Max-effort) score, not a default-effort score.

| Benchmark | Fable 5.2 | Fable 5.1 | Opus 5.5 | GPT-6 Astra | Gemini 4 Carbon |
|---|---|---|---|---|---|
| FrontierCode 2.0 | 49.1% (Xhigh) | 32.4% (Xhigh) | 45.5% | 42.8% | 41.1% (Medium) |
| FrontierSWE v2 | 69.9% | 56.3% | 62.3% | 65.5% | 61.2% |
| AutomationBench (business workflows) | 51.4% | 31.4% | 42.5% | 41.4% | **53.9%** |
| Terminal-Bench-Science 0.1 | 74.6% (Mythos 5.2: 75.3%) | 52.6% | 58.7% | 68.1% | 64.8% |
| WANDR (relaxed score) | 82.1% | 68.7% | 72.3% | n/a | n/a |
| OSWorld 2.1 (offline set, partial) | 89.3% | 83.5% | 87.2% | 79.5% | 81.5% |
| RoboDojo Sim (internal run) | 64.9% | 27.6% | 39.4% | 29.8% | n/a |
| AA-Briefcase v1.1, rubric | 66.1% | 61.5% | 61.2% | 52.0% | 61.8% |
| AA-Briefcase v1.1, Elo | 1785 | 1669 | **1800** | 1569 | 1611 |
| Remote Labor Index | 41.3% (High) | 17.9% | 21.3% | 20.8% | n/a |
| Humanity's Last Exam (with tools) | 74.2% | 65.6% | 67.7% | 57.2% | n/a |
| Chartography (no tools) | 73.4% | 44.8% | 64.4% | 71.0% | 72.5% |

Cyber and bio rows (Mythos 5.2 only, not Fable; do not quote as Fable numbers): CyScenarioBench 76.3% (Mythos 5.2) vs 67.6% Opus 5.5 without safeguards; CVE Rediscovery 89.6% vs 81.3%; de novo binder design 85.1 vs 82.6.

Where Fable 5.2 does NOT lead in that table: AutomationBench (Gemini 4 Carbon 53.9% vs 51.4%) and the AA-Briefcase Elo row (Opus 5.5 1800 vs 1785).

### Effort and cost claims (Anthropic's text, read off its own accuracy-vs-cost charts)
- FrontierCode 2.0: at High effort Fable 5.2 scores 45.3% vs Opus 5.5's best score 45.5%, "for roughly half the cost per task" (and ahead of GPT-6 Astra's best, 42.8%, at about the same cost). At Xhigh it reaches 49.1%, "the highest score of any released model we've tested".
- WANDR: at Medium effort Fable 5.2 matches Opus 5.5's top score for about 40% of the cost per task.
- Humanity's Last Exam: at Low effort Fable 5.2 matches Opus 5.5's top score for less than one-tenth of the cost per task.
- Chartography: at Medium effort Fable 5.2 scores 66.4%, ahead of Opus 5.5 at Max (64.4%), for less than one-tenth of the cost per task.
- On Medium effort (default in Claude apps and Claude Code) Fable 5.2 completes challenging tasks with fewer tokens than Fable 5.1.
- Take for the show: the per-token price is 2x Opus 5.5, but Anthropic's claim is that per-task cost at matched scores is lower. This is Anthropic's evals only; whether it holds on our own workloads is exactly the question for the hosts.

## Headline claims (Anthropic only, not independently verified)
- Fermat's Last Theorem: 1,000 Fable 5.2 agents formalized it in Lean in 30 hours. The first formalization (an unreleased research version of Claude, with a purpose-built harness and a human researcher's guidance) took 11 days, so that comparison is not like for like. Opus 5.5 with the same 1,000-agent setup completed only 26% at 18 hours and barely progressed after 30 (the post says so in text). One run per model. Agents were given 60 statements, a one-sentence sketch of the classical route, the definitions and 47 proved lemmas from the earlier formalization (footnote 4, added in the Nov 11 edit). Anthropic also says it needed one-third as many action tokens and produced a proof seven times shorter than the first formalization.
- Two open theoretical-physics (black hole) problems solved; preprints linked from the post, not peer reviewed, not fetched.
- Over 90% of changes merged into Anthropic's core codebase are now written by Claude "with human guidance".
- A team of agents running an earlier version of Fable 5.2 migrated a critical production service from Python to Rust, starting about 26x faster. One engineer's experiment: 1,000+ subagents over 8 days built a prototype operating system that boots on a laptop.
- Customer quotes (Vercel, Shopify, Uber etc.) are testimonials selected by Anthropic.

## Controversy / angles
- METR (Nov 5): Anthropic capability progress ~1.9x faster (95% CI 1.5-2.8x); ~80% of the acceleration plausibly AI-driven; most informative evidence redacted by Anthropic. TechCrunch frames it as approaching recursive self-improvement. (Not re-read 2026-11-16.)
- Launch post itself says Fable 5.2 and Mythos 5.2 "each voice suspicion that they are being evaluated more often than any of our recent models", which Anthropic says complicates assessing real-world behavior.
- Launch post also says that during training Anthropic limited some AI-R&D capabilities (accelerator kernel optimization, LLM architecture work), so there Fable 5.2 performs at about the level of Opus 5.5.
- Launch comes ahead of Anthropic's IPO (CNBC: $1-1.5T target; prospectus flags safety vs commercial tension). Not re-checked.
- Operator angle (unvalidated): 2x the per-token price, but Anthropic claims lower cost per task at matched scores, and Opus 5.5 is still its recommended daily driver. When is Fable worth it? Head-to-head on the hosts' real workloads.

## Not verified / not done
- Fetched and checked 2026-11-16: the launch post and the model docs overview page. Everything labelled "Anthropic's table" above matches the post.
- Not re-checked 2026-11-16, do not quote on air without a fresh look: METR figures (only the first ~40k of ~94k characters were read verbatim on 2026-11-15; the 1.1x-2.9x range and the ~1.4x non-Anthropic figure came from a model summary), CNBC and TechCrunch claims (Dianne Penn quote, IPO figures).
- Never fetched: the system card, the physics preprints, the Fermat formalization write-up, the model docs "What's new" and migration guide, and the fast mode and effort docs pages. The cost-per-task claims are read from the post's text, not recomputed from the chart data.
- YouTube trends (cloud container cannot run yt-dlp search; needs the Studio).
- Title/description final wording, talking points sign-off, thumbnails.
