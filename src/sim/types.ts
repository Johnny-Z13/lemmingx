import type { Terrain } from './Terrain';

/**
 * The eight classic skills. Two kinds:
 * - State skills replace what the lemming is doing (blocker/builder/basher/
 *   miner/digger/bomber).
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
  | 'miner'
  | 'digger';

/** Classic Lemmings panel order — drives HUD button order and hotkeys 1–8. */
export const ALL_SKILLS: readonly Skill[] = [
  'climber',
  'floater',
  'bomber',
  'blocker',
  'builder',
  'basher',
  'miner',
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
  | 'miner' // carving a diagonal tunnel downward
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

/**
 * Animated single-victim traps (vs. hazards, which kill everything that
 * touches them). A trap in `idle` kills the first lemming entering its trigger
 * box, plays its kill animation for `cycleMs`, then re-arms — lemmings passing
 * mid-cycle survive, exactly like the classic machines.
 */
export type TrapKind = 'crusher' | 'zapper' | 'chomper';

export interface TrapDefinition extends Point {
  width: number;
  height: number;
  kind: TrapKind;
  /** Kill-animation duration before the trap re-arms. Default 1400ms. */
  cycleMs?: number;
}

export interface TrapState {
  def: TrapDefinition;
  phase: 'idle' | 'killing';
  /** Remaining ms of the current kill cycle (0 when idle). */
  timerMs: number;
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
  /** Animated single-victim traps. Empty/omitted means none. */
  traps?: TrapDefinition[];
  /** Hatch-opening duration before the first spawn. Omit for the default. */
  hatchOpenMs?: number;
  spawnIntervalMs: number;
  totalLemmings: number;
  releaseRate: number;
  minReleaseRate: number;
  maxReleaseRate: number;
  targetSaved: number;
  skills: SkillInventory;
  /** Optional level time limit in ms. Omit/0 for no limit. */
  timeLimitMs?: number;
}

/**
 * One-shot things that happened during a sim step, drained by the renderer for
 * audio + particle feedback. Keeping these as data keeps the sim free of any
 * audio/render coupling.
 */
export type SimEventKind =
  | 'spawn'
  | 'assign'
  | 'exit'
  | 'splat' // fatal fall / off-bottom
  | 'drown' // died in a hazard
  | 'explode'
  | 'dig'
  | 'bash'
  | 'build'
  | 'clank' // carve attempt hit steel / a one-way wall the wrong way
  | 'trap' // a trap sprung on a victim (see trapKind)
  | 'nuke';

export interface SimEvent {
  kind: SimEventKind;
  x: number;
  y: number;
  /** Which machine sprung (only on 'trap' events). */
  trapKind?: TrapKind;
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
  /** Time left in ms when the level has a limit, else null (untimed). */
  timeRemainingMs: number | null;
  selectedSkill: Skill;
  outcome: 'running' | 'won' | 'lost';
  /** True once the nuke (mass self-destruct) has been triggered. */
  nuking: boolean;
  /** Live trap states (parallel to level.traps). */
  traps: TrapState[];
  /** Remaining hatch-opening ms; spawning starts at 0. */
  hatchOpenMs: number;
  /** Total hatch-opening duration (for animation progress). */
  hatchTotalMs: number;
}
