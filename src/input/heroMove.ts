export type HeroMovePhase = 'idle' | 'armed' | 'focused' | 'resolving';

/** Scarce by design: campaign levels offer two decisive moments, rising to three late-game. */
export function heroMoveChargesForLevel(levelIndex: number, campaignCount: number): number {
  if (levelIndex < 0 || levelIndex >= campaignCount) return 0;
  return levelIndex < 7 ? 2 : 3;
}

export interface HeroMoveControlState {
  visible: boolean;
  canArm: boolean;
}

/** Keep the HUD promise identical to the scene-side arming preconditions. */
export function heroMoveControlState(
  charges: number,
  hasAssignableSkill: boolean,
  worldToolArmed: boolean,
): HeroMoveControlState {
  const visible = charges > 0 && hasAssignableSkill;
  return { visible, canArm: visible && !worldToolArmed };
}
