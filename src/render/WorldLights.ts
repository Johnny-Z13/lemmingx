import Phaser from 'phaser';
import { WORLD_THEME } from './visualTheme';

export const MAX_WORLD_LIGHT_SOURCES = 28;
export const WORLD_LIGHT_FILLS_PER_SOURCE = 3;
export const MAX_WORLD_LIGHT_RADIUS = 96;

export interface WorldLightSource {
  x: number;
  y: number;
  color: number;
  radius: number;
  strength?: number;
}

/** Tight additive pools only; this is atmosphere, not a visibility mechanic. */
export function drawWorldLights(
  graphics: Phaser.GameObjects.Graphics,
  sources: readonly WorldLightSource[],
  timeMs: number,
): void {
  graphics.clear();
  const breathe = 0.94 + Math.sin(timeMs / 310) * 0.06;
  for (const source of sources.slice(0, MAX_WORLD_LIGHT_SOURCES)) {
    const radius = Math.min(source.radius, MAX_WORLD_LIGHT_RADIUS) * breathe;
    const strength = source.strength ?? 0.6;
    graphics.fillStyle(source.color, 0.04 * strength);
    graphics.fillEllipse(source.x, source.y + radius * 0.12, radius * 2, radius * 1.1);
    graphics.fillStyle(source.color, 0.095 * strength);
    graphics.fillEllipse(source.x, source.y + radius * 0.08, radius * 1.12, radius * 0.72);
    graphics.fillStyle(source.color, 0.24 * strength);
    graphics.fillCircle(source.x, source.y, radius * 0.22);
  }
}

export function drawIndustrialTorch(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  timeMs: number,
): void {
  const flicker = Math.sin(timeMs / 95) * 1.2;
  graphics.fillStyle(WORLD_THEME.steelDark, 1);
  graphics.fillRect(x - 3, y - 2, 6, 10);
  graphics.fillStyle(WORLD_THEME.steelLight, 1);
  graphics.fillRect(x - 4, y - 3, 8, 2);
  graphics.fillStyle(WORLD_THEME.fire, 0.98);
  graphics.fillTriangle(x - 3, y - 4, x + 3, y - 4, x, y - 11 - flicker);
  graphics.fillStyle(WORLD_THEME.fireHot, 1);
  graphics.fillTriangle(x - 1.5, y - 5, x + 1.5, y - 5, x, y - 9 - flicker * 0.5);
}
