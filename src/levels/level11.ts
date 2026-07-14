import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Prototype 11 — "Drop Zone".
 * Crew are pieces in the player's tray: drag or click a role, place it in the
 * world, then start time. The map deliberately puts several role/material
 * interactions in one screen rather than prescribing a solution.
 */
export function createLevel11(): LevelDefinition {
  const terrain = new Terrain(960, 540, 4);

  // Steel catch tray keeps loose materials inside the experiment.
  terrain.fillRect(0, 504, 960, 36, MATERIAL.steel);
  terrain.fillRect(0, 180, 16, 360, MATERIAL.steel);
  terrain.fillRect(944, 180, 16, 360, MATERIAL.steel);

  // Fatal-drop perch: a Floater placement makes this a safe entrance.
  terrain.fillRect(40, 180, 210, 20);
  terrain.fillRect(210, 120, 20, 60);

  // Deep pool with dirt banks and a timber raft ready to be floated or burned.
  terrain.fillRect(300, 460, 260, 44);
  terrain.fillRect(300, 396, 20, 108);
  terrain.fillRect(540, 396, 20, 108);
  terrain.fillRect(320, 416, 220, 44, MATERIAL.water);
  terrain.fillRect(382, 382, 96, 12, MATERIAL.wood);

  // Burnable gate and diggable mound create a second little play pocket.
  terrain.fillRect(620, 432, 220, 72);
  terrain.fillRect(682, 332, 20, 100, MATERIAL.wood);
  terrain.fillRect(760, 384, 80, 48, MATERIAL.sand);

  return {
    name: 'Drop Zone',
    objective: 'Place a hand-picked crew directly into the living world.',
    hint: 'Drag a coloured role into the map, or select it and click. Compose first, then press Start.',
    width: 960,
    height: 540,
    spawn: { x: 140, y: 156 },
    exit: { x: 872, y: 460, width: 40, height: 44 },
    spawnIntervalMs: 650,
    totalLemmings: 16,
    releaseRate: 50,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 1,
    timeLimitMs: 0,
    caEnabled: true,
    caSeed: 1111,
    caSubsteps: 4,
    sandEmitRatio: 0.55,
    stabilityThreshold: 2,
    openToolbox: true,
    playMode: { spawn: 'tray-drop', goal: 'free-play' },
    emitters: [
      { x: 812, y: 258, material: 'sand', cellsPerSecond: 4, budget: 120 },
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
