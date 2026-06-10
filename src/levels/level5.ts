import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 5 — "Steel Yourself".
 * A steel wall (with a steel-capped floor segment under it) blocks the road —
 * no carving through it. The route is down: dig through the dirt floor west
 * of the steel, drop into the gallery beneath, and walk under the wall to the
 * basement exit. Digging at the steel cap just clanks. Teaches steel.
 *
 * Intended solution: digger at x≈620 (any dirt west of the cap), crew follows
 * through the shaft and walks right to the exit.
 */
export function createLevel5(): LevelDefinition {
  const terrain = new Terrain(1440, 540, 6);

  // Main slab with a gallery + basement beneath.
  terrain.fillRect(0, 430, 1440, 30); // dirt slab (430..460)
  terrain.fillRect(0, 490, 1440, 50); // basement floor (490..540)

  // Steel wall on the slab + steel cap so you can't dig straight through it.
  terrain.fillRect(680, 330, 40, 100, MATERIAL.steel);
  terrain.fillRect(660, 430, 120, 30, MATERIAL.steel);

  return {
    name: 'Steel Yourself',
    width: 1440,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 1300, y: 446, width: 40, height: 44 },
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 7,
    timeLimitMs: 240000,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 1,
      blocker: 2,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 3,
    },
    terrain,
  };
}
