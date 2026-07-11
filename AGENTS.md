# AGENTS.md — LemmingX

Guidance for AI agents working in this repo.

## What this game is

**LemmingX** = **Lemmings swarm puzzle × Noita sandworld**.

- Browser, TypeScript, Phaser 3 render + headless deterministic sim.
- Clean-room: no copyrighted Lemmings assets or source.
- USP: the player authors living terrain (dig / build / bomb / flood / float wood)
  and can **order the hatch queue** so the swarm reaches the exit. Skills are
  precision tools; **terrain physics is the star**.

Modes:

1. **Campaign** — 10 levels, quota + timer, progressive landscape intros.
2. **Sand Lab** — free-play paint arena (Noita-lite), always unlocked.

## Stack

| Piece | Choice |
|-------|--------|
| UI / canvas | Phaser 3 (`GameScene`) |
| Sim | Pure TS in `src/sim/` (no Phaser imports) |
| CA | `ChunkStepper` + `SeededRng` (deterministic) |
| Audio | Runtime WebAudio synth (`Sfx`, `Music`) — no asset files |
| Tests | Vitest — behavior + **level solvability scripts** |
| Build | Vite + `tsc` |

Commands: `npm run dev` · `npm test` · `npm run build`

## Hard rules for changes

1. **Never invent files/APIs** — inspect the repo first.
2. **Minimal diffs** — stay in scope; no drive-by refactors.
3. **Sim stays headless** — no DOM/Phaser/audio inside `src/sim/`. Feedback goes
   through `SimEvent`s drained by `GameScene`.
4. **CA must stay seeded** — no unseeded `Math.random` in terrain physics.
5. **Every campaign level needs a solvability guard** in `test/levels.test.ts`.
   If you change geometry or skills, update the script or the level will CI-fail.
6. **Prefers composition** — small modules; don't grow god files.
7. Commit only when the user asks (`type(scope): summary`).

## Layout

```
src/
  sim/
    Terrain.ts          Materials + carve/fill bitmap
    GameSimulation.ts   Lemmings, skills, hatch queue, landscape paint, traps
    types.ts            LevelDefinition, Lemming, Skill, SimEvent, …
    ca/SeededRng.ts     Deterministic PRNG
    ca/ChunkStepper.ts  Sand / water / wood / optional dirt stability
    skills/             Skill registry (canAssign / onAssign)
  scenes/GameScene.ts   Input, camera, draw, Lab tools, juice
  ui/Hud.ts             Skills, Success %, hatch queue, landscape, overlays
  ui/LevelSelect.ts     Campaign unlocks + Sand Lab
  levels/               level1…level10 + lab.ts + index.ts
  audio/                Sfx, Music, tracks, settings (music muted by default)
  render/               LemmingSprite, Particles
  progress.ts           localStorage unlocks + best save-%
test/                   simulation, ca, levels, tracks, progress
docs/superpowers/       Design specs + plans (Sand hybrid USP locked here)
```

## Materials (`MATERIAL`)

| ID | Name | Behavior |
|----|------|----------|
| 0 | empty | air |
| 1 | dirt | diggable solid |
| 2 | steel | indestructible (clank) |
| 3/4 | one-way L/R | carve only with the arrow |
| 5 | sand | powder; dig/bomb debris |
| 6 | water | flows; floats lemmings (tread/swim); death only when sealed under it |
| 7 | wood | falls in air; floats on water; water beside it on a floor seeps under and lifts it (bridge hook) |

Campaign dig tunnels usually stay clear (`sandEmitRatio: 0` default). Lab and
some mid/late levels emit sand. Wood + landscape water is the Level 7 signature.

## Campaign roster (progressive intros)

| # | Name | Teaches |
|---|------|---------|
| 1 | First Steps | Bash (+ optional hatch-queue diggers) |
| 2 | Bridge the Gap | Builders + living water + terrain authoring |
| 3 | Hold the Line | Blocker + bomber (sand crater) — or sand-ramp charges |
| 4 | The Long March | Wide level / camera / multi-bash |
| 5 | Steel Yourself | Dig under steel + sand debris + a cap-duning emitter |
| 6 | Trap House | Traps — sand charges can bury one |
| 7 | Float the Timber | Dig lip → paint water → wood bridge (builders = backup) |
| 8 | Down and Out | Miner (tall level) + mountain sand emitter |
| 9 | The Gauntlet | Floater + climber |
| 10 | Sandworld Symphony | Full toolkit finale: all charges + dune emitter |

Sand Lab is index `SAND_LAB_INDEX` (not part of the unlock chain).

## Important APIs

- `enqueueRelease(skill)` / `popReleaseQueue()` — hatch order puzzle (UI: **Q** / **Backspace**).
  Queued skills apply on spawn or once grounded (`pendingHatchSkill`); open
  toolboxes do not consume stock.
- `paintLandscape(x, y, r, kind)` — paints `water|sand|dirt|wood|erase`.
  Limited test/custom levels can use `level.landscape` / `state.landscape`;
  shipped levels paint freely through `openToolbox`. UI hotkeys are
  **Z/X/C/V/B**, plus **M** for bomb.
- `openToolbox` — shipped campaign levels set this at the roster boundary, so
  every crew skill, hatch-queued role, terrain brush, and bomb is unlimited
  while quota/timer outcomes remain active. Unit-test levels stay limited unless
  they opt in.
- Campaign levels start paused in a planning phase. `objective` and `hint` are
  shown while the player queues roles or reshapes terrain; Start/Space opens the
  hatch and clock. Sand Lab skips planning and labels its status Free Play.
- Crew display identity stays render/UI-only: deterministic names plus separate
  role/state labels come from `render/lemmingIdentity.ts`. Sprite hair and debug
  text share its colour key. The persisted Labels/L toggle must not enter sim state.
- `level.emitters` — deterministic material spouts (`EmitterDefinition`:
  x/y/material/cellsPerSecond/budget), stepped between agents and the CA
  settle. Live state in `state.emitters`; a blocked spout burns no budget.
- Success % = `saved / totalLemmings` (HUD + end overlay). Quota is still
  `targetSaved` for win/lose.
- Level factories return fresh mutable `Terrain` every start/restart.
- Water model: chest-deep water → `treading` (safe, stuck) or `swimming`
  (swimmer trait, hotkey 9, assignable mid-water). The only water/sand death
  is the sealed-head rule (`SEALED_DEATH_MS`). Armed bombers sink instead;
  blockers wash off; climbers self-rescue. See the README interaction matrix
  and `docs/superpowers/specs/2026-07-11-water-reactive-lemmings-design.md`.

## Testing expectations

- `test/simulation.test.ts` — core lemming / skill behavior
- `test/ca.test.ts` — sand, water, wood, hatch queue, drowning
- `test/levels.test.ts` — one scripted win path per campaign level
- After level or dig/bash/CA changes: run `npm test` before claiming done

## Design docs

- USP + hybrid decisions: `docs/superpowers/specs/2026-07-11-lemmingx-sand-hybrid-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-11-lemmingx-sand-hybrid.md`
- Older classic-parity specs still useful for skill/trap behavior details

## Out of scope (unless asked)

- Online / lockstep (architecture must not preclude it; not shipping)
- Rigid falling chunks, full chemistry set
- Copyrighted Lemmings assets or reverse-engineered source
