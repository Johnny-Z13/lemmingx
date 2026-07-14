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
import { createLevel11 } from './level11';
import { createLevel12 } from './level12';
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

/** Always-unlocked mechanic experiments; deliberately outside campaign progression. */
export const PROTOTYPE_LEVELS: ReadonlyArray<() => LevelDefinition> = [createLevel11, createLevel12];
export const PROTOTYPE_START_INDEX = LEVEL_COUNT;
export const PROTOTYPE_LEVEL_INDICES = PROTOTYPE_LEVELS.map((_, offset) => PROTOTYPE_START_INDEX + offset);

/** Index for the Sand Lab free-play arena (not part of campaign or prototype slots). */
export const SAND_LAB_INDEX = PROTOTYPE_START_INDEX + PROTOTYPE_LEVELS.length;

/** Build a campaign level, prototype slot, or the Sand Lab from its select index. */
export function createLevelAt(index: number): LevelDefinition {
  if (index === SAND_LAB_INDEX) return { ...createLabLevel(), openToolbox: true };
  if (index >= PROTOTYPE_START_INDEX && index < SAND_LAB_INDEX) {
    const level = PROTOTYPE_LEVELS[index - PROTOTYPE_START_INDEX]();
    return { ...level, openToolbox: level.openToolbox ?? true };
  }
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, index));
  const level = LEVELS[clamped]();
  return { ...level, openToolbox: level.openToolbox ?? true };
}

export { createLabLevel, createLevel11, createLevel12 };
