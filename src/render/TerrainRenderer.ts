import type Phaser from 'phaser';
import { MATERIAL, type Terrain } from '../sim/Terrain';
import { isVisualSurface, visualHash, WORLD_THEME } from './visualTheme';
import type { WorldLightSource } from './WorldLights';

export interface TerrainRenderResult {
  fireLights: WorldLightSource[];
}

/**
 * Draw the mutable material grid with a richer pixel cross-section treatment.
 * All variation derives from cell coordinates, keeping redraws stable without
 * advancing either deterministic simulation RNG stream.
 */
export function drawTerrain(
  graphics: Phaser.GameObjects.Graphics,
  terrain: Terrain,
  timeMs: number,
): TerrainRenderResult {
  graphics.clear();
  const fireLights: WorldLightSource[] = [];
  const cellSize = terrain.cellSize;

  terrain.forEachSolidCell((x, y, width, height, material) => {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const above = terrain.getCell(cellX, cellY - 1);
    const exposed = isVisualSurface(above);
    const hash = visualHash(cellX, cellY);

    if (material === MATERIAL.steel) {
      graphics.fillStyle(hash % 5 === 0 ? WORLD_THEME.steelLight : WORLD_THEME.steel, 1);
      graphics.fillRect(x, y, width, height);
      graphics.fillStyle(WORLD_THEME.steelDark, 1);
      if (cellX % 4 === 0) graphics.fillRect(x, y, 1, height);
      if (cellY % 4 === 3) graphics.fillRect(x, y + height - 1, width, 1);
      if (hash % 9 === 0) {
        graphics.fillStyle(WORLD_THEME.steelLight, 0.95);
        graphics.fillRect(x + 1, y + 1, 1, 1);
      }
      return;
    }

    if (material === MATERIAL.sand) {
      const color = hash % 4 === 0
        ? WORLD_THEME.sandLight
        : hash % 3 === 0
          ? WORLD_THEME.sandDark
          : WORLD_THEME.sand;
      graphics.fillStyle(color, 1);
      graphics.fillRect(x, y, width, height);
      if (exposed) {
        graphics.fillStyle(WORLD_THEME.sandLight, 0.9);
        graphics.fillRect(x, y, width, 1);
      }
      return;
    }

    if (material === MATERIAL.wood) {
      graphics.fillStyle(hash % 6 === 0 ? WORLD_THEME.woodLight : WORLD_THEME.wood, 1);
      graphics.fillRect(x, y, width, height);
      graphics.fillStyle(WORLD_THEME.woodDark, 0.95);
      if (cellY % 3 === 2) graphics.fillRect(x, y + height - 1, width, 1);
      if (cellX % 5 === 0) graphics.fillRect(x, y, 1, height);
      if (exposed) {
        graphics.fillStyle(WORLD_THEME.woodLight, 0.9);
        graphics.fillRect(x, y, width, 1);
      }
      return;
    }

    if (material === MATERIAL.fire) {
      const flicker = (cellX + cellY + Math.floor(timeMs / 80)) % 3;
      graphics.fillStyle(flicker === 0 ? WORLD_THEME.fireHot : flicker === 1 ? WORLD_THEME.fire : 0xff3d21, 0.98);
      graphics.fillRect(x, y, width, height);
      graphics.fillStyle(0xfff2b0, 0.8);
      graphics.fillRect(x + 1, y, Math.max(1, width - 2), Math.max(1, height / 2));
      if (fireLights.length < 18 && hash % 13 === 0) {
        fireLights.push({ x: x + width / 2, y: y + height / 2, color: WORLD_THEME.fire, radius: 34, strength: 0.7 });
      }
      return;
    }

    if (material === MATERIAL.water) {
      graphics.fillStyle(hash % 5 === 0 ? WORLD_THEME.water : WORLD_THEME.waterDeep, 0.94);
      graphics.fillRect(x, y, width, height);
      if (above !== MATERIAL.water) {
        graphics.fillStyle(WORLD_THEME.waterLight, 0.8);
        graphics.fillRect(x, y, width, Math.max(1, height / 3));
      } else if (hash % 7 === 0) {
        graphics.fillStyle(WORLD_THEME.water, 0.45);
        graphics.fillRect(x, y, 1, height);
      }
      return;
    }

    const depth = y / terrain.height;
    const base = depth > 0.78 ? WORLD_THEME.dirtDeep : WORLD_THEME.dirt;
    graphics.fillStyle(hash % 8 === 0 ? WORLD_THEME.dirtSpeck : base, 1);
    graphics.fillRect(x, y, width, height);

    if (exposed) {
      graphics.fillStyle(hash % 4 === 0 ? WORLD_THEME.mossLight : WORLD_THEME.moss, 1);
      graphics.fillRect(x, y, width, Math.max(1, height / 2));
      if (hash % 11 === 0) {
        graphics.fillStyle(WORLD_THEME.mossLight, 0.95);
        graphics.fillRect(x + (hash % Math.max(1, width)), y - 2, 1, 2);
      }
    }

    if (material === MATERIAL.oneWayLeft || material === MATERIAL.oneWayRight) {
      const direction = material === MATERIAL.oneWayRight ? 1 : -1;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      graphics.fillStyle(WORLD_THEME.sandLight, 0.72);
      graphics.fillTriangle(
        centerX - direction * (width / 4), y + 1,
        centerX - direction * (width / 4), y + height - 1,
        centerX + direction * (width / 3), centerY,
      );
    }
  });

  return { fireLights };
}
