import { DEV_SANDBOX_ENABLED } from '../runtimeMode';

export const LEVEL_COUNT = 10;
export const PROTOTYPE_START_INDEX = LEVEL_COUNT;
export const PROTOTYPE_LEVEL_INDICES: readonly number[] = DEV_SANDBOX_ENABLED ? [10, 11] : [];
export const SAND_LAB_INDEX = PROTOTYPE_START_INDEX + PROTOTYPE_LEVEL_INDICES.length;
