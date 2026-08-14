export type HeroMovePhase = 'idle' | 'armed' | 'focused' | 'resolving';

/** Scarce by design: campaign levels offer two decisive moments, rising to three late-game. */
export function heroMoveChargesForLevel(levelIndex: number, campaignCount: number): number {
  if (levelIndex < 0 || levelIndex >= campaignCount) return 0;
  return levelIndex < 7 ? 2 : 3;
}
