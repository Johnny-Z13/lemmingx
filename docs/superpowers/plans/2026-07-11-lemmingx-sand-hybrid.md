# LemmingX Sand Hybrid Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Living sand/water terrain in LemmingX — classic dig/blow loop first, Sand Lab second.

**Architecture:** Extend `Terrain` with sand/water materials; add seeded `ChunkStepper` CA after agent updates; dig/bomb convert carved cells to sand that falls; water flows and drowns; Sand Lab paints materials.

**Tech Stack:** TypeScript, Vitest, existing Phaser scene/HUD.

## Global Constraints

- No `Math.random` in sim/CA — only `SeededRng`
- Existing campaign solvability tests must stay green
- Dig/bomb: carved dirt → sand (then falls), not pure empty refill fights
- Preserve headless sim + SimEvents

---

## File map

| File | Role |
|------|------|
| `src/sim/ca/SeededRng.ts` | Deterministic PRNG |
| `src/sim/ca/ChunkStepper.ts` | Dirty chunks, sand/water/stability steps |
| `src/sim/Terrain.ts` | Add sand/water; solid≠liquid; CA helpers; sand emit on carve |
| `src/sim/types.ts` | Level CA options; lab flag |
| `src/sim/GameSimulation.ts` | CA after agents; water drown; lab paint/bomb APIs |
| `src/scenes/GameScene.ts` | Sand tint; lab input |
| `src/ui/LevelSelect.ts` | Sand Lab card |
| `src/ui/Hud.ts` / lab HUD | Paint hotbar in lab |
| `src/levels/lab.ts` | Lab arena factory |
| `test/ca.test.ts` | Sand/water/determinism tests |
| `README.md` | Document hybrid |

---

### Task 1: SeededRng + sand material + CA stepper

- [ ] Add `MATERIAL.sand` / `water`
- [ ] `isSolidAt` excludes water
- [ ] `SeededRng`, `ChunkStepper.stepSand`
- [ ] Tests: sand falls; same seed → same result
- [ ] Commit message note: not auto-commit unless asked

### Task 2: Wire dig/bomb + sim tick

- [ ] Carve converts dirt→sand (ratio from level, default 1.0 for convert-then-fall)
- [ ] `GameSimulation.step` runs CA substeps after lemmings
- [ ] Render sand color
- [ ] Campaign tests green

### Task 3: Water + drown

- [ ] Water flow rules in ChunkStepper
- [ ] `isInHazard` / body overlap with water cells
- [ ] Tests

### Task 4: Stability

- [ ] Dirt with < threshold solid neighbors → sand
- [ ] Level flag `stabilityThreshold` (0 = off)

### Task 5: Sand Lab

- [ ] `createLabLevel()`, level select entry
- [ ] Paint/erase/bomb tools, reseed
- [ ] CA always on

### Task 6: Docs + polish

- [ ] README Campaign vs Lab
- [ ] Spec status → Accepted
- [ ] Full test + build
