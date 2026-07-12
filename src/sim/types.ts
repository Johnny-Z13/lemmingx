import type { Terrain } from './Terrain';

/**
 * The eight classic skills plus Swimmer. Two kinds:
 * - State skills replace what the lemming is doing (blocker/builder/basher/
 *   miner/digger/bomber).
 * - Trait skills are permanent modifiers layered on top of normal walking/falling
 *   (climber/floater/swimmer): traits stack with the current movement state.
 */
export type Skill =
  | 'climber'
  | 'floater'
  | 'bomber'
  | 'blocker'
  | 'builder'
  | 'basher'
  | 'miner'
  | 'digger'
  | 'swimmer';

/** Classic Lemmings panel order — drives HUD button order and hotkeys 1–9. */
export const ALL_SKILLS: readonly Skill[] = [
  'climber',
  'floater',
  'bomber',
  'blocker',
  'builder',
  'basher',
  'miner',
  'digger',
  'swimmer',
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
  | 'treading' // bobbing at a deep-water surface (safe but stuck)
  | 'swimming' // swimmer trait crossing a water surface
  | 'shrug' // classic builder "oh no" after finishing / hitting a wall
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

/**
 * A level-authored material spout: pours whole terrain cells at a fixed,
 * deterministic rate (no RNG — the seeded CA scatters the pile as it settles).
 */
export interface EmitterDefinition extends Point {
  material: 'sand' | 'water';
  /** Whole cells emitted per second while the spout cell is empty. */
  cellsPerSecond: number;
  /** Total cells this emitter may produce; it goes quiet at 0. */
  budget: number;
}

export interface EmitterState {
  def: EmitterDefinition;
  budgetLeft: number;
  /** Fractional cells accrued toward the next emission. */
  accumulatorCells: number;
}

export interface LevelDefinition {
  /** Optional human-readable name shown in the HUD / level select. */
  name?: string;
  /** Player-facing mission shown before the hatch opens. */
  objective?: string;
  /** Short route cue; alternatives remain possible through the open toolbox. */
  hint?: string;
  width: number;
  height: number;
  spawn: Point;
  exit: ExitZone;
  terrain: Terrain;
  /** Simulated death zones. Empty/omitted means no hazards. */
  hazards?: HazardZone[];
  /** Animated single-victim traps. Empty/omitted means none. */
  traps?: TrapDefinition[];
  /** Material spouts (sand pours, springs). Empty/omitted means none. */
  emitters?: EmitterDefinition[];
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
  /**
   * Living-terrain CA. When omitted, defaults enable sand/water physics with
   * a fixed seed so campaign play stays deterministic.
   */
  caEnabled?: boolean;
  /** Seed for CA PRNG. Default 1. */
  caSeed?: number;
  /** CA passes per sim step. Default 3. */
  caSubsteps?: number;
  /**
   * Fraction of dig debris grains to spray as sand near a carve (0–1).
   * Default 0.5. Dig tunnels stay empty; sand falls in from around the bite.
   */
  sandEmitRatio?: number;
  /**
   * Dirt with fewer than this many solid neighbors becomes sand.
   * 0 (default) disables collapse.
   */
  stabilityThreshold?: number;
  /** Limited landscape paint charges for campaign sandworld puzzles. */
  landscape?: {
    water?: number;
    sand?: number;
    dirt?: number;
    wood?: number;
    fire?: number;
    erase?: number;
  };
  /** Unlimited crew skills and terrain tools while campaign objectives remain active. */
  openToolbox?: boolean;
  /** Sand Lab free-play arena (no quota pressure; paint tools on). */
  sandLab?: boolean;
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
  | 'drown' // sealed under water/sand past the grace, or a hazard zone
  | 'splash' // entered deep water (safe — water breaks falls)
  | 'burn' // touched living fire
  | 'explode'
  | 'dig'
  | 'bash'
  | 'build'
  | 'shrug' // builder finished or hit a wall
  | 'land' // survived a fall (soft thud / squash)
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
  /** Permanent trait: crosses deep water instead of treading in place. */
  isSwimmer: boolean;
  /**
   * How long the head has been sealed (water or solid, no air). Past the
   * grace window the lemming drowns/suffocates — the only water/sand death.
   */
  sealedMs: number;
  /**
   * Bomber fuse in ms once armed, else null. Counts down regardless of state;
   * at zero the lemming explodes, carving terrain and dying.
   */
  fuseMs: number | null;
  /** Remaining ms of landing squash/stretch (0 when idle). */
  squashMs: number;
  /**
   * Skill prepaid via the hatch queue. Applied on spawn when possible, otherwise
   * once the lemming is grounded (so queued diggers/bashers still work).
   */
  pendingHatchSkill: Skill | null;
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
  /** Live emitter states (parallel to level.emitters). */
  emitters: EmitterState[];
  /** Remaining hatch-opening ms; spawning starts at 0. */
  hatchOpenMs: number;
  /** Total hatch-opening duration (for animation progress). */
  hatchTotalMs: number;
  /**
   * Skills pre-loaded onto the next hatch releases (front = next spawn).
   * Limited toolboxes consume stock; open toolboxes queue without consuming.
   */
  hatchQueue: Skill[];
  /** Remaining landscape paint charges for limited-toolbox levels. */
  landscape: { water: number; sand: number; dirt: number; wood: number; fire: number; erase: number };
}
