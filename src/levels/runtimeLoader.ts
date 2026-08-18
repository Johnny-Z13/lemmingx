import type { LevelDefinition } from '../sim/types';
import { createLevel1 } from './level1';
import { createLevel2 } from './level2';
import { createLevel3 } from './level3';
import { LEVEL_COUNT, PROTOTYPE_START_INDEX, SAND_LAB_INDEX } from './catalog';

const FIRST_FACTORIES = [createLevel1, createLevel2, createLevel3] as const;
const LATER_LOADERS = [
  () => import('./level4').then(({ createLevel4 }) => createLevel4),
  () => import('./level5').then(({ createLevel5 }) => createLevel5),
  () => import('./level6').then(({ createLevel6 }) => createLevel6),
  () => import('./level7').then(({ createLevel7 }) => createLevel7),
  () => import('./level8').then(({ createLevel8 }) => createLevel8),
  () => import('./level9').then(({ createLevel9 }) => createLevel9),
  () => import('./level10').then(({ createLevel10 }) => createLevel10),
] as const;

/** Critical entry owns Sites 1–3; later Expeditions, prototypes, and Yard stream on demand. */
export async function loadLevelAt(index: number): Promise<LevelDefinition> {
  if (index === SAND_LAB_INDEX) {
    const { createLabLevel } = await import('./lab');
    return { ...createLabLevel(), openToolbox: true };
  }
  if (!__PLAYER_BUILD__ || __DEV_SANDBOX_AVAILABLE__) {
    if (index >= PROTOTYPE_START_INDEX && index < SAND_LAB_INDEX) {
      const factory = index === PROTOTYPE_START_INDEX
        ? (await import('./level11')).createLevel11
        : (await import('./level12')).createLevel12;
      const level = factory();
      return { ...level, openToolbox: level.openToolbox ?? true };
    }
  }
  const clamped = Math.max(0, Math.min(LEVEL_COUNT - 1, index));
  const factory = clamped < FIRST_FACTORIES.length
    ? FIRST_FACTORIES[clamped]
    : await LATER_LOADERS[clamped - FIRST_FACTORIES.length]();
  const level = factory();
  return { ...level, openToolbox: level.openToolbox ?? false };
}
