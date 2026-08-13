import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 2 — "Float the Way".
 * Water is the only active tool. A broad marked hydraulic lock sits between
 * the two banks: fill it while the hatch is closed, watch the timber rise to
 * the waterline, then explicitly start the run.
 */
export function createLevel2(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  terrain.fillRect(0, 430, 420, 110);
  terrain.fillRect(540, 430, 420, 110);
  terrain.fillRect(420, 486, 120, 54, MATERIAL.steel);
  terrain.fillRect(414, 430, 6, 56, MATERIAL.steel);
  terrain.fillRect(426, 468, 108, 18, MATERIAL.wood);

  return {
    name: 'Float the Way',
    objective: 'Fill the blue lock until the timber bridge rises to both banks.',
    hint: 'Pour Water across the glowing lock, watch it level out, then press Start.',
    width: 960,
    height: 540,
    spawn: { x: 80, y: 410 },
    exit: { x: 860, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 240000,
    caSeed: 22,
    openToolbox: false,
    landscape: { water: 10 },
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
