import type Phaser from 'phaser';
import type { EmitterState, ExitZone, HazardZone, Point, TrapState } from '../sim/types';
import { WORLD_THEME } from './visualTheme';

export interface HatchSetpieceState {
  spawn: Point;
  planning: boolean;
  hatchOpenMs: number;
  hatchTotalMs: number;
  timeMs: number;
}

export interface ExitSetpieceState {
  exit: ExitZone;
  powered: boolean;
  saved: number;
  targetSaved: number;
  timeMs: number;
}

/** Industrial cargo portal; all geometry surrounds the unchanged spawn point. */
export function drawHatchSetpiece(
  graphics: Phaser.GameObjects.Graphics,
  state: HatchSetpieceState,
): void {
  const { spawn, planning, hatchOpenMs, hatchTotalMs, timeMs } = state;
  const hatchX = spawn.x - 33;
  const hatchY = spawn.y - 42;
  const open = planning ? 0 : hatchTotalMs > 0 ? 1 - hatchOpenMs / hatchTotalMs : 1;
  const gantryLeft = spawn.x - 48;
  const gantryRight = spawn.x + 48;
  const gantryTop = hatchY - 27;

  graphics.fillStyle(WORLD_THEME.steelDark, 1);
  graphics.fillRect(gantryLeft, gantryTop, gantryRight - gantryLeft, 10);
  graphics.fillRect(gantryLeft + 3, gantryTop + 8, 7, 55);
  graphics.fillRect(gantryRight - 10, gantryTop + 8, 7, 55);
  graphics.fillStyle(WORLD_THEME.steel, 1);
  graphics.fillRect(gantryLeft + 3, gantryTop + 2, gantryRight - gantryLeft - 6, 3);
  graphics.lineStyle(2, WORLD_THEME.steelLight, 0.42);
  graphics.lineBetween(gantryLeft + 10, gantryTop + 10, gantryLeft + 33, gantryTop + 34);
  graphics.lineBetween(gantryRight - 10, gantryTop + 10, gantryRight - 33, gantryTop + 34);
  graphics.lineBetween(spawn.x, gantryTop + 8, spawn.x, hatchY - 3);

  // Hoist block and paired state lamps read before the smaller hatch details.
  graphics.fillStyle(WORLD_THEME.ink, 1);
  graphics.fillRect(spawn.x - 10, gantryTop + 1, 20, 8);
  graphics.fillStyle(WORLD_THEME.sandLight, 0.98);
  graphics.fillRect(spawn.x - 6, gantryTop + 3, 12, 4);
  graphics.fillStyle(open < 1 ? WORLD_THEME.danger : WORLD_THEME.mint, 0.98);
  graphics.fillRect(gantryRight - 18, gantryTop + 3, 5, 4);

  if (open < 1) {
    graphics.fillStyle(0xffd96b, 0.09 + open * 0.1);
    graphics.fillCircle(spawn.x, hatchY + 24, 38);
  }

  graphics.fillStyle(WORLD_THEME.steelDark, 1);
  graphics.fillRoundedRect(hatchX - 4, hatchY - 4, 74, 46, 5);
  graphics.fillStyle(WORLD_THEME.ink, 0.98);
  graphics.fillRoundedRect(hatchX, hatchY, 66, 38, 4);
  graphics.lineStyle(3, WORLD_THEME.sandLight, 1);
  graphics.strokeRoundedRect(hatchX, hatchY, 66, 38, 4);

  const shutterWidth = 33 * (1 - open);
  if (shutterWidth > 0.5) {
    graphics.fillStyle(WORLD_THEME.steelDark, 1);
    graphics.fillRect(hatchX + 2, hatchY + 2, Math.max(0, shutterWidth - 2), 34);
    graphics.fillRect(hatchX + 66 - shutterWidth, hatchY + 2, Math.max(0, shutterWidth - 2), 34);
    graphics.lineStyle(3, WORLD_THEME.sand, 0.85);
    for (let x = hatchX + 8; x < hatchX + 62; x += 11) {
      if (x < hatchX + shutterWidth || x > hatchX + 66 - shutterWidth) {
        graphics.lineBetween(x, hatchY + 5, x - 10, hatchY + 31);
      }
    }
  }
  graphics.fillStyle(0xffd96b, 0.92);
  graphics.fillRect(hatchX + 6, hatchY + 5, 5, 4);
  graphics.fillRect(hatchX + 55, hatchY + 5, 5, 4);

  if (open >= 1) {
    const bob = Math.sin(timeMs / 280) * 2;
    graphics.fillStyle(0xffd96b, 0.95);
    graphics.fillTriangle(spawn.x - 7, hatchY + 12 + bob, spawn.x + 7, hatchY + 12 + bob, spawn.x, hatchY + 25 + bob);
  }
}

/** Mint transit arch; all solid-looking structure stays outside the save zone. */
export function drawExitSetpiece(
  graphics: Phaser.GameObjects.Graphics,
  state: ExitSetpieceState,
): void {
  const { exit, powered, saved, targetSaved, timeMs } = state;
  const rescueCharge = Math.min(1, saved / Math.max(1, targetSaved));
  const pulse = powered ? 0.72 + Math.sin(timeMs / 420) * 0.16 : 0.3;
  const cx = exit.x + exit.width / 2;
  const cy = exit.y + exit.height / 2;
  const outerLeft = exit.x - 20;
  const outerRight = exit.x + exit.width + 20;
  const outerTop = exit.y - 26;
  const outerBottom = exit.y + exit.height + 5;

  graphics.fillStyle(WORLD_THEME.steelDark, 1);
  graphics.fillRect(outerLeft - 4, exit.y - 12, 12, exit.height + 20);
  graphics.fillRect(outerRight - 8, exit.y - 12, 12, exit.height + 20);
  graphics.fillRect(outerLeft - 8, outerBottom - 5, outerRight - outerLeft + 16, 8);
  graphics.fillStyle(WORLD_THEME.steel, 1);
  graphics.fillRect(outerLeft - 1, exit.y - 9, 5, exit.height + 14);
  graphics.fillRect(outerRight - 4, exit.y - 9, 5, exit.height + 14);
  graphics.fillStyle(WORLD_THEME.steelLight, 0.9);
  for (const rivetX of [outerLeft + 2, outerRight - 2]) {
    graphics.fillCircle(rivetX, exit.y - 5, 1.5);
    graphics.fillCircle(rivetX, exit.y + exit.height, 1.5);
  }

  graphics.lineStyle(4, WORLD_THEME.steel, 1);
  graphics.lineBetween(outerLeft + 5, exit.y - 10, cx, outerTop);
  graphics.lineBetween(cx, outerTop, outerRight - 5, exit.y - 10);
  graphics.lineStyle(2, powered ? WORLD_THEME.mint : WORLD_THEME.steelLight, pulse);
  graphics.lineBetween(outerLeft + 10, exit.y - 5, cx, outerTop + 9);
  graphics.lineBetween(cx, outerTop + 9, outerRight - 10, exit.y - 5);

  graphics.lineStyle(2, WORLD_THEME.mint, pulse);
  graphics.strokeRect(exit.x, exit.y, exit.width, exit.height);
  graphics.fillStyle(WORLD_THEME.mint, powered ? 0.22 + rescueCharge * 0.18 : 0.12);
  graphics.fillRect(exit.x + 2, exit.y + exit.height - 4, exit.width - 4, 3);
  const beaconY = outerTop + 9;
  const core = 4 + rescueCharge * 2 + (powered ? Math.sin(timeMs / 300) * 0.6 : 0);
  graphics.fillStyle(powered ? 0xeaffff : WORLD_THEME.steelLight, powered ? 0.88 : 0.38);
  graphics.fillTriangle(cx, beaconY - core, cx + core, beaconY, cx, beaconY + core);
  graphics.fillTriangle(cx, beaconY - core, cx - core, beaconY, cx, beaconY + core);

  graphics.lineStyle(2, WORLD_THEME.mint, 0.55 + pulse * 0.3);
  for (let offset = 0; offset < 3; offset += 1) {
    const x = exit.x - 14 + offset * 7;
    const y = cy + 12;
    graphics.lineBetween(x, y - 4, x + 5, y);
    graphics.lineBetween(x + 5, y, x, y + 4);
  }
}

function drawDangerBeacon(graphics: Phaser.GameObjects.Graphics, cx: number, y: number, timeMs: number): void {
  const pulse = 0.72 + Math.sin(timeMs / 260) * 0.2;
  graphics.fillStyle(WORLD_THEME.ink, 0.95);
  graphics.fillTriangle(cx, y - 9, cx + 9, y, cx, y + 9);
  graphics.fillTriangle(cx, y - 9, cx - 9, y, cx, y + 9);
  graphics.lineStyle(2, WORLD_THEME.danger, pulse);
  graphics.lineBetween(cx, y - 7, cx + 7, y);
  graphics.lineBetween(cx + 7, y, cx, y + 7);
  graphics.lineBetween(cx, y + 7, cx - 7, y);
  graphics.lineBetween(cx - 7, y, cx, y - 7);
  graphics.fillStyle(WORLD_THEME.fireHot, 0.95);
  graphics.fillRect(cx - 1, y - 4, 2, 5);
  graphics.fillRect(cx - 1, y + 3, 2, 2);
}

/** Warning rigs enlarge recognition only above the exact trap trigger boxes. */
export function drawTrapSetpieces(
  graphics: Phaser.GameObjects.Graphics,
  traps: readonly TrapState[],
  timeMs: number,
): void {
  for (const trap of traps) {
    const { x, y, width, height, kind, cycleMs } = { cycleMs: 1400, ...trap.def };
    const cycle = trap.phase === 'killing' ? 1 - trap.timerMs / cycleMs : 1;
    const cx = x + width / 2;
    drawDangerBeacon(graphics, cx, y - 25, timeMs);

    // A narrow suspended rail gives the tiny trigger a visible industrial
    // silhouette without pretending the route is blocked outside its bounds.
    graphics.fillStyle(WORLD_THEME.steelDark, 0.96);
    graphics.fillRect(cx - 18, y - 14, 36, 5);
    graphics.fillStyle(WORLD_THEME.danger, 0.9);
    for (let stripe = cx - 15; stripe < cx + 15; stripe += 8) graphics.fillRect(stripe, y - 13, 4, 2);
    graphics.lineStyle(1, WORLD_THEME.steel, 0.8);
    graphics.lineBetween(cx - 15, y - 9, x, y);
    graphics.lineBetween(cx + 15, y - 9, x + width, y);

    if (kind === 'crusher') {
      graphics.fillStyle(WORLD_THEME.steelDark, 1);
      graphics.fillRect(x - 3, y - 6, 3, height + 6);
      graphics.fillRect(x + width, y - 6, 3, height + 6);
      const drop = trap.phase === 'killing'
        ? (cycle < 0.25 ? cycle / 0.25 : 1 - (cycle - 0.25) / 0.75)
        : Math.sin(timeMs / 500) * 0.04;
      const blockY = y - 6 + drop * (height - 8);
      graphics.fillStyle(WORLD_THEME.steelLight, 1);
      graphics.fillRect(x - 1, blockY, width + 2, 10);
      graphics.fillStyle(WORLD_THEME.steelDark, 1);
      for (let sx = x; sx < x + width; sx += 5) {
        graphics.fillTriangle(sx, blockY + 10, sx + 4, blockY + 10, sx + 2, blockY + 14);
      }
    } else if (kind === 'zapper') {
      graphics.fillStyle(WORLD_THEME.steelDark, 1);
      graphics.fillRect(x - 2, y, 4, height);
      graphics.fillRect(x + width - 2, y, 4, height);
      graphics.fillStyle(WORLD_THEME.cyan, 0.95);
      graphics.fillCircle(x, y + 2, 3);
      graphics.fillCircle(x + width, y + 2, 3);
      if (trap.phase === 'killing' || Math.floor(timeMs / 700) % 4 === 0) {
        const alpha = trap.phase === 'killing' ? 0.95 : 0.3;
        graphics.lineStyle(1.5, WORLD_THEME.cyan, alpha);
        let px = x;
        let py = y + 3;
        for (let segment = 1; segment <= 5; segment += 1) {
          const nx = x + (width / 5) * segment;
          const ny = y + 3 + (segment === 5 ? 0 : Math.sin(timeMs / 30 + segment * 7) * 4);
          graphics.lineBetween(px, py, nx, ny);
          px = nx;
          py = ny;
        }
      }
    } else {
      const open = trap.phase === 'killing' ? Math.abs(Math.sin(cycle * Math.PI * 6)) : 0.25 + Math.sin(timeMs / 600) * 0.08;
      const gape = open * (height * 0.6);
      graphics.fillStyle(0x3a2c3f, 1);
      graphics.fillRect(x, y + height - 6, width, 6);
      graphics.fillStyle(0xd8e0ef, 1);
      for (let toothX = x; toothX < x + width - 2; toothX += 6) {
        graphics.fillTriangle(toothX, y + height - 5, toothX + 5, y + height - 5, toothX + 2.5, y + height - 14);
        const topY = y + height - 16 - gape;
        graphics.fillTriangle(toothX, topY, toothX + 5, topY, toothX + 2.5, topY + 7);
      }
    }
  }
}

export function drawHazardSetpieces(
  graphics: Phaser.GameObjects.Graphics,
  hazards: readonly HazardZone[],
  timeMs: number,
): void {
  for (const hazard of hazards) {
    const isLava = hazard.kind === 'lava';
    const surface = isLava ? 0xff5b3a : WORLD_THEME.cyan;
    const deep = isLava ? 0x6e1410 : 0x123a63;
    graphics.fillStyle(WORLD_THEME.ink, 0.9);
    graphics.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
    graphics.fillStyle(deep, 0.94);
    graphics.fillRect(hazard.x, hazard.y + 6, hazard.width, hazard.height - 6);
    graphics.fillStyle(surface, isLava ? 0.98 : 0.75);
    for (let x = hazard.x; x < hazard.x + hazard.width; x += 12) {
      const wave = Math.sin((x + timeMs / 240) * 0.18) * 2;
      graphics.fillRect(x, hazard.y + 4 + wave, Math.min(10, hazard.x + hazard.width - x), 4);
    }
    // Exact-width danger lip distinguishes authored death zones from living
    // terrain water without extending the apparent contact area.
    graphics.lineStyle(2, WORLD_THEME.danger, 0.92);
    graphics.lineBetween(hazard.x, hazard.y, hazard.x + hazard.width, hazard.y);
    for (let x = hazard.x + 4; x < hazard.x + hazard.width - 4; x += 18) {
      const right = Math.min(hazard.x + hazard.width, x + 8);
      const middle = x + (right - x) / 2;
      graphics.fillStyle(isLava ? WORLD_THEME.fireHot : 0xd8e0ef, 0.7);
      graphics.fillTriangle(x, hazard.y + 8, middle, hazard.y + 3, right, hazard.y + 8);
    }
    if (Math.floor(timeMs / 180) % 3 === 0) {
      graphics.fillStyle(0xffffff, isLava ? 0.35 : 0.25);
      const hx = hazard.x + ((Math.floor(timeMs / 90) * 17) % Math.max(1, hazard.width - 4));
      graphics.fillRect(hx, hazard.y + 6, 2, 2);
    }
  }
}

export function drawEmitterSetpieces(
  graphics: Phaser.GameObjects.Graphics,
  emitters: readonly EmitterState[],
  timeMs: number,
  advancing: boolean,
  isSpoutClear: (emitter: EmitterState) => boolean,
): void {
  for (const emitter of emitters) {
    const { x, y, material } = emitter.def;
    const color = material === 'sand' ? WORLD_THEME.sand : WORLD_THEME.waterLight;
    graphics.fillStyle(WORLD_THEME.steelDark, 1);
    graphics.fillRect(x - 10, y - 15, 20, 9);
    graphics.fillRect(x - 6, y - 6, 12, 5);
    graphics.fillStyle(WORLD_THEME.steelLight, 0.9);
    graphics.fillRect(x - 7, y - 13, 14, 2);
    graphics.fillStyle(color, 0.98);
    graphics.fillRect(x - 5, y - 5, 10, 3);
    graphics.fillRect(x - 2, y - 2, 4, 2);
    if (advancing && emitter.active && emitter.budgetLeft > 0 && isSpoutClear(emitter)) {
      graphics.fillStyle(color, 0.85);
      graphics.fillRect(x - 1.5, y - 1 + ((timeMs / 30) % 10), 3, 4);
    }
  }
}
