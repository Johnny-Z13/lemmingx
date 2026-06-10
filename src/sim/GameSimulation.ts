import type { Lemming, LevelDefinition, SimulationState, Skill } from './types';

const WALK_SPEED = 26;
const GRAVITY = 360;
const MAX_SAFE_FALL = 38;
const BODY_HALF_WIDTH = 4;
const FOOT_Y = 14;
const HEAD_Y = -8;
const STEP_HEIGHT = 7;

export class GameSimulation {
  readonly level: LevelDefinition;
  readonly state: SimulationState;
  private nextLemmingId = 1;
  private spawnTimerMs = 0;

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
      selectedSkill: 'digger',
      outcome: 'running',
    };
  }

  step(deltaMs: number): void {
    if (this.state.outcome !== 'running') return;

    this.state.timeMs += deltaMs;
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

  assignSkill(lemmingId: number, skill: Skill): boolean {
    const lemming = this.state.lemmings.find((candidate) => candidate.id === lemmingId);
    if (!lemming || lemming.state === 'dead' || lemming.state === 'exited') return false;
    if (this.state.skills[skill] <= 0) return false;

    lemming.actionTimerMs = 0;
    if (skill === 'builder') {
      lemming.state = 'builder';
      lemming.buildSteps = 0;
      this.state.skills[skill] -= 1;
      return true;
    }
    if (skill === 'blocker') {
      lemming.state = 'blocker';
      lemming.velocityY = 0;
      this.state.skills[skill] -= 1;
      return true;
    }
    lemming.state = 'digger';
    this.state.skills[skill] -= 1;
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

  triggerPulse(): number {
    let changed = 0;
    for (const lemming of this.state.lemmings) {
      if (lemming.state === 'walker' || lemming.state === 'builder' || lemming.state === 'digger') {
        lemming.direction *= -1;
        changed += 1;
      }
    }
    return changed;
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
    });
    this.nextLemmingId += 1;
    this.state.spawned += 1;
  }

  private updateLemming(lemming: Lemming, deltaMs: number): void {
    if (lemming.state === 'dead' || lemming.state === 'exited' || lemming.state === 'blocker') return;

    if (this.isInsideExit(lemming)) {
      lemming.state = 'exited';
      this.state.saved += 1;
      return;
    }

    if (lemming.state === 'digger') {
      this.updateDigger(lemming, deltaMs);
      return;
    }

    if (lemming.state === 'builder') {
      this.updateBuilder(lemming, deltaMs);
      return;
    }

    if (!this.hasGroundBelow(lemming)) {
      if (lemming.state !== 'faller') {
        lemming.state = 'faller';
        lemming.fallStartY = lemming.y;
      }
      this.updateFaller(lemming, deltaMs);
      return;
    }

    lemming.state = 'walker';
    this.walk(lemming, deltaMs);
  }

  private updateDigger(lemming: Lemming, deltaMs: number): void {
    lemming.actionTimerMs += deltaMs;
    this.level.terrain.eraseRect(lemming.x - 8, lemming.y + 10, 16, 16);
    if (lemming.actionTimerMs >= 80) {
      lemming.actionTimerMs = 0;
      lemming.y += 4;
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
    }
  }

  private updateFaller(lemming: Lemming, deltaMs: number): void {
    const dt = deltaMs / 1000;
    lemming.velocityY += GRAVITY * dt;
    lemming.y += lemming.velocityY * dt;

    if (this.hasGroundBelow(lemming)) {
      const fallDistance = lemming.y - lemming.fallStartY;
      if (fallDistance > MAX_SAFE_FALL) {
        lemming.state = 'dead';
        this.state.lost += 1;
      } else {
        lemming.state = 'walker';
        lemming.velocityY = 0;
        lemming.y = this.findStandingY(lemming.x, lemming.y);
      }
    } else if (lemming.y > this.level.height + 28) {
      lemming.state = 'dead';
      this.state.lost += 1;
    }
  }

  private walk(lemming: Lemming, deltaMs: number): void {
    const distance = WALK_SPEED * (deltaMs / 1000) * lemming.direction;
    const nextX = lemming.x + distance;

    if (this.hitsWall(nextX, lemming.y, lemming.direction)) {
      const climbedY = this.findStepUp(lemming, nextX);
      if (climbedY === null) {
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

  private findStandingY(x: number, y: number): number {
    let candidateY = y;
    while (candidateY > 0 && this.level.terrain.isSolidAt(x, candidateY + FOOT_Y - 1)) {
      candidateY -= 1;
    }
    while (candidateY < this.level.height && !this.level.terrain.isSolidAt(x, candidateY + FOOT_Y + 1)) {
      candidateY += 1;
    }
    return candidateY;
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

    const allAccountedFor =
      this.state.spawned === this.level.totalLemmings &&
      this.state.lemmings.every((lemming) => lemming.state === 'dead' || lemming.state === 'exited');
    if (allAccountedFor) {
      this.state.outcome = 'lost';
    }
  }
}
