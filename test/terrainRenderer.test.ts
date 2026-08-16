import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { ChunkedTerrainRenderer } from '../src/render/TerrainRenderer';
import { MATERIAL, Terrain } from '../src/sim/Terrain';

class FakeGraphics {
  clears = 0;
  destroyed = false;

  setDepth(): this { return this; }
  clear(): this { this.clears += 1; return this; }
  fillStyle(): this { return this; }
  fillRect(): this { return this; }
  fillTriangle(): this { return this; }
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
});
