# CloudCraft: project context

Read this before changing the game. It describes how the game is built today, the rules that
keep it correct, and how to add content. Keep it current when you change the architecture.

## What it is

CloudCraft is a 3D browser game that teaches AWS from zero to Cloud Practitioner level. You build
architectures on a data-centre board (Internet Users → edge → public subnet → private subnet),
run real traffic through them, and fix what breaks. There are 130 levels in 13 modules that follow
the AWS Cloud Practitioner syllabus. Every 10th level is a module assessment.

Stack: React 19, Three.js 0.186 (plain Three, no react-three-fiber), Tailwind v4, motion,
TypeScript, Vite 8 (rolldown), vitest, bun. It's an installable PWA.

## Architecture

There are three layers, and dependencies only point down:

```text
src/app      React UI: screens, HUD, overlays, store (reducer + persistence)
   │
src/render   Three.js renderer: draws a BoardScene, never decides rules
   │
src/content  Levels, stories and cutscenes, as data
   │
src/engine   Pure TypeScript rules. No DOM, no Three, no React. Source of truth.
```

### Engine (`src/engine`)
- `analyzeBoard(board, { load, limits })` is the single function that decides what happens on a
  board. It returns a `BoardAnalysis`: zones, links (allowed or not, and why), health per block,
  violations (with codes such as `zone.db_exposed` and `link.tier_skip`), the traffic trace
  (`served`, the paths, where packets stop), and telemetry (latency, capacity, errors, cost,
  security score).
- `catalog.ts`: every service's tier, legal zones, cost, capacity and default config.
- `board.ts`: geometry and zones.
  - Grid x runs −7..7. External is −7..−5, edge −4..−2, public subnet −1..2, private subnet 3..7.
  - Grid z runs −3..3. z ≤ 0 is us-east-1a, z > 0 is us-east-1b. A tile is 1.4 world units.
- `rules/`: connection, placement, security and FinOps rules, each emitting violations.
- Rules worth knowing before you write a level:
  - An EBS volume only attaches to a server in its own AZ (`link.ebs_cross_az`).
  - Route 53 with a non-simple routing policy skips crashed targets when a healthy one is
    wired (`dns.failed_over`, a warning). Simple routing keeps sending users to the dead one.
  - ECS capacity and cost scale with `desiredCount` (tasks, 600 rps each).
  - SQS buffers writes only when no compute writes to the database directly.
- `objectives.ts`: evaluates level goals (path, place, reach, wire, config, firewall, removed,
  maxCount, apart, azSpread, sla) and explains each result in plain English. `apart(a, b)` passes
  when no working wire joins the two service types.
- `simulate.ts`: `runTest` is the referee. It decides whether a stage passes, whether the level is
  complete, and the stars and XP earned.
- `session.ts`: the session reducer. It's the only way the board changes, and it validates every
  action.
- `save.ts`: a versioned save format. Parsing never throws.
- `tsconfig.engine.json` type-checks the engine on its own, with no DOM lib, to keep it pure.

### Content (`src/content`)
- **Module 1** (levels 1–10) is hand-written in `levels/module1.ts`. Its cutscenes are in
  `cutscenes/module1.ts`.
- **Levels 11–130** are recipes in `levels/recipes.ts`. A recipe lists:
  - the starting board, as `"id:type@x,z"` (`~` marks a removable block, `!` a crashed one)
  - the player's changes for each stage
  - the goals, built with the helpers in `goals.ts`
  - optionally `clientName`, to rename Internet Users (for example "Head Office")

  `recipe.ts` compiles a recipe into a full `LevelSpec`. It works out the reference solution by
  replaying the stages, and writes the step-by-step hint from the same changes, so the hint can't
  disagree with the solution.
- **Stories** (`stories/moduleN.ts`, typed in `story.ts`) hold everything a player reads for each
  recipe level:
  - text: title, briefing, tips and concept card
  - stage card rewrites
  - the opening cutscene
  - a **wrong board**: the most tempting mistake, as a change to a stage's finished board

  `levels/index.ts` merges recipes with stories. Any level without a story falls back to
  `legacy/levelText.json`.
- **Cutscenes** (`cutscene.ts`) are timelines of beats: camera, spawn, remove, wire, crash,
  traffic, callout, caption, speech, stat, clear and wait.
  - They play on the real renderer, and traffic beats run `analyzeBoard`, so a story can never
    show something the rules wouldn't do.
  - The recurring cast is Maya (CTO), Dev (on-call), Rio (founder), Ines (security), Tom (finance)
    and a customer.

### Renderer (`src/render`)
- `BoardRenderer` owns the scene. The app calls `setScene(BoardScene)` and `playTraffic(trace)`,
  plus camera and effect calls: `shot`, `playIntro`, `celebrate` and `flashBlock`.
- Layers:
  - `BoardMesh`: plinth, perforated floor and zone outlines
  - `Environment`: data-hall floor, rack rows and city skyline, all instanced
  - `BlockLayer`: models, status LEDs, and smoke, sparks and embers for faults
  - `WireLayer`, `TrafficAnimator`, `LabelLayer`, `Effects`
- `CameraRig` handles orbit, pan, intro fly-in, victory sweep and cinematic shots.
- Models (`assets/library.ts`):
  - GLB files load lazily from `public/models`, compressed with meshopt.
  - A voxel stand-in shows until the GLB arrives.
  - Materials are swapped for shared, tone-checked palette materials, keyed by the material name.
- `PostFx.ts` (bloom, plus GTAO on high) is loaded with a dynamic import. Quality tiers in
  `quality.ts` are low (no post-processing), medium (bloom) and high (bloom and AO).
- Every geometry, material and texture is disposed through `disposal.ts`. GPU memory stays flat
  across level switches (checked in the browser with `renderer.info`).

### App (`src/app`)
- Store: `store/game.ts` is a reducer of `GameState` (screen, session, overlay, save). It wraps
  the engine's session reducer. `GameProvider` provides it, and `persistence.ts` saves it.
- Screens: Title → Module map → Play.
- Starting a level opens the **cutscene**, then the **briefing**, then the board. With reduced
  motion, the cutscene shows as still story panels.
- During play, the HUD shows the toolbelt, inspector, mission panel, telemetry and report. "Run
  Traffic" calls `runTest`, and the result goes to the debrief.
- `dev/Gallery.tsx` (`/?gallery`) shows every model on the real board, for art review.

### Art pipeline (`art/`)
- Each service model is a Blender Python script in `art/models/<service>.py`, built from the
  shared kit in `art/lib/cc.py`.
- `node art/build.mjs [names…] [--preview]` runs headless Blender, exports a GLB, compresses it
  with gltf-transform (meshopt), and writes `src/render/assets/models.json` (height, sockets,
  triangles, bytes, hash).
- Named nodes the game drives: `socket_status`, `socket_label`, `led_*`, `spin_*` and `heat_*`.
- Budgets, enforced by `src/render/__tests__/models.test.ts`: at most 4,000 triangles and 90 KB
  per model, and at most 2 MB in total.
- Judge shape in Blender previews, and colour in the in-game gallery, because colours shift under
  the game's lighting and tone mapping.

## Invariants
1. **The engine decides; nothing else does.** The UI, the renderer and cutscenes ask
   `analyzeBoard` and `runTest`. They never reimplement a rule.
2. **Free placement, strict testing.** Players can place blocks anywhere legal for the reducer.
   Mistakes show up as violations and failed goals when traffic runs.
3. **Every level is proven by tests**:
   - the solution completes the level
   - the starting board doesn't already pass
   - each stage needs new work
   - the recipe replays through the real reducer for three stars
   - the wrong board fails for its stated reason
4. **Cutscenes are checked by tests**:
   - blocks are in legal zones (unless the story is about that mistake)
   - no two blocks land on the same tile
   - each cutscene runs 15–35 s
   - every traffic beat matches the engine
5. **Phones are first-class.** Every screen works at 360 px wide, and the low tier stays smooth.
   Headless FPS numbers come from SwiftShader and aren't meaningful, so check FPS on a real
   device.

## Adding or changing a level
1. Edit the recipe in `levels/recipes.ts`: the board, the stage changes and the goals.
2. Edit its story in `stories/moduleN.ts`: text, stage cards, cutscene and wrong board.
3. Run `bun run test`. The level, story and cutscene suites tell you exactly what's wrong.

## Commands
- `bun run dev` starts the dev server on port 3000.
- `bun run test` runs vitest.
- `bun run lint` type-checks the app and the engine.
- `bun run build` builds for production.
- `node art/build.mjs <names> --preview` rebuilds models. Blender 5.2 must be at
  `/Applications/Blender.app`.

## History
- **Original prototype**, written by a smaller model: a react-three-fiber scene, rules spread
  across UI components, and generated level text. It was replaced because of rule bugs, levels
  that passed for the wrong reasons, and memory leaks.
- **Overhaul** (branch `overhaul/game-engine`):
  1. A pure engine.
  2. The app and renderer rebuilt on that engine.
  3. A game-style UI and phone layout.
  4. Blender-built realistic models, the data-hall environment and post-processing.
  5. A cutscene system.
  6. A rewrite of all 130 levels, each with a cutscene and a wrong-board test.
  7. Bundle splitting, with the models precached by the PWA.
