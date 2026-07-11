# LemmingX

**Lemmings × Noita sandworld** — a clean-room browser puzzle game.

Tiny creatures spill from a hatch. You assign classic skills **and** author the
living landscape: dig, build, bomb, flood, float wood into bridges, and order
the hatch queue so the swarm gets home. Skills are precision tools; terrain
physics is the star. Original work — no copyrighted Lemmings assets or source.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

```bash
npm run test    # vitest: sim + CA + level solvability
npm run build   # typecheck + production build
```

## How to play

- **Level select** — 10 campaign levels (progressive landscape intros) plus
  **Sand Lab**. Clearing a level unlocks the next; best Success % is saved
  (localStorage).
- Meet the **save quota** before the **timer** ends. Live **Success %** is
  `saved / total` (100% = everyone home). Quota can be lower than 100%.
- Terrain is a **living pixel grid**: sand settles, water flows and drowns,
  **wood floats** on water. Bombers/digs can spray sand when a level enables it
  (always on in the Lab).
- Pick a skill (**1–9** or click), then click a lemming. Hover shows the current
  job. **Swimmer (9)** is assignable mid-water — rescue a treading lemming.
- **Hatch queue (Q)** — spend a skill charge to pre-order the next release
  (e.g. diggers first). **Backspace** pops the last queued skill.
- **Terrain toolbar** — when a level has charges (or always, in the Lab), the
  second toolbar paints the living world: **Z** water · **X** sand · **C** dirt ·
  **V** wood · **B** erase (Lab adds **M** bomb). Drag to pour; Esc returns to
  skills (stacked puzzles: dig → flood → float wood).
- **Emitters** — some levels have spouts that pour sand or water on their own
  until their budget runs dry. Living terrain you don't control.
- **Space** pause · **F** speed (1×/2×/3×) · **N** nuke · **H** hide/show the
  control bar · **R** restart · **Esc** select.
- Pan big levels with **arrows**, edge scroll, or **right/middle-drag**; **minimap** jumps the camera.
- **Traps** (crusher / zapper / chomper) kill one victim, then re-arm.
- Chiptune **music** + SFX are synthesized at runtime. Music starts **muted**;
  HUD toggles/volumes persist.

### Campaign roster

| # | Level | Introduces |
|---|-------|------------|
| 1 | First Steps | Bash (optional hatch-queue diggers) |
| 2 | Bridge the Gap | Builders + living water + landscape water |
| 3 | Hold the Line | Blocker + bomber — or a poured sand ramp |
| 4 | The Long March | Wide map / camera / multi-bash |
| 5 | Steel Yourself | Dig under steel + a sand spout duning the cap |
| 6 | Trap House | Traps — sand charges can bury a machine |
| 7 | Float the Timber | Dig → paint water → wood bridge |
| 8 | Down and Out | Miner, under a mountain sand pour |
| 9 | The Gauntlet | Floater + climber |
| 10 | Sandworld Symphony | Full toolkit + every terrain charge + a dune spout |

### Sand Lab

Always-unlocked Noita-lite sandbox from the level select:

| Key | Tool |
|:---:|------|
| Z/X/C/V/B | Paint water / sand / dirt / wood / erase |
| M | Bomb |
| 1–8 | Skills (click a lemming to assign) |

Drag to paint. No quota — dig, flood, bomb, and shepherd the crew for fun.

### The Interaction Matrix

Who can do what, where — the heart of the design. 🆕 marks the water-update
behaviors, now shipped: water no longer kills on contact; you only die
**buried** (head sealed under water or sand for a beat).

| # | Lemming | Ability | Works the terrain | Blocked by | In water | Endangered by |
|---|---------|---------|-------------------|------------|----------|---------------|
| — | Walker | Walks, steps ≤7px, turns at walls | Walks on any solid | Walls taller than a step | 🆕 Wades shallow; treads deep — bobs safely, grabs an exit or a wood raft | Falls >38px, traps, lava, 🆕 burial |
| 1 | Climber | Permanent: scales vertical walls | Climbs any solid, steel included | Overhangs (falls off) | 🆕 Treads, then climbs out up an adjacent wall | Post-detach falls, traps |
| 2 | Floater | Permanent: parachute, no fall death | — | — | 🆕 Gentle splashdown, then treads | Traps, lava, 🆕 burial |
| 3 | Bomber | 5s fuse → sand-debris crater | Craters dirt/sand/wood; steel survives | Nothing (one-shot) | 🆕 **Sinks** — fuse burns on, underwater blast floods the crater | Itself |
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
| Wood | yes | yes | falls in air, floats on water | — |

Design source of truth:
`docs/superpowers/specs/2026-07-11-water-reactive-lemmings-design.md`.

### Materials

| Material | Role |
|----------|------|
| Dirt | Classic diggable ground |
| Steel | Puzzle locks |
| One-way | Directional carve |
| Sand | Settling powder / dig-bomb debris |
| Water | Flows; drowns lemmings |
| Wood | Falls in air; floats / lifts on water into walkable bridges |

## Architecture

Simulation is deterministic and headless; Phaser only draws what the sim reports.

```
src/
  sim/                Headless sim (no Phaser/DOM)
    Terrain.ts        Bitmap + materials (dirt/steel/sand/water/wood/…)
    ca/               SeededRng + ChunkStepper (sand/water/wood)
    GameSimulation.ts Lemmings, hatch queue, landscape paint, traps, events
    types.ts          Shared types
    skills/           Skill registry
  render/             Procedural sprites + particles
  audio/              Runtime SFX + chiptune + persisted settings
  scenes/GameScene.ts Input, camera, Lab tools, juice
  ui/                 HUD (Success %, queue, landscape) + level select
  levels/             Campaign factories + Sand Lab
  progress.ts         Unlocks + best save-%
test/                 Vitest: sim, CA, solvability guards
docs/superpowers/     Design specs (Sand hybrid USP locked)
CLAUDE.md             Agent-oriented project map
```

### Design notes

- **Bitmap terrain** — carve/build are cell edits.
- **State vs trait skills** — blockers/builders/etc. replace the job; climber/floater
  are permanent modifiers (a climber-walker is fine).
- **`SimEvent`s** — sim emits dig/exit/splat/…; scene drains them for audio/FX.
- **Seeded CA** — same seed + inputs → same settle (tests, future lockstep).
- **Level factories** — fresh terrain every start; each level has a scripted win
  path in `test/levels.test.ts`.

## Adding a level

1. Add `src/levels/levelN.ts` → `createLevelN(): LevelDefinition`
   (`fillRect` / `eraseRect`, spawn, exit, skills, quota, optional `landscape`,
   `sandEmitRatio`, `caSeed`, timer).
2. Append the factory to `LEVELS` in `src/levels/index.ts`.
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
