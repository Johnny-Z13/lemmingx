import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { ChunkedTerrainRenderer, drawTerrain } from '../src/render/TerrainRenderer';
import { MATERIAL, Terrain } from '../src/sim/Terrain';

class FakeGraphics {
  clears = 0;
  destroyed = false;
  readonly rects: Array<{ x: number; y: number; width: number; height: number }> = [];
  readonly triangles: Array<{ x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }> = [];

  setDepth(): this { return this; }
  clear(): this { this.clears += 1; this.rects.length = 0; this.triangles.length = 0; return this; }
  fillStyle(): this { return this; }
  fillRect(x: number, y: number, width: number, height: number): this {
    this.rects.push({ x, y, width, height });
    return this;
  }
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this {
    this.triangles.push({ x1, y1, x2, y2, x3, y3 });
    return this;
  }
  destroy(): void { this.destroyed = true; }
}

function sceneHarness(): { scene: Phaser.Scene; graphics: FakeGraphics[] } {
  const graphics: FakeGraphics[] = [];
  const scene = {
    add: {
      graphics: () => {
        const item = new FakeGraphics();
        graphics.push(item);
        return item;
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, graphics };
}

describe('ChunkedTerrainRenderer', () => {
  it('redraws only changed chunks and keeps static chunks cached', () => {
    const terrain = new Terrain(512, 128, 4);
    terrain.fillRect(0, 96, 512, 32);
    const { scene, graphics } = sceneHarness();
    const renderer = new ChunkedTerrainRenderer(scene);

    expect(renderer.render(terrain, 0)).toMatchObject({ redrawnChunks: 4, totalChunks: 4 });
    expect(renderer.render(terrain, 50)).toMatchObject({ redrawnChunks: 0, totalChunks: 4 });

    terrain.setCell(10, 10, MATERIAL.sand);
    expect(renderer.render(terrain, 60)).toMatchObject({ redrawnChunks: 1, totalChunks: 4 });
    expect(graphics.map(({ clears }) => clears).reduce((sum, count) => sum + count, 0)).toBe(5);

    renderer.clear();
    expect(graphics.every(({ destroyed }) => destroyed)).toBe(true);
  });

  it('refreshes only chunks containing animated water or fire on visual ticks', () => {
    const terrain = new Terrain(512, 128, 4);
    terrain.fillRect(0, 96, 512, 32);
    terrain.setCell(10, 10, MATERIAL.water);
    const { scene } = sceneHarness();
    const renderer = new ChunkedTerrainRenderer(scene);

    expect(renderer.render(terrain, 0)).toMatchObject({ redrawnChunks: 4, animatedChunks: 1 });
    expect(renderer.render(terrain, 50)).toMatchObject({ redrawnChunks: 0, animatedChunks: 1 });
    expect(renderer.render(terrain, 120)).toMatchObject({ redrawnChunks: 1, animatedChunks: 1 });
  });

  it('keeps cell decoration inside authoritative material bounds', () => {
    const terrain = new Terrain(12, 12, 4);
    terrain.setCell(1, 1, MATERIAL.dirt);
    const graphics = new FakeGraphics();

    drawTerrain(graphics as unknown as Phaser.GameObjects.Graphics, terrain, 0);

    expect(graphics.rects.length).toBeGreaterThan(0);
    expect(graphics.rects.every(({ x, y, width, height }) => (
      x >= 4 && y >= 4 && x + width <= 8 && y + height <= 8
    ))).toBe(true);
  });

  it('keeps every material primitive inside 1px, 2px, and 3px partial edge cells', () => {
    const materials = [
      MATERIAL.dirt,
      MATERIAL.steel,
      MATERIAL.oneWayLeft,
      MATERIAL.oneWayRight,
      MATERIAL.sand,
      MATERIAL.water,
      MATERIAL.wood,
      MATERIAL.fire,
    ];

    for (const remainder of [1, 2, 3]) {
      const edge = 8 + remainder;
      for (const material of materials) {
        for (const timeMs of material === MATERIAL.water ? [0, 220] : [0]) {
          const terrain = new Terrain(edge, edge, 4);
          terrain.setCell(2, 2, material);
          const graphics = new FakeGraphics();

          drawTerrain(graphics as unknown as Phaser.GameObjects.Graphics, terrain, timeMs);

          expect(graphics.rects.length).toBeGreaterThan(0);
          expect(graphics.rects.every(({ x, y, width, height }) => (
            x >= 8 && y >= 8 && x + width <= edge && y + height <= edge
          ))).toBe(true);
          expect(graphics.triangles.every(({ x1, y1, x2, y2, x3, y3 }) => (
            [x1, x2, x3].every((x) => x >= 8 && x <= edge) &&
            [y1, y2, y3].every((y) => y >= 8 && y <= edge)
          ))).toBe(true);
        }
      }
    }
  });

  it('emits a deterministic practical light for even a single live fire cell', () => {
    const terrain = new Terrain(12, 12, 4);
    terrain.setCell(1, 1, MATERIAL.fire);
    const graphics = new FakeGraphics();

    const result = drawTerrain(graphics as unknown as Phaser.GameObjects.Graphics, terrain, 0);

    expect(result.fireLights).toHaveLength(1);
    expect(result.fireLights[0]).toMatchObject({ x: 6, y: 6, radius: 34 });
  });

  it('removes fire geometry and its fallback light after authoritative erase', () => {
    const terrain = new Terrain(12, 12, 4);
    terrain.setCell(1, 1, MATERIAL.fire);
    const graphics = new FakeGraphics();

    expect(drawTerrain(graphics as unknown as Phaser.GameObjects.Graphics, terrain, 0).fireLights).toHaveLength(1);
    expect(graphics.rects.length).toBeGreaterThan(0);

    terrain.setCell(1, 1, MATERIAL.empty);
    const erased = drawTerrain(graphics as unknown as Phaser.GameObjects.Graphics, terrain, 120);

    expect(erased.fireLights).toHaveLength(0);
    expect(graphics.rects).toHaveLength(0);
  });

  it('clears cached fire geometry, animation, and light state after authoritative erase', () => {
    const terrain = new Terrain(12, 12, 4);
    terrain.setCell(1, 1, MATERIAL.fire);
    const { scene, graphics } = sceneHarness();
    const renderer = new ChunkedTerrainRenderer(scene);

    expect(renderer.render(terrain, 0)).toMatchObject({
      fireLights: [{ x: 6, y: 6, radius: 34 }],
      redrawnChunks: 1,
      animatedChunks: 1,
    });
    expect(graphics[0].rects.length).toBeGreaterThan(0);

    terrain.setCell(1, 1, MATERIAL.empty);
    expect(renderer.render(terrain, 120)).toMatchObject({
      fireLights: [],
      redrawnChunks: 1,
      animatedChunks: 0,
    });
    expect(graphics[0].rects).toHaveLength(0);
    expect(graphics[0].triangles).toHaveLength(0);
  });
});
