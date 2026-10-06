---
title: "Claude Opus 4.8: One-shot app gauntlet"
slug: "claude-opus-4-8-one-shot-apps"
source: "Anthropic, Claude Docs, Artificial Analysis, DeepSWE, AWS, GitHub, TechCrunch, VentureBeat, Axios, Reddit, Three.js, Maker.js"
status: "in_progress"
date: "2026-06-02"
thumbnail_prompt: "YouTube livestream thumbnail, 16:9, high-contrast cinematic tech style. Center: a glowing Claude Opus 4.8 terminal window generating three apps at once. Left foreground: clean blue CAD wireframe bracket with dimension lines. Right foreground: first-person shooter arena view with red hit marker and blocky enemy silhouette. Bottom center: small node graph labeled AGENT TRACE. Big readable title text: CLAUDE 4.8. Secondary text: 3 APPS. Dark charcoal background, electric cyan and red accents, crisp UI details, no logos, no fake company marks, no tiny unreadable text."
---

## Livestream Notes

- [YouTube livestream](https://www.youtube.com/watch?v=p-WXHu2gU2s)

## Cold Open - READ THIS

> Claude Opus 4.8 just dropped.
>
> Anthropic says it is better at the failure mode coding agents keep hitting: knowing when the job is actually done.
>
> Price stays at 4.7 levels.
>
> Fast mode is here.
>
> Dynamic workflows can spawn parallel subagents and verify the results.
>
> Artificial Analysis has it back at number one: 61.4 on their Intelligence Index, 1,890 Elo on GDPval.
>
> But a leaderboard does not ship the app.
>
> Today we test the claim with three builds: CAD, a first-person shooter, and an agent debugger.
>
> Three apps, one stream.
>
> If 4.8 is meaningfully better, it should not only write code.
>
> It should catch itself when the thing is broken.

## Talking Points — The Launch Is About Trust, Not Hype

### Segment Thesis

This is not just "new model, higher number." The real question is whether it stops lying to itself when the code is not done.

### Talking Points

- Anthropic says 4.8 is more likely to flag uncertainty and unsupported claims. Good. That's the part I actually care about. [Anthropic announcement](https://www.anthropic.com/news/claude-opus-4-8)
- They also say it is around four times less likely than 4.7 to let flaws in its own code pass without saying anything. If true, that's huge. Not because it writes more code, but because it stops pretending broken code is finished. [Anthropic announcement](https://www.anthropic.com/news/claude-opus-4-8)
- The Reddit split is already useful. Some people say one-shot fixes are better. Some say it is slower, more careful, more expensive. Yeah. That's exactly the trade. [r/ClaudeCode launch thread](https://www.reddit.com/r/ClaudeCode/comments/1tq99jj/introducing_claude_opus_48/) / [r/ClaudeAI launch thread](https://www.reddit.com/r/ClaudeAI/comments/1tq99mu/introducing_claude_opus_48/)
- My issue with agents is not that they write bad code. I write bad code too. The problem is when they say "done" and the tests, the UI, the edge cases, and sometimes the whole repo say no.
- So if 4.8 is slower but it catches itself, maybe that's cheaper. Because the expensive part is not the first answer. The expensive part is trusting the wrong answer.
- Clip line: **"The enemy is not bad code. The enemy is bad code with confidence."**
- Then go to benchmarks: the trust claim is interesting, but what's the scoreboard?

### Host Notes

- Push on: 4.8 as a trust release, not a taste release.
- Avoid: declaring it "best model" from vendor claims alone.
- Pull up: Anthropic announcement section on honesty, then Reddit split-screen.

## Talking Points — The Bench Run Is Real But Uneven

### Segment Thesis

The benchmark story is good, but don't turn it into religion. The question is still: what loop do you trust it with?

### Talking Points

- Artificial Analysis has 4.8 at **61.4** on the Intelligence Index. That's +4.1 over 4.7 and slightly above GPT-5.5 xhigh. That is real movement. [Artificial Analysis](https://artificialanalysis.ai/articles/claude-opus-4-8-analysis-and-benchmarks)
- GDPval-AA is **1,890 Elo**. It retakes the top spot there. That's the kind of benchmark I care about more, because it's closer to work than trivia. [Artificial Analysis](https://artificialanalysis.ai/articles/claude-opus-4-8-analysis-and-benchmarks)
- Coding numbers: SWE-bench Verified **88.6%**, SWE-bench Pro **69.2%**, Terminal-Bench 2.1 **74.6%**. But GPT-5.5 still has the terminal-loop story in that comparison, so don't do the dumb thing and say "Claude wins everything." [VentureBeat](https://venturebeat.com/technology/anthropics-claude-opus-4-8-is-here-with-3x-cheaper-fast-mode-and-near-mythos-level-alignment)
- DeepSWE is the receipt to pull up when the chat starts worshipping saturated benchmarks. It measures original long-horizon engineering tasks, and the table makes the real question obvious: pass rate, cost, time, output tokens, and verification all move together. [DeepSWE](https://deepswe.datacurve.ai/)
- AWS frames it around agentic coding and long-running autonomous tasks. That's the market they are aiming at. Not chat. Work. [AWS](https://aws.amazon.com/about-aws/whats-new/2026/05/claude-opus-4.8-aws/)
- So the routing rule is boring but important: use 4.8 where being wrong is expensive. Reviews, architecture, migrations, weird UI, long context. Don't use it just because the logo has the highest number this week.
- Clip line: **"The leaderboard says smarter. The terminal still asks for receipts."**
- Then turn: and Anthropic knows that, because the feature they shipped is not just the model. It's the workflow.

### Host Notes

- Push on: GDPval and SWE-bench Pro as "work" signals, not trivia.
- Avoid: drowning the stream in tables.
- Pull up: Artificial Analysis chart first, then Anthropic pricing line.

## Talking Points — The Product Feature Is Parallel Agents

### Segment Thesis

Dynamic workflows are Anthropic saying the quiet part out loud: the product is not chat anymore, it is a work loop.

### Talking Points

- The docs are stacked now: `claude-opus-4-8`, 1M context, 128k max output, adaptive thinking, mid-conversation system messages, high effort by default, fast mode, prompt cache minimum down to 1,024 tokens. That's not a chatbot page. That's agent infrastructure. [Claude API docs](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8)
- Dynamic workflows are the big one. Claude can write orchestration scripts, spin up tens or hundreds of subagents, then verify before it reports back. Useful. Also expensive. Also dangerous if the verification is garbage. [Claude dynamic workflows announcement](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code)
- Their Bun Zig-to-Rust example ran for 11 days and got 99.8% of the test suite passing. That's not "make me a landing page." That's "I need a machine that can grind on a repo while I sleep." [Claude dynamic workflows announcement](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code)
- GitHub Copilot has it too, so this is not some hidden API thing. This is going into normal developer workflows. [GitHub changelog](https://github.blog/changelog/2026-05-28-claude-opus-4-8-is-generally-available-for-github-copilot/)
- My take: don't burn dynamic workflows on a button. Use it when the loop matters: migration, audit, security sweep, repo cleanup, "find all the places this is broken."
- Clip line: **"The next IDE is not an editor. It is a work scheduler with taste."**
- Then turn: so if the product is work loops, let's not build another todo app. Let's make it do annoying software.

### Host Notes

- Push on: cost warning from the dynamic workflows post.
- Avoid: promising autonomous perfection.
- Pull up: dynamic workflows "How it works" section and the Bun port paragraph.

## Talking Points — Demo 1: PocketCAD

### Segment Thesis

CAD is perfect because it does not care about vibes. If the hole is wrong, the part is wrong. That's it.

### Talking Points

- Build `PocketCAD`: small browser CAD for a laser-cut bracket or enclosure plate. Not SolidWorks. Just enough that it can be wrong in obvious ways.
- Use React + Three.js for preview. Maker.js for the 2D geometry and SVG/DXF export, because Maker.js is literally built for parametric CNC drawings. [Maker.js](https://maker.js.org/)
- Reference target: think Scriptcad / JSCAD energy, but with a visual plate editor instead of code-first CAD. Small maker tool, live parameters, browser preview, export button. [Scriptcad](https://scriptcad.com/) / [JSCAD](https://jscad.app/)
- What I want to see: paste a small CAD nomenclature/spec, generate the 2D plate, render the 3D extrusion, then tweak dimensions with normal controls.
- The spec does not need to parse STEP or SolidWorks. It should parse a structured mini spec: units, plate dimensions, thickness, holes, slots, fillets.
- Then the UI should still expose grid, dimensions, rectangle/circle/slot, drag handles, numeric inputs, live 3D extrusion, undo/redo, export SVG/DXF.
- The point is not "wow CAD." The point is: can 4.8 keep geometry, UI state, and export math in its head without silently breaking one of them?
- If the dimensions drift, good. That's content. That's exactly why CAD is a better test than a todo app.
- Clip line: **"A todo app forgives hallucinations. CAD turns them into crooked parts."**
- Then turn: CAD tests precision. FPS tests feel, and feel is where generated apps usually become trash.

### Host Notes

- Best title variant: **Can Claude 4.8 One-Shot CAD?**
- Prompt opener: "Build a polished browser CAD tool, not a demo canvas."
- Keep scope: 2D parametric designer + 3D preview. Do not ask for full SolidWorks.

## Talking Points — Demo 2: FPS Arena

### Segment Thesis

FPS is the opposite of a benchmark table. You know in two seconds if it feels wrong.

### Talking Points

- Build `FPS Arena`: one browser arena, pointer lock, WASD, mouse look, raycast weapon, target bots, health, ammo, score, restart.
- Three.js has `PointerLockControls` for exactly this kind of first-person game. Use that. Don't invent camera controls from scratch unless we want pain. [Three.js PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html)
- If Rapier fits cleanly, fine. If not, use raycasting and bounding boxes. I don't want to spend 40 minutes watching physics integration sadness.
- This is good TV because there is no hiding. Either the mouse locks or it doesn't. Either the bullet hits or it doesn't. Either the enemy moves or it teleports like garbage.
- This is also a good model test because it mixes UI overlays, game loop, input events, performance, state, and "does this actually feel right?"
- Clip line: **"A benchmark cannot tell you if the shotgun feels like soup."**
- Then turn: and the last demo is the real Anthropic claim. Not graphics. Agents checking agents.

### Host Notes

- Best title variant: **Claude 4.8 Builds Doom In One Prompt**
- Keep it single-player. Multiplayer is a trap for a live one-shot.
- If physics gets risky, switch to raycasting + bounding boxes instead of full rigid bodies.

## Talking Points — Demo 3: AgentFlow Debugger

### Segment Thesis

AgentFlow is the serious one. If agents are going to run work, I need traces, not vibes.

### Talking Points

- Build `AgentFlow Debugger`: visual workflow with Start, Research, Build, Test, Review, Fix, Done.
- Run simulator moves a task through the graph. Every node emits logs, cost, duration, confidence, artifacts. The reviewer can fail it and send it back to Fix.
- This is not random. This is basically the 4.8 promise as an app: long-running work, verification, retries, and a final report.
- The take is simple: I don't want more chat bubbles. I want to see why the agent believes it is done.
- If this demo breaks, it still proves the point. Because the point is exactly that agent workflow needs visible state and failure paths.
- Clip line: **"Autonomy without a trace is just vibes with admin permissions."**
- Then close: the demo that fails honestly tells us more than the one that says done and lies.

### Host Notes

- Best title variant: **Claude 4.8 Builds Its Own Agent Debugger**
- This is the fallback if the FPS eats too much time: it is high-signal and easier to ship polished.
- Optional twist: feed it the Opus 4.8 launch sources as sample research nodes.

## Talking Points — Thumbnail Prompts

### Segment Thesis

The thumbnail should sell the gauntlet, not the announcement: Claude 4.8 under pressure, three apps, visible receipts.

### Talking Points

- **Primary prompt:** YouTube livestream thumbnail, 16:9, high-contrast cinematic tech style. Center: a glowing Claude Opus 4.8 terminal window generating three apps at once. Left foreground: clean blue CAD wireframe bracket with dimension lines. Right foreground: first-person shooter arena view with red hit marker and blocky enemy silhouette. Bottom center: small node graph labeled AGENT TRACE. Big readable title text: **CLAUDE 4.8**. Secondary text: **3 APPS**. Dark charcoal background, electric cyan and red accents, crisp UI details, no logos, no fake company marks, no tiny unreadable text.
- **CAD variant:** YouTube thumbnail, 16:9. A dramatic browser CAD interface fills the frame, blue wireframe mechanical part with dimension arrows and extrusion preview. A terminal panel says `opus-4.8 build`. Big text: **CAN IT CAD?** Small text: **CLAUDE 4.8**. High contrast, sharp, premium tech, dark background, cyan geometry, red warning accents, no logos.
- **FPS variant:** YouTube thumbnail, 16:9. First-person shooter arena in browser, crosshair locked on a red target dummy, code terminal reflected behind the scene. Big text: **ONE PROMPT FPS**. Small text: **CLAUDE 4.8**. Energetic but clean, not cartoonish, strong depth, readable text, dark metal and neon accents, no logos.
- **Agent variant:** YouTube thumbnail, 16:9. A visual agent workflow graph with nodes Research -> Build -> Test -> Review -> Fix, one node glowing red as failed, Claude 4.8 terminal verifying the run. Big text: **AGENT GAUNTLET**. Small text: **3 BUILDS LIVE**. Dark UI, cyan nodes, red failure path, sharp readable typography, no logos.
- **Thumbnail text options:** `CLAUDE 4.8`, `3 APPS`, `CAN IT CAD?`, `ONE PROMPT FPS`, `AGENT GAUNTLET`, `NO TODO APPS`.
- **Do not use:** Anthropic logo, Claude logo, photorealistic people, tiny benchmark tables, gradient blobs, generic robot face, crowded text.

### Host Notes

- Best A/B pair: **CLAUDE 4.8 / 3 APPS** vs **CAN IT CAD? / CLAUDE 4.8**.
- For Shorts/clips later, crop from the CAD and FPS variants rather than the combined thumbnail.
- Keep the visual promise concrete: CAD object, FPS crosshair, workflow trace.

## Talking Points — Clip Candidates

### Segment Thesis

The stream should be packaged for discovery before it starts: model fight, build proof, trust failure, and one visual demo per short.

### Talking Points

- **Clip:** Mark live during CAD demo; timestamp pending.
- **Type:** Build proof.
- **Hook text:** `CAN IT CAD?`
- **Title:** `Claude 4.8 Built CAD In One Prompt`
- **Thesis:** CAD is the cleanest test because geometry punishes fake correctness.
- **Why it works:** visual result, named model, one-prompt promise, obvious failure/success stakes.
- **Caption:** A todo app forgives hallucinations. CAD turns them into crooked parts.
- **Thumbnail prompt:** crop the CAD variant: blue wireframe part, dimension lines, `CAN IT CAD?`
- **Hashtags:** `#ClaudeCode` `#AICoding` `#CAD` `#SoftwareEngineering`
- **Risk:** needs a visible CAD object on screen; do not publish if it only shows setup.

- **Clip:** Mark live during FPS demo; timestamp pending.
- **Type:** Build proof / failure autopsy.
- **Hook text:** `ONE PROMPT FPS`
- **Title:** `Claude 4.8 Tried To Build An FPS`
- **Thesis:** Real-time game feel reveals integration failures benchmarks hide.
- **Why it works:** immediate visual proof: crosshair, movement, hit marker, enemy behavior.
- **Caption:** Benchmarks cannot tell you if the shotgun feels like soup.
- **Thumbnail prompt:** crop FPS variant: crosshair on red target, dark arena, `ONE PROMPT FPS`
- **Hashtags:** `#ClaudeCode` `#AICoding` `#ThreeJS` `#GameDev`
- **Risk:** if the FPS fails early, title it as a failure/autopsy instead of a success claim.

- **Clip:** Mark live during AgentFlow demo; timestamp pending.
- **Type:** Operator warning / build proof.
- **Hook text:** `AGENT TRACE`
- **Title:** `Autonomous Agents Need Receipts`
- **Thesis:** Agent products need traces, reviewer nodes, and failure paths, not more chat bubbles.
- **Why it works:** connects the Opus 4.8 trust story to a concrete UI viewers can understand cold.
- **Caption:** Autonomy without a trace is just vibes with admin permissions.
- **Thumbnail prompt:** workflow graph with one red failed node, `AGENT TRACE`
- **Hashtags:** `#AIAgents` `#ClaudeCode` `#AICoding` `#DevTools`
- **Risk:** needs a clear node graph on screen; otherwise keep it as a quote clip.

- **Clip:** Use cold open or benchmark segment; timestamp pending.
- **Type:** Model fight.
- **Hook text:** `BENCHMARKS DO NOT SHIP`
- **Title:** `Claude 4.8 Is Smarter. So What?`
- **Thesis:** The useful question is whether Opus 4.8 survives weird, stateful app builds.
- **Why it works:** contrarian model-launch framing, strong browse hook, clear promise.
- **Caption:** A leaderboard says smarter. A live build asks whether the thing actually ships.
- **Thumbnail prompt:** combined thumbnail with `CLAUDE 4.8` and `3 APPS`
- **Hashtags:** `#ClaudeAI` `#Anthropic` `#AICoding` `#SoftwareEngineering`
- **Risk:** avoid too much benchmark table footage; use this only if the line lands cleanly.

- **Clip:** Use trust/honesty segment; timestamp pending.
- **Type:** Hot take / operator warning.
- **Hook text:** `BAD CODE + CONFIDENCE`
- **Title:** `The Real AI Coding Failure`
- **Thesis:** The enemy is not bad code; it is bad code that says it is done.
- **Why it works:** strong standalone line, applies beyond Claude, likely comment bait.
- **Caption:** A slower agent that admits uncertainty can be cheaper than a fast one that silently breaks the repo.
- **Thumbnail prompt:** terminal with green "done" beside red failing tests, `BAD CODE + CONFIDENCE`
- **Hashtags:** `#AICoding` `#ClaudeCode` `#DevTools` `#SoftwareEngineering`
- **Risk:** needs one concrete receipt from the Anthropic announcement or live failure.

### Host Notes

- Publish order if demos work: CAD first, FPS second, AgentFlow third, then trust/honesty quote.
- Publish order if demos fail: FPS failure autopsy first, CAD precision failure second, honesty quote third.
- During the stream, say the exact clip lines cleanly once. Do not bury them in cross-talk.

## Talking Points — Copy Paste /goal Prompts

### Segment Thesis

The live test should not be "ask Claude to make a thing." It should be `/goal` end-to-end work: install, build, run, verify, and report.

### Talking Points

- Use these as literal copy-paste prompts during the build segment.
- Start with AgentFlow if you want the cleanest demo. Use PocketCAD for the most concrete "precision punishes hallucination" test. Use FPS if you want the highest-risk, highest-TV segment.
- If time is tight, do one single app well instead of three half-working apps.
- Clip line: **"The model does not get points for scaffolding. It gets points when the thing runs."**

**AgentFlow Debugger**

```text
/goal Build AgentFlow Debugger end to end: a polished visual debugger for autonomous coding-agent runs.

Use React + TypeScript + Vite. Use a proven graph/flow library such as React Flow if it fits cleanly. Use local state; no backend required. Do not build a chat app. Build an operator tool for inspecting agent work.

The app must include:
- Full-screen app UI with a graph canvas, run timeline, details inspector, and compact toolbar.
- Workflow nodes: Start, Research, Plan, Build, Test, Review, Fix, Done.
- Directed edges between nodes.
- A simulator that moves a task through the workflow step by step.
- Each node emits logs, cost, duration, confidence, artifacts, and status.
- Reviewer node can pass or fail.
- Failure sends the run back to Fix, then Test, then Review.
- Final report summarizes what happened, cost, time, retries, failed checks, and artifacts.
- Ability to select a node and inspect its logs/artifacts.
- Run controls: Start, Pause, Step, Reset, Speed.
- Visual status states: pending, running, passed, failed, retrying.
- No landing page. The first screen is the debugger.

Seed the app with this realistic sample task:
"Build PocketCAD: browser CAD with 2D geometry, 3D preview, and SVG export."

Acceptance criteria:
- Dependencies install.
- npm run dev starts the app.
- npm run build passes.
- Graph renders correctly.
- Simulator visibly advances through nodes.
- Failure/retry path works.
- Inspector updates when selecting nodes.
- Final report is generated after Done.
- Browser verification confirms the app is usable and nonblank.
- Do not stop at mock cards. The workflow simulation must actually run end to end.

When done, give me:
- Local dev URL.
- Build/test commands run.
- What works.
- Any known limitations.
```

**PocketCAD**

```text
/goal Build PocketCAD end to end: a polished browser CAD tool for designing a simple laser-cut bracket or enclosure plate.

Use React + TypeScript + Vite. Use Three.js for the 3D preview. Use Maker.js or another proven geometry/export library for 2D geometry and SVG/DXF export. Do not hand-roll CAD export math if a reliable library fits.

Reference targets:
- Maker.js for 2D parametric geometry and SVG/DXF export.
- Scriptcad for the browser-maker-tool feel: parameters, simple model, export.
- JSCAD/OpenJSCAD for live parametric CAD behavior in the browser.
- Do not clone any of them visually. Use them as references for capability and workflow.

The app must include:
- A stable full-screen tool UI with a left property panel, center 2D canvas, right 3D preview, and top toolbar.
- A CAD spec/nomenclature paste box that accepts a small structured part spec and generates the model from it.
- A sample spec button that loads this exact demo input:

  part: laser-cut-controller-bracket
  units: mm
  plate:
    width: 120
    height: 72
    thickness: 4
    cornerRadius: 6
  holes:
    - id: mount-left
      type: circle
      diameter: 6
      x: 18
      y: 18
    - id: mount-right
      type: circle
      diameter: 6
      x: 102
      y: 18
    - id: cable-pass
      type: slot
      width: 32
      height: 10
      x: 60
      y: 52
  labels:
    - text: PocketCAD
      x: 60
      y: 36

- Parametric shape controls for plate width, height, corner radius, thickness, hole count, hole diameter, hole spacing, and slot dimensions.
- Parsed spec values must populate the normal controls so the user can edit after generation.
- Live 2D drawing with grid, dimensions, holes, slots, and selection/drag handles where practical.
- Live 3D extrusion preview that matches the 2D dimensions.
- Undo/redo.
- Reset.
- Export SVG.
- Export DXF if the chosen library supports it cleanly; otherwise export SVG and explain the DXF limitation in the final report.
- No landing page. The first screen is the CAD tool.
- Professional compact UI. No giant hero section, no marketing copy, no decorative gradient blobs.

Acceptance criteria:
- Dependencies install.
- npm run dev starts the app.
- npm run build passes.
- Pasting the sample CAD spec generates a visible bracket with two circular holes and one slot.
- The generated 3D preview matches the parsed width, height, thickness, holes, and slot.
- The CAD model visibly updates when numeric inputs change.
- Export produces a real file/blob, not a placeholder.
- The 3D preview is nonblank and correctly framed.
- Browser verification includes at least one screenshot or visual check.
- Do not stop after scaffolding. Keep fixing until the app runs end to end.

When done, give me:
- Local dev URL.
- Build/test commands run.
- What works.
- Any known limitations.
```

**FPS Arena**

```text
/goal Build FPS Arena end to end: a playable browser first-person shooter arena.

Use React + TypeScript + Vite. Use Three.js. Use Three.js PointerLockControls for mouse look. Do not invent pointer-lock camera controls from scratch. Keep physics simple unless a physics library integrates cleanly; raycasting and bounding boxes are fine.

The app must include:
- Full-screen playable 3D arena.
- Pointer lock mouse look.
- WASD movement.
- Jump or simple vertical movement if it is reliable.
- Raycast weapon fired with left click.
- Crosshair.
- Hit marker.
- Target bots or moving enemies.
- Enemy health.
- Player health.
- Ammo and reload.
- Score.
- Timer.
- Restart button.
- Pause/escape behavior.
- Compact HUD that does not block gameplay.
- No landing page. The first screen is the game.

Gameplay requirements:
- Player can move around immediately after clicking into the game.
- Shooting hits enemies when the crosshair is on them.
- Enemies respawn or reset so the demo does not dead-end.
- If an enemy reaches the player, health changes.
- Game can be restarted without refreshing the browser.
- The arena must be visually readable: floor, walls, targets, lighting, depth.

Acceptance criteria:
- Dependencies install.
- npm run dev starts the app.
- npm run build passes.
- Browser verification confirms the scene is nonblank.
- Pointer lock works.
- Movement works.
- Shooting works.
- Hit detection works.
- Restart works.
- Do not stop at a static Three.js scene. Keep fixing until it is playable end to end.

When done, give me:
- Local dev URL.
- Build/test commands run.
- Controls.
- What works.
- Any known limitations.
```

**Full Gauntlet**

```text
/goal Build one polished browser app called Claude 4.8 Gauntlet that contains three complete demos in tabs: PocketCAD, FPS Arena, and AgentFlow Debugger.

Use React + TypeScript + Vite. Use Three.js for 3D. Use PointerLockControls for the FPS. Use Maker.js or another proven geometry/export library for CAD if it integrates cleanly. Use React Flow or a proven graph library for AgentFlow if it integrates cleanly.

Do not build a landing page. The first screen is the usable gauntlet app with tabs.

Tab 1: PocketCAD
- Parametric laser-cut bracket/enclosure plate designer.
- Inputs for width, height, corner radius, thickness, hole diameter, hole spacing, slots.
- Live 2D drawing with grid and dimensions.
- Live 3D extrusion preview.
- Export SVG.
- Reset.

Tab 2: FPS Arena
- Full-screen playable Three.js arena.
- Pointer lock mouse look.
- WASD movement.
- Raycast shooting.
- Crosshair, hit marker, enemies/targets, health, ammo, score, restart.

Tab 3: AgentFlow Debugger
- Visual workflow graph: Start, Research, Plan, Build, Test, Review, Fix, Done.
- Simulator with logs, cost, duration, confidence, artifacts, retry path, and final report.
- Select nodes to inspect details.

Global requirements:
- Professional compact UI.
- No marketing copy.
- No decorative gradient blobs.
- Stable layout on desktop.
- Every tab must be functional, not a placeholder.
- Use proven libraries for domain logic where reasonable.
- Run the app in the browser and verify every tab is nonblank and interactive.

Acceptance criteria:
- Dependencies install.
- npm run dev starts the app.
- npm run build passes.
- CAD updates geometry and exports SVG.
- FPS movement and shooting work.
- AgentFlow simulation reaches Done after retries.
- Browser verification confirms all three tabs work.
- Do not stop after scaffolding. Keep fixing until all three tabs work end to end.

When done, give me:
- Local dev URL.
- Build/test commands run.
- What works in each tab.
- Any known limitations.
```

### Host Notes

- Copy from the code block, not from memory.
- Tell the audience what `/goal` changes: the model has to keep working until acceptance criteria pass.
- If the model returns early, paste the acceptance criteria back and say: "No, keep going until the app runs end to end."
- Best live order: AgentFlow first, PocketCAD second, FPS third.
- Best chaos order: FPS first, then debug the fallout.

## Closing Take

> This is the real 4.8 test.
>
> Not whether it can write code.
>
> Every frontier model writes code.
>
> The question is whether it can build something weird, keep the state in its head, and tell me when it is broken.
>
> CAD exposes fake precision.
>
> FPS exposes fake interactivity.
>
> AgentFlow exposes fake autonomy.
>
> If 4.8 passes, we have a new default for expensive weird work.
>
> If it fails, we know exactly where the harness still has to do the job.

## Talking Points — Creator Reaction Pullups

### Segment Thesis

The creator reaction is the useful middle ground: Theo is testing limits and cost, Prime is poking at Mythos/launch framing, and the developer crowd is split between "this is insane" and "this still lies on dumb prompts."

### Talking Points

- Theo is the cleanest cost/limits receipt. He resubbed at the `$100` tier to try 4.8 and `ultracode`, then said he hit limits in a single prompt. Pull this up right before the `/goal` demo so the audience understands why end-to-end verification has to include cost and time, not just "did it build." [Theo on X](https://x.com/theo/status/2059820505574863069)
- Theo also had the subscription cutoff complaint right before launch: "hard cut me off over 24 hours early." That's not the main story, but it frames the user-trust problem around Claude Code subscriptions. [Theo on X](https://x.com/theo/status/2060066259233075429)
- Prime's best pullup is the Mythos skepticism line: Anthropic two weeks ago says "too dangerous," then today says here you go. That's the angle for the safety/marketing whiplash before the Mythos mention. [ThePrimeagen on X](https://x.com/theprimeagen/status/2060090905349034380)
- The r/theprimeagen thread is more useful than a single tweet for audience mood. Comments bounce between "Opus 4.8 is insane" and "all these models converge to the same crap." That is exactly the stream tension: benchmark hype versus actual operator feel. [r/theprimeagen launch thread](https://www.reddit.com/r/theprimeagen/comments/1tqctnz/introducing_claude_opus_48/)
- There is also a separate r/theprimeagen thread around 4.8 getting simple letter-count questions wrong. Use it only if the demo gets too benchmark-y: the point is not that spelling gotchas matter; the point is that models still need harnesses and verification. [r/theprimeagen: Opus 4.8 is insane](https://www.reddit.com/r/theprimeagen/comments/1tqdv35/opus_48_is_insane_nothing_will_be_the_same_after/)
- Clip line: **"Creators are not arguing about the benchmark. They are arguing about whether the thing survives contact with a real bill, a real prompt, and a real repo."**
- Then turn: enough reaction farming. Let's run the `/goal` and see whether the app exists at the end.

### Host Notes

- Pull up in this order: Theo limit tweet, Prime Mythos tweet, r/theprimeagen thread.
- Avoid making this a drama segment. Use it as setup for the live build.
- If Theo's tweet fails to load on X, use the Digg mirror for the same posts.

## Sources — Primary Launch

- [Anthropic: Introducing Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8)
- [Claude API docs: What's new in Claude Opus 4.8](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8)
- [Claude: Introducing dynamic workflows in Claude Code](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code)
- [Claude Opus 4.8 System Card PDF](https://cdn.sanity.io/files/4zrzovbb/website/c886650a2e96fc0925c805a1a7ca77314ccbf4a6.pdf)
- [AWS: Claude Opus 4.8 is now available on AWS](https://aws.amazon.com/about-aws/whats-new/2026/05/claude-opus-4.8-aws/)
- [GitHub Changelog: Claude Opus 4.8 is generally available for GitHub Copilot](https://github.blog/changelog/2026-05-28-claude-opus-4-8-is-generally-available-for-github-copilot/)

## Sources — Benchmarks And Analysis

- [Artificial Analysis: Claude Opus 4.8 takes the lead on the Intelligence Index](https://artificialanalysis.ai/articles/claude-opus-4-8-analysis-and-benchmarks)
- [Artificial Analysis model page: Claude Opus 4.8](https://artificialanalysis.ai/models/claude-opus-4-8)
- [DeepSWE: long-horizon coding agent benchmark](https://deepswe.datacurve.ai/)
- [VentureBeat: Opus 4.8, cheaper fast mode, near-Mythos alignment](https://venturebeat.com/technology/anthropics-claude-opus-4-8-is-here-with-3x-cheaper-fast-mode-and-near-mythos-level-alignment)
- [TechCrunch: Anthropic releases Opus 4.8 with dynamic workflow tool](https://techcrunch.com/2026/05/28/anthropic-releases-opus-4-8-with-new-dynamic-workflow-tool/)
- [Axios: Anthropic releases new model, Opus 4.8](https://www.axios.com/2026/05/28/anthropic-opus-release-mythos)
- [Tom's Guide: Opus 4.8 and honesty framing](https://www.tomsguide.com/ai/claude-opus-4-8-just-launched-and-anthropic-says-its-far-less-likely-to-fake-answers)

## Sources — Live Build Libraries

- [Maker.js: parametric CNC drawings, SVG/DXF/PDF export](https://maker.js.org/)
- [JSCAD: JavaScript parametric CAD in the browser](https://jscad.app/)
- [OpenJSCAD docs: modular browser and command-line CAD tools](https://www.openjscad.xyz/docs/)
- [Scriptcad: browser parametric modeler for makers](https://scriptcad.com/)
- [Three.js PointerLockControls docs](https://threejs.org/docs/pages/PointerLockControls.html)
- [Three.js pointer lock controls example](https://threejs.org/examples/misc_controls_pointerlock)
- [web.dev: Pointer lock and first-person shooter controls](https://web.dev/articles/pointerlock-intro)

## Sources — Audience Sentiment

- [Theo on X: resubbed at $100, hit limits in a single prompt](https://x.com/theo/status/2059820505574863069)
- [Theo on X: Claude Code sub cut off early](https://x.com/theo/status/2060066259233075429)
- [Digg mirror: Theo Claude Code subscription cutoff story](https://digg.com/ai/8274xekc)
- [ThePrimeagen on X: Mythos/Anthropic launch whiplash](https://x.com/theprimeagen/status/2060090905349034380)
- [r/theprimeagen: Introducing Claude Opus 4.8](https://www.reddit.com/r/theprimeagen/comments/1tqctnz/introducing_claude_opus_48/)
- [r/theprimeagen: Opus 4.8 is insane, nothing will be the same after this model](https://www.reddit.com/r/theprimeagen/comments/1tqdv35/opus_48_is_insane_nothing_will_be_the_same_after/)
- [Friday AI Club: cross-platform reaction roundup](https://fridayaiclub.com/what-people-really-think-about-claude-opus-4-8/)
- [r/ClaudeCode launch thread](https://www.reddit.com/r/ClaudeCode/comments/1tq99jj/introducing_claude_opus_48/)
- [r/ClaudeAI launch thread](https://www.reddit.com/r/ClaudeAI/comments/1tq99mu/introducing_claude_opus_48/)
- [r/ClaudeCode: Opus 4.8 smart, but careful and slow](https://www.reddit.com/r/ClaudeCode/comments/1tqfiw2/opus_48_smart_but_careful_and_slow/)
- [r/ClaudeCode: 4.8 feels better, stay tool-mobile](https://www.reddit.com/r/ClaudeCode/comments/1tqkcvt/claude_code_48_feels_much_better_but_my_real/)

## Tweets — Paste Live

- Claude Opus 4.8 is not getting a benchmark stream. It is getting CAD, an FPS, and an agent debugger. Weird apps or it doesn't count.
- A todo app forgives hallucinations. CAD turns them into crooked parts.
- The real AI coding failure is not bad code. It is bad code that says "done."
- Autonomy without a trace is just vibes with admin permissions.
- If 4.8 is really better, it should survive weird stateful software, not another CRUD demo.
