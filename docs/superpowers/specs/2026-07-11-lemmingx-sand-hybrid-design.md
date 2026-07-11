# LemmingX Sand Hybrid — Design

**Date:** 2026-07-11  
**Status:** Accepted — Sandworld USP locked 2026-07-11  

**USP (locked):** LemmingX is **Lemmings × Noita sandworld**. The player authors the living landscape (dig, build, bomb, flood, float wood) and orders the hatch queue so the swarm reaches the exit. Skills are precision tools; terrain physics is the star.


**Related:**
- LemmingX: `src/sim/Terrain.ts`, `GameSimulation.ts`
- Unity refs: [Johnny-Z13/2D-sandbox](https://github.com/Johnny-Z13/2D-sandbox), [Johnny-Z13/FallingSand](https://github.com/Johnny-Z13/FallingSand)

---

## Product fantasy (locked)

**Hybrid (campaign + lab), sequenced:**

1. **Primary (v1 ship):** Classic Lemmings-like loop — assign skills, dig/bash/mine/bomb the landscape, meet save quota. Destruction feels physical because carved terrain becomes **sand** that settles, and bombs spray debris.
2. **Secondary (v1.x):** Sand Lab free-play — paint materials, dig/bomb freely, optional lemming release. Sandbox vibes are a major appeal pillar, but they do not block the classic campaign loop.

---

## Decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product shape | Hybrid: Campaign + Sand Lab | Best of puzzle identity + Noita-lite juice |
| v1 priority | Classic dig/blow + settling sand | Keep Lemmings readable; juice without rewriting the game |
| Engine path | CPU MaterialGrid + ChunkStepper in TS | Fits headless tests; portable from FallingSand ideas; WebGPU optional later |
| Determinism | Seeded PRNG for all CA choices | Solvability tests, replays, future lockstep online |
| Online | Not in v1; architecture must not preclude it | Same seed + inputs → identical world |
| Rigid falling chunks | Out of v1 | Marching-squares rigidbodies are FallingSand Phase 2+ |
| Full 30-element chem | Out of v1 | Start sand + water; registry allows growth |

---

## Modes

### Campaign
- Existing level select, skills, quota, timer, traps, steel, one-ways.
- Living materials enabled per level (`caEnabled`, `caSeed`, `caSubsteps`).
- Early levels can keep mostly static dirt; later levels introduce sand piles, floods, collapse.
- HUD unchanged aside from any material readability (sand vs dirt tint).

### Sand Lab
- Always-unlocked entry from level select (or pause menu).
- Tools: paint sand / water / dirt / erase, dig brush, bomb, optional hatch release.
- No quota/timer by default; optional “challenge card” later.
- Uses a large seeded (or re-rollable) arena; CA always on.

---

## Materials (v1)

| ID | Name | Motion | Carvable | Notes |
|----|------|--------|----------|-------|
| 0 | empty | — | — | air |
| 1 | dirt | static (until undercut) | yes | classic diggable |
| 2 | steel | immovable | no | puzzle locks / clank |
| 3 | oneWayLeft | static | only carving left | keep classic |
| 4 | oneWayRight | static | only carving right | keep classic |
| 5 | sand | powder: down, then diagonal | yes | dig/bomb debris |
| 6 | water | liquid: down, then sideways | n/a (flows) | moving hazard; drown on overlap |
| 7 | wood | falls in air; floats on water | yes | paint-water lift; walkable bridge |

**Post-v1 (registry-ready):** oil, lava, steam, gunpowder — follow FallingSand Element hierarchy.

---

## Simulation contract

### Architecture
```
src/sim/
  MaterialGrid.ts     # replaces/extends Terrain cell storage + carve API
  ca/
    SeededRng.ts      # deterministic PRNG
    ChunkStepper.ts   # dirty chunks, bottom-up step, shuffled X
    rules/
      sand.ts
      water.ts
  GameSimulation.ts   # agents, then CA settle, then outcome
```

Preserve: headless sim, `SimEvent`s, Phaser-only rendering, vitest solvability guards.

### Tick order (deterministic)
1. Hatch / spawn / timers  
2. Update lemmings (skills, walk, fall, carve)  
3. CA settle: `caSubsteps` passes over dirty chunks  
4. Hazards / traps / outcome  

Carve/fill/bomb mark chunks dirty. CA never uses `Math.random` — only `SeededRng` from `caSeed`.

### Skill → material coupling (classic loop focus)
| Action | Effect |
|--------|--------|
| Digger / basher / miner | Carve carvable cells; **emit sand** into cleared volume (tunable density) |
| Bomber / nuke | Crater (steel survives); **sand spray** in blast ring; screen shake already exists |
| Builder | Still places dirt (or dedicated “brick” later); can dam water |
| Blocker / climber / floater | Unchanged vs agents |

### Stability (phase 1.5)
Dirt with fewer than `stabilityThreshold` solid neighbors becomes sand (from 2D-sandbox). Off by default on tutorial levels; on for later campaign + lab.

### Agent ↔ grid
- `isSolidAt` = any non-empty, non-liquid (water is hazard, not floor — or shallow water walkable later; **v1: water kills / drowns** like today’s hazard zones, but water cells move).
- Ground probes unchanged aside from material meaning.
- Floating sand under feet can settle mid-frame; CA substeps after agents reduce “jitter.”

---

## Determinism & future online

**Not saying** sand physics can’t be online. Saying:

- Unseeded CA RNG → divergent clients / flaky tests.  
- Seeded CA RNG → deterministic; lockstep or replay is viable later.

| Mode | Seed |
|------|------|
| Campaign level | Fixed `caSeed` in level data |
| Sand Lab | Randomize on enter; “Reseed” button; shareable seed string later |
| Tests | Fixed seed + optional `settleUntilQuiet()` before skill scripts |

Online (future, non-goal for v1): shared seed + identical input stream, or server-authoritative grid.

---

## Rendering

- Keep Phaser agents/HUD.
- Terrain: continue Graphics or move to ImageData/canvas texture for sand/water color variance (glitter optional).
- Dirty-flag redraw stays (already in LemmingX).
- Sand Lab paint cursor + material hotbar (DOM, like skill bar).

---

## Phased delivery

### Phase 1 — Classic dig/blow with sand (must ship first)
- MaterialGrid + sand powder rules + seeded ChunkStepper  
- Dig/bash/mine/bomb emit sand; sand settles  
- Existing 10 levels still solvable (CA on with stable seeds, or sand emission off until verified)  
- Tests: sand fall unit tests + campaign guards green  

### Phase 2 — Water
- Water flow rules; drowning via water cells  
- At least one campaign level that uses flooding / damming  

### Phase 3 — Collapse
- Stability threshold undercut → sand  

### Phase 4 — Sand Lab mode
- Lab scene/UI, paint tools, bomb, reseed  
- No campaign regression  

### Phase 5 — Campaign spice
- 2–3 new levels designed around living terrain  
- Level select Lab entry polish  

### Phase 6+ (backlog)
- Element registry (FallingSand-style)  
- Oil / lava / steam  
- Rigid chunk detach (Marching Squares)  
- WebGPU CA if CPU chunks aren’t enough  
- Online lockstep prototype  

---

## Success criteria

- Classic loop still feels like Lemmings: assign, dig, bomb, save quota.  
- Digging/bombing produces visible settling sand (the “sandbox vibe” teaser inside campaign).  
- All existing solvability tests pass with seeded CA.  
- Sand Lab is fun for 5+ minutes of free play without a win condition.  
- No unseeded randomness in sim paths.  
- README documents Campaign vs Lab and `caSeed`.  

---

## Non-goals (v1)

- Multiplayer / netcode implementation  
- Full Noita chemistry set  
- Rigidbody falling terrain chunks  
- Replacing Phaser with a Unity port  
- Mobile-first Lab controls (nice-to-have later)  

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| CA breaks scripted solutions | Fixed seeds; settle-until-quiet in tests; toggle sand emission per level |
| Perf on 2880-wide levels | Dirty chunks only; cap substeps; cellSize 4–6 |
| Water + blockers edge cases | Spec water as hazard-not-floor in v1; revisit shallow wade later |
| Scope creep into full FallingSand | Phase gate: Lab only after Phase 1 dig/blow feels good |

---

## Open questions (non-blocking)

1. Should dig emit **100% sand** or a mix of empty + sand (less fill-in)? Default proposal: ~40–60% of carved cells become sand particles above the hole.  
2. Lab first unlock: from boot level select only, or also from in-level pause?  
3. Keep one-way walls as static-only forever, or allow them to become sand if bombed from the allowed side?

Defaults if unspecified: (1) ~50% sand emit, (2) level select only for v1, (3) bomb respects carvability then debris is sand.
