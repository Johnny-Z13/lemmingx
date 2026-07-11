import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 10 — "Sandworld Symphony".
 * Finale: crusher, bash, water chasm, steel-capped wall, dig into the basement.
 * Every terrain tool is stocked, and a spout builds a dune on the east slab
 * the crew must cross.
 *
 * Intended solution: bash wall A (x≈760), two builders over the water
 * (x≈1010 then on the bridge), bash wall B (x≈1600), digger at x≈2310,
 * crew follows into the basement.
 */
export function createLevel10(): LevelDefinition {
  const terrain = new Terrain(2880, 810, 6);

  // Main floor (thick slab) with a basement under the right half.
  terrain.fillRect(0, 430, 2880, 60); // slab 430..490
  terrain.fillRect(0, 520, 2880, 90); // basement floor 520..610

  // Wall A: plain dirt.
  terrain.fillRect(760, 330, 26, 100);

  // Water chasm: open the slab and fill the pit with real living water,
  // lipped underneath so it can't drain into the basement gallery.
  terrain.eraseRect(1040, 430, 60, 60);
  terrain.fillRect(1034, 490, 6, 30); // west lip
  terrain.fillRect(1100, 490, 6, 30); // east lip
  terrain.fillRect(1040, 452, 60, 68, MATERIAL.water);
  // Raised landing shelf catching the two-stage bridge (see level 2).
  terrain.fillRect(1100, 400, 80, 30);

  // Wall B on a steel cap (digging under it clanks).
  terrain.fillRect(1600, 330, 26, 100);
  terrain.fillRect(1560, 430, 110, 60, MATERIAL.steel);

  return {
    name: 'Sandworld Symphony',
    width: 2880,
    height: 810,
    spawn: { x: 80, y: 406 },
    exit: { x: 2500, y: 476, width: 40, height: 44 },
    traps: [{ x: 480, y: 402, width: 14, height: 28, kind: 'crusher', cycleMs: 5000 }],
    spawnIntervalMs: 700,
    totalLemmings: 10,
    releaseRate: 70,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 360000,
    caSeed: 1010,
    landscape: { water: 6, sand: 4, dirt: 2, wood: 2 },
    emitters: [{ x: 2200, y: 250, material: 'sand', cellsPerSecond: 5, budget: 200 }],
    skills: {
      climber: 0,
      floater: 0,
      bomber: 1,
      blocker: 1,
      builder: 4,
      basher: 3,
      miner: 0,
      digger: 2,
      swimmer: 2,
    },
    terrain,
  };
}
