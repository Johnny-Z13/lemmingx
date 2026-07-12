# CLAUDE.md — LemmingX

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

The current presentation layer includes full role uniforms + matching HUD
icons, render-only crowd fan-out/jitter, a fixed-anchor collapsible control
dock, deterministic Random hatch roles, and event-driven impact FX.

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
   UI/gameplay randomness must not advance the CA stream; Random hatch roles
   use their own `releaseRng`.
5. **Every campaign level needs a solvability guard** in `test/levels.test.ts`.
   If you change geometry or skills, update the script or the level will CI-fail.
6. **Prefers composition** — small modules; don't grow god files.
7. **Crowd spacing is render-only** — never write display fan-out/jitter back to
   `Lemming.x/y`; hit-testing may follow display positions, sim logic may not.
8. Commit only when the user asks (`type(scope): summary`).

## Layout

```
src/
  sim/
    Terrain.ts          Materials + carve/fill bitmap
    GameSimulation.ts   Lemmings, skills, seeded hatch queue, paint, traps
    types.ts            LevelDefinition, Lemming, Skill, SimEvent, …
    ca/SeededRng.ts     Deterministic PRNG
    ca/ChunkStepper.ts  Sand / water / wood / optional dirt stability
    skills/             Skill registry (canAssign / onAssign)
  scenes/GameScene.ts   Input, camera, draw, Lab tools, juice
  ui/Hud.ts             Skills, Success %, hatch queue, landscape, overlays
  ui/LevelSelect.ts     Campaign unlocks + Sand Lab
  levels/               level1…level10 + lab.ts + index.ts
  audio/                Sfx, Music, tracks, settings (music muted by default)
  render/               LemmingSprite, lemmingIdentity, crowdLayout, Particles
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
| 8 | fire | non-solid; rises, burns wood, burns lemmings, and is extinguished by water/sand |

Campaign dig tunnels usually stay clear (`sandEmitRatio: 0` default). Lab and
some mid/late levels emit sand. Fire doors + a protected quencher tank are the
Level 7 signature.

## Campaign roster (progressive intros)

| # | Name | Teaches |
|---|------|---------|
| 1 | First Steps | Bash (+ optional hatch-queue diggers) |
| 2 | The Deep End | Locked Swimmer loadout + deep crossing pool |
| 3 | Hold the Line | Blocker + bomber (sand crater) — or sand-ramp charges |
| 4 | The Long March | Wide level / camera / multi-bash |
| 5 | Steel Yourself | Dig under steel + sand debris + a cap-duning emitter |
| 6 | Trap House | Traps + a timed water spout filling the catwalk reservoir |
| 7 | Trial by Fire | Locked Fire loadout + timber doors + quencher tank |
| 8 | Down and Out | Miner (tall level) + mountain sand emitter |
| 9 | The Gauntlet | Locked Floater/Climber loadout + two fatal drops |
| 10 | Sandworld Symphony | Full toolkit finale: all charges + dune emitter |

Sand Lab is index `SAND_LAB_INDEX` (not part of the unlock chain).

## Important APIs

- `enqueueRelease(skill)` / `popReleaseQueue()` — hatch order puzzle (UI: **Q**
  / **Backspace**, or double-click a crew button). Queued skills apply on spawn
  or once grounded (`pendingHatchSkill`); open toolboxes do not consume stock.
- `enqueueRandomRelease()` — queues and returns a concrete available `Skill`.
  It uses a separate seed-derived `releaseRng`, so random releases are
  reproducible and cannot perturb sand/water physics. The HUD shows the chosen
  role in `state.hatchQueue` rather than leaving a hidden "random" token.
- `paintLandscape(x, y, r, kind)` — paints `water|sand|dirt|wood|fire|erase`.
  Limited test/custom levels can use `level.landscape` / `state.landscape`;
  shipped levels paint freely through `openToolbox`. UI hotkeys are
  **Z/X/C/V/G/B**, plus **M** for bomb. Fire may be a finite locked-loadout tool;
  the point bomb remains open-toolbox-only.
- `openToolbox` — campaign defaults to unlimited tools at the roster boundary,
  but an explicit `openToolbox: false` is preserved for challenge-loadout stages.
  Levels 2, 7, and 9 are locked so their canonical Swimmer, Fire, and
  Floater/Climber mechanics are genuinely required.
- `PLAYTEST_UNLOCK_ALL_LEVELS` in `progress.ts` is temporarily `true` so every
  campaign layout is directly testable. Sequential progression remains covered
  with `{ unlockAll: false }`; flip the constant off rather than deleting it.
- Campaign levels start paused in a planning phase. `objective` and `hint` are
  shown while the player queues roles or reshapes terrain; Start/Space opens the
  hatch and clock. `GameScene` still calls `stepLivingTerrain()` while planning,
  so painted materials settle without advancing agents, traps, emitters, or time.
  Sand Lab skips planning and labels its status Free Play.
- Crew display identity stays render/UI-only: deterministic names, role/state
  labels, ten full uniform palettes, and matching HUD miniatures come from
  `render/lemmingIdentity.ts`. Armed bombers override the displayed role; a
  pending hatch skill displays its intended palette before grounding. The
  persisted Labels/L toggle must not enter sim state.
- `render/entityLabels.ts` supplies render-only descriptors for the hatch,
  exit, traps, hazards, and material spouts. `GameScene` owns the Phaser text;
  keep label wording/status out of `SimulationState`.
- `layoutLemmingCrowds(lemmings, timeMs)` — fans close stacks to 7.5px centres
  with deterministic per-ID jitter. `GameScene` uses the returned positions for
  sprites, labels, hover, and clicking only; terrain/minimap/sim use real positions.
- The compact `.hud__dock` uses a top-right window-control cluster: a Lucide
  hand is the drag handle and the adjacent minimise/maximise toggle is the fixed
  anchor. Collapse/expand must preserve that button's exact screen coordinates.
  Keep drag bounds on-screen and avoid permanent gameplay instructions.
- Fatal falls emit `splat`; `GameScene` routes only that event to
  `Particles.bloodSplat()` (large transient spray + capped persistent stain).
  Drowning, burning, traps, and explosions retain separate feedback.
- Explosion tuning lives in `sim/terrainTuning.ts`: both crew and landscape
  bombs carve a 32px steel-safe crater, return 22% as sand debris, and seed live fire.
  Fire stochastic behavior must use the CA `SeededRng`; never `Math.random`.
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
- `test/ca.test.ts` — sand, water, wood, fire, hatch queue, drowning
- `test/identity.test.ts` — role/palette mapping and queued display identity
- `test/crowdLayout.test.ts` — render-only spacing, jitter, and ledge separation
- `test/particles.test.ts` — transient and persistent fatal-fall feedback
- `test/levels.test.ts` — one scripted win path per campaign level
- `docs/level-design-review-and-solvability-test-plan.md` — roster diversity,
  water placement rationale, coverage layers, and failure policy
- After level or dig/bash/CA changes: run `npm test` before claiming done

## Design docs

- USP + hybrid decisions: `docs/superpowers/specs/2026-07-11-lemmingx-sand-hybrid-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-11-lemmingx-sand-hybrid.md`
- Older classic-parity specs still useful for skill/trap behavior details

## Out of scope (unless asked)

- Online / lockstep (architecture must not preclude it; not shipping)
- Rigid falling chunks, full chemistry set
- Copyrighted Lemmings assets or reverse-engineered source
