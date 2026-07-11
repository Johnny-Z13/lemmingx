# Terrain Toolbar + Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground the lemming sprites on the terrain, promote environmental painting to a first-class Terrain toolbar (unified with the Sand Lab), add deterministic material emitters, and retrofit five campaign levels with environmental beats.

**Architecture:** The sim stays headless and deterministic — emitters are a plain accumulator stepped between lemming updates and the CA settle, no RNG. The sprite fix is render-only (no sim constants change, so all solvability guards hold). The HUD grows a second toolbar sharing the skills bar's visual language; `GameScene`'s two brush systems (`labBrush`/`landscapeBrush`) collapse into one.

**Tech Stack:** TypeScript, Phaser 3 (render only), Vitest, Vite. Spec: `docs/superpowers/specs/2026-07-11-terrain-toolbar-and-grounding-design.md`.

## Global Constraints

- `src/sim/` stays headless: no Phaser/DOM/audio imports there.
- No unseeded randomness anywhere in the sim (`SeededRng` only; emitters use none).
- Every campaign level change updates/keeps its solvability guard in `test/levels.test.ts`.
- Sim collision constants (`FOOT_Y = 14`, `HEAD_Y = -8`, `STEP_HEIGHT = 7`) must NOT change.
- Match existing code style (comment density, naming, single quotes).
- Commands: `npm test` = `vitest run`; `npm run build` = `tsc && vite build`.
- Commit style: `type(scope): summary`, message via bash heredoc.

---

### Task 1: Ground the lemming sprite (render-only)

**Files:**
- Modify: `src/render/LemmingSprite.ts`
- Modify: `src/scenes/GameScene.ts:499-512` (`findNearestLemming` pick point)

**Interfaces:**
- Consumes: sim constants `FOOT_Y = 14` (feet at `lemming.y + 14`); NOT imported — mirrored as a render constant.
- Produces: nothing consumed by later tasks; purely visual alignment.

Background (verified): the sim treats `lemming.y` as mid-body — collision feet at `y + 14`, head at `y − 8`. `drawLemming` currently draws feet at `y` exactly, so sprites float ~15px. Fix: `PX` 1.5 → 2 (body better fills the 22px collision box) and shift the draw origin so drawn feet (block row 8–9, i.e. `oy + 9·PX`) land at `y + 14`.

- [ ] **Step 1: Update sprite constants and origin**

In `src/render/LemmingSprite.ts` replace:

```ts
/** One pixel unit. Body is ~8 wide x ~12 tall at this scale. */
const PX = 1.5;
```

with:

```ts
/** One pixel unit. Body is ~8 wide x ~12 tall at this scale. */
const PX = 2;
/** Mirror of the sim's FOOT_Y: collision feet sit at lemming.y + 14. */
const FOOT_OFFSET = 14;
```

In `drawLemming`, replace:

```ts
  const ox = lemming.x - 4 * PX - squash * PX;
  const oy = lemming.y - 9 * PX + squash * 3 * PX;
```

with:

```ts
  const ox = lemming.x - 4 * PX - squash * PX;
  // Feet (block row 9 bottom = oy + 9·PX) rest on the sim's collision feet.
  const oy = lemming.y + FOOT_OFFSET - 9 * PX + squash * 2;
```

- [ ] **Step 2: Move the ring and fuse digit with the body**

Selection ring (currently centred at `lemming.y + 2`, which is now inside the torso) — replace both circles:

```ts
    g.strokeCircle(lemming.x, lemming.y + 4, pulse);
    g.lineStyle(1, 0x6ae1ff, 0.45);
    g.strokeCircle(lemming.x, lemming.y + 4, pulse + 3);
```

Fuse countdown digit (head top is now ≈ `y − 6`) — replace:

```ts
    drawDigit(g, lemming.x, lemming.y - 16 - squash * 2, digit);
```

with:

```ts
    drawDigit(g, lemming.x, lemming.y - 12 - squash * 2, digit);
```

(Parachute, splat, blink overlay, and all limb blocks are relative to `ox`/`oy` and move automatically.)

- [ ] **Step 3: Align the hover/click pick point**

In `src/scenes/GameScene.ts` `findNearestLemming`, the body's visual centre is now `y + 4`. Replace:

```ts
      const distanceSq = (lemming.x - worldX) ** 2 + (lemming.y - worldY) ** 2;
```

with:

```ts
      const distanceSq = (lemming.x - worldX) ** 2 + (lemming.y + 4 - worldY) ** 2;
```

- [ ] **Step 4: Verify tests and build stay green**

Run: `npm test` — Expected: all pass (no sim change).
Run: `npm run build` — Expected: clean tsc + vite build.

- [ ] **Step 5: Visual check in the running game**

Run `npm run dev`, open level 1: walkers' feet must touch the dirt on flat ground, in dig shafts, and on builder bridges; hover ring wraps the body; bomber digit sits just above the head.

- [ ] **Step 6: Commit**

```bash
git add src/render/LemmingSprite.ts src/scenes/GameScene.ts
git commit -m "fix(render): ground lemming sprites on their collision feet"
```

---

### Task 2: Material emitters — sim + types (TDD)

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/GameSimulation.ts`
- Create: `test/emitters.test.ts`

**Interfaces:**
- Produces (used by Tasks 3, 6, 8, 9):
  - `EmitterDefinition { x: number; y: number; material: 'sand' | 'water'; cellsPerSecond: number; budget: number }` on `LevelDefinition.emitters?: EmitterDefinition[]`
  - `EmitterState { def: EmitterDefinition; budgetLeft: number; accumulatorCells: number }` on `SimulationState.emitters: EmitterState[]`

- [ ] **Step 1: Write the failing tests**

Create `test/emitters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MATERIAL, Terrain } from '../src/sim/Terrain';
import { GameSimulation } from '../src/sim/GameSimulation';
import type { EmitterDefinition, LevelDefinition } from '../src/sim/types';

function makeLevel(terrain: Terrain, overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    width: terrain.width,
    height: terrain.height,
    spawn: { x: 20, y: 20 },
    exit: { x: 200, y: 0, width: 1, height: 1 },
    spawnIntervalMs: 1000,
    totalLemmings: 0,
    releaseRate: 50,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 1,
    hatchOpenMs: 0,
    caEnabled: true,
    caSeed: 42,
    caSubsteps: 4,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 0,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 0,
    },
    terrain,
    ...overrides,
  };
}

function countMaterial(terrain: Terrain, material: number): number {
  let count = 0;
  for (let y = 0; y < terrain.rows; y += 1) {
    for (let x = 0; x < terrain.cols; x += 1) {
      if (terrain.getCell(x, y) === material) count += 1;
    }
  }
  return count;
}

describe('material emitters', () => {
  it('pours sand until the budget is exhausted', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 100, 120, 20); // floor
    const emitter: EmitterDefinition = { x: 60, y: 20, material: 'sand', cellsPerSecond: 20, budget: 6 };
    const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
    for (let s = 0; s < 200; s += 1) sim.step(16);
    sim.settleTerrain();
    expect(sim.state.emitters[0].budgetLeft).toBe(0);
    expect(countMaterial(terrain, MATERIAL.sand)).toBe(6);
  });

  it('a blocked spout emits nothing and burns no budget', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 100, 120, 20);
    terrain.fillRect(56, 16, 8, 8, MATERIAL.steel); // plug the spout cell
    const emitter: EmitterDefinition = { x: 60, y: 20, material: 'sand', cellsPerSecond: 20, budget: 6 };
    const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
    for (let s = 0; s < 100; s += 1) sim.step(16);
    expect(sim.state.emitters[0].budgetLeft).toBe(6);
    expect(countMaterial(terrain, MATERIAL.sand)).toBe(0);
  });

  it('water emitters pour water', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 100, 120, 20);
    const emitter: EmitterDefinition = { x: 60, y: 20, material: 'water', cellsPerSecond: 20, budget: 5 };
    const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
    for (let s = 0; s < 200; s += 1) sim.step(16);
    expect(sim.state.emitters[0].budgetLeft).toBe(0);
    expect(countMaterial(terrain, MATERIAL.water)).toBe(5);
  });

  it('same level and seed produce identical terrain after emission', () => {
    const build = () => {
      const terrain = new Terrain(120, 120, 4);
      terrain.fillRect(0, 100, 120, 20);
      const emitter: EmitterDefinition = { x: 60, y: 20, material: 'sand', cellsPerSecond: 20, budget: 12 };
      const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
      for (let s = 0; s < 300; s += 1) sim.step(16);
      return Array.from({ length: terrain.cols * terrain.rows }, (_, i) =>
        terrain.getCell(i % terrain.cols, Math.floor(i / terrain.cols)),
      );
    };
    expect(build()).toEqual(build());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/emitters.test.ts`
Expected: FAIL — `emitters` does not exist on `SimulationState` / type errors.

- [ ] **Step 3: Add the types**

In `src/sim/types.ts`, after the `TrapState` interface add:

```ts
/**
 * A level-authored material spout: pours whole terrain cells at a fixed,
 * deterministic rate (no RNG — the seeded CA scatters the pile as it settles).
 */
export interface EmitterDefinition extends Point {
  material: 'sand' | 'water';
  /** Whole cells emitted per second while the spout cell is empty. */
  cellsPerSecond: number;
  /** Total cells this emitter may produce; it goes quiet at 0. */
  budget: number;
}

export interface EmitterState {
  def: EmitterDefinition;
  budgetLeft: number;
  /** Fractional cells accrued toward the next emission. */
  accumulatorCells: number;
}
```

In `LevelDefinition`, after `traps?: TrapDefinition[];` add:

```ts
  /** Material spouts (sand pours, springs). Empty/omitted means none. */
  emitters?: EmitterDefinition[];
```

In `SimulationState`, after `traps: TrapState[];` add:

```ts
  /** Live emitter states (parallel to level.emitters). */
  emitters: EmitterState[];
```

- [ ] **Step 4: Implement emitter stepping in the sim**

In `src/sim/GameSimulation.ts` constructor state object, after the `traps:` line add:

```ts
      emitters: (level.emitters ?? []).map((def) => ({ def, budgetLeft: def.budget, accumulatorCells: 0 })),
```

In `step()`, after `this.resolveBlockers();` and before the CA block add:

```ts
    this.stepEmitters(deltaMs);
```

Add the method (near `updateTraps`):

```ts
  /**
   * Level-authored spouts pour material on a plain accumulator — fully
   * deterministic, no RNG. An occupied spout cell blocks emission without
   * burning budget; the accumulator is clamped so a long blockage doesn't
   * burst-release when it clears.
   */
  private stepEmitters(deltaMs: number): void {
    const terrain = this.level.terrain;
    for (const emitter of this.state.emitters) {
      if (emitter.budgetLeft <= 0) continue;
      emitter.accumulatorCells += emitter.def.cellsPerSecond * (deltaMs / 1000);
      const cellX = Math.floor(emitter.def.x / terrain.cellSize);
      const cellY = Math.floor(emitter.def.y / terrain.cellSize);
      while (emitter.accumulatorCells >= 1 && emitter.budgetLeft > 0) {
        if (terrain.getCell(cellX, cellY) !== MATERIAL.empty) {
          emitter.accumulatorCells = Math.min(emitter.accumulatorCells, 1);
          break;
        }
        emitter.accumulatorCells -= 1;
        terrain.setCell(cellX, cellY, emitter.def.material === 'sand' ? MATERIAL.sand : MATERIAL.water);
        emitter.budgetLeft -= 1;
        this.ca?.markWorldRect(emitter.def.x - 8, emitter.def.y - 8, 16, 16);
      }
    }
  }
```

(`MATERIAL` is already imported in `GameSimulation.ts`.)

- [ ] **Step 5: Run the new tests**

Run: `npx vitest run test/emitters.test.ts`
Expected: 4 passing.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all pass (no level has emitters yet).

- [ ] **Step 7: Commit**

```bash
git add src/sim/types.ts src/sim/GameSimulation.ts test/emitters.test.ts
git commit -m "feat(sim): deterministic material emitters with budgets"
```

---

### Task 3: Emitter rendering (spout set-piece + drip)

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `SimulationState.emitters: EmitterState[]` (Task 2).

- [ ] **Step 1: Draw the spouts**

In `src/scenes/GameScene.ts`, add after `drawHazards()`:

```ts
  private drawEmitters(): void {
    const g = this.setpieceGraphics;
    for (const emitter of this.sim.state.emitters) {
      const { x, y, material } = emitter.def;
      const color = material === 'sand' ? 0xd4a84a : 0x3a9fd8;
      // Nozzle housing with a material-tinted lip.
      g.fillStyle(0x2c333f, 1);
      g.fillRect(x - 7, y - 12, 14, 8);
      g.fillStyle(color, 0.9);
      g.fillRect(x - 4, y - 5, 8, 3);
      // Falling drip while the emitter still has budget.
      if (emitter.budgetLeft > 0 && this.sim.state.outcome === 'running') {
        g.fillStyle(color, 0.8);
        g.fillRect(x - 1.5, y - 2 + ((this.sim.state.timeMs / 30) % 10), 3, 4);
      }
    }
  }
```

In `drawWorld()`, call it after `this.drawHazards();`:

```ts
    this.drawEmitters();
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean. (Visual check lands with Task 6, the first level that ships an emitter.)

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(render): emitter spout set-piece with drip"
```

---

### Task 4: Terrain toolbar + unified brush

**Files:**
- Modify: `src/ui/Hud.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces (used by GameScene + later manual tests):
  - `export type TerrainBrush = 'water' | 'sand' | 'dirt' | 'wood' | 'erase' | 'bomb'`
  - `export const TERRAIN_TOOLS: readonly { kind: TerrainBrush; label: string; hotkey: string; color: number; labOnly?: boolean }[]`
  - `HudEvents.onSelectBrush?: (kind: TerrainBrush) => void` (replaces `onSelectLandscape`)
  - `HudView.brush: TerrainBrush | null` and `HudView.hasTerrainTools: boolean` (replace `labBrush`/`landscapeBrush`)
  - `new Hud(events, audio?, opts?: { lab?: boolean })`

- [ ] **Step 1: Hud — tool registry and events**

In `src/ui/Hud.ts`, after the imports add:

```ts
/** Terrain paint tools — hotkeys mirror the skill row on the bottom letter row. */
export type TerrainBrush = 'water' | 'sand' | 'dirt' | 'wood' | 'erase' | 'bomb';

export const TERRAIN_TOOLS: readonly {
  kind: TerrainBrush;
  label: string;
  hotkey: string;
  color: number;
  labOnly?: boolean;
}[] = [
  { kind: 'water', label: 'Water', hotkey: 'z', color: 0x3a9fd8 },
  { kind: 'sand', label: 'Sand', hotkey: 'x', color: 0xd4a84a },
  { kind: 'dirt', label: 'Dirt', hotkey: 'c', color: 0x4d9674 },
  { kind: 'wood', label: 'Wood', hotkey: 'v', color: 0xa67c52 },
  { kind: 'erase', label: 'Erase', hotkey: 'b', color: 0x59617a },
  { kind: 'bomb', label: 'Bomb', hotkey: 'm', color: 0xff7a3a, labOnly: true },
] as const;
```

In `HudEvents`, replace:

```ts
  /** Select a landscape paint tool (campaign sandworld). */
  onSelectLandscape?: (kind: 'water' | 'sand' | 'dirt' | 'wood' | 'erase') => void;
```

with:

```ts
  /** Arm a terrain paint brush (campaign charges / Lab infinite). */
  onSelectBrush?: (kind: TerrainBrush) => void;
```

In `HudView`, replace `labBrush: string | null;` and `landscapeBrush: string | null;` with:

```ts
  /** Armed terrain brush, or null when assigning skills. */
  brush: TerrainBrush | null;
  /** Whether this level exposes the terrain toolbar at all. */
  hasTerrainTools: boolean;
```

- [ ] **Step 2: Hud — build the terrain bar in the constructor**

Add fields next to `skillButtons`:

```ts
  private readonly terrainButtons = new Map<TerrainBrush, HTMLButtonElement>();
  private readonly terrainBar: HTMLDivElement;
  private readonly lab: boolean;
```

Change the constructor signature:

```ts
  constructor(events: HudEvents, audio?: AudioSettings, opts?: { lab?: boolean }) {
```

and set `this.lab = opts?.lab ?? false;` right after `this.events = events;`.

After the skills/queue buttons are appended to `tools` (after `tools.append(queueBtn, unqueueBtn);`), build the terrain bar and insert it into the bottom bar between `tools` and `controls`:

```ts
    this.terrainBar = document.createElement('div');
    this.terrainBar.className = 'hud__tools hud__tools--terrain';
    for (const tool of TERRAIN_TOOLS) {
      if (tool.labOnly && !this.lab) continue;
      const button = document.createElement('button');
      button.className = 'hud__tool';
      button.type = 'button';
      button.title = `${tool.label} (${tool.hotkey.toUpperCase()})`;
      button.setAttribute('aria-label', tool.label);
      button.innerHTML =
        `<span class="hud__hotkey">${tool.hotkey.toUpperCase()}</span>` +
        `<span class="hud__swatch"></span>` +
        `<span class="hud__tool-name">${tool.label}</span>` +
        `<span class="hud__stock">0</span>`;
      (button.querySelector('.hud__swatch') as HTMLSpanElement).style.background =
        `#${tool.color.toString(16).padStart(6, '0')}`;
      button.addEventListener('click', () => events.onSelectBrush?.(tool.kind));
      this.terrainBar.append(button);
      this.terrainButtons.set(tool.kind, button);
    }
    bar.append(tools, this.terrainBar, controls);
```

(This replaces the existing `bar.append(tools, controls);` line.)

Delete the old floating landscape bar: remove the `landscapeBar` field, its creation block (`this.landscapeBar = document.createElement('div'); ...`), and its whole update block in `update()` (the `// Landscape tools (campaign charges)` section).

- [ ] **Step 3: Hud — update() and notices**

In `update()`, change the skill-button active check to use the brush:

```ts
      button.classList.toggle('is-active', skill === state.selectedSkill && !view.brush);
```

Where the old landscape block was, add:

```ts
    // Terrain toolbar (campaign charges / Lab infinite)
    this.terrainBar.hidden = !view.hasTerrainTools;
    if (view.hasTerrainTools) {
      for (const [kind, button] of this.terrainButtons) {
        const stockEl = button.querySelector('.hud__stock');
        const infinite = this.lab || kind === 'bomb';
        const stock = kind === 'bomb' ? 0 : state.landscape[kind];
        if (stockEl) stockEl.textContent = infinite ? '∞' : String(stock);
        button.classList.toggle('is-active', view.brush === kind);
        button.disabled = !running || (!infinite && stock <= 0);
      }
    }
```

Replace `noticeText`'s `labBrush`/`landscapeBrush` branches with:

```ts
    if (view.brush) {
      const tool = TERRAIN_TOOLS.find((t) => t.kind === view.brush);
      if (view.brush === 'bomb') return 'Bomb (M) — click to blast · Esc skills';
      const stock = this.lab ? '∞' : String(state.landscape[view.brush]);
      return `${tool?.label ?? view.brush} ×${stock} — click/drag to paint · Esc skills`;
    }
```

- [ ] **Step 4: GameScene — one brush to rule them all**

In `src/scenes/GameScene.ts`:

Replace the import line for the Hud:

```ts
import { Hud, TERRAIN_TOOLS, type TerrainBrush } from '../ui/Hud';
```

Delete `type LabBrush = ...` and the fields `labBrush`, `labPainting`, `landscapeBrush`; add:

```ts
  private brush: TerrainBrush | null = null;
  private painting = false;
```

Replace the whole left-button `pointerdown` body (capture `this.brush` in a
local — TS won't narrow the mutable property across the checks):

```ts
      if (pointer.button !== 0) return;
      const brush = this.brush;
      if (brush === 'bomb') {
        this.applyBomb(pointer.worldX, pointer.worldY);
        return;
      }
      if (brush) {
        this.painting = true;
        this.sim.paintLandscape(pointer.worldX, pointer.worldY, 16, brush);
        return;
      }
      this.assignSelectedSkill(pointer.worldX, pointer.worldY);
```

`pointerup` sets `this.painting = false;`. The `pointermove` paint branch becomes:

```ts
      const brush = this.brush;
      if (this.painting && pointer.isDown && brush && brush !== 'bomb') {
        this.sim.paintLandscape(pointer.worldX, pointer.worldY, 16, brush);
      }
```

Replace `applyLabBrush` entirely with:

```ts
  private applyBomb(worldX: number, worldY: number): void {
    if (!this.sim || this.sim.state.outcome !== 'running') return;
    this.sim.labBomb(worldX, worldY, 28);
    this.sfx.play('explode');
    this.particles.burst(worldX, worldY, 20, { color: [0xff7a3a, 0xffd96b, 0xd4a84a], speed: 0.2, lifeMs: 700, size: 2.5 });
    this.addShake(6);
  }
```

In `startLevel()`, replace `this.landscapeBrush = null;` with:

```ts
    this.brush = this.isLab() ? 'sand' : null;
    this.painting = false;
```

Hud construction gains the lab flag and the new event, replacing `onSelectLandscape`:

```ts
    this.hud = new Hud({
      onSelectSkill: (skill) => {
        this.brush = null;
        this.selectSkill(skill);
      },
      ...
      onSelectBrush: (kind) => {
        this.brush = kind;
      },
      ...
    }, this.audioSettings, { lab: this.isLab() });
```

In `hudView()`, replace the `labBrush`/`landscapeBrush` lines with:

```ts
      brush: this.brush,
      hasTerrainTools: this.isLab() || Object.values(this.level.landscape ?? {}).some((n) => (n ?? 0) > 0),
```

- [ ] **Step 5: GameScene — hotkeys and Esc**

In `installKeyboard()`, delete the whole `if (this.isLab()) { key '1'..'6' ... }` block, and make the `q`/`backspace` branches unconditional (they already early-return). Remove the `!this.isLab()` guard on the skill-hotkey branch so 1–8 assign skills in the Lab too:

```ts
      const skill = ALL_SKILLS.find((s) => SKILL_DEFS[s].hotkey === key);
      if (skill) {
        this.brush = null;
        this.selectSkill(skill);
        return;
      }
```

Before the skill-hotkey lookup, add terrain hotkeys:

```ts
      const tool = TERRAIN_TOOLS.find((t) => t.hotkey === key);
      if (tool && (!tool.labOnly || this.isLab())) {
        const stock = tool.kind === 'bomb' ? (this.isLab() ? 1 : 0) : this.sim.state.landscape[tool.kind];
        if (this.isLab() || stock > 0) {
          this.brush = tool.kind;
          return;
        }
      }
```

Change the Esc branch so campaign Esc disarms the brush first:

```ts
      } else if (key === 'escape' && !this.selectOpen) {
        if (this.brush && !this.isLab()) {
          this.brush = null;
          return;
        }
        this.openLevelSelect();
      }
```

- [ ] **Step 6: GameScene — brush cursor ring**

Add a method and call it in `drawWorld()` right after `this.particles.draw(this.fxGraphics);`:

```ts
  /** Tinted ring at the pointer while a terrain brush is armed. */
  private drawBrushCursor(): void {
    if (!this.brush || this.selectOpen) return;
    const tool = TERRAIN_TOOLS.find((t) => t.kind === this.brush);
    if (!tool) return;
    const pointer = this.input.activePointer;
    const radius = this.brush === 'bomb' ? 28 : 16;
    const g = this.fxGraphics;
    g.fillStyle(tool.color, 0.08);
    g.fillCircle(pointer.worldX, pointer.worldY, radius);
    g.lineStyle(1.5, tool.color, 0.85);
    g.strokeCircle(pointer.worldX, pointer.worldY, radius);
  }
```

- [ ] **Step 7: CSS**

In `src/styles.css`, delete the `.hud__landscape` and `.hud__landscape .hud__btn.is-active` blocks (lines ~133–145) and add near `.hud__tools`:

```css
.hud__tools--terrain {
  padding-left: 10px;
  border-left: 1px solid var(--stroke);
}

.hud__swatch {
  width: 16px;
  height: 9px;
  border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22) inset;
}
```

- [ ] **Step 8: Verify**

Run: `npm test` — Expected: all pass.
Run: `npm run build` — Expected: clean.
Manual (`npm run dev`): Level 2 shows the terrain bar (Water 3); Z arms water, ring cursor follows pointer, dragging floods, Esc returns to skills. Level 1 shows no terrain bar. Sand Lab: bar shows all six tools with ∞, skills 1–8 assign, M+click blasts.

- [ ] **Step 9: Commit**

```bash
git add src/ui/Hud.ts src/scenes/GameScene.ts src/styles.css
git commit -m "feat(ui): terrain toolbar with Z/X/C/V/B hotkeys, unified Lab brush"
```

---

### Task 5: Level 3 retrofit — sand-ramp alternate solution

**Files:**
- Modify: `src/levels/level3.ts`
- Modify: `test/levels.test.ts`

**Interfaces:**
- Consumes: `paintLandscape(x, y, r, kind)` (existing sim API), `landscape` level field.

- [ ] **Step 1: Add the failing solvability script**

In `test/levels.test.ts`, after the existing level 3 test add:

```ts
  it('level 3 (Hold the Line) — sand charges ramp the wall, no lives spent', () => {
    let poured = 0;
    const sim = run(2, (s) => {
      if (poured < 3 && s.state.timeMs > 1200 + poured * 400) {
        if (s.paintLandscape(564, 392, 16, 'sand')) poured += 1;
      }
    });
    expectWon(sim);
    expect(sim.state.lost).toBe(0);
  });
```

Run: `npx vitest run test/levels.test.ts -t "sand charges ramp"`
Expected: FAIL (no sand charges on the level yet, `paintLandscape` returns false).

- [ ] **Step 2: Grant the charges**

In `src/levels/level3.ts`, after `sandEmitRatio: 0.55,` add:

```ts
    landscape: { sand: 3 },
```

Update the level doc comment to mention the alternate route:

```ts
/**
 * Level 3 — "Hold the Line".
 * Plant a blocker at the wall face and arm a bomber — the crater sprays sand
 * debris that settles. Teaches blocker + bomber (and that bombers cost lives).
 * Alternate: three landscape sand charges poured on the wall settle into a
 * walkable ramp — nobody dies.
 */
```

- [ ] **Step 3: Run and tune**

Run: `npx vitest run test/levels.test.ts -t "level 3"`
Expected: both level 3 tests pass. If the ramp script fails, tune in this order: paint point (`564, 392` → try `552, 400` for a west-side bias), then charges (3 → 4). The wall is at x 560–568, y 400–430; floor top is 430; walkers climb ≤7px steps and settled sand slopes are 6px (one cell) — the pile only needs to reach the wall top.

- [ ] **Step 4: Full suite + commit**

Run: `npm test` — Expected: all pass.

```bash
git add src/levels/level3.ts test/levels.test.ts
git commit -m "feat(levels): level 3 sand charges enable a no-loss ramp route"
```

---

### Task 6: Level 5 retrofit — sand emitter above the steel cap

**Files:**
- Modify: `src/levels/level5.ts`
- Modify: `test/levels.test.ts` (only if tuning is needed — the existing guard must stay green)

**Interfaces:**
- Consumes: `EmitterDefinition` (Task 2).

- [ ] **Step 1: Add the emitter**

In `src/levels/level5.ts`, after the `caSeed: 55,` line add:

```ts
    emitters: [{ x: 700, y: 300, material: 'sand', cellsPerSecond: 5, budget: 200 }],
```

Update the doc comment:

```ts
 * A spout above the steel wall trickles sand that piles around the cap —
 * the living-terrain pressure that makes dig timing matter.
```

- [ ] **Step 2: Existing guard must still pass**

Run: `npx vitest run test/levels.test.ts -t "level 5"`
Expected: PASS. If the pile blocks the dig route, tune: lower `budget` (200 → 120), lower `cellsPerSecond` (5 → 3), or move the spout east onto the cap side (`x: 700` → `x: 744`). Do NOT move the scripted dig window; the emitter must never soft-lock the intended route.

- [ ] **Step 3: Visual check**

`npm run dev` → level 5: spout visible above the wall, sand trickles and piles; emitter goes quiet after its budget.

- [ ] **Step 4: Full suite + commit**

Run: `npm test` — Expected: all pass.

```bash
git add src/levels/level5.ts test/levels.test.ts
git commit -m "feat(levels): level 5 sand emitter pressures the dig route"
```

---

### Task 7: Level 6 retrofit — bury the crusher

**Files:**
- Modify: `src/levels/level6.ts`
- Modify: `test/levels.test.ts`

- [ ] **Step 1: Add the failing bury script**

After the existing level 6 test add:

```ts
  it('level 6 (Trap House) — bury the crusher in sand and walk over it', () => {
    let poured = 0;
    const sim = run(5, (s) => {
      if (poured < 3 && s.state.timeMs > 1000 + poured * 400) {
        if (s.paintLandscape(507, 408, 16, 'sand')) poured += 1;
      }
    });
    expectWon(sim);
  });
```

Run: `npx vitest run test/levels.test.ts -t "bury the crusher"`
Expected: FAIL (no charges yet).

- [ ] **Step 2: Grant the charges**

In `src/levels/level6.ts`, after the `traps:` array add:

```ts
    landscape: { sand: 3 },
    caSeed: 66,
```

Doc comment addition: `Three sand charges can bury a machine outright — the mound carries the crew above its trigger box.`

- [ ] **Step 3: Run and tune**

Run: `npx vitest run test/levels.test.ts -t "level 6"`
Expected: both level 6 tests pass. The crusher trigger box is x 500–514, y 402–430; a lemming dies if its feet (`y+14`) are ≥ 402 while its x is within 496–518. The mound must therefore be ≥ 28px tall across that whole band. Tuning order: stagger the three pours across the box (`500, 507, 514`), then add a fourth charge.

- [ ] **Step 4: Full suite + commit**

Run: `npm test` — Expected: all pass.

```bash
git add src/levels/level6.ts test/levels.test.ts
git commit -m "feat(levels): level 6 sand charges can bury the crusher"
```

---

### Task 8: Level 8 retrofit — mountain sand pour

**Files:**
- Modify: `src/levels/level8.ts`

- [ ] **Step 1: Add the emitter**

In `src/levels/level8.ts`, after the `timeLimitMs` line add:

```ts
    caSeed: 88,
    emitters: [{ x: 900, y: 140, material: 'sand', cellsPerSecond: 5, budget: 200 }],
```

Doc comment addition: `A high spout dusts the massif with sand while the miner works below.`

- [ ] **Step 2: Existing guard must still pass**

Run: `npx vitest run test/levels.test.ts -t "level 8"`
Expected: PASS (the pile forms on the mountain top at x≈900, far past the mine point at x≈440 and above the tunnel). If red, reduce budget or move the spout right.

- [ ] **Step 3: Full suite + commit**

Run: `npm test` — Expected: all pass.

```bash
git add src/levels/level8.ts
git commit -m "feat(levels): level 8 sand pour over the massif"
```

---

### Task 9: Level 10 retrofit — full-toolkit finale

**Files:**
- Modify: `src/levels/level10.ts`

- [ ] **Step 1: Widen the landscape spread and add the dune spout**

In `src/levels/level10.ts` replace:

```ts
    landscape: { water: 6 },
```

with:

```ts
    landscape: { water: 6, sand: 4, dirt: 2, wood: 2 },
    emitters: [{ x: 2200, y: 250, material: 'sand', cellsPerSecond: 5, budget: 200 }],
```

Doc comment addition: `Every terrain tool is stocked, and a spout builds a dune on the east slab the crew must cross.`

- [ ] **Step 2: Existing guard must still pass**

Run: `npx vitest run test/levels.test.ts -t "level 10"`
Expected: PASS — settled sand slopes are one cell (6px) ≤ the 7px step height, so the crew walks over the dune to the dig point at x≈2310. If red, reduce the budget (200 → 120) or move the spout to `x: 2150` so the dune's east foot stays clear of the 2290–2330 dig window.

- [ ] **Step 3: Full suite + commit**

Run: `npm test` — Expected: all pass.

```bash
git add src/levels/level10.ts
git commit -m "feat(levels): level 10 full terrain spread plus dune spout"
```

---

### Task 10: Docs + final verification

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README**

In "How to play", replace the landscape-paint bullet with:

```markdown
- **Terrain toolbar** — when a level has charges (or always, in the Lab), the
  second toolbar paints the living world: **Z** water · **X** sand · **C** dirt ·
  **V** wood · **B** erase (Lab adds **M** bomb). Drag to pour; Esc returns to
  skills. Some levels also have **emitters** — spouts that pour sand or water
  on their own until their budget runs dry.
```

Replace the Sand Lab key table with:

```markdown
| Key | Tool |
|:---:|------|
| Z/X/C/V/B | Paint water / sand / dirt / wood / erase |
| M | Bomb |
| 1–8 | Skills (click a lemming to assign) |
```

Update the campaign roster rows for 3, 5, 6, 8, 10 to mention their new beats (sand ramp, sand spout, bury-the-trap, mountain pour, full spread + dune).

- [ ] **Step 2: CLAUDE.md**

In "Important APIs" add:

```markdown
- `level.emitters` — deterministic material spouts (`EmitterDefinition`:
  x/y/material/cellsPerSecond/budget), stepped between agents and the CA settle.
  State in `state.emitters`; blocked spouts don't burn budget.
```

Update the campaign roster table rows for 3/5/6/8/10 and the landscape-paint bullet to mention the terrain toolbar hotkeys (Z/X/C/V/B, Lab M).

- [ ] **Step 3: Full verification**

Run: `npm test` — Expected: all pass (old guards + 2 new level scripts + 4 emitter tests).
Run: `npm run build` — Expected: clean.
Manual sweep in `npm run dev`: L1 (grounded sprites, no terrain bar), L2 (bar + water), L3 (sand ramp), L5/L8/L10 (spouts), L6 (bury), Sand Lab (unified bar, skills 1–8, M bomb).

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: terrain toolbar, emitters, retrofit level beats"
```
