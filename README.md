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
- Pick a skill (**1–8** or click), then click a lemming. Hover shows the current job.
- **Hatch queue (Q)** — spend a skill charge to pre-order the next release
  (e.g. diggers first). **Backspace** pops the last queued skill.
- **Terrain toolbar** — when a level has charges (or always, in the Lab), the
  second toolbar paints the living world: **Z** water · **X** sand · **C** dirt ·
  **V** wood · **B** erase (Lab adds **M** bomb). Drag to pour; Esc returns to
  skills (stacked puzzles: dig → flood → float wood).
- **Emitters** — some levels have spouts that pour sand or water on their own
  until their budget runs dry. Living terrain you don't control.
- **Space** pause · **F** speed (1×/2×/3×) · **N** nuke · **R** restart · **Esc** select.
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

### Skills

| Hotkey | Skill   | Effect |
|:------:|---------|--------|
| 1 | Climber | Permanent: scales walls instead of turning. |
| 2 | Floater | Permanent: parachute — no fatal fall damage. |
| 3 | Bomber  | 5s fuse, then crater (may spray sand). |
| 4 | Blocker | Plants; turns walkers that bump it. |
| 5 | Builder | Rising brick bridge. |
| 6 | Basher  | Carves horizontally. |
| 7 | Miner   | Diagonal tunnel down. |
| 8 | Digger  | Straight down. |

**Steel** never carves (clank). **One-way** walls only carve with the arrow.

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
