import { Terrain } from '../sim/Terrain';
import type { LevelDefinition } from '../sim/types';

export function createDemoLevel(): LevelDefinition {
  const terrain = new Terrain(960, 540, 6);

  terrain.fillRect(0, 460, 960, 80);
  terrain.fillRect(0, 140, 388, 58);
  terrain.fillRect(284, 186, 104, 274);
  terrain.fillRect(388, 402, 328, 58);
  terrain.fillRect(792, 402, 168, 58);
  terrain.fillRect(518, 328, 108, 34);

  terrain.eraseCircle(742, 452, 54);
  terrain.eraseCircle(150, 460, 30);
  terrain.eraseCircle(286, 460, 36);

  return {
    name: 'Just Dig-ish',
    width: 960,
    height: 540,
    spawn: { x: 76, y: 116 },
    exit: { x: 884, y: 358, width: 42, height: 44 },
    hazards: [
      // Lava pit carved into the lower-right plateau — instant death.
      { x: 700, y: 470, width: 88, height: 70, kind: 'lava' },
    ],
    spawnIntervalMs: 850,
    totalLemmings: 10,
    releaseRate: 50,
    minReleaseRate: 50,
    maxReleaseRate: 99,
    targetSaved: 8,
    skills: {
      climber: 2,
      floater: 2,
      bomber: 1,
      blocker: 2,
      builder: 4,
      basher: 2,
      digger: 10,
    },
    terrain,
  };
}
