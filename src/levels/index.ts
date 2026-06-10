import type { LevelDefinition } from '../sim/types';
import { createLevel1 } from './level1';
import { createLevel2 } from './level2';
import { createLevel3 } from './level3';
import { createLevel4 } from './level4';
import { createLevel5 } from './level5';
import { createLevel6 } from './level6';
import { createLevel7 } from './level7';
import { createLevel8 } from './level8';
import { createLevel9 } from './level9';
import { createLevel10 } from './level10';

/**
 * Ordered level roster. Each entry is a factory so a fresh, mutable terrain is
 * built every time a level starts (terrain is destroyed during play). Add new
 * levels by writing a `levelN.ts` and appending its factory here.
 */
export const LEVELS: ReadonlyArray<() => LevelDefinition> = [
  createLevel1,
  createLevel2,
  createLevel3,
  createLevel4,
  createLevel5,
  createLevel6,
  createLevel7,
  createLevel8,
  createLevel9,
  createLevel10,
];

export const LEVEL_COUNT = LEVELS.length;

/** Build the level at `index`, clamped into range. */
export function createLevelAt(index: number): LevelDefinition {
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, index));
  return LEVELS[clamped]();
}
