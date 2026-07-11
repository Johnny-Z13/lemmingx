import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Sand Lab — free-play arena with living sand/water. Paint, dig, bomb, and
 * optionally shepherd a small crew. No quota win/lose.
 */
export function createLabLevel(seed = (Date.now() & 0xffff) || 1): LevelDefinition {
  const terrain = new Terrain(1280, 720, 4);

  // Basin floor + side walls (steel rim so the world doesn't spill forever).
  terrain.fillRect(0, 640, 1280, 80);
  terrain.fillRect(0, 200, 24, 520, MATERIAL.steel);
  terrain.fillRect(1256, 200, 24, 520, MATERIAL.steel);

  // Starter sand dune and a water pool pocket.
  terrain.fillRect(120, 520, 220, 120, MATERIAL.sand);
  terrain.fillRect(900, 580, 180, 60, MATERIAL.water);
  terrain.fillRect(880, 560, 40, 80); // dirt dam holding water

  // A diggable dirt shelf under the hatch.
  terrain.fillRect(200, 400, 400, 24);
  terrain.fillRect(480, 360, 40, 64);

  return {
    name: 'Sand Lab',
    width: 1280,
    height: 720,
    spawn: { x: 260, y: 380 },
    exit: { x: 1100, y: 596, width: 40, height: 44 },
    spawnIntervalMs: 600,
    totalLemmings: 20,
    releaseRate: 50,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 999,
    timeLimitMs: 0,
    caEnabled: true,
    caSeed: seed,
    caSubsteps: 4,
    sandEmitRatio: 0.55,
    stabilityThreshold: 2,
    sandLab: true,
    skills: {
      climber: 10,
      floater: 10,
      bomber: 20,
      blocker: 10,
      builder: 20,
      basher: 20,
      miner: 10,
      digger: 20,
      swimmer: 10,
    },
    terrain,
  };
}
