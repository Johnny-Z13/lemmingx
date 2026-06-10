import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 2 — "Drop & Dash".
 * The crew starts on a high ledge with a wall ahead. Bash through the wall, then
 * the only way down to the exit floor is a long drop that's fatal without a
 * floater — so float the crew down. Lava pools on the low floor punish anyone
 * who drifts past the exit. Introduces hazards + two skills working together.
 */
export function createLevel2(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // High start ledge on the left.
  terrain.fillRect(0, 200, 430, 22);
  // Wall blocking the ledge near its right end.
  terrain.fillRect(360, 120, 34, 102);
  // Low exit floor spanning the bottom.
  terrain.fillRect(0, 470, 960, 70);

  return {
    name: 'Drop & Dash',
    width: 960,
    height: 540,
    spawn: { x: 70, y: 176 },
    exit: { x: 470, y: 426, width: 40, height: 44 },
    hazards: [
      // Lava to the right of the exit on the low floor.
      { x: 600, y: 478, width: 240, height: 62, kind: 'lava' },
    ],
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 240000,
    skills: {
      climber: 1,
      floater: 8,
      bomber: 0,
      blocker: 3,
      builder: 2,
      basher: 4,
      digger: 2,
    },
    terrain,
  };
}
