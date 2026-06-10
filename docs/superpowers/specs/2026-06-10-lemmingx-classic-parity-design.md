# LemmingX Second Pass — Classic Parity

**Date:** 2026-06-10
**Goal:** Close the gap between LemmingX and the classic Lemmings feature set at a
professional polish level. Original work; no copyrighted assets or source; the
project stays 100% asset-free (all art, SFX, and music generated in code).

## Decisions (locked)

- **Scope:** Full classic parity — terrain materials (steel, one-way walls),
  scrolling levels + minimap, miner skill, animated traps, procedural chiptune
  music, level select + localStorage persistence, 10 levels.
- **Music:** Procedural chiptune via a small WebAudio sequencer playing original
  tunes authored as note-pattern data in code. No audio files.
- **Levels:** 10, with a difficulty arc; each introduces one new mechanic and
  ships with a scripted-solution solvability test.
- **Autonomy:** Run all stages, commit after each with tests green, push when
  complete, check in at the end or if blocked.

## Design

### Terrain materials

`Terrain` cells go from 0/1 to a material enum:

| Value | Material | Solid | Carvable |
|---|---|---|---|
| 0 | empty | no | — |
| 1 | dirt | yes | yes |
| 2 | steel | yes | never |
| 3 | one-way-left | yes | only while moving left |
| 4 | one-way-right | yes | only while moving right |

- `isSolidAt` is unchanged in meaning: any non-zero cell is solid. All existing
  movement/collision code keeps working untouched.
- New `canDestroyAt(x, y, direction)` gates every carve. Basher/digger/miner
  stop (skill cancels) when they hit non-carvable cells, emitting a new `clank`
  SimEvent for sparks + metallic SFX. Bomber craters erase only carvable cells.
- Builders may build against anything (classic behavior).
- Level authoring gains `fillRect(..., material)` plus `steelRect` /
  `oneWayRect` conveniences.

### Big levels, camera, minimap

- `LevelDefinition.width/height` decouple from the 960×540 viewport; worlds up
  to ~3200×1080. The sim is already world-coordinate based — no sim changes.
- Phaser camera pans: edge-scroll near viewport borders, arrow keys, and
  click-drag (middle mouse or right-drag), clamped to world bounds. Camera
  centers on the hatch at level start.
- HUD minimap: downscaled terrain grid (one rect per solid cell region or a
  per-cell canvas), lemming dots, hazard/trap tint, and the viewport rectangle.
  Click/drag on the minimap jumps the camera. Redraws cheaply from the terrain
  grid (cols×rows is small) at a throttled rate.

### Miner skill (completes the classic 8)

- State skill: carves a diagonal tunnel downward in the facing direction
  (alternating horizontal + downward erase steps), turns into a faller when the
  ground disappears, cancels on steel/one-way-against-direction with `clank`.
- Hotkeys reorder to classic skill order:
  **1 climber, 2 floater, 3 bomber, 4 blocker, 5 builder, 6 basher, 7 miner,
  8 digger.** README and HUD update to match.

### Animated traps and set pieces

- New `TrapDefinition` in level data: `{ x, y, kind, triggerZone }` with kinds
  `crusher`, `zapper`, `chomper` (original-inspired art, drawn procedurally).
- Classic behavior: a trap in `idle` kills the first lemming whose body enters
  its trigger zone, plays its kill animation for its cycle duration (the
  lemming dies with a trap-specific SimEvent → unique SFX + particles), then
  re-arms. Lemmings passing during the cycle survive.
- Trap state lives in the sim (deterministic, testable); the scene only draws
  animation frames from trap state + phase.
- Entrance hatch animates open at level start (spawning begins when open);
  exit gets an idle pulse/shimmer animation.

### Procedural chiptune music

- `src/audio/Music.ts`: a small WebAudio sequencer — 2 pulse-wave channels
  (lead/harmony), 1 triangle bass, 1 noise percussion channel — scheduled
  ahead via `AudioContext.currentTime` lookahead.
- Tunes are original compositions authored as in-code note-pattern data
  (tempo, per-channel note/rest sequences). 3–4 tracks; each level picks one
  (rotating by level index). Jaunty, Lemmings-spirited, but original melodies.
- HUD gains music mute + volume; SFX and music volumes independent; settings
  persisted with save data. Music ducks briefly under the nuke.

### Level select and persistence

- DOM level-select screen (replaces linear "Next Level" flow): grid of level
  cards showing name, locked/unlocked/completed, and best save percentage.
- Completing level N unlocks N+1. Progress (`completed`, best %, audio
  settings) stored in localStorage under a versioned key.
- In-game: Esc / button returns to level select; win overlay offers Next /
  Replay / Level Select.

### Ten levels

Difficulty arc, each introducing roughly one mechanic:

1. Tutorial: walk to exit (release rate + dig).
2. Builders over a gap.
3. Blockers + bombers (single-screen).
4. First scrolling level (wide world, camera + minimap matter).
5. Steel introduction (dig around, not through).
6. Traps introduction.
7. One-way walls.
8. Miner showcase.
9. Combined: tall level, climbers/floaters + steel + traps.
10. Finale: everything, tight skill budget.

Each level: factory + solvability test mirroring the intended solution.
Existing levels 1–3 are revamped into this arc rather than kept verbatim.

## Stages

1. **Terrain materials** — material enum, `canDestroyAt`, steel/one-way carve
   rules, `clank` event, sim unit tests.
2. **Camera + minimap** — decoupled world size, camera controls, HUD minimap.
3. **Miner** — skill module, sprite frames, hotkey reorder, tests.
4. **Traps + set pieces** — trap sim entity + kinds, hatch/exit animation,
   per-trap SFX/particles, tests.
5. **Music** — sequencer, 3–4 tracks, HUD audio controls.
6. **Level select + persistence** — select screen, localStorage, flow rewire.
7. **Levels** — 10 levels + 10 solvability tests.
8. **Polish & docs** — tuning playtest, README, future-work notes.

Every stage ends with: tests green, `npm run build` clean, commit.
After stage 8: push to origin.

## Success criteria

- All 8 classic skills assignable; classic hotkey order.
- Steel and one-way walls verified by sim unit tests (basher/digger/miner/
  bomber all respect them).
- At least one level wider than the viewport, playable via camera + minimap.
- ≥2 animated trap kinds killing with unique feedback; classic re-arm cycle.
- Original chiptune music playing in-game with working mute/volume that
  persists.
- Level select with 10 levels, unlock progression, and best-% surviving a
  refresh.
- 10/10 level solvability tests + all sim tests green; clean production build.

## Non-goals

- No level editor UI, no multiplayer, no mobile-specific work this pass.
- No copyrighted assets, melodies, or imported reference source.
