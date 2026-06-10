# LemmingX

A clean-room, browser-based puzzle game inspired by the classic Lemmings
formula. Tiny chaotic creatures spill from a hatch; you assign skills to carve,
build, block, and float a route to the exit before time runs out. Original work
— no copyrighted Lemmings assets or source.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

```bash
npm run test    # vitest: sim behavior + level solvability
npm run build   # typecheck + production build
```

## How to play

- The game opens on a **level select**: 10 levels on a difficulty arc; clearing
  one unlocks the next, and your best save-% is remembered (localStorage).
- Lemmings walk, fall, and turn at walls automatically. Get enough of them to the
  exit to meet the **save quota** before the **timer** expires.
- Pick a skill (click its button or press its hotkey **1–8**), then click a
  lemming to assign it. The hovered lemming is ringed and its current job shown.
- **Space** pause · **F** fast-forward (1×/2×/3×) · **N** nuke · **R** restart ·
  **Esc** level select.
- Big levels scroll: pan with **arrow keys**, screen-edge scroll, or
  **right/middle-drag**; the **minimap** (top right) jumps the camera on click.
- Watch out for **traps** — crushers, zappers and chompers kill the first
  lemming that springs them, then need a moment to re-arm.
- Original **chiptune music** (synthesized at runtime, like all audio) plays per
  level; the HUD has music/SFX mute toggles and volume sliders that persist.

### Skills

| Hotkey | Skill   | Effect |
|:------:|---------|--------|
| 1 | Climber | Permanent trait: scales vertical walls instead of turning. |
| 2 | Floater | Permanent trait: parachutes — never dies from fall height. |
| 3 | Bomber  | Arms a 5s fuse, then explodes, carving a crater. |
| 4 | Blocker | Plants and reverses any walker that bumps into it. |
| 5 | Builder | Lays a short rising bridge of bricks ahead. |
| 6 | Basher  | Carves horizontally through a wall. |
| 7 | Miner   | Carves a diagonal tunnel down in its facing direction. |
| 8 | Digger  | Carves straight down. |

Steel plate is indestructible; one-way walls (chevroned) only carve along
their arrow. Hitting either stops the worker with a metallic *clank*.

## Architecture

A strict simulation / rendering split keeps the game logic deterministic and
unit-testable, with Phaser only drawing what the sim reports.

```
src/
  sim/                Deterministic, headless simulation (no Phaser/DOM)
    Terrain.ts        Destructible bitmap terrain with materials
                      (dirt/steel/one-way) + direction-aware carving
    GameSimulation.ts Lemming state machine, physics, traps, outcome, SimEvents
    types.ts          Shared types (Lemming, LevelDefinition, Skill, Trap, …)
    skills/           Skill registry: each skill's assignment rules + metadata
  render/
    LemmingSprite.ts  Procedural retro-pixel lemming drawing (per state/dir/frame)
    Particles.ts      Pooled CPU particle bursts (dust, debris, sparkle, splat)
  audio/
    Sfx.ts            WebAudio sounds synthesized at runtime (no asset files)
    Music.ts          4-channel chiptune sequencer (lookahead scheduling)
    tracks.ts         Original tunes authored as note-pattern data
    settings.ts       Persisted music/SFX mute + volume
  scenes/GameScene.ts Phaser scene: input, camera pan, draws sim state, FX
  ui/
    Hud.ts            DOM HUD: skills, counters, timer, minimap, audio, overlays
    LevelSelect.ts    Campaign screen (locks, NEW badges, best save-%)
  progress.ts         Campaign progress in localStorage (injectable for tests)
  levels/             Level roster (index.ts) + level1…level10 factories
  main.ts             Phaser bootstrap
test/                 Vitest: sim behavior, tracks shape, progress,
                      per-level solvability guards
```

### Key design notes

- **Terrain is a bitmap**, not vector shapes — destruction/building are just
  cell edits, exactly like the originals.
- **Skills split into two kinds:** *state* skills (blocker/builder/basher/
  digger/bomber) replace what a lemming is doing; *trait* skills (climber/
  floater) are permanent modifiers layered on normal walking/falling. A lemming
  can be a "climber walker" or "floater faller" at once.
- **The sim emits `SimEvent`s** (dig, exit, splat, explode, …) that the scene
  drains each frame for audio + particles, so the sim has zero render/audio
  coupling.
- **Levels are data + a factory** so terrain rebuilds fresh on restart. Each
  level ships with a scripted solution in `test/levels.test.ts` that fails the
  build if a sim change ever makes it unwinnable.

## Adding a level

1. Write `src/levels/levelN.ts` exporting `createLevelN(): LevelDefinition`.
   Build terrain with `fillRect`/`eraseRect`/`eraseCircle`; set spawn, exit,
   hazards, skills, quota, and an optional time limit.
2. Append the factory to `LEVELS` in `src/levels/index.ts`.
3. Add a solvability guard to `test/levels.test.ts` mirroring the intended
   solution.

## Future work

- More skill variants (stacker, fencer, bridger-down).
- More trap kinds and per-level visual themes / parallax backgrounds.
- Difficulty tiers (Fun/Tricky/Taxing-style groupings) as the roster grows.
- Mobile touch tuning for skill-assignment precision.
- A simple level-editor harness (the bitmap + data format already supports it).
- Replays / pause-and-rewind built on the deterministic sim.

## Reference Note

Behavioral inspiration only. This prototype does not import any Lemmings source
or original assets; all art, audio, and levels are generated/authored here.
