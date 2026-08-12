import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 2 — "Float the Way".
 * Water is the only active tool. Pour across the marked catch while the hatch
 * is closed, let the timber rise into a bridge, then explicitly start the run.
 */
export function createLevel2(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  terrain.fillRect(0, 430, 618, 110);
  terrain.fillRect(726, 430, 234, 110);
  terrain.fillRect(618, 480, 108, 60, MATERIAL.steel);
  terrain.fillRect(612, 430, 6, 50, MATERIAL.steel);
  terrain.fillRect(624, 462, 96, 18, MATERIAL.wood);

  return {
    name: 'Float the Way',
    objective: 'Pour water into the marked channel to lift the timber crossing.',
    hint: 'Drag Water across the channel, then press Start.',
    width: 960,
    height: 540,
    spawn: { x: 400, y: 410 },
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
    landscape: { water: 8 },
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 0,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 0,
      swimmer: 0,
    },
    terrain,
  };
}
