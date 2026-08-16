import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  drawWorldLights,
  MAX_WORLD_LIGHT_RADIUS,
  MAX_WORLD_LIGHT_SOURCES,
  WORLD_LIGHT_FILLS_PER_SOURCE,
} from '../src/render/WorldLights';

class FakeGraphics {
  clears = 0;
  readonly circles: Array<{ x: number; y: number; radius: number }> = [];
  readonly ellipses: Array<{ x: number; y: number; width: number; height: number }> = [];

  clear(): this { this.clears += 1; return this; }
  fillStyle(): this { return this; }
  fillCircle(x: number, y: number, radius: number): this {
    this.circles.push({ x, y, radius });
    return this;
  }
  fillEllipse(x: number, y: number, width: number, height: number): this {
    this.ellipses.push({ x, y, width, height });
    return this;
  }
}

describe('drawWorldLights', () => {
  it('keeps the practical-light batch inside its mobile fill and radius budget', () => {
    const graphics = new FakeGraphics();
    const sources = Array.from({ length: 40 }, (_, index) => ({
      x: index * 4,
      y: 100,
      color: 0xffaa33,
      radius: 140,
      strength: 1,
    }));

    drawWorldLights(graphics as unknown as Phaser.GameObjects.Graphics, sources, 0);

    expect(graphics.clears).toBe(1);
    expect(graphics.circles.length + graphics.ellipses.length).toBe(
      MAX_WORLD_LIGHT_SOURCES * WORLD_LIGHT_FILLS_PER_SOURCE,
    );
    expect(graphics.ellipses).toHaveLength(MAX_WORLD_LIGHT_SOURCES * 2);
    expect(graphics.circles).toHaveLength(MAX_WORLD_LIGHT_SOURCES);
    expect(Math.max(...graphics.circles.map(({ radius }) => radius))).toBeLessThanOrEqual(MAX_WORLD_LIGHT_RADIUS);
    expect(Math.max(...graphics.ellipses.map(({ width }) => width / 2))).toBeLessThanOrEqual(MAX_WORLD_LIGHT_RADIUS);
    expect(new Set([...graphics.circles, ...graphics.ellipses].map(({ x }) => x))).toHaveLength(MAX_WORLD_LIGHT_SOURCES);
  });
});
