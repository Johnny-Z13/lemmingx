import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 1 — "First Steps".
 * One Basher breaches the floor of a contained reservoir. The dirt becomes
 * falling sand, water drains into the catch, and a timber pallet lifts into a
 * bridge for the swarm. This is the first-play promise in one real sim chain.
 */
export function createLevel1(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Banks and a retained steel-bottomed catch. Hatch and exit landmarks use
  // equal visual edge margins in the locked one-screen composition.
  terrain.fillRect(0, 430, 420, 110);
  terrain.fillRect(540, 430, 420, 110);
  terrain.fillRect(420, 486, 120, 54, MATERIAL.steel);
  terrain.fillRect(414, 430, 6, 56, MATERIAL.steel);

  // The thin dam is the only obstacle and emits visible sand as it is carved.
  terrain.fillRect(302, 354, 24, 76);

  // Timber starts on the catch floor and rises after the breach arms the spout.
  terrain.fillRect(426, 468, 108, 18, MATERIAL.wood);

  return {
    name: 'First Steps',
    objective: 'Break the dam and lift the timber bridge for the crew.',
    hint: 'Click a walker once; the Basher order fires when it reaches the dirt face.',
    width: 960,
    height: 540,
    spawn: { x: 160, y: 410 },
    exit: { x: 780, y: 386, width: 40, height: 44 },
    hatchOpenMs: 0,
    firstSpawnDelayMs: 120,
    spawnIntervalMs: 1050,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 50,
    maxReleaseRate: 99,
    targetSaved: 7,
    caSeed: 11,
    sandEmitRatio: 0,
    openToolbox: false,
    emitters: [
      ...[426, 450, 474, 498, 522, 534].map((x) => ({
        x,
        y: 390,
        material: 'water' as const,
        cellsPerSecond: 6,
        budget: 20,
        trigger: 'bash' as const,
      })),
      {
        x: 480,
        y: 390,
        material: 'sand',
        cellsPerSecond: 8,
        budget: 8,
        trigger: 'bash',
      },
    ],
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 0,
      builder: 0,
      basher: 1,
      miner: 0,
      digger: 0,
      swimmer: 0,
    },
    skillAssignmentBounds: {
      basher: { minX: 286, maxX: 308 },
    },
    terrain,
  };
}
