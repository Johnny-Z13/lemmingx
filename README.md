# Swarmwright

`Swarmwright` is the working public title for the repository historically named
LemmingX: an original swarm-rescue puzzle game built around authored living
terrain. Name/trademark clearance is still a human pre-publication gate.

Tiny creatures spill from a hatch. You assign classic skills **and** author the
living landscape: dig, build, bomb, flood, float wood into bridges, ignite it
into fire, and order
the hatch queue so the swarm gets home. Skills are precision tools; terrain
physics is the star. Original work — no copyrighted Lemmings assets or source.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

`npm run dev` boots the canonical player/CrazyGames experience. On the local
development server only, the **Dev Sandbox** button reloads the tab with every
campaign level unlocked, Prototype 11/12, Sand Lab, and diagnostic controls.
Compiled builds cannot enter Sandbox mode.

The runtime selects a **Desktop** or **Mobile** device profile from platform and
input capabilities, never from viewport width alone. Direct and shareable launches
(including Vercel/Home Screen launches) supply their own landscape-only rotate
gate. The same artifact detects when it is embedded by CrazyGames and delegates
that prompt to the host, avoiding a competing modal. iPadOS desktop-style user
agents are recognized through touch support.

```bash
npm run test    # vitest: sim + CA + level solvability
npm run build   # the one production artifact for Vercel and CrazyGames
npm run verify:crazygames:browser
npm run verify:crazygames:sdk
npm run build:covers
npm run capture:previews
npm run validate:submission-media
```

## CrazyGames product

The canonical player build now boots directly into live Site 1. A first-time
player sees no logo, title screen, level grid, settings decision, or modal
tutorial. The first instruction is `TAP THE CREW`; a successful tap starts a
seeded sand → water → timber rescue chain, with the first permanent Salvage and
Atlas progress banked as it happens.

- Sites 1–3 form the first Expedition and introduce one verb at a time.
- Sites 4–10, Workshop, Pause, Atlas, Daily Rescue, and Test Yard stream after
  the initial playable path.
- Workshop projects, a forgiving UTC Daily Rescue, a 14-entry Material Atlas,
  and capped away accrual provide independent return hooks.
- Direct/Vercel launches make no CrazyGames SDK or ad request. The same artifact
  loads the CrazyGames v3 SDK only when embedded by a host; rewarded offers stay
  optional and frequency-gated.
- The player experience is landscape-only on mobile, one-thumb/touch playable,
  muted-safe, legible at DPR 1, and tiered down automatically on 4-core/4 GB
  devices or after sustained frame pressure.
- Submission covers and silent previews live in `marketing/crazygames/` and do
  not enter the runtime payload. The locked design and implementation evidence
  live in `docs/crazygames/`.

## Current state

Swarmwright is a playable, guarded CrazyGames candidate: the full
10-site rescue route and Test Yard ship as the player game, while two development-only
mechanic-prototype slots exercise the same deterministic headless sim,
every campaign level has a scripted solvability path, and the rendered shell
adds procedural sprites, role identity, crowd readability, particles, music,
and SFX without leaking Phaser or browser state into simulation code.

## How to play

- **Player progression** — 10 sequential rescue sites, grouped into short
  Expeditions. Salvage, discoveries, best rescue counts, failures, Workshop,
  Daily, and Atlas state are written to versioned localStorage continuously.
  Local **Dev Sandbox** unlocks the entire roster and adds Prototype 11/12.
- Meet the **save quota** before the **timer** ends. Live **Success %** is
  `saved / total` (100% = everyone home). Quota can be lower than 100%.
- Player sites use curated loadouts of at most three visible tools. Site 1 is
  already moving; Site 2 pauses for one water-route choice and explicit release;
  later planning surfaces remain concise and contextual. Dev Sandbox retains
  the full diagnostic toolbox.
- Terrain is a **living pixel grid**: sand settles, water flows and supports
  wading/treading/swimming, **wood floats**, and **fire rises and consumes wood**.
  Water extinguishes fire; touching flame burns a lemming. Bombs now carve a
  larger 32px crater and throw live flames as well as settling sand debris.
- Pick a skill (**1–9** or click), then click a lemming. Hover shows the current
  job. **Swimmer (9)** is assignable mid-water — rescue a treading lemming.
- Every crew role has a distinct hair + uniform palette, echoed by the miniature
  lemming on its HUD button. Armed bombers take priority while their fuse burns.
  In Sandbox, toggle persisted debug labels with **Labels** or **L** to show
  `Name · Role · State` above every crew member. The same layer identifies
  hatches, exits, traps, hazards, and material spouts with their live status.
- **Hatch queue (Q)** — select a role and press Q/Queue, or double-click its
  crew button, to pre-order that exact release. **Random** immediately queues a
  seeded-random available role and reveals the concrete choice in the queue.
  **Backspace** pops the last queued skill.
- Tight piles fan out visually to about 50% sprite overlap and jitter subtly so
  a stack reads as a crowd. This is render-only: collisions and solutions still
  use the untouched sim positions, while hovering/clicking follows the display.
- **Terrain toolbar** — when the loadout provides it: **Z** water ·
  **X** sand · **C** dirt · **V** wood · **G** fire · **B** erase · **M** bomb. Drag to pour;
  Esc returns to skills (stacked puzzles: dig → flood → float wood).
- **Emitters** — some levels have spouts that pour sand or water on their own
  until their budget runs dry. Living terrain you don't control.
- **Space** pause · **F** speed (1×/2×/3×) · **R** restart. Dev Sandbox also
  exposes **N** nuke · **H** hide/show the
  control dock · **L** debug labels · **R** restart · **Esc** select. The dock
  uses a compact top-right hand/minimise cluster: drag by the hand, or toggle
  the panel without moving the cursor. The canonical player belt keeps restart
  and fast-forward visible on every level for quick retries and solved-route cleanup.
- Levels 1–2 are locked one-screen rooms with symmetric hatch/exit margins.
  From Level 3 onward, pan with **arrows**, edge scroll, or **right/middle-drag**;
  the **minimap** jumps the camera. Start briefly presents the hatch, and the
  first rescue presents the exit before returning camera control.
- **Traps** (crusher / zapper / chomper) kill one victim, then re-arm.
- Public fatal falls use dust, helmet, impact flash, and shake feedback suitable
  for a PEGI-12 portal audience. Dev Sandbox retains stronger diagnostic FX.
- Chiptune **music** + SFX are synthesized at runtime. Music starts **muted**;
  HUD toggles/volumes persist.

### Campaign roster

| # | Level | Introduces |
|---|-------|------------|
| 1 | First Steps | Bash (optional hatch-queue diggers) |
| 2 | Float the Way | Pour and level water in a hydraulic lock to lift timber |
| 3 | Hold the Line | First scrolling map; blocker + bomber or a poured sand ramp |
| 4 | The Long March | Wide map / camera / multi-bash + a shallow marsh |
| 5 | Steel Yourself | Dig under steel + a sand spout duning the cap |
| 6 | Trap House | Traps + a water spout filling the reservoir catwalk |
| 7 | Trial by Fire | Locked Fire loadout + timber doors + quencher tank |
| 8 | Down and Out | Miner, under a mountain sand pour |
| 9 | The Gauntlet | Locked Floater/Climber loadout + two fatal drops |
| 10 | Sandworld Symphony | Full toolkit + every terrain charge + a dune spout |

### Test Yard / Sand Lab

Living-terrain free play from the Workshop after the first Expedition, or
immediately in Dev Sandbox:

| Key | Tool |
|:---:|------|
| Z/X/C/V/G/B | Paint water / sand / dirt / wood / fire / erase |
| M | Bomb |
| 1–9 | Skills (click a lemming to assign) |

Drag to paint. No quota — dig, flood, bomb, and shepherd the crew for fun.

### Prototype slots

These development-only experiments are deliberately outside campaign progression
and quota scoring. Enter them through the local Dev Sandbox:

| # | Prototype | Experiment |
|---|-----------|------------|
| 11 | Drop Zone | Drag a coloured crew role from the tray into the world, or select and click-place it. Place several while planning, then Start. |
| 12 | World Kit | Drag/click-place the Hatch and Exit during planning, order the normal hatch queue, then Start. |

The planning card gives short contextual prompts (`Place your first crew member`,
`Place the hatch`, `Place the exit`, then queue/start) and disappears when the
run begins. Both slots retain the open terrain toolbox and never overwrite the
classic automatic-hatch implementation.

### The Interaction Matrix

Who can do what, where — the heart of the design. 🆕 marks the water-update
behaviors, now shipped: water no longer kills on contact; you only die
**buried** (head sealed under water or sand for a beat).

| # | Lemming | Ability | Works the terrain | Blocked by | In water | Endangered by |
|---|---------|---------|-------------------|------------|----------|---------------|
| — | Walker | Walks, steps ≤7px, turns at walls | Walks on any solid | Walls taller than a step | 🆕 Wades shallow; treads deep — bobs safely, grabs an exit or a wood raft | Falls >38px, traps, lava, 🆕 burial |
| 1 | Climber | Permanent: scales vertical walls | Climbs any solid, steel included | Overhangs (falls off) | 🆕 Treads, then climbs out up an adjacent wall | Post-detach falls, traps |
| 2 | Floater | Permanent: parachute, no fall death | — | — | 🆕 Gentle splashdown, then treads | Traps, lava, 🆕 burial |
| 3 | Bomber | 5s fuse → large fiery sand-debris crater | Craters dirt/sand/wood; steel survives | Nothing (one-shot) | 🆕 **Sinks** — fuse burns on, underwater blast floods and extinguishes the crater | Itself; nearby fire |
| 4 | Blocker | Plants; turns the crowd | Stands on any solid | — | 🆕 Deep water washes it off its post — treads, stops blocking | Traps, lava, 🆕 burial |
| 5 | Builder | 14-brick rising bridge; dams water | Builds over anything | Wall ahead (shrug) | 🆕 Wades and keeps laying; deep water cancels → treads | Falls, traps, 🆕 burial |
| 6 | Basher | Horizontal tunnel | Dirt/sand/wood; one-ways only along the arrow | Steel (clank) | 🆕 Wades and keeps bashing; deep → treads | Falls, traps, 🆕 burial |
| 7 | Miner | Diagonal-down tunnel | Dirt/sand/wood/one-ways | Steel (clank) | 🆕 Same as basher | Falls, traps, 🆕 burial |
| 8 | Digger | Straight-down shaft | Dirt/sand/wood/one-ways | Steel (clank) | 🆕 Digging into a flooded cavity = safe splashdown | Falls, traps, 🆕 burial |
| 9 | 🆕 Swimmer | Permanent: crosses water surfaces | Exits banks within step height | Waterline walls (turns) | **Swims** | Burial (flooded ceilings), traps |

And the terrain, from the swarm's side:

| Material | Walk on? | Carvable? | Behavior | Danger |
|----------|----------|-----------|----------|--------|
| Dirt | yes | yes | static | — |
| Steel | yes | never (clank) | static | — |
| One-way L/R | yes | only along the arrow (bash); vertical work passes | static | — |
| Sand | yes — settles into walkable slopes | yes | powder, pours and piles | 🆕 buries |
| Water | no | flows | floats wood, 🆕 floats lemmings | 🆕 only if it seals you in |
| Wood | yes | yes | falls in air, floats on water, burns into non-solid flame | Fire |
| Fire | no | n/a | rises, spreads through wood, burns out; water/sand extinguish it | Burns on contact |

Design source of truth:
`docs/superpowers/specs/2026-07-11-water-reactive-lemmings-design.md`.
Campaign review and automated test plan:
`docs/level-design-review-and-solvability-test-plan.md`.

### Materials

| Material | Role |
|----------|------|
| Dirt | Classic diggable ground |
| Steel | Immutable puzzle locks — brushes, bombs, and skills cannot remove it |
| One-way | Directional carve |
| Sand | Settling powder / dig-bomb debris |
| Water | Flows; supports wading/treading/swimming; kills only by burial |
| Wood | Falls in air; floats / lifts on water into walkable bridges |
| Fire | Seeded reactive flame; burns wood, rises through air, dies in water/sand |

## Architecture

Simulation is deterministic and headless; Phaser only draws what the sim reports.

```
src/
  sim/                Headless sim (no Phaser/DOM)
    Terrain.ts        Bitmap + materials (dirt/steel/sand/water/wood/…)
    ca/               SeededRng + ChunkStepper (sand/water/wood/fire)
    GameSimulation.ts Lemmings, hatch queue, landscape paint, traps, events
    types.ts          Shared types
    skills/           Skill registry
  render/             Role palettes, procedural sprites, crowd layout, particles
  audio/              Runtime SFX + chiptune + persisted settings
  scenes/GameScene.ts Input, camera, Lab tools, juice
  ui/                 HUD (Success %, queue, landscape) + level select
  levels/             Campaign + Sand Lab; prototypes compile only for dev/test
  runtimeMode.ts      Fail-closed player/Sandbox boundary
  deviceProfile.ts    Desktop/Mobile capability and iPad detection
  progress.ts         Sandbox unlock override + player progression + best save-%
test/                 Vitest: sim, CA, solvability guards
docs/superpowers/     Design specs (Sand hybrid USP locked)
CLAUDE.md             Agent-oriented project map
```

### Design notes

- **Bitmap terrain** — carve/build are cell edits.
- **State vs trait skills** — blockers/builders/etc. replace the job;
  climber/floater/swimmer are permanent modifiers (a climber-walker is fine).
- **`SimEvent`s** — sim emits dig/exit/splat/…; scene drains them for audio/FX.
- **Seeded CA** — same seed + inputs → same settle (tests, future lockstep).
- **Separate random streams** — Random hatch roles use their own seeded RNG and
  never advance the terrain-physics RNG.
- **Render-only crowd layout** — `crowdLayout.ts` fans stacks for readability;
  sim positions remain authoritative for terrain, traps, and outcomes.
- **Persistent level FX** — fatal-fall stains live in `Particles` and clear with
  the rest of the scene on restart.
- **Level factories** — fresh terrain every start; each level has a scripted win
  path in `test/levels.test.ts`.

## Adding a level

1. Add `src/levels/levelN.ts` → `createLevelN(): LevelDefinition`
   (`fillRect` / `eraseRect`, spawn, exit, skills, quota, optional `landscape`,
   `sandEmitRatio`, `caSeed`, timer).
2. Append campaign factories to `LEVELS`; experimental factories belong in
   `PROTOTYPE_LEVELS` so progression remains a ten-level chain.
3. Add a solvability script in `test/levels.test.ts`.

## Future work

- More materials / skill variants; richer Lab challenges.
- Difficulty tiers as the roster grows.
- Mobile touch tuning; level-editor harness.
- Replays / rewind on the deterministic sim.

## Reference

Behavioral inspiration only. No Lemmings source or original assets — art, audio,
and levels are generated or authored here.

Unity sand-sim cousins (ideas, not code): [2D-sandbox](https://github.com/Johnny-Z13/2D-sandbox),
[FallingSand](https://github.com/Johnny-Z13/FallingSand).
