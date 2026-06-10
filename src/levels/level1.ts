import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 1 — "Just Dig-ish".
 * The gentlest possible puzzle. The whole crew spawns onto one long, safe floor
 * and can almost walk straight to the exit — but a low wall blocks the way. A
 * single basher tunnels through it (or a builder ramps over, or a digger drops
 * under). Generous skills and a forgiving quota; no hazards yet — lava arrives
 * in level 2. Designed to be solvable with one well-placed skill.
 */
export function createLevel1(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // One continuous, safe floor across the whole level.
  terrain.fillRect(0, 430, 960, 110);

  // A low wall partway across that the crew must get through/over/under.
  terrain.fillRect(560, 360, 40, 70);

  return {
    name: 'Just Dig-ish',
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
      climber: 2,
      floater: 2,
      bomber: 1,
      blocker: 2,
      builder: 4,
      basher: 4,
      digger: 4,
    },
    terrain,
  };
}
