import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 8 — "Down and Out".
 * A tall level (vertical scrolling): the crew marches on top of a huge dirt
 * massif with the exit buried in a basement gallery far below. One miner
 * carves a long diagonal shaft through the whole mountain; everyone else
 * follows the tunnel down. Teaches the miner at scale.
 *
 * Intended solution: miner at x≈440 heading right; the shaft breaks into the
 * gallery and the crew walks to the exit.
 *
 * A high spout dusts the massif with sand while the miner works below.
 */
export function createLevel8(): LevelDefinition {
  const terrain = new Terrain(1440, 810, 6);

  // Start platform feeding onto the mountain top.
  terrain.fillRect(0, 200, 400, 22);
  // The mountain: a solid dirt massif.
  terrain.fillRect(300, 222, 1140, 478); // down to y=700
  // Basement gallery (700..740 open) above the basement floor.
  terrain.fillRect(0, 740, 1440, 70);

  return {
    name: 'Down and Out',
    width: 1440,
    height: 810,
    spawn: { x: 80, y: 178 },
    exit: { x: 1200, y: 696, width: 40, height: 44 },
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 8,
    timeLimitMs: 300000,
    caSeed: 88,
    emitters: [{ x: 900, y: 140, material: 'sand', cellsPerSecond: 5, budget: 200 }],
    skills: {
      climber: 0,
      floater: 2,
      bomber: 1,
      blocker: 2,
      builder: 0,
      basher: 0,
      miner: 3,
      digger: 0,
      swimmer: 0,
    },
    terrain,
  };
}
