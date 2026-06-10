import type { Lemming, LevelDefinition, SimEvent, SimEventKind, SimulationState, Skill } from './types';
import type { SkillContext } from './skills/types';
import { SKILL_DEFS, BOMBER_FUSE_MS } from './skills/registry';

const WALK_SPEED = 26;
const CLIMB_SPEED = 22;
const FLOAT_FALL_SPEED = 40; // terminal velocity while parachuting
const GRAVITY = 360;
const MAX_SAFE_FALL = 38;
const BODY_HALF_WIDTH = 4;
const FOOT_Y = 14;
const HEAD_Y = -8;
const STEP_HEIGHT = 7;
const BASH_INTERVAL_MS = 70; // time between basher bites
const BASH_REACH = 7; // how far ahead a basher carves per bite
const BOMBER_BLAST_RADIUS = 22;

export class GameSimulation {
  readonly level: LevelDefinition;
  readonly state: SimulationState;
  private nextLemmingId = 1;
  private spawnTimerMs = 0;
  private events: SimEvent[] = [];

  /** Take and clear the events accumulated since the last drain (for FX/audio). */
  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(kind: SimEventKind, x: number, y: number): void {
    this.events.push({ kind, x, y });
  }

  constructor(level: LevelDefinition) {
    this.level = level;
    this.state = {
      width: level.width,
      height: level.height,
      lemmings: [],
      spawned: 0,
      totalLemmings: level.totalLemmings,
      saved: 0,
      lost: 0,
      targetSaved: level.targetSaved,
      releaseRate: level.releaseRate,
      minReleaseRate: level.minReleaseRate,
      maxReleaseRate: level.maxReleaseRate,
      skills: { ...level.skills },
      timeMs: 0,
      timeRemainingMs: level.timeLimitMs && level.timeLimitMs > 0 ? level.timeLimitMs : null,
      selectedSkill: 'digger',
      outcome: 'running',
      nuking: false,
    };
  }

  step(deltaMs: number): void {
    if (this.state.outcome !== 'running') return;

    this.state.timeMs += deltaMs;
    if (this.state.timeRemainingMs !== null) {
      this.state.timeRemainingMs = Math.max(0, this.state.timeRemainingMs - deltaMs);
    }
    this.spawnTimerMs += deltaMs * (this.state.releaseRate / 50);
    while (this.state.spawned < this.level.totalLemmings && this.spawnTimerMs >= this.level.spawnIntervalMs) {
      this.spawnTimerMs -= this.level.spawnIntervalMs;
      this.spawnLemming();
    }

    for (const lemming of this.state.lemmings) {
      this.updateLemming(lemming, deltaMs);
    }
    this.resolveBlockers();
    this.updateOutcome();
  }

  /**
   * Assign a skill to a lemming by id, consuming one use if the registry's
   * `canAssign` rule accepts it and stock remains. Returns true on success.
   */
  assignSkill(lemmingId: number, skill: Skill): boolean {
    const lemming = this.state.lemmings.find((candidate) => candidate.id === lemmingId);
    if (!lemming || lemming.state === 'dead' || lemming.state === 'exited') return false;
    if (this.state.skills[skill] <= 0) return false;

    const def = SKILL_DEFS[skill];
    if (!def.canAssign(lemming)) return false;

    def.onAssign(lemming, this.skillContext());
    this.state.skills[skill] -= 1;
    this.emit('assign', lemming.x, lemming.y);
    return true;
  }

  setSelectedSkill(skill: Skill): void {
    this.state.selectedSkill = skill;
  }

  changeReleaseRate(delta: number): number {
    const next = this.state.releaseRate + delta;
    this.state.releaseRate = Math.max(this.state.minReleaseRate, Math.min(this.state.maxReleaseRate, next));
    return this.state.releaseRate;
  }

  /**
   * Arm every live lemming with a staggered bomber fuse — the classic "nuke"
   * panic button. Returns how many were armed.
   */
  nukeAll(): number {
    let armed = 0;
    let stagger = 0;
    for (const lemming of this.state.lemmings) {
      if (lemming.state === 'dead' || lemming.state === 'exited') continue;
      if (lemming.fuseMs !== null) continue;
      // Small stagger so they pop in a cascade rather than all at once.
      lemming.fuseMs = 600 + stagger;
      stagger += 120;
      armed += 1;
    }
    this.state.nuking = true;
    if (armed > 0) this.emit('nuke', this.level.spawn.x, this.level.spawn.y);
    return armed;
  }

  /** The limited operation surface exposed to skill modules. */
  private skillContext(): SkillContext {
    return {
      terrain: this.level.terrain,
      level: this.level,
      killLemming: (l) => this.kill(l),
      findStandingY: (x, y) => this.findStandingY(x, y),
      hasGroundBelow: (l) => this.hasGroundBelow(l),
      startFalling: (l) => this.beginFall(l),
    };
  }

  private spawnLemming(): void {
    this.state.lemmings.push({
      id: this.nextLemmingId,
      x: this.level.spawn.x,
      y: this.level.spawn.y,
      direction: 1,
      velocityY: 0,
      state: 'walker',
      buildSteps: 0,
      actionTimerMs: 0,
      fallStartY: this.level.spawn.y,
      isClimber: false,
      isFloater: false,
      fuseMs: null,
    });
    this.emit('spawn', this.level.spawn.x, this.level.spawn.y);
    this.nextLemmingId += 1;
    this.state.spawned += 1;
  }

  /**
   * Kill a lemming and record the loss (idempotent for already-dead). `cause`
   * picks the feedback flavour: a splat (fall), a drown (hazard), or none (the
   * caller already emitted its own event, e.g. an explosion).
   */
  private kill(lemming: Lemming, cause: 'splat' | 'drown' | 'silent' = 'splat'): void {
    if (lemming.state === 'dead' || lemming.state === 'exited') return;
    lemming.state = 'dead';
    lemming.actionTimerMs = 0; // reset so the splat sprite can fade from now
    this.state.lost += 1;
    if (cause !== 'silent') this.emit(cause, lemming.x, lemming.y);
  }

  /** Transition a lemming into a fresh fall from its current Y. */
  private beginFall(lemming: Lemming): void {
    lemming.state = 'faller';
    lemming.fallStartY = lemming.y;
    lemming.velocityY = 0;
  }

  private updateLemming(lemming: Lemming, deltaMs: number): void {
    if (lemming.state === 'dead' || lemming.state === 'exited') return;

    // Bomber fuse counts down in every active state. At zero it explodes.
    if (lemming.fuseMs !== null) {
      lemming.fuseMs -= deltaMs;
      if (lemming.fuseMs <= 0) {
        this.explode(lemming);
        return;
      }
    }

    // Hazards kill any lemming touching them, including blockers.
    if (this.isInHazard(lemming)) {
      this.kill(lemming, 'drown');
      return;
    }

    if (lemming.state === 'blocker') return;

    if (this.isInsideExit(lemming)) {
      lemming.state = 'exited';
      this.state.saved += 1;
      this.emit('exit', lemming.x, lemming.y);
      return;
    }

    if (lemming.state === 'digger') {
      this.updateDigger(lemming, deltaMs);
      return;
    }

    if (lemming.state === 'basher') {
      this.updateBasher(lemming, deltaMs);
      return;
    }

    if (lemming.state === 'builder') {
      this.updateBuilder(lemming, deltaMs);
      return;
    }

    if (lemming.state === 'climber') {
      this.updateClimber(lemming, deltaMs);
      return;
    }

    if (!this.hasGroundBelow(lemming)) {
      if (lemming.state !== 'faller') {
        this.beginFall(lemming);
      }
      this.updateFaller(lemming, deltaMs);
      return;
    }

    lemming.state = 'walker';
    this.walk(lemming, deltaMs);
  }

  /** Bomber detonation: carve a crater and kill the lemming. */
  private explode(lemming: Lemming): void {
    this.level.terrain.eraseCircle(lemming.x, lemming.y + 4, BOMBER_BLAST_RADIUS);
    this.emit('explode', lemming.x, lemming.y);
    lemming.fuseMs = null;
    this.kill(lemming, 'silent');
  }

  private updateDigger(lemming: Lemming, deltaMs: number): void {
    lemming.actionTimerMs += deltaMs;
    this.level.terrain.eraseRect(lemming.x - 8, lemming.y + 10, 16, 16);
    if (lemming.actionTimerMs >= 80) {
      lemming.actionTimerMs = 0;
      lemming.y += 4;
      this.emit('dig', lemming.x, lemming.y + 12);
    }
    if (!this.level.terrain.isSolidAt(lemming.x, lemming.y + FOOT_Y + 3)) {
      lemming.state = 'faller';
      lemming.fallStartY = lemming.y;
    }
  }

  private updateBuilder(lemming: Lemming, deltaMs: number): void {
    if (lemming.buildSteps >= 14) {
      lemming.state = 'walker';
      return;
    }

    lemming.actionTimerMs += deltaMs;
    if (lemming.actionTimerMs >= 96) {
      lemming.actionTimerMs = 0;
      const plankX = lemming.x + lemming.direction * (10 + lemming.buildSteps * 4);
      const plankY = lemming.y + FOOT_Y - 2 - lemming.buildSteps * 1.4;
      this.level.terrain.fillRect(plankX - 5, plankY, 10, 4);
      lemming.x += lemming.direction * 3.2;
      lemming.y -= 1.2;
      lemming.buildSteps += 1;
      this.emit('build', plankX, plankY);
    }
  }

  /**
   * Basher: carves horizontally in the facing direction, advancing through
   * solid terrain. Stops (reverts to walker) when there's no more wall ahead,
   * and falls if it bashes out the floor under itself.
   */
  private updateBasher(lemming: Lemming, deltaMs: number): void {
    // A basher keeps eating while solid material remains *beyond* the slab it
    // carves. We probe one body just past the carve depth — untouched terrain —
    // so detection never depends on what was already cleared. Once that lookahead
    // is clear, the wall is breached and the basher walks on.
    if (!this.wallAheadOfBasher(lemming)) {
      lemming.state = 'walker';
      lemming.y = this.findStandingY(lemming.x, lemming.y);
      return;
    }

    lemming.actionTimerMs += deltaMs;
    if (lemming.actionTimerMs < BASH_INTERVAL_MS) return;
    lemming.actionTimerMs = 0;

    // Carve a slab in front of the body at head-to-shin height (leaving the
    // floor intact), then step forward into the cleared space.
    const frontX = lemming.x + lemming.direction * BODY_HALF_WIDTH;
    const left = lemming.direction === 1 ? frontX : frontX - BASH_REACH;
    this.level.terrain.eraseRect(left, lemming.y + HEAD_Y, BASH_REACH, FOOT_Y - HEAD_Y - 1);
    this.emit('bash', frontX + lemming.direction * 2, lemming.y);
    lemming.x += lemming.direction * 3;

    if (!this.hasGroundBelow(lemming)) {
      this.beginFall(lemming);
    }
  }

  /**
   * True if solid terrain remains just past a basher's carve depth — i.e. there
   * is still wall to chew. Probing beyond the carve (rather than within it) keeps
   * detection independent of already-cleared terrain, so the basher reliably
   * eats fully through and then stops.
   */
  private wallAheadOfBasher(lemming: Lemming): boolean {
    const start = BODY_HALF_WIDTH + BASH_REACH;
    for (let dx = start; dx <= start + BODY_HALF_WIDTH * 2; dx += 1) {
      const probeX = lemming.x + lemming.direction * dx;
      for (let dy = HEAD_Y + 2; dy <= FOOT_Y - 3; dy += 2) {
        if (this.level.terrain.isSolidAt(probeX, lemming.y + dy)) return true;
      }
    }
    return false;
  }

  /**
   * Climber: scales straight up a wall on the side it's facing. Pops over the
   * top to resume walking when the wall ends, or detaches to a fall if the wall
   * vanishes mid-climb (e.g. bashed away).
   */
  private updateClimber(lemming: Lemming, deltaMs: number): void {
    const rise = CLIMB_SPEED * (deltaMs / 1000);
    const wallX = lemming.x + lemming.direction * (BODY_HALF_WIDTH + 1);

    // Still a wall beside the head? keep climbing.
    if (this.level.terrain.isSolidAt(wallX, lemming.y + HEAD_Y)) {
      lemming.y -= rise;
      // Lost the wall surface entirely (overhang/gap) -> fall away.
      if (!this.level.terrain.isSolidAt(wallX, lemming.y + 4)) {
        this.beginFall(lemming);
      }
      return;
    }

    // Reached the top: mount onto the ledge and resume walking.
    lemming.y -= STEP_HEIGHT;
    lemming.x += lemming.direction * (BODY_HALF_WIDTH + 2);
    lemming.state = 'walker';
    lemming.y = this.findStandingY(lemming.x, lemming.y);
  }

  private updateFaller(lemming: Lemming, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const floating = lemming.isFloater;

    if (floating) {
      // Parachute: capped descent speed, no fall damage on landing.
      lemming.velocityY = FLOAT_FALL_SPEED;
    } else {
      lemming.velocityY += GRAVITY * dt;
    }
    lemming.y += lemming.velocityY * dt;

    if (this.hasGroundBelow(lemming)) {
      const fallDistance = lemming.y - lemming.fallStartY;
      if (!floating && fallDistance > MAX_SAFE_FALL) {
        this.kill(lemming);
      } else {
        lemming.state = 'walker';
        lemming.velocityY = 0;
        lemming.y = this.findStandingY(lemming.x, lemming.y);
      }
    } else if (lemming.y > this.level.height + 28) {
      this.kill(lemming);
    }
  }

  private walk(lemming: Lemming, deltaMs: number): void {
    const distance = WALK_SPEED * (deltaMs / 1000) * lemming.direction;
    const nextX = lemming.x + distance;

    if (this.hitsWall(nextX, lemming.y, lemming.direction)) {
      const climbedY = this.findStepUp(lemming, nextX);
      if (climbedY === null) {
        // A climber scales the wall instead of turning around.
        if (lemming.isClimber) {
          lemming.state = 'climber';
          return;
        }
        lemming.direction *= -1;
        return;
      }
      lemming.y = climbedY;
    }

    lemming.x = Math.max(BODY_HALF_WIDTH, Math.min(this.level.width - BODY_HALF_WIDTH, nextX));
    lemming.y = this.findStandingY(lemming.x, lemming.y);
  }

  private resolveBlockers(): void {
    const blockers = this.state.lemmings.filter((lemming) => lemming.state === 'blocker');
    for (const blocker of blockers) {
      for (const lemming of this.state.lemmings) {
        if (lemming === blocker || lemming.state !== 'walker') continue;
        const closeX = Math.abs(lemming.x - blocker.x) < 13;
        const closeY = Math.abs(lemming.y - blocker.y) < 16;
        const movingTowardBlocker = Math.sign(blocker.x - lemming.x) === lemming.direction;
        if (closeX && closeY && movingTowardBlocker) {
          lemming.direction *= -1;
          lemming.x += lemming.direction * 4;
        }
      }
    }
  }

  private hasGroundBelow(lemming: Lemming): boolean {
    const y = lemming.y + FOOT_Y + 1;
    return (
      this.level.terrain.isSolidAt(lemming.x - BODY_HALF_WIDTH, y) ||
      this.level.terrain.isSolidAt(lemming.x + BODY_HALF_WIDTH, y) ||
      this.level.terrain.isSolidAt(lemming.x, y)
    );
  }

  private hitsWall(x: number, y: number, direction: -1 | 1): boolean {
    const probeX = x + direction * (BODY_HALF_WIDTH + 1);
    return this.level.terrain.isSolidAt(probeX, y + 2) || this.level.terrain.isSolidAt(probeX, y + HEAD_Y);
  }

  private findStepUp(lemming: Lemming, x: number): number | null {
    for (let step = 1; step <= STEP_HEIGHT; step += 1) {
      const candidateY = lemming.y - step;
      if (!this.hitsWall(x, candidateY, lemming.direction) && this.level.terrain.isSolidAt(x, candidateY + FOOT_Y + 1)) {
        return candidateY;
      }
    }
    return null;
  }

  /**
   * Snap a walking lemming vertically so its feet rest on the terrain surface.
   * Bounded scans (never more than STEP_HEIGHT in either direction) keep this
   * deterministic and cheap: a walker can step up a small lip or settle down a
   * shallow drop, but anything larger is handled by the faller path instead.
   */
  private findStandingY(x: number, y: number): number {
    // If feet are buried in terrain, climb out (up to one step height).
    let candidateY = y;
    for (let i = 0; i < STEP_HEIGHT && candidateY > 0; i += 1) {
      if (!this.level.terrain.isSolidAt(x, candidateY + FOOT_Y - 1)) break;
      candidateY -= 1;
    }
    // If feet are in the air, settle down onto the surface (up to one step height).
    for (let i = 0; i < STEP_HEIGHT && candidateY < this.level.height; i += 1) {
      if (this.level.terrain.isSolidAt(x, candidateY + FOOT_Y + 1)) break;
      candidateY += 1;
    }
    return candidateY;
  }

  private isInHazard(lemming: Lemming): boolean {
    const hazards = this.level.hazards;
    if (!hazards || hazards.length === 0) return false;
    // Approximate the body as a box from head to foot.
    const left = lemming.x - BODY_HALF_WIDTH;
    const right = lemming.x + BODY_HALF_WIDTH;
    const top = lemming.y + HEAD_Y;
    const bottom = lemming.y + FOOT_Y;
    for (const hazard of hazards) {
      if (
        right >= hazard.x &&
        left <= hazard.x + hazard.width &&
        bottom >= hazard.y &&
        top <= hazard.y + hazard.height
      ) {
        return true;
      }
    }
    return false;
  }

  private isInsideExit(lemming: Lemming): boolean {
    const exit = this.level.exit;
    return (
      lemming.x >= exit.x &&
      lemming.x <= exit.x + exit.width &&
      lemming.y >= exit.y - 8 &&
      lemming.y <= exit.y + exit.height
    );
  }

  private updateOutcome(): void {
    if (this.state.saved >= this.level.targetSaved) {
      this.state.outcome = 'won';
      return;
    }

    // Running out of time ends the level immediately on whatever's been saved.
    if (this.state.timeRemainingMs === 0) {
      this.state.outcome = this.state.saved >= this.level.targetSaved ? 'won' : 'lost';
      return;
    }

    const allAccountedFor =
      this.state.spawned === this.level.totalLemmings &&
      this.state.lemmings.every((lemming) => lemming.state === 'dead' || lemming.state === 'exited');
    if (allAccountedFor) {
      this.state.outcome = 'lost';
    }
  }
}
