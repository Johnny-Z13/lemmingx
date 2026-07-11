import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 3 — "Hold the Line".
 * Plant a blocker at the wall face and arm a bomber — the crater sprays sand
 * debris that settles. Teaches blocker + bomber (and that bombers cost lives).
 */
export function createLevel3(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Continuous floor; one wall barring the route — too tall to step over,
  // thin enough that a single well-placed crater clears the body height.
  terrain.fillRect(0, 430, 960, 110);
  terrain.fillRect(560, 400, 8, 30);

  return {
    name: 'Hold the Line',
    width: 960,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 880, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 1000,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 240000,
    caSeed: 33,
    sandEmitRatio: 0.55,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 3,
      blocker: 3,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 0,
    },
    terrain,
  };
}
