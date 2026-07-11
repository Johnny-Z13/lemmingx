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
import { createLabLevel } from './lab';

/**
 * Ordered campaign roster. Each entry is a factory so a fresh, mutable terrain is
 * built every time a level starts (terrain is destroyed during play).
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

/** Index for the Sand Lab free-play arena (not part of campaign unlock chain). */
export const SAND_LAB_INDEX = LEVEL_COUNT;

/** Build the campaign level at `index`, or the Sand Lab when index === SAND_LAB_INDEX. */
export function createLevelAt(index: number): LevelDefinition {
  if (index === SAND_LAB_INDEX) return { ...createLabLevel(), openToolbox: true };
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, index));
  return { ...LEVELS[clamped](), openToolbox: true };
}

export { createLabLevel };
