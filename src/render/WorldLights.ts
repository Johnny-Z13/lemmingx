import Phaser from 'phaser';

export interface WorldLightSource {
  x: number;
  y: number;
  color: number;
  radius: number;
  strength?: number;
}

/** Small additive pools only; this is atmosphere, not a visibility mechanic. */
export function drawWorldLights(
  graphics: Phaser.GameObjects.Graphics,
  sources: readonly WorldLightSource[],
  timeMs: number,
): void {
  graphics.clear();
  const breathe = 0.94 + Math.sin(timeMs / 310) * 0.06;
  for (const source of sources.slice(0, 28)) {
    const radius = source.radius * breathe;
    const strength = source.strength ?? 0.6;
    graphics.fillStyle(source.color, 0.018 * strength);
    graphics.fillCircle(source.x, source.y, radius);
    graphics.fillStyle(source.color, 0.032 * strength);
    graphics.fillCircle(source.x, source.y, radius * 0.68);
    graphics.fillStyle(source.color, 0.06 * strength);
    graphics.fillCircle(source.x, source.y, radius * 0.34);
  }
}

export function drawIndustrialTorch(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  timeMs: number,
): void {
  const flicker = Math.sin(timeMs / 95) * 1.2;
  graphics.fillStyle(0x232a34, 1);
  graphics.fillRect(x - 3, y - 2, 6, 10);
  graphics.fillStyle(0x9ba7b4, 1);
  graphics.fillRect(x - 4, y - 3, 8, 2);
  graphics.fillStyle(0xff6a2a, 0.95);
  graphics.fillTriangle(x - 3, y - 4, x + 3, y - 4, x, y - 11 - flicker);
  graphics.fillStyle(0xffd96b, 0.96);
  graphics.fillTriangle(x - 1.5, y - 5, x + 1.5, y - 5, x, y - 9 - flicker * 0.5);
}
