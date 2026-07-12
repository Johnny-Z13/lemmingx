import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 6 — "Trap House".
 * Three killing machines guard the corridor: a crusher, a zapper, and a
 * chomper, each with a long re-arm cycle. The crew is released at a high rate
 * so it travels as one tight mob: each trap claims its first victim, then the
 * rest stream past while the machine resets. Teaches traps + the release-rate
 * dial. No skills required — only nerve. Four sand charges can bury a machine
 * outright — the mound carries the crew above its trigger box. A deep water
 * settling tank beneath a steel catwalk gives the flat factory a second visual
 * layer without changing the mob-rush timing lesson.
 */
export function createLevel6(): LevelDefinition {
  const terrain = new Terrain(1440, 540, 6);

  terrain.fillRect(0, 430, 1440, 110);

  // Contained industrial reservoir between the crusher and zapper. The steel
  // catwalk rises by one cell, so walkers can cross without a skill.
  terrain.eraseRect(580, 430, 160, 110);
  terrain.fillRect(580, 424, 160, 12, MATERIAL.steel);
  terrain.fillRect(580, 500, 160, 40, MATERIAL.steel);
  terrain.fillRect(580, 488, 160, 12, MATERIAL.water);

  return {
    name: 'Trap House',
    objective: 'Get at least 6 lemmings through the three-machine corridor.',
    hint: 'Send a tight wave while traps reset, or bury and bypass them.',
    width: 1440,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 1340, y: 386, width: 40, height: 44 },
    traps: [
      { x: 500, y: 402, width: 14, height: 28, kind: 'crusher', cycleMs: 5000 },
      { x: 800, y: 402, width: 14, height: 28, kind: 'zapper', cycleMs: 5000 },
      { x: 1100, y: 402, width: 14, height: 28, kind: 'chomper', cycleMs: 5000 },
    ],
    landscape: { sand: 4 },
    caSeed: 66,
    // A protected spout fills the settling tank beneath the catwalk over ~20s.
    emitters: [{ x: 660, y: 450, material: 'water', cellsPerSecond: 6, budget: 120 }],
    spawnIntervalMs: 600,
    totalLemmings: 10,
    releaseRate: 90,
    minReleaseRate: 60,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 240000,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 2,
      builder: 2,
      basher: 0,
      miner: 0,
      digger: 0,
      swimmer: 0,
    },
    terrain,
  };
}
