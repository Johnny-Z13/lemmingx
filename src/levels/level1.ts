import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 1 — "First Steps".
 * The gentlest possible puzzle. The whole crew spawns onto one long, safe floor
 * and can almost walk straight to the exit — but a low wall blocks the way. A
 * single basher tunnels through it (or a builder ramps over, or a digger drops
 * under). Generous skills and a forgiving quota; no hazards yet.
 */
export function createLevel1(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // One continuous, safe floor across the whole level.
  terrain.fillRect(0, 430, 960, 110);

  // A low wall partway across that the crew must get through/over/under.
  terrain.fillRect(560, 360, 40, 70);

  return {
    name: 'First Steps',
    width: 960,
    height: 540,
    spawn: { x: 90, y: 410 },
    exit: { x: 884, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 800,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 50,
    maxReleaseRate: 99,
    targetSaved: 7,
    timeLimitMs: 180000,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 1,
      blocker: 2,
      builder: 2,
      basher: 3,
      miner: 0,
      digger: 3,
    },
    terrain,
  };
}
