import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Prototype 12 — "World Kit".
 * Keeps the hatch queue, but promotes the hatch and exit to player-placeable
 * entities during planning. This probes a tiny level-editor-like play loop
 * without committing the project to a full editor.
 */
export function createLevel12(): LevelDefinition {
  const terrain = new Terrain(1280, 720, 4);

  // Steel world rim; dirt islands make hatch/exit placement visibly meaningful.
  terrain.fillRect(0, 668, 1280, 52, MATERIAL.steel);
  terrain.fillRect(0, 200, 20, 520, MATERIAL.steel);
  terrain.fillRect(1260, 200, 20, 520, MATERIAL.steel);
  terrain.fillRect(48, 250, 250, 24);
  terrain.fillRect(380, 420, 260, 24);
  terrain.fillRect(720, 260, 210, 24);
  terrain.fillRect(1010, 520, 210, 148);

  // A material playground below the islands: water, floating wood, fire fuel,
  // and a steel-backed sand pile that can be bombed without deleting the rim.
  terrain.fillRect(80, 590, 360, 78);
  terrain.fillRect(100, 536, 320, 54, MATERIAL.water);
  terrain.fillRect(180, 508, 120, 12, MATERIAL.wood);
  terrain.fillRect(520, 580, 180, 88, MATERIAL.sand);
  terrain.fillRect(780, 560, 150, 108);
  terrain.fillRect(842, 432, 20, 128, MATERIAL.wood);

  return {
    name: 'World Kit',
    objective: 'Move the hatch and exit, order the queue, then release the experiment.',
    hint: 'Use the World row to drag or click-place Hatch and Exit. They lock when the run starts.',
    width: 1280,
    height: 720,
    spawn: { x: 140, y: 226 },
    exit: { x: 1120, y: 476, width: 40, height: 44 },
    spawnIntervalMs: 650,
    totalLemmings: 16,
    releaseRate: 55,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 1,
    timeLimitMs: 0,
    caEnabled: true,
    caSeed: 1212,
    caSubsteps: 4,
    sandEmitRatio: 0.55,
    stabilityThreshold: 2,
    openToolbox: true,
    playMode: {
      spawn: 'automatic-hatch',
      goal: 'free-play',
      worldTools: ['hatch', 'exit'],
    },
    emitters: [
      { x: 610, y: 318, material: 'water', cellsPerSecond: 3, budget: 180 },
      { x: 910, y: 350, material: 'sand', cellsPerSecond: 4, budget: 160 },
    ],
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
