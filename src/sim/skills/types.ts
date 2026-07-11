import type { Lemming, LevelDefinition, Skill } from '../types';
import type { Terrain } from '../Terrain';

/**
 * The surface a skill is allowed to touch. The simulation implements this and
 * passes it to skill modules, so skill logic never reaches into private sim
 * internals — it only uses these well-defined operations.
 */
export interface SkillContext {
  readonly terrain: Terrain;
  readonly level: LevelDefinition;
  /** Kill a lemming and increment the lost counter. */
  killLemming(lemming: Lemming): void;
  /** Snap a lemming's feet onto the surface (bounded scan). */
  findStandingY(x: number, y: number): number;
  /** True if solid terrain supports the lemming's feet at its current position. */
  hasGroundBelow(lemming: Lemming): boolean;
  /** Begin a fall from the current Y (records fallStartY, sets faller state). */
  startFalling(lemming: Lemming): void;
}

/**
 * A skill definition. `assignableState` filter decides whether a given lemming
 * can currently take the skill; `onAssign` performs the assignment mutation.
 * Per-frame behavior for "state" skills lives in the sim's state machine, keyed
 * by the lemming's state — registry keeps assignment rules + metadata in one place.
 */
export interface SkillDef {
  readonly id: Skill;
  /** Short label for HUD. */
  readonly label: string;
  /** Single-character glyph for the HUD button. */
  readonly icon: string;
  /** Keyboard hotkey (1-based slot also works; this is the letter binding). */
  readonly hotkey: string;
  /**
   * Whether this lemming can receive the skill right now (e.g. a blocker can't
   * become a climber mid-block, a floater trait can't be applied twice,
   * digger/blocker need feet on the ground). `ctx` is available for probes
   * like `hasGroundBelow`.
   */
  canAssign(lemming: Lemming, ctx: SkillContext): boolean;
  /** Apply the skill to the lemming. Called only after canAssign passed. */
  onAssign(lemming: Lemming, ctx: SkillContext): void;
}
