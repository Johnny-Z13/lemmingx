import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 9 — "The Gauntlet".
 * Everything at once, both axes scrolling: a fatal drop off the start ledge
 * (floaters), a steel tower mid-terrace (climbers — picks just clank), a
 * second fatal drop off the terrace, and a zapper guarding the home stretch
 * that claims a victim or two from the marching column.
 *
 * Intended solution: make everyone a floater + climber on the start ledge;
 * the traits carry them through both drops and over the steel.
 */
export function createLevel9(): LevelDefinition {
  const terrain = new Terrain(2400, 810, 6);

  // High start ledge.
  terrain.fillRect(0, 150, 500, 22);
  // Mid terrace with a steel tower planted on it.
  terrain.fillRect(0, 400, 1600, 24);
  terrain.fillRect(1200, 300, 30, 100, MATERIAL.steel);
  // Ground floor running the full width.
  terrain.fillRect(0, 700, 2400, 110);

  return {
    name: 'The Gauntlet',
    objective: 'Get at least 6 through two fatal drops, steel, and a final trap.',
    hint: 'Queue Climbers, then give each release Floater on the start ledge before the first drop.',
    width: 2400,
    height: 810,
    spawn: { x: 80, y: 126 },
    exit: { x: 2300, y: 656, width: 40, height: 44 },
    traps: [{ x: 1900, y: 672, width: 14, height: 28, kind: 'zapper', cycleMs: 5000 }],
    spawnIntervalMs: 700,
    totalLemmings: 10,
    releaseRate: 70,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 6,
    timeLimitMs: 300000,
    openToolbox: false,
    skills: {
      climber: 10,
      floater: 10,
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
