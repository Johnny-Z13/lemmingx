# Classic Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring LemmingX to classic-Lemmings feature parity: terrain materials (steel/one-way), scrolling levels + minimap, miner skill, animated traps, procedural chiptune music, level select + persistence, and 10 levels.

**Architecture:** Extend the existing deterministic sim / Phaser render split. Terrain cells become materials; all carving goes through direction-aware `carve*` methods. Traps live in the sim (testable); camera/minimap are pure render/UI. Music is a WebAudio sequencer with tunes as note data. Spec: `docs/superpowers/specs/2026-06-10-lemmingx-classic-parity-design.md`.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, WebAudio. No asset files.

**Per-stage gate:** `npx vitest run` green → `npm run build` clean → commit.

---

### Task 1: Terrain materials (steel + one-way walls)

**Files:**
- Modify: `src/sim/Terrain.ts`, `src/sim/types.ts`, `src/sim/GameSimulation.ts`, `src/audio/Sfx.ts`, `src/scenes/GameScene.ts`
- Test: `test/simulation.test.ts` (extend)

**Terrain.ts** — cells become materials:

```ts
export const MATERIAL = {
  empty: 0, dirt: 1, steel: 2, oneWayLeft: 3, oneWayRight: 4,
} as const;
export type Material = (typeof MATERIAL)[keyof typeof MATERIAL];
```

- `fillRect(x, y, w, h, material: Material = MATERIAL.dirt)` writes the material.
- `isSolidAt`/`isCellSolid`: any non-zero cell is solid (no caller changes).
- `materialAt(x, y): Material` for probes.
- New `carveRect(x, y, w, h, direction: -1 | 0 | 1): { carved: number; blockedBySteel: boolean }`
  and `carveCircle(x, y, radius): same` replace raw `eraseRect`/`eraseCircle` in
  *destruction* paths. Carvability per cell: dirt always; steel never;
  one-way-left only when `direction === -1` or `0`; one-way-right only when
  `direction === 1` or `0`. (Direction 0 = vertical/blast: diggers and bombers
  go through one-way walls, as in the original; steel stops everything.)
  `blockedBySteel` is true if any visited cell was steel (drives clank + cancel).
- `eraseRect`/`eraseCircle` stay for level *authoring* only.
- `forEachSolidCell` visitor gains a 5th arg `material` (existing callers unaffected).

**GameSimulation.ts:**
- Digger: `carveRect(..., 0)`; if `blockedBySteel` and no dirt carved → emit `clank`, revert to walker (snap to standing Y).
- Basher: carve with `lemming.direction`; `wallAheadOfBasher` unchanged (probes solidity), but after a bite with `carved === 0 && blockedBySteel` → `clank` + walker. One-way against direction behaves like steel for the basher.
- Bomber `explode`: `carveCircle` (steel survives the blast).
- New `SimEventKind` `'clank'`; Sfx plays a short metallic ping (high-freq square blip + fast decay); scene bursts pale spark particles.

**GameScene.drawTerrain:** shade by material — steel: riveted gray (`0x8a93a6` base, darker at depth); one-way: dirt shade with a chevron-arrow tint overlay in the wall's direction; dirt: existing depth shading.

**Tests (sim):**
- digger over steel: carves dirt above, stops at steel boundary, terrain below steel line unchanged, lemming back to walker, one `clank` event.
- basher into steel wall: stops, `clank`, no steel cells removed.
- basher into one-way wall with the arrow: passes through; against the arrow: stops.
- bomber next to steel: crater erases dirt only.

- [ ] Write failing material/carve tests → implement Terrain changes → sim changes → render → all green → commit `Stage 1: terrain materials — steel + one-way walls`

### Task 2: Camera + minimap

**Files:**
- Modify: `src/scenes/GameScene.ts`, `src/ui/Hud.ts`, `src/styles.css`

- Viewport stays 960×540 (`main.ts` untouched). Camera bounds already track level size.
- Camera controls in GameScene: arrow keys pan (`update()` polls cursor keys, ~420 px/s), edge-scroll when pointer is within 24 px of a viewport edge, drag with middle or right button (`pointerdown` button check + move deltas; suppress context menu). Camera starts centered on `level.spawn`.
- Minimap in Hud: a `<canvas class="hud__minimap">` (top-right, ~180 px wide, height by level aspect). Scene passes `{ terrain, lemmings, camera: {x, y, w, h}, hazards }` via `hudView()`. Hud redraws terrain layer at ≤10 Hz (cells → fillRect, material colors), lemming dots + camera rectangle every update. Pointer down/drag on minimap → `onMinimapJump(fractionX, fractionY)` → scene `cameras.main.centerOn`.
- Only render the minimap when `level.width > 960 || level.height > 540` (single-screen levels keep a clean HUD).

**Verify:** temporary wide test level not needed — Task 7's level 4 covers it; until then verify camera clamps on existing levels (no pan possible = correct) and via a quick browser check after Task 7.

- [ ] Implement camera controls → minimap → tests stay green → build → commit `Stage 2: camera pan + HUD minimap`

### Task 3: Miner (8th skill) + classic hotkey order

**Files:**
- Modify: `src/sim/types.ts`, `src/sim/skills/registry.ts`, `src/sim/GameSimulation.ts`, `src/render/LemmingSprite.ts`, `src/levels/level*.ts`, `README.md`
- Test: `test/simulation.test.ts`

- `Skill` + `ALL_SKILLS` + `LemmingState` gain `'miner'`; ALL_SKILLS reordered to classic: climber, floater, bomber, blocker, builder, basher, miner, digger; hotkeys `1`–`8` follow that order (digger moves 7→8).
- Registry def: `canAssign: isInterruptible`, `onAssign` → state `'miner'`, `actionTimerMs = 0`.
- `updateMiner` (mirrors basher's bite pattern): every `MINE_INTERVAL_MS = 90`, carve a down-slanted slab in front (`carveRect(frontX, y + 2, 12, 14, direction)`), then step `x += direction * 3.4`, `y += 2.6`. Stop conditions: `blockedBySteel && carved === 0` → clank + walker; no ground below after the step → faller. Emits `dig` events (reuses dig SFX/particles).
- Sprite: miner pose = basher arms + digger crouch, alternating 2-frame swing.
- All level factories add `miner: 0` (or a stock where useful) to `skills`.

**Tests:** miner carves a descending tunnel (end position lower and ahead), miner stops on steel with clank, miner falls when tunnel exits a ledge.

- [ ] Failing miner tests → types/registry → sim update → sprite → levels/README hotkeys → green → commit `Stage 3: miner skill + classic hotkey order`

### Task 4: Animated traps + hatch/exit set pieces

**Files:**
- Modify: `src/sim/types.ts`, `src/sim/GameSimulation.ts`, `src/scenes/GameScene.ts`, `src/audio/Sfx.ts`, `src/render/Particles.ts` (only if a new burst preset is needed)
- Test: `test/simulation.test.ts`

**types.ts:**

```ts
export type TrapKind = 'crusher' | 'zapper' | 'chomper';
export interface TrapDefinition { x: number; y: number; width: number; height: number; kind: TrapKind; cycleMs?: number; }
export interface TrapState { def: TrapDefinition; phase: 'idle' | 'killing'; timerMs: number; }
// LevelDefinition gains traps?: TrapDefinition[]
// SimulationState gains traps: TrapState[]
// SimEvent gains optional trapKind?: TrapKind; SimEventKind gains 'trap'
```

**Sim:** each step, for each idle trap, the first live overlapping lemming (same box test as hazards) dies: `kill(l, 'silent')` + emit `{ kind: 'trap', trapKind }` + phase `'killing'` for `cycleMs` (default 1400). While killing, lemmings pass safely. Timer counts down → idle.

**Hatch open:** sim gains `hatchOpenMs` countdown (`HATCH_OPEN_MS = 900`) before the first spawn can happen; exposed on state as `hatchOpenMs` so the scene can animate doors swinging by progress. Solvability tests are time-generous, unaffected.

**Scene:** `drawTraps()` — procedural per kind, animated by phase + timer (crusher: descending spiked block; zapper: tesla post with arc flicker while killing; chomper: jaw from the floor). Exit gets a slow shimmer pulse (alpha sine on the glow). Hatch doors rotate open during `hatchOpenMs`.

**Sfx:** distinct per kind: crusher = low thud, zapper = descending zap, chomper = quick snap. Particles per kind.

**Tests:** trap kills exactly one lemming then re-arms after `cycleMs`; second lemming entering during `killing` survives; trap emits `trap` event with kind; no spawns before `hatchOpenMs` elapses.

- [ ] Failing trap/hatch tests → sim → render/audio → green → commit `Stage 4: animated traps + hatch/exit set pieces`

### Task 5: Procedural chiptune music

**Files:**
- Create: `src/audio/Music.ts`, `src/audio/tracks.ts`
- Modify: `src/audio/Sfx.ts` (master gain), `src/scenes/GameScene.ts`, `src/ui/Hud.ts`, `src/styles.css`

**tracks.ts** — tunes as data, no audio assets:

```ts
export interface Track {
  name: string; bpm: number;
  // Four channels; each pattern is steps of note name ('C4', 'G#3', …) or null (rest).
  lead: (string | null)[]; harmony: (string | null)[]; bass: (string | null)[];
  noise: (0 | 1 | 2)[]; // 0 rest, 1 hat, 2 kick/snare-ish
}
export const TRACKS: Track[] = [/* 3 original 32–64-step loops, jaunty/marching */];
```

**Music.ts** — lookahead sequencer:
- `start(trackIndex)`, `stop()`, `setVolume(v)`, `setMuted(m)`, `duck(ms)` (brief gain dip for the nuke).
- 25 ms `setInterval` tick schedules every step landing within the next 120 ms via `AudioContext.currentTime`-anchored `OscillatorNode`s — square (lead/harmony), triangle (bass) — and a shared white-noise `AudioBuffer` for percussion, all into a master `GainNode`.
- Note-name → frequency: `440 * 2 ** ((midi - 69) / 12)` with a small name parser.
- Shares the Sfx unlock pattern (resume on first gesture).

**Wiring:** GameScene owns a `Music` instance; `startLevel()` plays `TRACKS[levelIndex % TRACKS.length]`; nuke event → `duck()`. Hud gains a compact audio cluster: music mute toggle + volume slider, SFX mute + slider; values persisted to `localStorage('lemmingx.audio.v1')` immediately and restored on boot.

**Verify:** no unit tests for audio output; assert tracks data shape in a tiny test (all patterns same length per track, valid note names). Manual browser check: music plays, mute persists across reload.

- [ ] tracks data test → sequencer → HUD controls + persistence → green → commit `Stage 5: procedural chiptune music + audio controls`

### Task 6: Level select + progress persistence

**Files:**
- Create: `src/progress.ts`, `src/ui/LevelSelect.ts`
- Modify: `src/scenes/GameScene.ts`, `src/ui/Hud.ts`, `src/styles.css`
- Test: `test/progress.test.ts`

**progress.ts** — storage-injectable for tests:

```ts
export interface LevelResult { completed: boolean; bestSavedPct: number; }
export class Progress {
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> , private key = 'lemmingx.progress.v1') {}
  get(index: number): LevelResult; // default { completed: false, bestSavedPct: 0 }
  recordWin(index: number, savedPct: number): void; // keeps max pct
  isUnlocked(index: number): boolean; // index 0 always; else get(index-1).completed
}
```

**LevelSelect.ts:** DOM overlay (same panel styling as the HUD) with a card grid: level number, name, lock icon / best-% badge; clicking an unlocked card → `onPick(index)`. Shown at boot and via Esc / overlay buttons.

**GameScene:** boots into level select (game canvas behind, dimmed); win → `progress.recordWin`; win overlay buttons: Next (if unlocked/exists), Replay, Level Select; Esc during play → confirm-free return to select (sim discarded). `nextLevel()` stops wrapping past the last level.

**Tests (progress with a fake storage object):** defaults, recordWin keeps best %, unlock chain, corrupted JSON falls back to empty.

- [ ] Failing progress tests → progress.ts → LevelSelect UI → scene wiring → green → commit `Stage 6: level select + saved progress`

### Task 7: Ten levels + solvability guards

**Files:**
- Create: `src/levels/level4.ts` … `src/levels/level10.ts`
- Modify: `src/levels/level1-3.ts` (fit the arc: names, miner stock, polish), `src/levels/index.ts`
- Test: `test/levels.test.ts` (one scripted-solution guard per level, same `run(levelIndex, strategy)` pattern)

Arc (one new mechanic each; sizes in px):
1. **First Steps** (960×540) — walk + dig basics (revamp of current 1).
2. **Bridge the Gap** (960×540) — builders over water (revamp of 2).
3. **Hold the Line** (960×540) — blockers + bombers (revamp of 3).
4. **The Long March** (2880×540) — first scrolling level; camera + minimap.
5. **Steel Yourself** (1440×540) — steel floor forces digging around.
6. **Trap House** (1440×540) — first traps (crusher + zapper).
7. **Wrong Way** (1440×540) — one-way walls force a route.
8. **Down and Out** (1440×810) — miner showcase, tall.
9. **The Gauntlet** (2400×810) — climbers/floaters + steel + traps.
10. **Last Lemming Standing** (2880×810) — everything, tight skill budget.

Each level file: doc comment describing the intended human solution; the test script mirrors it. Levels 4+ must keep spawn-to-exit routes solvable with the listed inventory only.

- [ ] For each level: write factory → write its solvability test → run until green → after all 10: full suite + build → commit `Stage 7: ten-level campaign + solvability guards`

### Task 8: Polish, tune, docs

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/...-classic-parity-design.md` (mark shipped), misc tuning

- README: 8 skills + new hotkey table, camera controls, minimap, traps, music, level select, 10 levels.
- Browser playtest pass (chrome-devtools): boot → level select → play level 1 and level 4 (scrolling) → verify minimap, music, trap kill feedback, win overlay → record fixes.
- Final: `npx vitest run` + `npm run build` green → commit `Stage 8: polish, tuning, docs` → **push to origin**.

- [ ] Playtest → tune → docs → green → commit → push

---

## Self-review notes

- Spec coverage: materials (T1), camera/minimap (T2), miner (T3), traps + hatch/exit (T4), music (T5), select/persistence (T6), 10 levels (T7), polish/push (T8). Audio settings persistence handled in T5 (not deferred to T6).
- Type names used across tasks: `MATERIAL`/`Material`, `carveRect`/`carveCircle` (T1, reused T3/T4), `TrapDefinition`/`TrapState`/`'trap'` event (T4), `Progress`/`LevelResult` (T6) — consistent.
- `eraseRect`/`eraseCircle` remain authoring-only; all gameplay destruction goes through `carve*`.
