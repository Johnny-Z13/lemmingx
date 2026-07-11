import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 5 — "Steel Yourself".
 * Dig through the dirt slab west of the steel cap into the gallery; sand
 * debris from digging settles around the shaft. Steel clanks if you dig wrong.
 *
 * Intended solution: digger at x≈620 (any dirt west of the cap), crew follows
 * through the shaft and walks right to the exit.
 *
 * A spout east of the wall trickles sand into a dune on the steel cap —
 * living terrain dressing the lock (kept clear of the dig route so the
 * gallery below never silts shut).
 */
export function createLevel5(): LevelDefinition {
  const terrain = new Terrain(1440, 540, 6);

  // Main slab with a gallery + basement beneath. The gallery is a full cell
  // taller than a lemming so a one-cell debris bump can't pinch it shut.
  terrain.fillRect(0, 430, 1440, 30); // dirt slab (430..460)
  terrain.fillRect(0, 492, 1440, 48); // basement floor (492..540)

  // Steel wall on the slab + steel cap so you can't dig straight through it.
  terrain.fillRect(680, 330, 40, 100, MATERIAL.steel);
  terrain.fillRect(660, 430, 120, 30, MATERIAL.steel);

  return {
    name: 'Steel Yourself',
    objective: 'Save at least 7 by reaching the lower gallery beyond the steel lock.',
    hint: 'Steel cannot be erased or carved. Dig west of the cap or build around it.',
    width: 1440,
    height: 540,
    spawn: { x: 80, y: 406 },
    exit: { x: 1300, y: 446, width: 40, height: 44 },
    spawnIntervalMs: 900,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 7,
    timeLimitMs: 240000,
    caSeed: 55,
    sandEmitRatio: 0.4,
    emitters: [{ x: 744, y: 300, material: 'sand', cellsPerSecond: 5, budget: 200 }],
    skills: {
      climber: 0,
      floater: 0,
      bomber: 1,
      blocker: 2,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 3,
      swimmer: 0,
    },
    terrain,
  };
}
