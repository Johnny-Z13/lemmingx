import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 2 — "The Deep End".
 * A deep, steel-bottomed pool blocks the only route. This is a challenge-loadout
 * stage: every rescue must be given the Swimmer trait before or during its tread.
 *
 * Intended solution: queue swimmers before release, or click treaders in the pool.
 */
export function createLevel2(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Banks sit flush with a 90px-deep pool so swimmers can climb out either side.
  terrain.fillRect(0, 430, 380, 110);
  terrain.fillRect(560, 430, 400, 110);
  terrain.fillRect(380, 520, 180, 20, MATERIAL.steel);
  terrain.fillRect(380, 430, 180, 90, MATERIAL.water);

  return {
    name: 'The Deep End',
    objective: 'Give at least 6 lemmings the Swimmer trait and cross the deep pool.',
    hint: 'This is a locked loadout: queue Swimmers before release or rescue treaders mid-pool.',
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
    openToolbox: false,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 0,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 0,
      swimmer: 10,
    },
    terrain,
  };
}
