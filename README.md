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

- Lemmings walk, fall, and turn at walls automatically. Get enough of them to the
  exit to meet the **save quota** before the **timer** expires.
- Pick a skill (click its button or press its hotkey **1–8**), then click a
  lemming to assign it. The hovered lemming is ringed and its current job shown.
- **Space** pause · **F** fast-forward (1×/2×/3×) · **N** nuke · **R** restart.
- Clear a level to unlock **Next Level**.

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
    Terrain.ts        Pixel-destructible bitmap terrain (Uint8 grid)
    GameSimulation.ts Lemming state machine, physics, outcome, SimEvents
    types.ts          Shared types (Lemming, LevelDefinition, Skill, …)
    skills/           Skill registry: each skill's assignment rules + metadata
  render/
    LemmingSprite.ts  Procedural retro-pixel lemming drawing (per state/dir/frame)
    Particles.ts      Pooled CPU particle bursts (dust, debris, sparkle, splat)
  audio/Sfx.ts        WebAudio sounds synthesized at runtime (no asset files)
  scenes/GameScene.ts Phaser scene: input, camera, draws sim state, drives FX
  ui/Hud.ts           DOM HUD: skills, counters, timer, controls, overlays
  levels/             Level roster (index.ts) + level1/2/3 factories
  main.ts             Phaser bootstrap
test/                 Vitest: sim behavior + per-level solvability guards
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

- More skills/variants (miner/diagonal-digger, stacker, fencer).
- Camera pan/scroll for levels larger than the viewport.
- Level select screen + progress persistence (localStorage).
- Decorative terrain themes / tilesets and parallax backgrounds.
- Mobile touch tuning for skill-assignment precision.
- A simple level-editor harness (the bitmap + data format already supports it).

## Reference Note

Behavioral inspiration only. This prototype does not import any Lemmings source
or original assets; all art, audio, and levels are generated/authored here.
