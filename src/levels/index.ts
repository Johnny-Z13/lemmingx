import type { LevelDefinition } from '../sim/types';
import { createLevel1 } from './level1';
import { createLevel2 } from './level2';
import { createLevel3 } from './level3';

/**
 * Ordered level roster. Each entry is a factory so a fresh, mutable terrain is
 * built every time a level starts (terrain is destroyed during play). Add new
 * levels by writing a `levelN.ts` and appending its factory here.
 */
export const LEVELS: ReadonlyArray<() => LevelDefinition> = [createLevel1, createLevel2, createLevel3];

export const LEVEL_COUNT = LEVELS.length;

/** Build the level at `index`, clamped into range. */
export function createLevelAt(index: number): LevelDefinition {
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, index));
  return LEVELS[clamped]();
}
