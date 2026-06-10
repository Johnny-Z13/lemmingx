import type { Terrain } from './Terrain';

export type Skill = 'blocker' | 'builder' | 'digger';
export type SkillInventory = Record<Skill, number>;

export type LemmingState = 'walker' | 'faller' | 'blocker' | 'builder' | 'digger' | 'exited' | 'dead';

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
}
