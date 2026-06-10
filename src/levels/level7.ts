import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 7 — "Wrong Way".
 * Two one-way walls. The first points with the route — a basher chews straight
 * through. The second points against it: picks just clank off, so the crew
 * must climb over instead. Teaches one-way arrows (and that they can't be
 * cheated).
 *
 * Intended solution: bash wall A (x≈600), assign climbers before wall B
 * (x≈1000); the short drop off wall B's top is safe.
 */
export function createLevel7(): LevelDefinition {
  const terrain = new Terrain(1440, 540, 6);

  terrain.fillRect(0, 430, 1440, 110);
  // Wall A: arrow agrees with the route (carvable heading right).
  terrain.fillRect(600, 350, 24, 80, MATERIAL.oneWayRight);
  // Wall B: arrow against the route — uncarvable from this side, climb it.
  terrain.fillRect(1000, 394, 24, 36, MATERIAL.oneWayLeft);

  return {
    name: 'Wrong Way',
    width: 1440,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 1340, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 7,
    timeLimitMs: 300000,
    skills: {
      climber: 8,
      floater: 0,
      bomber: 1,
      blocker: 2,
      builder: 0,
      basher: 3,
      miner: 0,
      digger: 0,
    },
    terrain,
  };
}
