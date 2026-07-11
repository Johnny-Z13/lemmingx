# Water-Reactive Lemmings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved interaction-matrix water model: wade/tread/swim states, the universal buried-seal death rule, the Swimmer skill (9th), job flavors (bomber sinks, blocker washes off, climber self-rescue, wood-raft grab), splash feedback.

**Architecture:** All behavior in the headless sim keyed off submersion depth (chest probe at `y+2`); bobbing is render-only. No RNG. Spec: `docs/superpowers/specs/2026-07-11-water-reactive-lemmings-design.md` — the matrix is the contract.

**Tech Stack:** TypeScript, Vitest, Phaser (render/audio only).

## Global Constraints

- Sim headless, deterministic, no unseeded randomness.
- `FOOT_Y`/`HEAD_Y`/`STEP_HEIGHT` unchanged.
- All existing campaign guards stay green (L2/L7/L10 scripts win by quota; treading stragglers don't block a win).
- Closed `Record<Skill, …>` types: every level file + test helper gains `swimmer`.

---

### Task 1: Sim core — types, submersion, tread/swim, seal rule, splash (TDD)

**Files:** Modify `src/sim/types.ts`, `src/sim/GameSimulation.ts`, `src/sim/skills/registry.ts`; rewrite `test/ca.test.ts` drown test; Create `test/water.test.ts`.

**Types:** `Skill` + `ALL_SKILLS` gain `'swimmer'` (hotkey 9, appended). `LemmingState` gains `'treading' | 'swimming'`. `Lemming` gains `isSwimmer: boolean`, `sealedMs: number`. `SimEventKind` gains `'splash'`.

**Registry:** swimmer trait def — `canAssign: (l) => !l.isSwimmer && l.state !== 'blocker'` (works on treading lemmings — the rescue), `onAssign: isSwimmer = true; if state === 'treading' → 'swimming'`.

**Sim constants:** `SWIM_SPEED = 20`, `SINK_FALL_SPEED = 30`, `SEALED_DEATH_MS = 1500`, `CHEST_Y = 2`, float line: `y = surface − 2`.

**Sim mechanics:**
- `waterAtChest(l)` = `terrain.isWaterAt(l.x, l.y + CHEST_Y)`.
- `waterSurfaceY(x, fromY)`: step up cell-by-cell from the chest cell while water; return top edge of the highest contiguous water cell.
- `updateSealed(l, dt)`: head probe `(x, y + HEAD_Y)` is water **or solid** → `sealedMs += dt` else `0`; over `SEALED_DEATH_MS` → `kill('drown')`. Runs for every live state EXCEPT armed lemmings (`fuseMs !== null` — the fuse gets them first, per matrix) and exempts blockers? No — blockers can be buried too. Grace covers transient head clips (miner swings etc.).
- `enterWater(l)`: state = isSwimmer ? 'swimming' : 'treading'; `velocityY = 0`; `squashMs = 0`; emit `'splash'`.
- Transition check in `updateLemming` after the exit check: if `waterAtChest` and state not water/blocker and `fuseMs === null` → `enterWater` (cancels working jobs). Blocker wash-off: before the blocker early-return, `waterAtChest` → `enterWater` (stops blocking).
- `updateTreading`: re-pin `y` toward `surface − 2` (cap 60px/s); if no water at chest: ground below → walker + `findStandingY`, else `beginFall`. Exit grab both directions: `tryClimbOut(l, dir)` — probe `exitX = x + dir·(BODY_HALF_WIDTH + 2)`, `candidate = findStandingY(exitX, y)`; accept if feet `(candidate + FOOT_Y)` within `STEP_HEIGHT + 2` of the surface, ground below there, and `!hitsWall` → move + walker. Wood rafts qualify (walk-solid). Climber self-rescue: wall beside head on either side → state 'climber' (+ face the wall).
- `updateSwimming`: pin `y = surface − 2`; `x += SWIM_SPEED·dt·direction` (edge-clamp + bounce like walk); wall at waterline → `tryClimbOut` then climber-mount then turn; ground below (swam into shallows) → walker.
- `updateFaller`: on entering water at chest — armed (`fuseMs !== null`): cap `velocityY` at `SINK_FALL_SPEED` and keep falling (sinks; lands on the bottom; no splat when feet in water); otherwise `enterWater`. Fall-damage check gains `&& !inWater`.
- `isInHazard`: DELETE the three terrain-water probes (zones unchanged — lava et al. still kill).
- `spawnLemming`: init `isSwimmer: false, sealedMs: 0`.

**Tests (`test/water.test.ts`, same `makeLevel` helper style with `sandLab: true` where quota would end the run):** deep-fall → treading + alive (fall > 38px); tread pins head above surface; fully-sealed drowns after ~1.5s, surfaced treader doesn't; swimmer assigned while treading crosses a pool and walks out the far bank; climber treader climbs out up a wall; blocker floods → stops blocking (walkers pass) + treads; armed bomber sinks and craters the pool floor; shallow wade keeps walking; sand burial suffocates. Rewrite `ca.test.ts` "water cells drown a lemming" → lemming in open water treads and survives (`lost` stays 0), with a sealed variant covering the drown path.

**Verify:** `npx vitest run test/water.test.ts test/ca.test.ts` then `npm test` (level files fail TS until Task 2 — run together).

### Task 2: Swimmer inventory sweep + stock

**Files:** all `src/levels/level*.ts` + `lab.ts` (add `swimmer:` to skills), `test/ca.test.ts` + `test/emitters.test.ts` helpers.
Stock: `swimmer: 0` everywhere except lab `10`, level2 `2`, level9 `2`, level10 `2`.
**Verify:** `npm test` green, `npm run build` clean.

### Task 3: Level 10 — real water chasm

Replace the water hazard zone with CA water in a contained basin: keep the `eraseRect`; add 6px dirt lips under the chasm sides (`fillRect(1034, 490, 6, 30)`, `fillRect(1100, 490, 6, 30)`) and `fillRect(1040, 452, 60, 68, MATERIAL.water)`; delete `hazards`. Guard must stay green.

### Task 4: Render + audio + HUD polish

- `LemmingSprite`: `treading` (legs hidden, alternating flail arms above head, ±1px frame-sine bob, hair `0x4ab6ff`) and `swimming` (leaning pose, stroke arm, kick flicker behind, hair `0x2ee6c8`); hair map entries.
- `Sfx.play` case `'splash'` (short filtered-noise plop); `GameScene.consumeEvents` case `'splash'` (blue droplet burst).
- README matrix: flip the 🆕 markers note to "shipped".
**Verify:** build + full suite + manual splash in Lab.

### Task 5: Docs + final verification

CLAUDE.md (materials table water row, swimmer in APIs/skills), README skills/keys touch-ups. `npm test`, `npm run build`, commit each task, merge per finishing skill.
