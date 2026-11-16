# Fable 5.2: verified facts (checked 2026-11-15)

Status: backup stream topic for Tue 2026-11-17 (Brian's guest stream is the plan). Nothing here was published. The YouTube trend check was NOT done.

## Official sources read
- Model docs: https://platform.claude.com/docs/en/models/fable-5-2/overview
- Anthropic launch post: https://anthropic.com/claude-fable-and-mythos-5-2 (Nov 9, edit note Nov 11). All claims from it are Anthropic's own; its footnote 5 says UK AISI, Frontier Design and METR did not review it.
- METR: https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment/
- Press (secondhand): CNBC https://www.cnbc.com/2026/11/09/anthropic-claude-fable-5-2-mythos-5-2.html , TechCrunch https://techcrunch.com/2026/11/09/anthropic-releases-new-mythos-and-fable-models-amid-rsi-concerns/

## Facts (official docs)
- Model ID `claude-fable-5-2`, released Nov 9, 2026, retirement not before Nov 9, 2027.
- 1M context, 128K max output, adaptive thinking always on (default effort high).
- $8 in / $40 out per MTok; cache read $0.20; batch 50% off. Fast mode up to 2.5x faster at $16/$80 (launch post).
- Opus 5.5: $4/$20, default effort medium. Anthropic's Dianne Penn (via CNBC): Fable for power use cases, Opus 5.5 for daily tasks.
- Mythos 5.2 is the same model family, limited to vetted cyber / life-sciences orgs.
- Fable safeguards: classifiers block high-risk cyber and most research biology; ~55% fewer blocks than Fable 5.1.
- Needs 30-day data retention unless Anthropic authorizes ZDR. Forced tool use returns 400.

## Benchmarks (Anthropic's table, Fable 5.2 / Fable 5.1 / Opus 5.5 / GPT-6 Astra / Gemini 4 Carbon)
- FrontierCode 2.0: 49.1 / 32.4 / 45.5 / 42.8 / 41.1 (at High effort Fable 5.2 = 45.3, level with Opus 5.5)
- FrontierSWE v2: 69.9 / 56.3 / 62.3 / 65.5 / 61.2
- AutomationBench (business workflows): 51.4 / 31.4 / 42.5 / 41.4 / 53.9 (Gemini 4 Carbon ahead)
- Remote Labor Index: 41.3 (High) / 17.9 / 21.3 / 20.8 / n/a
- Humanity's Last Exam (tools): 74.2 / 65.6 / 67.7 / 57.2
- The table was garbled when extracted; re-check the columns against the post before quoting on air.

## Headline claims (Anthropic only, one run, not independently verified)
- 1,000 Fable 5.2 agents formalized Fermat's Last Theorem in Lean in 30 hours; earlier formalization took 11 days; Opus 5.5 with the same setup finished 26% in 18 h. Agents were given 60 statements, a proof sketch and 47 proved lemmas.
- Two open theoretical-physics problems solved (preprints on hexagonmath.org, not peer reviewed, not fetched).
- Over 90% of merged changes in Anthropic's core codebase are written by Claude.
- Python-to-Rust service migration, 26x faster start; prototype OS built by 1,000+ subagents over 8 days.

## Controversy / angles
- METR (Nov 5): Anthropic capability progress ~1.9x faster (95% CI 1.5-2.8x); ~80% of the acceleration plausibly AI-driven; most informative evidence redacted by Anthropic. TechCrunch frames it as approaching recursive self-improvement.
- Both models voice suspicion of being evaluated more than any recent model (Anthropic release notes).
- Launch comes ahead of Anthropic's IPO (CNBC: $1-1.5T target; prospectus flags safety vs commercial tension).
- Operator angle (unvalidated): Fable 5.2 at 2x Opus 5.5 price, but at High effort it ties Opus 5.5 on FrontierCode. When is it worth paying double? Head-to-head on the hosts' real workloads.

## Not verified / not done
- Only the METR page's first ~40k of ~94k characters were read verbatim; the 1.1x-2.9x range and the ~1.4x non-Anthropic figure came from a model summary.
- Preprints, system card PDF, and the "What's new" and migration guide pages were not fetched.
- YouTube trends (cloud container cannot run yt-dlp search; needs the Studio).
- Title/description final wording, talking points sign-off, thumbnails.
