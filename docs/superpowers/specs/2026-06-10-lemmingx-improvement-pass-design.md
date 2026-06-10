# LemmingX Improvement Pass — Design

**Date:** 2026-06-10
**Goal:** Evolve the rough Lemmings-style prototype into a polished, charming, faithful-in-spirit Lemmings-inspired puzzle game. Original work; no copyrighted assets or source.

## Decisions (locked)

- **Movement model:** Keep the existing continuous-pixel deterministic sim. Tighten it (integer collision probes, bounded ground scans, deterministic fall/turn) rather than rewriting to a fully grid-locked engine. Rationale: the sim works, is tested, and is the lower-risk path to crisp feel.
- **Art direction:** Cute retro pixel — chunky pixel-style creatures with frame-based animation cycles, bright readable palette. Drawn procedurally (no copyrighted sprites).
- **Autonomy:** Run all stages, commit after each, check in at the end or if blocked.

## Architecture (preserved + extended)

The clean sim/render split stays:

- `src/sim/` — deterministic, headless-testable simulation (Terrain bitmap, GameSimulation, types).
- `src/scenes/` — Phaser rendering that only reads sim state.
- `src/ui/` — DOM HUD.
- `src/levels/` — level-as-data definitions.

New modules:

- `src/sim/skills/` — a **skill registry**: each ability (walker, blocker, builder, basher, digger, climber, floater, bomber) is a small module with `onAssign` and `update` hooks, replacing the if/else blob in `GameSimulation`.
- `src/sim/hazards.ts` — simulated hazard zones (lava/water/crusher) defined in level data, with a death path. Replaces the purely-cosmetic painted hazard.
- `src/render/LemmingSprite.ts` (or in-scene) — frame-based procedural animation per state/direction.
- `src/audio/Sfx.ts` — WebAudio blips (assign, build, dig, splat, exit, nuke).
- `src/render/Particles.ts` — dust/debris/splat/exit-sparkle.

## Staged plan

1. **Foundation & feel** — tighten movement/collision; add simulated hazard zones + hazard-death; keep tests green.
2. **Skill registry refactor** — modularize skills; add basher, climber, floater, bomber; retire "Pulse".
3. **Expressive units** — frame-based animation (walk/dig/build/climb/fall/splat/panic), direction-aware, retro-pixel.
4. **UI/UX** — hovered-lemming cursor highlight + job label, keyboard skill hotkeys, level timer, pause + fast-forward, nuke button, win/lose overlay screens.
5. **Audio + particles** — WebAudio SFX, particle feedback.
6. **Levels** — richer level format (named hazard zones, theme, objective text); 3–4 levels with a difficulty ramp + level select/progression.
7. **Polish & tune** — playtest, edge cases, docs, future-work notes.

## Success criteria

- Game playable and tests green after every stage.
- ≥8 classic skills working and assignable with clear feedback.
- Units visibly animated and readable at small size.
- Real win/lose states with quota, timer, and overlay screens.
- ≥3 hand-built levels selectable with a difficulty ramp.
- Clean modular code, named constants, documented, with future-work notes.

## Non-goals

- No multiplayer, level editor UI, or persistence beyond simple progression.
- No copyrighted assets or imported reference source.
