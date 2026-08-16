import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { drawEmitterSetpieces, drawExitSetpiece, drawHatchSetpiece, drawHazardSetpieces, drawTrapSetpieces } from '../src/render/WorldSetpieces';
import type { EmitterState, TrapState } from '../src/sim/types';

class FakeGraphics {
  readonly rects: Array<{ x: number; y: number; width: number; height: number }> = [];
  readonly triangles: number[][] = [];
  readonly lines: number[][] = [];

  fillStyle(): this { return this; }
  lineStyle(): this { return this; }
  fillRect(x: number, y: number, width: number, height: number): this {
    this.rects.push({ x, y, width, height });
    return this;
  }
  fillTriangle(...points: number[]): this { this.triangles.push(points); return this; }
  lineBetween(...points: number[]): this { this.lines.push(points); return this; }
  fillCircle(): this { return this; }
  fillRoundedRect(x: number, y: number, width: number, height: number): this {
    return this.fillRect(x, y, width, height);
  }
  strokeRoundedRect(): this { return this; }
  strokeRect(): this { return this; }
}

function graphics(): { fake: FakeGraphics; phaser: Phaser.GameObjects.Graphics } {
  const fake = new FakeGraphics();
  return { fake, phaser: fake as unknown as Phaser.GameObjects.Graphics };
}

describe('WorldSetpieces', () => {
  it('keeps the hatch and exit apertures open while building readable surrounds', () => {
    const hatch = graphics();
    drawHatchSetpiece(hatch.phaser, {
      spawn: { x: 100, y: 200 },
      planning: false,
      hatchOpenMs: 0,
      hatchTotalMs: 1000,
      timeMs: 0,
    });
    expect(hatch.fake.rects.some(({ width, height }) => width >= 74 && height >= 46)).toBe(true);
    const closedHatch = graphics();
    drawHatchSetpiece(closedHatch.phaser, {
      spawn: { x: 100, y: 200 },
      planning: true,
      hatchOpenMs: 0,
      hatchTotalMs: 0,
      timeMs: 0,
    });
    expect(closedHatch.fake.rects.length).toBeGreaterThan(hatch.fake.rects.length);

    const exit = graphics();
    drawExitSetpiece(exit.phaser, {
      exit: { x: 300, y: 180, width: 40, height: 44 },
      powered: true,
      saved: 3,
      targetSaved: 6,
      timeMs: 0,
    });
    expect(exit.fake.rects.some(({ x, y, width, height }) => x === 300 && y === 180 && width === 40 && height === 44)).toBe(false);
    expect(exit.fake.lines.length).toBeGreaterThan(4);
  });

  it('enlarges trap warnings above each trigger without widening floor contact', () => {
    for (const kind of ['crusher', 'zapper', 'chomper'] as const) {
      const trap: TrapState = {
        def: { x: 100, y: 200, width: 14, height: 28, kind, cycleMs: 1400 },
        phase: 'idle',
        timerMs: 0,
      };
      const { fake, phaser } = graphics();
      drawTrapSetpieces(phaser, [trap], 0);

      expect(fake.rects).toContainEqual({ x: 89, y: 186, width: 36, height: 5 });
      const routeRects = fake.rects.filter(({ y }) => y >= trap.def.y);
      expect(routeRects.every(({ x, width }) => x >= 97 && x + width <= 117)).toBe(true);
    }
  });

  it('keeps hazard body and warning lip on the authored death-zone width', () => {
    const { fake, phaser } = graphics();
    drawHazardSetpieces(phaser, [{ x: 50, y: 80, width: 127, height: 40, kind: 'lava' }], 0);
    expect(fake.rects[0]).toEqual({ x: 50, y: 80, width: 127, height: 40 });
    expect(fake.rects.every(({ x, width }) => x >= 50 && x + width <= 177)).toBe(true);
    expect(fake.triangles.every((points) => [points[0], points[2], points[4]].every((x) => x >= 50 && x <= 177))).toBe(true);
    expect(fake.lines).toContainEqual([50, 80, 177, 80]);
  });

  it('shows flow only for an active, advancing emitter with a clear spout', () => {
    const emitter: EmitterState = {
      def: { x: 100, y: 200, material: 'water', cellsPerSecond: 4, budget: 20 },
      active: true,
      budgetLeft: 10,
      accumulatorCells: 0,
    };
    const hasDrip = (state: EmitterState, advancing: boolean, clear: boolean): boolean => {
      const { fake, phaser } = graphics();
      drawEmitterSetpieces(phaser, [state], 0, advancing, () => clear);
      return fake.rects.some(({ x, width, height }) => x === 98.5 && width === 3 && height === 4);
    };

    expect(hasDrip(emitter, true, true)).toBe(true);
    expect(hasDrip(emitter, false, true)).toBe(false);
    expect(hasDrip({ ...emitter, active: false }, true, true)).toBe(false);
    expect(hasDrip(emitter, true, false)).toBe(false);
  });
});
