import { MATERIAL, Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 7 — "Trial by Fire".
 * A timber choke seals the only opening through a steel bulkhead. Ignite it
 * during planning, watch the wood burn away, then release the crew through.
 */
export function createLevel7(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  // Raised route keeps both burn targets visible above the control dock.
  terrain.fillRect(0, 360, 960, 180);
  // Steel makes every route immutable except the deliberately combustible door.
  terrain.fillRect(480, 190, 80, 140, MATERIAL.steel);
  terrain.fillRect(490, 330, 60, 30, MATERIAL.wood);
  // A second steel arch makes the second charge mechanical, not decoration.
  terrain.fillRect(640, 190, 100, 140, MATERIAL.steel);
  terrain.fillRect(650, 330, 80, 30, MATERIAL.wood);
  // A protected quencher tank contrasts water against fire without letting it
  // reach the door. The steel catwalk keeps the exit route deterministic.
  terrain.eraseRect(760, 360, 90, 180);
  terrain.fillRect(760, 354, 90, 12, MATERIAL.steel);
  terrain.fillRect(760, 510, 90, 30, MATERIAL.steel);
  terrain.fillRect(760, 480, 90, 30, MATERIAL.water);

  return {
    name: 'Trial by Fire',
    objective: 'Burn through both timber obstacles and save at least 8 lemmings.',
    hint: 'Use one Fire charge on each timber choke. Let both burn clear before Start.',
    width: 960,
    height: 540,
    spawn: { x: 80, y: 336 },
    exit: { x: 880, y: 316, width: 40, height: 44 },
    spawnIntervalMs: 800,
    totalLemmings: 10,
    releaseRate: 45,
    minReleaseRate: 30,
    maxReleaseRate: 99,
    targetSaved: 8,
    timeLimitMs: 240000,
    caSeed: 77,
    caSubsteps: 4,
    openToolbox: false,
    landscape: { fire: 2 },
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
