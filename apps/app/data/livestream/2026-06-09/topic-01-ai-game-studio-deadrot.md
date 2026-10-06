---
title: "We're building our own AAA gaming studio entirely with AI"
slug: "ai-game-studio-deadrot"
source: "Ship Shit Games, DEADROT, Sega, Tomb Raider, Steam, xAI, Anthropic, Microsoft Build"
status: "in_progress"
date: "2026-06-09"
thumbnail_prompt: "YouTube livestream thumbnail, 16:9, high-contrast brutal tech/game-dev style. Center: a massive AI-controlled game studio command room building the DEADROT universe, with game editor screens, faction art boards, code terminals, QA checklists, and a playable horde scene. Big readable title text: AI AAA STUDIO. Secondary text: BUILT LIVE. Dark metal UI, red infection glow, cyan code accents, premium game studio energy, sharp readable text, no logos, no tiny text, no generic robot face."
---

## Livestream Notes

- [YouTube livestream](https://www.youtube.com/watch?v=Ap5vza8qGy4)

- Title: **[LIVE] We're Building Our Own AAA Gaming Studio Entirely With AI**
- Title alt: **[LIVE] Building An AI-Native AAA Game Studio From Scratch**
- Title alt: **[LIVE] Can AI Build A AAA Game Studio?**
- Angle: the big promise is Ship Shit Games as an AI-native studio, with DEADROT as the proof. This week's AI-in-games news is supporting evidence, not the headline.
- Core build target: continue DEADROT inside Ship Shit Games, preferably by upgrading one playable slice instead of bouncing across all seven tracks.
- Recommended live build: **Scourge Survivors** with faction classes, Choir-aware enemies, breach escalation, and an operation report that feeds the persistent war.
- Backup build if the repo fights back: build the persistent war state model and operation report UI first. That is easier to ship and still proves the studio-system thesis.

## Cold Open - READ THIS

> We are not trying to make one funny AI game anymore.
>
> We are building a gaming studio.
>
> Entirely with AI.
>
> The IP, the lore, the assets, the code, the QA loops, the deployment, the clips, the build logs, the whole machine.
>
> DEADROT is the first universe.
>
> Ship Shit Games is the studio.
>
> And tonight we find out if this is just a funny prototype factory or if an AI-native studio can actually keep a game universe coherent.
>
> The news this week is perfect timing: Crazy Taxi has an AI disclosure. Tomb Raider has an AI disclosure. Steam is drawing lines around what players consume.
>
> AAA is already using AI.
>
> We are doing the transparent version in public.
>
> The question is not "can AI make a game?"
>
> The question is whether AI can build the studio around the game.

## Summary

Ship Shit Games is the experiment: build a AAA-style game studio entirely with AI, in public, with DEADROT as the first universe. The weekly news gives the receipt: AAA studios are now openly disclosing AI-assisted development, while coding agents like Grok Build, Claude Code, Codex, and Copilot are becoming the software-production layer. The useful question is whether AI can handle the studio system around the game: canon, assets, code, QA, deployment, clips, build logs, and a persistent war state that keeps every prototype connected.

## Talking Points — AI Game Dev Is Now A Public Problem

### Segment Thesis

The industry is past "will games use AI?" The real question is what part of the pipeline uses AI, what ships to players, and who reviews it before release.

### Talking Points

- Sega's `Crazy Taxi: World Tour` has a Steam AI disclosure. Sega says generative AI was used as an optional support tool, including support for background assets, and that generated assets were reviewed by the development team. That is not some random itch.io experiment. That's known IP. [Shacknews](https://www.shacknews.com/article/149519/crazy-taxi-world-tour-generative-ai-content-disclosure?amphtml=1)
- `Tomb Raider: Legacy of Atlantis` also has a disclosure. The wording is the important part: AI-assisted tools were used for early exploration and temporary development content, and AI-assisted assets were replaced or refined by humans. [GamesRadar](https://www.gamesradar.com/games/tomb-raider/tomb-raider-legacy-of-atlantis-was-made-with-ai-steam-page-reveals-but-any-assets-made-using-the-controversial-tech-were-either-replaced-or-refined-by-humans/)
- That is the pipeline debate in one sentence: prototype, refine, replace, ship. Not "AI or no AI." More like "where did AI touch the thing, and did a human with taste approve the final artifact?"
- The internet argument is going to be moral and messy. Fine. But builders need an operational rule. For Ship Shit Games, the rule is simple: AI can flood ideas, code, sprites, lore, and UI. The studio loop decides what survives.
- Clip line: **"AI floods. Studios ship."**
- Transition: if the public fight is about disclosure, we need to understand what Steam is actually asking developers to disclose.

### Host Notes

- Pull up: Crazy Taxi disclosure first, then Tomb Raider wording.
- Push Mitchell on: would he care more about AI code, AI concept art, AI final sprites, or live AI content in the game?
- Do not pretend this is legally settled. Frame it as store policy and player trust, not legal advice.

## Talking Points — Steam Is Drawing The Line Around Player-Consumed AI

### Segment Thesis

Steam's disclosure fight matters because it separates internal development tooling from content players actually see or interact with.

### Talking Points

- PC Gamer reported that Valve updated the disclosure form language to focus on AI-generated content that ships with the game or marketing materials players consume, not general efficiency tools behind the scenes. [PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)
- That means code assistants are probably not the disclosure headline. Final art, writing, sound, marketing assets, and live-generated content are the real trust surface.
- Steam still distinguishes pre-generated AI content from live-generated AI content. That second bucket is where things get spicy: if the game generates content while running, the developer needs guardrails.
- DEADROT gives us a clean way to talk about this live. If we use agents to generate code, that's one category. If we use AI to generate final faction portraits or enemy sprites, that's another. If the game creates missions or enemies at runtime, that is a much bigger trust and moderation surface.
- This is why "we built it with AI" is too vague. It hides the actual question: **what did the player consume?**
- Clip line: **"The disclosure is not about your prompt. It's about what the player eats."**
- Transition: and once you care about what ships, lore stops being flavor. Lore becomes a production constraint.

### Host Notes

- Pull up: Steam/PC Gamer disclosure distinction.
- Ask chat: should a game disclose AI code if no AI content appears in the final game?
- Keep the useful line: code assistant, concept assist, final asset, live generation are different disclosure buckets.

## Talking Points — DEADROT Needs Rules Or It Becomes Slop

### Segment Thesis

AI can generate infinite game ideas. DEADROT only works if the canon turns that flood into constraints.

### Talking Points

- Pull up `deadrot.com`. The universe already has strong rules: Scourge, breaches, lanes, Wardens, Pyre, Listeners, the Choir, and a persistent war.
- The Scourge is not "generic zombies." It is a host-dependent parasite with no native shape. It wears flesh, fungus, machine, and ruined worlds. That should change enemy design.
- The Choir is not just lore. It is a mechanic: enemies coordinate inside signal range. Kill repeaters or isolate nodes and they become feral, blind, instinct-only.
- Breaches are not mystical portals. They are rooted spawning wounds. That gives the game a timer, a map objective, and an escalation system.
- Lanes are not just roads. They are the strategic layer. Hold a lane, survive. Lose it, get overrun.
- Wardens, Pyre, and Listeners give us class design immediately. Wardens fortify. Pyre burn the source. Listeners detect and sever the Choir but risk corruption.
- Clip line: **"Lore that does not change mechanics is just expensive flavor text."**
- Transition: so the live build should not add random features. It should turn those canon rules into one playable slice.

### Host Notes

- Pull up: `https://deadrot.com` home page, especially Scourge, Breaches & Lanes, Pact, Choir.
- Say clearly: "We are not building seven games tonight. We are improving one slice of one war."
- Good challenge to Mitchell: what is the first mechanic that makes the Scourge feel like the Scourge?

## Talking Points — The Live Build Is A Studio Pipeline Test

### Segment Thesis

The stream should prove a repeatable AI-native studio loop, not just produce another funny prototype.

### Talking Points

- Last week was funny because Opus 4.8 made a playable game from chaos. Good. But a studio is not a one-shot. A studio is continuity, QA, iteration, and taste.
- Build target: upgrade **Scourge Survivors** with three faction classes, three enemy roles, breach escalation, and an operation result screen.
- Warden class: barriers, turret drop, ammo discipline, slower but reliable. The fantasy is "hold the line."
- Pyre class: fire cone, breach-burn ability, high damage at dangerous range. The fantasy is "burn the source."
- Listener class: scan pulse, sever Choir node, corruption meter. The fantasy is "understand the thing without becoming it."
- Enemy roles: Swarm bodies rush, Repeaters extend Choir radius, Hulks carry infected armor/machine parts.
- Breach loop: the longer the breach stays alive, the more coordinated the swarm becomes. Killing repeaters creates windows where enemies desync.
- End screen: report the run as an operation: breach purged, lane held, convoy lost, resources gained, region pressure changed.
- Clip line: **"The prompt is not the studio. The loop is the studio."**
- Transition: and the bigger studio layer is the persistent war connecting all these small games.

### Host Notes

- Do not scope creep into multiplayer, accounts, Steam integration, or procedural everything.
- If the codebase is messy, build the operation report model first. It is the backbone for all tracks.
- Demo promise: one visible mechanic, one visible faction difference, one visible war report.

## Talking Points — The Persistent War Is The Product

### Segment Thesis

Ship Shit Games becomes interesting when each tiny browser game reports into one shared war state.

### Talking Points

- `shipshit.games` says there are seven game tracks and one live war IP. That is the actual product strategy: many small playable builds, one canon.
- Every game can report an operation. `Scourge Survivors` purges a breach. `Deadlane` holds a lane. `Redline` runs a convoy. `Starblight` burns sky infection. `Rothulk` infiltrates a nest. `Pactfall` settles faction doctrine without breaking the Pact.
- This turns prototypes into a system. The player is not just playing disconnected demos. They are pushing a planet front.
- The persistent war also gives the AI agents structure. They are not inventing a random new game every week. They are adding one operation type, one region effect, one faction mechanic.
- This is how you avoid AI slop at the product level: the universe has a ledger. If a feature cannot affect the war, it probably does not belong yet.
- Clip line: **"A game universe needs a ledger, not just lore."**
- Transition: that brings us back to the agent news. Grok Build, Opus dynamic workflows, and Copilot are all trying to become the work loop. Games are the harder test.

### Host Notes

- Pull up: `https://shipshit.games` metrics: seven game tracks, one live war IP, build loop.
- Good live whiteboard: region id, breach pressure, faction control, resources, operation result.
- End this segment with the build checklist on screen.

## Talking Points — Coding Agents Are The New Studio Layer

### Segment Thesis

Grok Build, Claude Code, Codex, and Copilot are not game engines. They are becoming the production layer around the engine.

### Talking Points

- xAI launched Grok Build as a terminal coding agent competing with Claude Code, Codex, and Gemini-style tools. It is not specifically a video-game builder. It is a general coding agent. [eWeek](https://www.eweek.com/news/xai-grok-build-coding-agent/)
- Anthropic shipped Opus 4.8 with Dynamic Workflows for larger coding jobs across parallel subagents. That is the studio direction: plan, delegate, verify, merge. [TechCrunch](https://techcrunch.com/2026/05/28/anthropic-releases-opus-4-8-with-new-dynamic-workflow-tool/)
- GitHub made Opus 4.8 available in Copilot with a 15x premium request multiplier before usage-based billing launched June 1. Translation: the powerful model is useful, but the bill is part of the workflow design. [GitHub Changelog](https://github.blog/changelog/2026-05-28-claude-opus-4-8-is-generally-available-for-github-copilot/)
- Microsoft Build pushed agentic workflows, local AI dev hardware, Copilot app, MAI-Code-1, and model-routing infrastructure. The big companies are all building the same thing: a work scheduler around software. [Tom's Guide](https://www.tomsguide.com/news/live/microsoft-build-2026)
- Games are the harder test because they punish the agent in more dimensions: input feel, animation, collisions, performance, assets, state, pacing, and taste.
- So tonight's rule is practical: use the agent for scaffolding, edits, and iteration. Use the human loop for canon, cuts, playtest, and "does this actually feel good?"
- Clip line: **"A coding agent can write a game. It cannot tell you if the shotgun feels like soup."**
- Transition: close on the rule for AI-native game development.

### Host Notes

- If chat asks "is Grok Build made for games?", answer: no, it is made for coding. That is why games are a good stress test.
- Bring back the Opus 4.8 thread from last week: the model matters, but the harness matters more.
- Do not turn this into model fanboy content. The point is pipeline design.

## Closing Take

The story is not "AI can build games now." We already know it can generate something funny, playable, and weird.

The story is whether an AI-native studio can keep shipping without drowning in its own output.

For DEADROT, the rule is simple: one canon, one playable slice, one review loop, one public build. AI can flood the table. The studio decides what survives.

## Talking Points — Copy Paste /goal Prompts

### Segment Thesis

The live build should not be "ask Claude to make a thing." It should be `/goal` end-to-end work: install, build, run, verify, and report.

### Talking Points

- Use these as literal copy-paste prompts during the build segment.
- Start with Scourge Survivors faction upgrade if you want the cleanest live arc. Use the asset generator for the highest-visual-impact moment on stream.
- If time is tight, do one thing completely instead of three half-built.
- Clip line: **"The model does not get points for scaffolding. It gets points when the thing runs."**

**Scourge Survivors — Faction Classes, Enemy Roles, Breach Escalation**

```text
/goal Upgrade Scourge Survivors with three playable faction classes, three enemy roles, breach escalation, and an operation result screen. Use the existing codebase as the base. Do not rewrite from scratch.

Faction classes:

Warden
- Ability: Barrier Drop — place a temporary wall that slows Scourge advance.
- Ability: Turret Drop — deploy an auto-targeting turret for a limited duration.
- Passive: Ammo Discipline — slower fire rate, more ammo per pickup.
- Fantasy: hold the line.

Pyre
- Ability: Fire Cone — short-range wide AoE damage burst, hits multiple enemies.
- Ability: Breach Burn — damages and slows the active breach.
- Passive: High Damage — highest single-target output, lower health.
- Fantasy: burn the source.

Listener
- Ability: Scan Pulse — reveals enemy Choir connections on screen.
- Ability: Sever Node — temporarily disables a Choir Repeater, desynchronizing nearby enemies.
- Passive: Corruption Meter — using abilities builds corruption. At max, becomes Choir-visible.
- Fantasy: understand the thing without becoming it.

Enemy roles:

Swarm — standard bodies. Rush the player. Die fast.
Repeater — stationary. Extends Choir coordination radius. Does not move. Priority target.
Hulk — slow, high health, armored. Creates a zone enemies cluster behind.

Choir mechanic:
- When a Repeater is alive, enemies within its radius move in coordination: they flank, pause, advance together.
- When all Repeaters in range are dead, enemies become feral: random movement, no flanking.
- Visual: a faint glowing link from each coordinated enemy to the nearest Repeater.

Breach escalation:
- Active breach has a pressure timer. The longer it stays open, the faster enemies spawn and the larger the Repeater count.
- Killing the breach stops escalation and triggers the operation result.

Operation result screen:
- After breach is closed or player dies, show a clean result screen.
- Fields: Breach Status (Purged / Overrun), Lane Held (Yes / No), Enemies Killed, Choir Nodes Severed, Time Elapsed, Faction Used.
- A short one-sentence operation summary in DEADROT voice. Example: "Pyre squad purged the breach at Grid 7. Lane held. Choir signal lost."
- Continue button returns to main menu.

Acceptance criteria:
- All three faction classes are selectable from the game menu.
- Faction abilities work in gameplay.
- Swarm, Repeater, and Hulk enemy types spawn correctly.
- Choir coordination is visible when Repeaters are alive.
- Breach escalation increases enemy count over time.
- Operation result screen appears on win and lose.
- Game runs without console errors.
- All three factions are playable end to end.

When done:
- Dev URL.
- What works.
- Known limitations.
```

**DEADROT Pixel Art Asset Generator (Replicate + Nano Banana Pro)**

```text
/goal Build a DEADROT pixel art asset generator script that calls the Replicate API with google/nano-banana-pro to generate faction sprites, enemy sprites, and UI assets. Save output locally as PNG files.

Tech:
- TypeScript script, run with: bun run scripts/generate-assets.ts
- Replicate API via the replicate npm package
- Input: entity name + entity type (faction_portrait, enemy_sprite, ui_icon)
- Output: PNG saved to apps/app/data/assets/deadrot/<entity-type>/<entity-name>.png

DEADROT aesthetic rules to bake into every prompt:
- Pixel art style, 16-bit, limited color palette
- Palette: dark slate, infected red, toxic green, bone white, rust orange
- No clean surfaces. Everything is corroded, cracked, or partially consumed
- Transparent background

Entity presets:

Faction portraits (64x64):
- warden: "16-bit pixel art portrait, armored soldier in grey-green tactical gear, cracked visor, fortified exosuit, dark slate and rust tones, transparent background"
- pyre: "16-bit pixel art portrait, fire-scarred soldier in burnt orange armor, cracked faceplate glowing orange, scorched texture, transparent background"
- listener: "16-bit pixel art portrait, scout in dark grey gear, antenna array on helmet, subtle green glow from eyes, corrupted tether visible at neck, transparent background"

Enemy sprites (48x48):
- swarm: "16-bit pixel art enemy sprite, infected humanoid with elongated limbs, mottled red-grey flesh, hunched sprint pose, transparent background"
- repeater: "16-bit pixel art enemy sprite, stationary infected creature, mushroom-like signal organ growing from torso, pulsing green-red glow, rooted stance, transparent background"
- hulk: "16-bit pixel art enemy sprite, massive infected creature, fused with corroded machine parts, heavy armored bulk, slow stance, dark metal and red flesh, transparent background"

UI icons (32x32):
- breach: "16-bit pixel art icon, glowing wound in reality, red-black rift, transparent background"
- choir_node: "16-bit pixel art icon, pulsing neural signal ring, green-red tones, transparent background"

CLI usage:
- bun run scripts/generate-assets.ts --preset all
- bun run scripts/generate-assets.ts --preset warden
- bun run scripts/generate-assets.ts --prompt "custom prompt" --name my-asset --type enemy_sprite

Environment:
- REPLICATE_API_TOKEN must be set in .env.local

Acceptance criteria:
- Script runs with bun run scripts/generate-assets.ts --preset all
- All preset assets generate and save as PNG to the correct paths
- File paths print to stdout as each asset saves
- Script exits cleanly
- README.md added to apps/app/data/assets/deadrot/ listing what is generated and how to run

When done:
- Command to run.
- List of files generated.
- Any known limitations.
```

**Persistent War State Model**

```text
/goal Build the DEADROT persistent war state model: a TypeScript data structure and set of pure functions that record operation results and track regional war state.

Use the existing monorepo. Add to packages/types as @shipshitshow/types exports.

Types to define:
- OperationResult: breach status (purged | overrun), lane held, enemies killed, choir nodes severed, time elapsed, faction used, region id, timestamp
- RegionState: region id, breach pressure (0-100), faction control (warden | pyre | listener | contested | none), resource level, operation history (last 5 results)
- WarState: record of RegionState by region id, last updated timestamp

Pure functions to add in packages/types or a new packages/war-state package:
- applyOperation(state: WarState, result: OperationResult): WarState
- getRegionPressure(state: WarState, regionId: string): number
- getSummary(state: WarState): string — one-sentence DEADROT-voice war report

Seed with five test regions: Grid-1 through Grid-5, starting at 20% breach pressure each.

Acceptance criteria:
- Types export cleanly from @shipshitshow/types
- applyOperation correctly reduces breach pressure on purge, increases on overrun
- getSummary returns a non-empty string
- bun run check:types passes
- Unit tests pass for applyOperation and getSummary

When done:
- Files created.
- Type exports.
- Test results.
```

### Host Notes

- Copy from the code block, not from memory.
- Tell the audience what `/goal` changes: the model has to keep working until acceptance criteria pass.
- If the model returns early, paste the acceptance criteria back: "No, keep going until it runs end to end."
- Best live order: Scourge Survivors first (visible gameplay), asset generator second (visual payoff), war state model third (foundation work).
- Best chaos order: asset generator first — the pixel art generates fast and looks great on stream.

## Sources — News And Disclosures

- [Crazy Taxi: World Tour AI disclosure coverage](https://www.shacknews.com/article/149519/crazy-taxi-world-tour-generative-ai-content-disclosure?amphtml=1) — Sega disclosure and background asset note.
- [Tomb Raider AI disclosure coverage](https://www.gamesradar.com/games/tomb-raider/tomb-raider-legacy-of-atlantis-was-made-with-ai-steam-page-reveals-but-any-assets-made-using-the-controversial-tech-were-either-replaced-or-refined-by-humans/) — early exploration / temporary content / replaced or refined.
- [Steam AI disclosure policy coverage](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/) — player-consumed AI vs behind-the-scenes tools.
- [Grok Build launch coverage](https://www.eweek.com/news/xai-grok-build-coding-agent/) — xAI joins coding-agent fight.
- [Claude Opus 4.8 Dynamic Workflows coverage](https://techcrunch.com/2026/05/28/anthropic-releases-opus-4-8-with-new-dynamic-workflow-tool/) — parallel subagent workflow story.
- [GitHub Copilot Opus 4.8 changelog](https://github.blog/changelog/2026-05-28-claude-opus-4-8-is-generally-available-for-github-copilot/) — availability and premium multiplier.
- [Microsoft Build 2026 recap](https://www.tomsguide.com/news/live/microsoft-build-2026) — agentic dev tooling, Copilot app, local AI hardware, model routing.

## Sources — DEADROT Universe

- [Ship Shit Games](https://shipshit.games) — studio positioning, seven game tracks, DEADROT and build loop.
- [DEADROT](https://deadrot.com) — universe rules: Scourge, breaches, lanes, Pact, Choir, factions.

## Sources — Live Build

- [Replicate: google/nano-banana-pro](https://replicate.com/google/nano-banana-pro) — image generation model used for pixel art asset generation.
- [How to prompt Nano Banana Pro](https://replicate.com/blog/how-to-prompt-nano-banana-pro) — prompting reference for the model.

## Talking Points — Thumbnail Prompts

### Segment Thesis

The thumbnail should sell AI game development becoming public, not a generic model fight.

### Talking Points

- **Primary prompt:** YouTube livestream thumbnail, 16:9, high-contrast brutal tech/game-dev style. Center: a massive AI-controlled game studio command room building the DEADROT universe, with game editor screens, faction art boards, code terminals, QA checklists, and a playable horde scene. Big readable title text: **AI AAA STUDIO**. Secondary text: **BUILT LIVE**. Dark metal UI, red infection glow, cyan code accents, premium game studio energy, sharp readable text, no logos, no tiny text, no generic robot face.
- **News variant:** YouTube livestream thumbnail, 16:9. A Steam store disclosure panel in the foreground, behind it a chaotic game-dev board with AAA trailer frames, AI asset thumbnails, and a DEADROT breach. Big text: **AI IN AAA GAMES**. Small text: **WE BUILD LIVE**. High contrast, dark UI, red/yellow warning accents, readable text, no company logos.
- **DEADROT variant:** YouTube livestream thumbnail, 16:9. A dark sci-fi battlefield lane with a red breach vomiting infected enemies, overlaid with a clean game editor UI, faction art board, asset pipeline, and code terminal. Faction cards for WARDEN, PYRE, LISTENER. Big text: **BUILDING DEADROT**. Small text: **AI AAA STUDIO**. Premium game-key-art energy, no tiny text, no fake logos.
- **Agent variant:** YouTube livestream thumbnail, 16:9. Four coding-agent terminals race to build one game scene, with one red QA checklist rejecting bad assets. Big text: **AGENTS VS GAME DEV**. Small text: **LIVE BUILD**. Dark metal, cyan terminals, red failure marks, game scene visible.
- **Thumbnail text options:** `AI AAA STUDIO`, `BUILT LIVE`, `BUILDING DEADROT`, `AI GAME STUDIO`, `AGENTS VS GAME DEV`, `NO MORE TOY DEMOS`.
- **Do not use:** generic robot head, cute gamepad, tiny news headlines, company logos, pure gradient background, fake Steam branding, fake publisher names.

### Host Notes

- Best A/B pair: **AI AAA STUDIO / BUILT LIVE** vs **BUILDING DEADROT / AI GAME STUDIO**.
- For clips, use the DEADROT variant once the build has visible gameplay.
- For pre-stream, the news variant will probably hook broader AI/gaming discourse better.

## Talking Points — Clip Candidates

### Segment Thesis

The stream should produce clips around AI disclosure, AI studio pipeline, DEADROT canon mechanics, and the live build result.

### Talking Points

- **Clip:** Cold open.
- **Hook text:** `AI GAME DEV IS HERE`
- **Title:** `AAA Games Are Already Using AI`
- **Thesis:** The conversation moved from hypothetical to public disclosures on known franchises.
- **Caption:** Crazy Taxi has a disclosure. Tomb Raider has a disclosure. Tonight we build the transparent version.
- **Risk:** Needs the source pages on screen, not just talking head.

- **Clip:** Steam disclosure segment.
- **Hook text:** `WHAT PLAYERS CONSUME`
- **Title:** `Steam's AI Line Actually Matters`
- **Thesis:** Code assistants and final player-facing AI assets are different trust surfaces.
- **Caption:** The disclosure is not about your prompt. It's about what the player eats.
- **Risk:** Avoid legal certainty. Keep it about policy and trust.

- **Clip:** DEADROT lore-to-mechanics segment.
- **Hook text:** `LORE MUST PLAY`
- **Title:** `AI Game Lore Becomes Slop Unless It Changes Mechanics`
- **Thesis:** DEADROT works because the Scourge, Choir, breaches, and lanes become gameplay constraints.
- **Caption:** Lore that does not change mechanics is just expensive flavor text.
- **Risk:** Needs `deadrot.com` or gameplay visible.

- **Clip:** Live build.
- **Hook text:** `BUILDING DEADROT`
- **Title:** `We Added A Faction System To Our AI-Built Game`
- **Thesis:** The stream moves from one-shot prototype to repeatable AI-native game production.
- **Caption:** The prompt is not the studio. The loop is the studio.
- **Risk:** Publish only if the mechanic is visible and playable.

- **Clip:** Agent pipeline segment.
- **Hook text:** `AGENTS VS GAME DEV`
- **Title:** `Coding Agents Are Not Game Engines`
- **Thesis:** Grok Build and Claude Code can write game code, but feel, pacing, QA, and canon still need a review loop.
- **Caption:** A coding agent can write a game. It cannot tell you if the shotgun feels like soup.
- **Risk:** Do not make it a fake model war. Tie it to workflow.

### Host Notes

- Mark timestamps during: cold open, first source pull-up, first working mechanic, first funny failure, final playtest.
- If the build fails, make the clip a failure autopsy. That is still on thesis.
- Best short title from the whole stream: **AI Floods. Studios Ship.**

## Tweets — Paste Live

- AAA games are now openly carrying AI disclosures. So tonight we're doing the transparent version: building DEADROT live, with the agent pipeline, canon rules, QA, and cuts on screen.
- The real AI game-dev question is not "can AI make a game?" It is "can AI keep a game universe coherent after the funny prototype?"
- AI floods. Studios ship.
- Lore that does not change mechanics is just expensive flavor text.
- The disclosure is not about your prompt. It's about what the player eats.
- A coding agent can write a game. It cannot tell you if the shotgun feels like soup.
- DEADROT rule for tonight: one canon, one playable slice, one review loop, one public build.
