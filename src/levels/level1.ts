import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 1 — "First Steps".
 * Bash through the low wall (or dig under / build over). Optional: press Q to
 * hatch-queue diggers so the first releases arrive already digging.
 */
export function createLevel1(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // One continuous, safe floor across the whole level.
  terrain.fillRect(0, 430, 960, 110);

  // A low wall partway across that the crew must get through/over/under.
  terrain.fillRect(560, 360, 40, 70);

  return {
    name: 'First Steps',
    objective: 'Get at least 7 lemmings past the wall and into the exit.',
    hint: 'Bash through, dig under, build over, or reshape the obstacle.',
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
    caSeed: 11,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 1,
      blocker: 2,
      builder: 2,
      basher: 3,
      miner: 0,
      digger: 3,
      swimmer: 0,
    },
    terrain,
  };
}
