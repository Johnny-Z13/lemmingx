import type Phaser from 'phaser';
import { WORLD_THEME } from './visualTheme';

/** Authored render-only architecture. Contact edges stay on authored cells. */
export function drawCampaignSetpieces(
  graphics: Phaser.GameObjects.Graphics,
  levelIndex: number,
  timeMs: number,
): void {
  if (levelIndex !== 3) return;

  // Level 4 sector-one gantry. It never covers the mutable 800..840 dirt wall:
  // the live terrain renderer remains the only material/collision truth.
  graphics.fillStyle(WORLD_THEME.steelDark, 0.72);
  graphics.fillRect(744, 310, 152, 10);
  graphics.fillRect(756, 320, 6, 26);
  graphics.fillRect(878, 320, 6, 26);
  graphics.lineStyle(3, WORLD_THEME.steel, 0.62);
  graphics.lineBetween(762, 320, 800, 340);
  graphics.lineBetween(878, 320, 840, 340);
  graphics.fillStyle(WORLD_THEME.sandDark, 0.92);
  graphics.fillTriangle(788, 332, 798, 332, 798, 344);
  graphics.fillTriangle(842, 332, 852, 332, 842, 344);
  const lamp = 0.65 + Math.sin(timeMs / 380) * 0.18;
  graphics.fillStyle(0xffb43a, lamp);
  graphics.fillRect(774, 314, 8, 4);
  graphics.fillRect(858, 314, 8, 4);

  // Marsh culvert: framing sits behind the live water. No fixed cyan surface is
  // drawn, so erase/flow changes remain visible and truthful.
  graphics.fillStyle(WORLD_THEME.steelDark, 0.76);
  graphics.fillRect(1034, 407, 14, 17);
  graphics.fillRect(1368, 407, 14, 17);
  graphics.fillRect(1034, 405, 348, 5);
  graphics.lineStyle(2, WORLD_THEME.steel, 0.7);
  for (let x = 1060; x < 1360; x += 48) {
    graphics.lineBetween(x, 410, x + 18, 423);
    graphics.lineBetween(x + 18, 423, x + 36, 410);
  }
}
