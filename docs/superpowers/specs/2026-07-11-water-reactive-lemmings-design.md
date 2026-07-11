# Water-Reactive Lemmings + Interaction Matrix — Design

**Date:** 2026-07-11
**Status:** Draft — matrix approved as the design heart; levels redesign follows it
**Supersedes:** the "v1: water kills / drowns" decision in
`2026-07-11-lemmingx-sand-hybrid-design.md` (that spec explicitly deferred
"shallow water walkable later" — this is that revisit).

## Vision

Materials stop being binary kill-zones. Every lemming type reads the
environment: wading, treading, swimming, sinking. The **interaction matrix**
below is the design contract — levels are designed *from* it, and sim changes
that contradict a cell are bugs. Existing campaign levels are expected to
break; they get redesigned against the matrix afterwards.

## Water model (approved)

- **Wade** — solid footing with shallow water (≤ ~2 cells) over the feet:
  behavior unchanged, splash feedback. Working states (bash/mine/dig/build)
  continue while wading.
- **Tread** (new state) — deep water, non-swimmer: buoyancy holds the head at
  the surface; bobs in place. Safe but stuck — a rescue problem. A treading
  lemming grabs any exit within step height on *either* side: ground or
  **floating wood** (rafts are rescues).
- **Swim** (new state) — Swimmer trait: crosses the surface at swim speed,
  turns at walls, climbs out banks within step height. Permanent trait,
  stacks with climber/floater.
- **Buried = dead (universal rule)** — head sealed (water or sand, no air
  above) for > ~1.5s: drown/suffocate. This is the ONLY water death, and the
  same rule covers sand burial. Grace window so splashes and brief waves
  don't kill.
- **Water breaks falls** — landing in deep water from any height: splash,
  never splat.
- **Job flavor in deep water** — most working states cancel to treading.
  **Bombers sink**: an armed bomber drops to the bottom, fuse still burning —
  underwater crater, then water floods the hole. **Blockers wash away**: deep
  water un-plants them (they tread; the crowd is no longer turned).
  **Climbers self-rescue**: a treading climber mounts an adjacent vertical
  wall and climbs out.

## The Interaction Matrix (design heart)

Legend: carve set = dirt, sand, wood (+ one-way walls only along their arrow
for bashers; vertical digs/mines/bombs pass one-ways). Steel is never carved.
🆕 = lands with this update.

| # | Lemming | Ability | Works the terrain | Blocked by | In water | Endangered by |
|---|---------|---------|-------------------|------------|----------|---------------|
| — | Walker (base) | Walks, steps ≤7px, turns at walls | Walks on any solid: dirt, steel, one-way, settled sand, wood | Walls taller than a step | 🆕 Wades shallow; treads deep, grabs exits/wood rafts either side | Falls >38px, traps, lava, 🆕 burial |
| 1 | Climber | Permanent trait: scales vertical walls | Climbs any solid, steel included | Overhangs (detaches, falls) | 🆕 Treads, then mounts an adjacent wall and climbs out | Post-detach falls, traps |
| 2 | Floater | Permanent trait: parachute, no fall death | — | — | 🆕 Gentle splashdown, then treads | Traps, lava, 🆕 burial |
| 3 | Bomber | 5s fuse → sand-debris crater | Craters the carve set; steel survives | Nothing (one-shot) | 🆕 **Sinks**, fuse burns on — underwater blast floods the crater | Itself |
| 4 | Blocker | Plants; turns the walking crowd | Stands on any solid | — | 🆕 Deep water washes it off its post → treads, stops blocking | Traps, lava, 🆕 burial |
| 5 | Builder | 14-brick rising bridge; dams water | Builds over anything, including spans above water | Wall ahead (shrug) | 🆕 Wades and keeps laying; deep water cancels → treads | Falls, traps, 🆕 burial |
| 6 | Basher | Horizontal tunnel | Carve set; one-ways only along the arrow | Steel (clank) | 🆕 Wades and keeps bashing; deep → treads | Falls, traps, 🆕 burial |
| 7 | Miner | Diagonal-down tunnel | Carve set + one-ways | Steel (clank) | 🆕 Same as basher | Falls, traps, 🆕 burial |
| 8 | Digger | Straight-down shaft | Carve set + one-ways | Steel (clank) | 🆕 Same as basher; digging into a flooded cavity = splashdown | Falls, traps, 🆕 burial |
| 9 | 🆕 Swimmer | Permanent trait: crosses water surfaces | Exits banks within step height | Waterline walls (turns) | **Swims** | 🆕 Burial (flooded ceilings), traps |

### Materials, from the swarm's side

| Material | Walk on? | Carvable? | Water behavior | Danger |
|----------|----------|-----------|----------------|--------|
| Dirt | yes | yes | static | — |
| Steel | yes | never (clank) | static | — |
| One-way L/R | yes | only along the arrow (bash); vertical work passes | static | — |
| Sand | yes (settles ≤1-cell slopes, always walkable) | yes | sinks through water | 🆕 buries (suffocation rule) |
| Water | no | n/a (flows) | — | 🆕 only if it seals you in |
| Wood | yes | yes | floats; lifted by seeping water | — |

## Mechanics (sim contract)

- Submersion drives state: surface Y = topmost water cell in the body's
  column. Feet-on-ground + shallow → wade; no footing + body in water →
  tread/swim (y pinned so the head clears the surface; bob is render-only).
- `Lemming` gains `isSwimmer: boolean`, `sealedMs: number` (burial timer,
  covers water and sand). `LemmingState` gains `'treading' | 'swimming'`.
- Swimmer is the 9th `Skill` (hotkey 9): registry trait, assignable to any
  live non-swimmer **including treading ones** (the rescue moment), hatch
  queue compatible. `SkillInventory` is a closed Record — every level file
  and test helper gains a `swimmer` count.
- Hazard zones: `water` zones retire from levels (level 10's chasm becomes
  real CA water); `lava` zones stay insta-kill.
- Events: `splash` (deep-water entry) new; `drown` reserved for the burial
  rule. All deterministic, no RNG.

## Testing

- Rewrite contact-drown tests in `test/ca.test.ts` to the burial rule.
- New unit tests: tread buoyancy, swimmer crossing, climb-out (ground and
  wood), bomber sink+blast, blocker wash-off, fall-into-water safety,
  sand-burial suffocation, buried-grace determinism.
- Campaign guards: updated per level as levels are redesigned against the
  matrix (separate phase — breakage accepted meanwhile).

## Phasing

1. Matrix published (README + this spec) — iterate on cells with the user.
2. Sim: submersion model (wade/tread, burial rule, splash-safe falls).
3. Swimmer skill end-to-end.
4. Job flavors: bomber sinks, blocker washes off, climber self-rescue,
   wood-raft grab.
5. Render/audio: treading + swimming sprites, splash SFX.
6. Level redesign pass against the matrix (new specs per level batch).

## Out of scope (v1)

Currents/drift, swim stamina, diving, temperature/steam, water pressure.
