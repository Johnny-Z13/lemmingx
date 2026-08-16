import type Phaser from 'phaser';
import { MATERIAL, type Material, type Terrain, type TerrainDirtyChunk } from '../sim/Terrain';
import { isVisualSurface, visualHash, WORLD_THEME } from './visualTheme';
import type { WorldLightSource } from './WorldLights';

const MATERIAL_ANIMATION_MS = 110;
const MAX_FIRE_LIGHTS = 18;

export interface TerrainRenderResult {
  fireLights: WorldLightSource[];
  redrawnChunks: number;
  totalChunks: number;
  animatedChunks: number;
}

interface TerrainChunkRecord {
  chunk: TerrainDirtyChunk;
  graphics: Phaser.GameObjects.Graphics;
  animated: boolean;
  fireLights: WorldLightSource[];
}

interface ChunkDrawResult {
  animated: boolean;
  fireLights: WorldLightSource[];
}

/**
 * Persistent terrain geometry split into bounded chunks. Mutating one material
 * cell no longer clears and rebuilds an entire 2,880px campaign level.
 */
export class ChunkedTerrainRenderer {
  private readonly records = new Map<number, TerrainChunkRecord>();
  private animationFrame = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth = 0,
  ) {}

  render(terrain: Terrain, timeMs: number): TerrainRenderResult {
    const pending = new Map<number, TerrainDirtyChunk>();
    for (const chunk of terrain.consumeDirtyChunks()) pending.set(chunk.key, chunk);

    const animationFrame = Math.floor(timeMs / MATERIAL_ANIMATION_MS);
    if (animationFrame !== this.animationFrame) {
      for (const [key, record] of this.records) {
        if (record.animated) pending.set(key, record.chunk);
      }
      this.animationFrame = animationFrame;
    }

    for (const chunk of pending.values()) {
      let record = this.records.get(chunk.key);
      if (!record) {
        record = {
          chunk,
          graphics: this.scene.add.graphics().setDepth(this.depth),
          animated: false,
          fireLights: [],
        };
        this.records.set(chunk.key, record);
      }
      record.chunk = chunk;
      record.graphics.clear();
      const result = drawTerrainChunk(record.graphics, terrain, timeMs, chunk);
      record.animated = result.animated;
      record.fireLights = result.fireLights;
    }

    const fireLights: WorldLightSource[] = [];
    let animatedChunks = 0;
    for (const record of this.records.values()) {
      if (record.animated) animatedChunks += 1;
      for (const light of record.fireLights) {
        if (fireLights.length >= MAX_FIRE_LIGHTS) break;
        fireLights.push(light);
      }
    }

    return {
      fireLights,
      redrawnChunks: pending.size,
      totalChunks: this.records.size,
      animatedChunks,
    };
  }

  clear(): void {
    for (const record of this.records.values()) record.graphics.destroy();
    this.records.clear();
    this.animationFrame = -1;
  }
}

/** Full-sweep reference path retained for renderer comparison tests. */
export function drawTerrain(
  graphics: Phaser.GameObjects.Graphics,
  terrain: Terrain,
  timeMs: number,
): TerrainRenderResult {
  graphics.clear();
  const result = drawTerrainChunk(graphics, terrain, timeMs, {
    key: 0,
    chunkX: 0,
    chunkY: 0,
    startCellX: 0,
    startCellY: 0,
    endCellX: terrain.cols,
    endCellY: terrain.rows,
  });
  return {
    fireLights: result.fireLights.slice(0, MAX_FIRE_LIGHTS),
    redrawnChunks: 1,
    totalChunks: 1,
    animatedChunks: result.animated ? 1 : 0,
  };
}

/**
 * Draw one authoritative slice of the mutable material grid. Every edge and
 * accent is derived from current cells plus a coordinate hash, so carving,
 * settling and erasing cannot leave decorative collision lies behind.
 */
function drawTerrainChunk(
  graphics: Phaser.GameObjects.Graphics,
  terrain: Terrain,
  timeMs: number,
  chunk: TerrainDirtyChunk,
): ChunkDrawResult {
  const fireLights: WorldLightSource[] = [];
  let firstFireCell: { x: number; y: number; width: number; height: number } | null = null;
  let animated = false;
  const cellSize = terrain.cellSize;

  for (let cellY = chunk.startCellY; cellY < chunk.endCellY; cellY += 1) {
    for (let cellX = chunk.startCellX; cellX < chunk.endCellX; cellX += 1) {
      const material = terrain.getCell(cellX, cellY);
      if (material === MATERIAL.empty) continue;
      const x = cellX * cellSize;
      const y = cellY * cellSize;
      const width = Math.min(cellSize, terrain.width - x);
      const height = Math.min(cellSize, terrain.height - y);
      if (material === MATERIAL.fire && !firstFireCell) firstFireCell = { x, y, width, height };
      drawTerrainCell(graphics, terrain, timeMs, cellX, cellY, x, y, width, height, material, fireLights);
      if (material === MATERIAL.water || material === MATERIAL.fire) animated = true;
    }
  }

  if (firstFireCell && fireLights.length === 0) {
    fireLights.push({
      x: firstFireCell.x + firstFireCell.width / 2,
      y: firstFireCell.y + firstFireCell.height / 2,
      color: WORLD_THEME.fire,
      radius: 34,
      strength: 0.7,
    });
  }

  return { animated, fireLights };
}

function drawTerrainCell(
  graphics: Phaser.GameObjects.Graphics,
  terrain: Terrain,
  timeMs: number,
  cellX: number,
  cellY: number,
  x: number,
  y: number,
  width: number,
  height: number,
  material: Material,
  fireLights: WorldLightSource[],
): void {
  const above = terrain.getCell(cellX, cellY - 1);
  const below = terrain.getCell(cellX, cellY + 1);
  const left = terrain.getCell(cellX - 1, cellY);
  const right = terrain.getCell(cellX + 1, cellY);
  const exposed = isVisualSurface(above);
  const openLeft = isVisualSurface(left);
  const openRight = isVisualSurface(right);
  const hash = visualHash(cellX, cellY);

  if (material === MATERIAL.steel) {
    const steelTone = hash % 31 === 0
      ? WORLD_THEME.steelRust
      : hash % 7 === 0
        ? WORLD_THEME.steelMid
        : WORLD_THEME.steel;
    graphics.fillStyle(steelTone, 1);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(WORLD_THEME.steelDark, 0.98);
    if (cellX % 6 === 0) graphics.fillRect(x, y, 1, height);
    if (cellY % 5 === 4) graphics.fillRect(x, y + height - 1, width, 1);
    if (openLeft) graphics.fillRect(x, y, 1, height);
    if (openRight) graphics.fillRect(x + width - 1, y, 1, height);
    if (exposed) {
      graphics.fillStyle(WORLD_THEME.steelLight, 1);
      graphics.fillRect(x, y, width, 1);
    }
    if (hash % 11 === 0) {
      graphics.fillStyle(0xdce9f3, 0.95);
      graphics.fillRect(x + Math.min(1, width - 1), y + Math.min(1, height - 1), 1, 1);
    }
    return;
  }

  if (material === MATERIAL.sand) {
    const color = hash % 5 === 0
      ? WORLD_THEME.sandLight
      : hash % 3 === 0
        ? WORLD_THEME.sandDark
        : WORLD_THEME.sand;
    graphics.fillStyle(color, 1);
    graphics.fillRect(x, y, width, height);
    if (exposed) {
      graphics.fillStyle(WORLD_THEME.sandLight, 1);
      graphics.fillRect(x, y, width, Math.max(1, height / 2));
    } else if (cellY % 5 === 0 && hash % 2 === 0) {
      graphics.fillStyle(WORLD_THEME.sandDark, 0.45);
      graphics.fillRect(x, y + height - 1, width, 1);
    }
    return;
  }

  if (material === MATERIAL.wood) {
    graphics.fillStyle(hash % 11 === 0 ? WORLD_THEME.woodGold : hash % 6 === 0 ? WORLD_THEME.woodLight : WORLD_THEME.wood, 1);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(WORLD_THEME.woodDark, 0.95);
    if (cellY % 3 === 2) graphics.fillRect(x, y + height - 1, width, 1);
    if (cellX % 5 === 0) graphics.fillRect(x, y, 1, height);
    if (openLeft || openRight) {
      const edgeX = openLeft ? x : x + width - 1;
      graphics.fillRect(edgeX, y, 1, height);
    }
    if (exposed) {
      graphics.fillStyle(WORLD_THEME.woodLight, 1);
      graphics.fillRect(x, y, width, 1);
    }
    return;
  }

  if (material === MATERIAL.fire) {
    const flicker = (cellX + cellY + Math.floor(timeMs / 80)) % 3;
    graphics.fillStyle(flicker === 0 ? WORLD_THEME.fireHot : flicker === 1 ? WORLD_THEME.fire : 0xff3d21, 0.98);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(WORLD_THEME.fireCore, 0.88);
    const coreWidth = Math.max(1, width - 2);
    graphics.fillRect(x + Math.min(1, width - 1), y, coreWidth, Math.max(1, height / 2));
    if (fireLights.length < MAX_FIRE_LIGHTS && hash % 13 === 0) {
      fireLights.push({ x: x + width / 2, y: y + height / 2, color: WORLD_THEME.fire, radius: 34, strength: 0.7 });
    }
    return;
  }

  if (material === MATERIAL.water) {
    graphics.fillStyle(WORLD_THEME.waterDeep, 0.92);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(WORLD_THEME.water, below === MATERIAL.water ? 0.3 : 0.5);
    const lowerOffset = Math.floor(height / 2);
    graphics.fillRect(x, y + lowerOffset, width, height - lowerOffset);
    if (above !== MATERIAL.water) {
      const requestedWave = (cellX + Math.floor(timeMs / MATERIAL_ANIMATION_MS)) % 4 === 0 ? 1 : 0;
      const wave = Math.min(requestedWave, Math.max(0, height - 1));
      const surfaceHeight = Math.min(height - wave, Math.max(1, height / 3));
      graphics.fillStyle(WORLD_THEME.waterLight, 0.96);
      graphics.fillRect(x, y + wave, width, surfaceHeight);
      if (hash % 5 === 0) {
        graphics.fillStyle(WORLD_THEME.waterFoam, 0.82);
        graphics.fillRect(x + Math.min(1, width - 1), y + wave, Math.max(1, width / 2), 1);
      }
    }
    return;
  }

  const depth = y / terrain.height;
  const base = depth > 0.78
    ? WORLD_THEME.dirtDeep
    : hash % 7 === 0
      ? WORLD_THEME.dirtMid
      : WORLD_THEME.dirt;
  graphics.fillStyle(base, 1);
  graphics.fillRect(x, y, width, height);
  if (openLeft || openRight) {
    graphics.fillStyle(WORLD_THEME.dirtDeep, 0.78);
    const edgeX = openLeft ? x : x + width - 1;
    graphics.fillRect(edgeX, y, 1, height);
  }
  if (exposed) {
    graphics.fillStyle(hash % 4 === 0 ? WORLD_THEME.mossLight : WORLD_THEME.moss, 1);
    graphics.fillRect(x, y, width, Math.max(1, height / 2));
  }

  if (material === MATERIAL.oneWayLeft || material === MATERIAL.oneWayRight) {
    const direction = material === MATERIAL.oneWayRight ? 1 : -1;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    graphics.fillStyle(WORLD_THEME.sandLight, 0.78);
    graphics.fillTriangle(
      centerX - direction * (width / 4), y + 1,
      centerX - direction * (width / 4), y + height - 1,
      centerX + direction * (width / 3), centerY,
    );
  }
}
