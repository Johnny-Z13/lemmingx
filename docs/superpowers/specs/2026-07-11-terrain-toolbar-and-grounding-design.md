# LemmingX Terrain Toolbar + Grounding — Design

**Date:** 2026-07-11
**Status:** Accepted (user approved recommendations)
**Builds on:** `2026-07-11-lemmingx-sand-hybrid-design.md` (USP locked). This is the
"Phase 5 — Campaign spice" pass plus a render-alignment bug fix.

## Goals

1. Lemmings visually stand on the terrain (they currently render ~15px above it).
2. Environmental authoring becomes a first-class, discoverable control surface:
   a dedicated Terrain toolbar mirroring the skills bar.
3. Levels gain "sand spawns": both player-held charges and level-authored
   material **emitters** (Noita-style set pieces).
4. Campaign retrofit: five levels get a signature environmental beat, each with
   an updated solvability guard.

## Part 1 — Ground the lemmings (render-only fix)

**Root cause (verified):** the sim treats `lemming.y` as mid-body — collision
feet at `y + FOOT_Y` (14), head at `y + HEAD_Y` (−8). `drawLemming` assumes
`y` = feet (`oy = y − 9·PX`), so the drawn feet land at `y` and the whole
sprite floats ~15px above the ground surface at `y + 15`.

**Fix (no sim changes; solvability guards untouched):**
- `PX` 1.5 → 2 so the ~10-unit-tall body better fills the 22px collision box.
- Offset the sprite so drawn feet bottom sits at `y + FOOT_Y`:
  `oy = y + FOOT_Y − 9·PX` (head top then ≈ `y − 6`, near `HEAD_Y`).
- `ox` recentred for the new `PX` (body stays centred on `lemming.x`).
- Move with it: selection/hover ring (centre near the feet), bomber fuse digit
  (above the new head), parachute canopy/strings, splat smudge (at the feet).
- No changes to `FOOT_Y`/`HEAD_Y`, `findStandingY`, or any probe.

**Acceptance:** in the running game, walkers' feet visibly touch dirt/sand on
flat ground, slopes, and inside dig shafts; hover/click feels attached to the
visible body.

## Part 2 — Terrain toolbar

A second persistent DOM bar in the HUD, visually parallel to the skills bar.

- **Tools (fixed order):** water, sand, dirt, wood, erase.
- **Hotkeys:** `Z X C V B` (bottom letter row, mirroring the 1–8 skill row).
  `Esc` or selecting any skill returns to skill-assign mode.
- **Button anatomy:** material swatch (same colors as terrain rendering),
  name, remaining-charge count, hotkey badge. Zero-stock tools render disabled,
  not hidden, so the bar layout is stable within a level.
- **Visibility:** campaign — shown only when the level defines any `landscape`
  charges; hidden otherwise (L1 etc. stay clean). Lab — always shown.
- **Brush cursor:** while a terrain tool is armed, draw a ring at the pointer
  (radius = paint radius 16) tinted with the material color; the HUD notice
  names the tool and remaining charges.
- **Sand Lab unification:** the Lab drops its private 1–6 key scheme and uses
  this same bar with infinite stock, plus a Lab-only **Bomb** button appended
  after erase, hotkey `M` (`N` stays nuke). Skill keys 1–8 work in the Lab
  exactly like campaign, and the old "assign" brush disappears — clicking a
  lemming with no terrain tool armed assigns the selected skill, same as
  campaign. One brush system in `GameScene`: the `labBrush`/`landscapeBrush`
  split collapses into a single armed-brush concept (Lab = unlimited charges).

## Part 3 — Material emitters ("sand spawns")

New optional level data:

```ts
export interface EmitterDefinition {
  x: number;            // world px, spout cell
  y: number;
  material: 'sand' | 'water';
  cellsPerSecond: number;
  budget: number;       // total cells; emitter goes quiet at 0
}
// LevelDefinition.emitters?: EmitterDefinition[]
```

- **Sim:** each emitter keeps an accumulator (`+= cellsPerSecond·dt`); whole
  cells emit at the spout cell if it is `empty`, decrementing `budget`, marking
  the CA chunk dirty. Stepped between lemming updates and the CA settle, in
  array order — fully deterministic, no RNG needed (the CA's seeded RNG handles
  scatter as the pile settles).
- **State:** remaining budgets live in `SimulationState.emitters` so restart
  resets them (level factories already rebuild terrain fresh).
- **Render:** small spout nozzle set-piece on the setpiece layer + a steady
  drip particle in the material's color while the emitter has budget.
- **Minimap:** emitted cells appear naturally via terrain sweep; no extra work.

## Part 4 — Campaign retrofit (five levels)

Each beat gets its solvability script updated in `test/levels.test.ts`
(scripts may call `paintLandscape` — it is public sim API).

| Level | Change | Beat |
|-------|--------|------|
| 3 Hold the Line | `landscape: { sand: 2 }` | Pour a sand ramp over the wall — alternate solution to the bomber. Guard: keep the existing bomber script AND add a sand-ramp script. |
| 5 Steel Yourself | sand emitter east of the wall at (744, 300) dunes the steel cap; the basement floor drops 490→492 so a one-cell debris bump can't pinch the 30px gallery shut (a spout west of the wall silted the crew's escape route) | Living terrain dresses the lock without soft-locking the dig route. Guard: existing dig script still wins with the emitter running. |
| 6 Trap House | `landscape: { sand: 4 }` | Bury the crusher under a twin-pour berm (two charges each side of the trigger at x498/x516). A single centred pyramid's 45° east slope stays inside the kill zone — the berm clears the whole 28px-tall trigger band with margin. Guard: bury script asserts the crusher claims no victim (lost ≤ 2); mob-rush script kept. |
| 8 Down and Out | sand emitter feeding the shaft | Living shaft; existing miner route must still win. |
| 10 Sandworld Symphony | `landscape: { water: 6, sand: 4, dirt: 2, wood: 2 }` + one emitter | Full-toolkit finale. Guard: existing script updated as needed. |

L1/L2/L4/L7/L9 unchanged (L2/L7 already carry water charges).

Balance note: emitter rates/budgets are tuned so untouched levels remain
solvable by their scripted route with zero player terrain input — emitters are
pressure and flavor, not soft locks.

## Testing

- Existing: `npm test` — all current guards must stay green after Part 1
  (render-only) and Part 3 (emitters only where levels add them).
- New unit tests (`test/ca.test.ts` or a new `test/emitters.test.ts`):
  emitter accumulator determinism, budget exhaustion, blocked-spout behavior
  (occupied cell ⇒ no emit, no budget burn).
- Updated/added level scripts per Part 4 table.
- Manual: play L3/L5/L6/L8/L10 + Lab in the running game; verify grounded
  sprites, toolbar hotkeys, brush cursor, emitter visuals.

## Out of scope

- New materials, chemistry, rigid chunks (per hybrid design non-goals).
- Retrofitting all 10 levels or authoring a new level (possible follow-up).
- Mobile/touch tuning for the toolbar.
