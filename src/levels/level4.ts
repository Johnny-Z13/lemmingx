import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

/**
 * Level 4 — "The Long March".
 * The first level wider than the screen: a 2880px trek with three walls to
 * bash through. Mechanically gentle on purpose — the real lesson is the
 * camera (edge scroll / arrows / drag) and the minimap.
 *
 * Intended solution: bash each wall (x≈800, 1600, 2400) as the lead walker
 * reaches it.
 */
export function createLevel4(): LevelDefinition {
  const terrain = new Terrain(2880, 540, 6);

  terrain.fillRect(0, 430, 2880, 110);
  terrain.fillRect(800, 340, 40, 90);
  terrain.fillRect(1600, 340, 40, 90);
  terrain.fillRect(2400, 340, 40, 90);

  return {
    name: 'The Long March',
    objective: 'Guide at least 8 lemmings across the three-wall trek.',
    hint: 'Use the minimap and camera; breach each wall or redraw the route.',
    width: 2880,
    height: 540,
    spawn: { x: 90, y: 410 },
    exit: { x: 2790, y: 386, width: 40, height: 44 },
    spawnIntervalMs: 800,
    totalLemmings: 10,
    releaseRate: 60,
    minReleaseRate: 40,
    maxReleaseRate: 99,
    targetSaved: 8,
    timeLimitMs: 300000,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 1,
      blocker: 2,
      builder: 2,
      basher: 5,
      miner: 0,
      digger: 0,
      swimmer: 0,
    },
    terrain,
  };
}
