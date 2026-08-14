export type HeroMovePhase = 'idle' | 'armed' | 'focused' | 'resolving';

/** Scarce by design: early levels teach one decisive move; late levels allow three. */
export function heroMoveChargesForLevel(levelIndex: number, campaignCount: number): number {
  if (levelIndex < 0 || levelIndex >= campaignCount) return 0;
  if (levelIndex < 3) return 1;
  if (levelIndex < 7) return 2;
  return 3;
}

