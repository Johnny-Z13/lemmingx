import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 2 — "Bridge the Gap".
 * Two plateaus separated by flowing water. Builders lay a two-stage bridge.
 * Teaches builders + living water (drowns on contact). A few landscape water
 * charges let you flood/experiment without breaking the builder route.
 *
 * Intended solution: builder at ~x385 heading right, second builder where the
 * first bridge ends (~x430), crew walks the bridge across.
 */
export function createLevel2(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Left plateau and right plateau with a 90px chasm between.
  terrain.fillRect(0, 430, 400, 110);
  terrain.fillRect(490, 430, 470, 110);
  // Raised landing shelf: the two-stage bridge ends high, and this catches it
  // so the drop on the far side stays survivable.
  terrain.fillRect(490, 400, 80, 30);
  // Living water in the chasm (also a drown hazard via material overlap).
  terrain.fillRect(400, 490, 90, 50, MATERIAL.water);

  return {
    name: 'Bridge the Gap',
    width: 960,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 880, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 240000,
    caSeed: 22,
    landscape: { water: 3 },
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 2,
      builder: 4,
      basher: 0,
      miner: 0,
      digger: 0,
      swimmer: 2,
    },
    terrain,
  };
}
