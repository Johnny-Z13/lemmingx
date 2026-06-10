import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 3 — "Hold the Line".
 * A wall and nothing to carve it with: plant a blocker right at the wall's
 * face and arm it as a bomber — one brave volunteer blasts the way open for
 * everyone else. Teaches the blocker + bomber combo (and that bombers cost
 * lives). The blast circle only clears the wall when planted close, so
 * placement matters.
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
