import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 7 — "Float the Timber".
 * Sandworld signature puzzle: dig the dirt lip so the wood stack drops into the
 * trench, then paint water — buoyancy lifts the timber into a walkable bridge.
 * Hatch-queue diggers (Q) first. Builders are a scarce backup.
 *
 * Scripted solution (tests): same two-stage builder bridge as Bridge the Gap.
 * Intended player solution: dig → paint water → walk the wood.
 */
export function createLevel7(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Plateaus with a 90px chasm (builder-solvable like level 2).
  terrain.fillRect(0, 430, 400, 110);
  terrain.fillRect(490, 430, 470, 110);
  terrain.fillRect(490, 400, 80, 30); // landing shelf for builder backup

  // Steel trench floor so diggers / wood can't void the map.
  terrain.fillRect(400, 510, 90, 30, MATERIAL.steel);

  // Dirt lip spanning the gap — dig this to drop the wood.
  terrain.fillRect(410, 430, 70, 20);
  // Timber stacked on the lip.
  terrain.fillRect(415, 360, 60, 70, MATERIAL.wood);

  return {
    name: 'Float the Timber',
    width: 960,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 880, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 800,
    totalLemmings: 10,
    releaseRate: 45,
    minReleaseRate: 30,
    maxReleaseRate: 99,
    targetSaved: 5,
    timeLimitMs: 300000,
    caSeed: 77,
    caSubsteps: 4,
    landscape: { water: 10 },
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 2,
      builder: 4,
      basher: 0,
      miner: 0,
      digger: 6,
      swimmer: 0,
    },
    terrain,
  };
}
