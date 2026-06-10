import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 3 — "Up and Over".
 * The exit sits high-right behind a tall wall. The crew must become climbers to
 * scale the wall, walk the top shelf, then float down to the exit ledge — the
 * drop is fatal without a floater. Water at the bottom drowns anyone who walks
 * off the shelf early or overshoots. Combines two traits + careful timing; the
 * hardest of the three.
 */
export function createLevel3(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Bottom floor (start area) with water on the right half.
  terrain.fillRect(0, 470, 520, 70);

  // Tall wall the crew climbs, on the left.
  terrain.fillRect(300, 150, 34, 320);

  // Top shelf running right from the top of the wall.
  terrain.fillRect(300, 150, 470, 20);

  // Exit ledge, mid-right, below the shelf's right end.
  terrain.fillRect(700, 380, 260, 22);

  return {
    name: 'Up and Over',
    width: 960,
    height: 540,
    spawn: { x: 90, y: 446 },
    exit: { x: 880, y: 336, width: 40, height: 44 },
    hazards: [
      // Water trough on the low floor, right of the start.
      { x: 520, y: 476, width: 180, height: 64, kind: 'water' },
    ],
    spawnIntervalMs: 1000,
    releaseRate: 45,
    minReleaseRate: 30,
    maxReleaseRate: 99,
    totalLemmings: 10,
    targetSaved: 6,
    timeLimitMs: 240000,
    skills: {
      climber: 6,
      floater: 6,
      bomber: 0,
      blocker: 2,
      builder: 2,
      basher: 1,
      digger: 1,
    },
    terrain,
  };
}
