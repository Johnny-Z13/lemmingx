import type { Terrain } from './Terrain';

/**
 * The eight classic skills. Two kinds:
 * - State skills replace what the lemming is doing (blocker/builder/basher/digger/bomber).
 * - Trait skills are permanent modifiers layered on top of normal walking/falling
 *   (climber/floater): a lemming can be a "climber walker" or a "floater faller".
 */
export type Skill =
  | 'climber'
  | 'floater'
  | 'bomber'
  | 'blocker'
  | 'builder'
  | 'basher'
  | 'digger';

export const ALL_SKILLS: readonly Skill[] = [
  'climber',
  'floater',
  'bomber',
  'blocker',
  'builder',
  'basher',
  'digger',
] as const;

export type SkillInventory = Record<Skill, number>;

export type LemmingState =
  | 'walker'
  | 'faller'
  | 'climber' // actively scaling a wall
  | 'blocker'
  | 'builder'
  | 'basher'
  | 'digger'
  | 'exited'
  | 'dead';

export interface Point {
  x: number;
  y: number;
}

export interface ExitZone extends Point {
  width: number;
  height: number;
}

/**
 * A hazard kills any lemming whose body overlaps it.
 * - `lava`/`water`: classic instant-death zones (lava = burn, water = drown).
 * - `pit` is handled separately by the off-bottom fall check, so it is not a zone.
 */
export type HazardKind = 'lava' | 'water';

export interface HazardZone extends Point {
  width: number;
  height: number;
  kind: HazardKind;
}

export interface LevelDefinition {
  /** Optional human-readable name shown in the HUD / level select. */
  name?: string;
  width: number;
  height: number;
  spawn: Point;
  exit: ExitZone;
  terrain: Terrain;
  /** Simulated death zones. Empty/omitted means no hazards. */
  hazards?: HazardZone[];
  spawnIntervalMs: number;
  totalLemmings: number;
  releaseRate: number;
  minReleaseRate: number;
  maxReleaseRate: number;
  targetSaved: number;
  skills: SkillInventory;
}

export interface Lemming {
  id: number;
  x: number;
  y: number;
  direction: -1 | 1;
  velocityY: number;
  state: LemmingState;
  buildSteps: number;
  actionTimerMs: number;
  fallStartY: number;
  /** Permanent trait: can scale vertical walls instead of turning. */
  isClimber: boolean;
  /** Permanent trait: opens a parachute, never dies from fall distance. */
  isFloater: boolean;
  /**
   * Bomber fuse in ms once armed, else null. Counts down regardless of state;
   * at zero the lemming explodes, carving terrain and dying.
   */
  fuseMs: number | null;
}

export interface SimulationState {
  width: number;
  height: number;
  lemmings: Lemming[];
  spawned: number;
  totalLemmings: number;
  saved: number;
  lost: number;
  targetSaved: number;
  releaseRate: number;
  minReleaseRate: number;
  maxReleaseRate: number;
  skills: SkillInventory;
  timeMs: number;
  selectedSkill: Skill;
  outcome: 'running' | 'won' | 'lost';
  /** True once the nuke (mass self-destruct) has been triggered. */
  nuking: boolean;
}
