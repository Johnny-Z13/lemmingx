import type { Lemming, LevelDefinition, SimEvent, SimEventKind, SimulationState, Skill } from './types';
import type { SkillContext } from './skills/types';
import { SKILL_DEFS } from './skills/registry';
import { MATERIAL } from './Terrain';
import { SeededRng } from './ca/SeededRng';
import { ChunkStepper } from './ca/ChunkStepper';

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
const MINE_INTERVAL_MS = 90; // time between miner pick swings
const BOMBER_BLAST_RADIUS = 22;
const HATCH_OPEN_MS = 900; // default door-opening time before the first spawn
const TRAP_CYCLE_MS = 1400; // default kill-animation length before a trap re-arms
const SHRUG_MS = 720; // classic builder "oh no" pose duration
const LAND_SQUASH_MS = 160;
const DEFAULT_CA_SUBSTEPS = 3;
/** Campaign default: no dig spray so scripted solutions stay stable. Lab overrides. */
const DEFAULT_SAND_EMIT = 0;

export class GameSimulation {
  readonly level: LevelDefinition;
  readonly state: SimulationState;
  private nextLemmingId = 1;
  private spawnTimerMs = 0;
  private events: SimEvent[] = [];
  private readonly caEnabled: boolean;
  private readonly caSubsteps: number;
  private readonly sandEmitRatio: number;
  private readonly stabilityThreshold: number;
  private readonly rng: SeededRng;
  private readonly ca: ChunkStepper | null;

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
    this.caEnabled = level.caEnabled !== false;
    this.caSubsteps = level.caSubsteps ?? DEFAULT_CA_SUBSTEPS;
    this.sandEmitRatio = level.sandEmitRatio ?? DEFAULT_SAND_EMIT;
    this.stabilityThreshold = level.stabilityThreshold ?? 0;
    this.rng = new SeededRng(level.caSeed ?? 1);
    this.ca = this.caEnabled ? new ChunkStepper(level.terrain, this.rng) : null;
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
      traps: (level.traps ?? []).map((def) => ({ def, phase: 'idle' as const, timerMs: 0 })),
      hatchOpenMs: level.hatchOpenMs ?? HATCH_OPEN_MS,
      hatchTotalMs: level.hatchOpenMs ?? HATCH_OPEN_MS,
      hatchQueue: [],
      landscape: {
        water: level.landscape?.water ?? 0,
        sand: level.landscape?.sand ?? 0,
        dirt: level.landscape?.dirt ?? 0,
        wood: level.landscape?.wood ?? 0,
        erase: level.landscape?.erase ?? 0,
      },
    };
  }

  step(deltaMs: number): void {
    if (this.state.outcome !== 'running') return;

    this.state.timeMs += deltaMs;
    if (this.state.timeRemainingMs !== null) {
      this.state.timeRemainingMs = Math.max(0, this.state.timeRemainingMs - deltaMs);
    }

    // The hatch doors swing open first; lemmings only pour out once they have.
    if (this.state.hatchOpenMs > 0) {
      this.state.hatchOpenMs = Math.max(0, this.state.hatchOpenMs - deltaMs);
    } else {
      this.spawnTimerMs += deltaMs * (this.state.releaseRate / 50);
      while (this.state.spawned < this.level.totalLemmings && this.spawnTimerMs >= this.level.spawnIntervalMs) {
        this.spawnTimerMs -= this.level.spawnIntervalMs;
        this.spawnLemming();
      }
    }

    for (const lemming of this.state.lemmings) {
      this.updateLemming(lemming, deltaMs);
    }
    this.updateTraps(deltaMs);
    this.resolveBlockers();

    // Living terrain settles after agents carve / bomb.
    if (this.ca) {
      this.ca.step(this.caSubsteps, this.stabilityThreshold);
    }

    this.updateOutcome();
  }

  /** Lab / tests: paint a material disc into the world. */
  paintCircle(x: number, y: number, radius: number, material: number): void {
    const cs = this.level.terrain.cellSize;
    const minX = Math.floor((x - radius) / cs);
    const maxX = Math.ceil((x + radius) / cs);
    const minY = Math.floor((y - radius) / cs);
    const maxY = Math.ceil((y + radius) / cs);
    const r2 = radius * radius;
    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        const wx = cx * cs + cs / 2;
        const wy = cy * cs + cs / 2;
        if ((wx - x) ** 2 + (wy - y) ** 2 <= r2) {
          this.level.terrain.setCell(cx, cy, material as 0 | 1 | 2 | 3 | 4 | 5 | 6);
        }
      }
    }
    this.ca?.markWorldRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  /** Lab: detonate a sand-debris bomb at a point. */
  labBomb(x: number, y: number, radius = BOMBER_BLAST_RADIUS): void {
    this.level.terrain.carveCircle(x, y, radius, 'sand');
    this.ca?.markWorldRect(x - radius, y - radius, radius * 2, radius * 2);
    this.emit('explode', x, y);
  }

  /** Expose CA settle for tests. */
  settleTerrain(maxPasses = 400): number {
    return this.ca?.settleUntilQuiet(maxPasses, this.stabilityThreshold) ?? 0;
  }

  private sprayDigDebris(x: number, y: number, carved: number): void {
    if (!this.ca || carved <= 0 || this.sandEmitRatio <= 0) return;
    const count = Math.max(1, Math.round(carved * this.sandEmitRatio));
    this.level.terrain.emitSandDebris(x, y, count, () => this.rng.next());
    this.ca.markWorldRect(x - 20, y - 24, 40, 40);
  }

  /**
   * Traps: an idle trap springs on the first live lemming inside its trigger
   * box, killing it and playing its cycle; victims passing mid-cycle survive.
   */
  private updateTraps(deltaMs: number): void {
    for (const trap of this.state.traps) {
      if (trap.phase === 'killing') {
        trap.timerMs -= deltaMs;
        if (trap.timerMs <= 0) {
          trap.phase = 'idle';
          trap.timerMs = 0;
        }
        continue;
      }
      const { def } = trap;
      const victim = this.state.lemmings.find(
        (l) => l.state !== 'dead' && l.state !== 'exited' && this.bodyOverlapsBox(l, def.x, def.y, def.width, def.height),
      );
      if (victim) {
        this.kill(victim, 'silent');
        this.events.push({ kind: 'trap', x: def.x + def.width / 2, y: def.y + def.height / 2, trapKind: def.kind });
        trap.phase = 'killing';
        trap.timerMs = def.cycleMs ?? TRAP_CYCLE_MS;
      }
    }
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
    const ctx = this.skillContext();
    if (!def.canAssign(lemming, ctx)) return false;

    def.onAssign(lemming, ctx);
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
    const lemming: Lemming = {
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
      squashMs: 0,
      pendingHatchSkill: null,
    };
    this.state.lemmings.push(lemming);
    this.emit('spawn', this.level.spawn.x, this.level.spawn.y);
    this.nextLemmingId += 1;
    this.state.spawned += 1;

    // Hatch queue: prepaid skill — apply now if possible, else on first grounded frame.
    const queued = this.state.hatchQueue.shift();
    if (queued) {
      lemming.pendingHatchSkill = queued;
      this.tryApplyPendingHatchSkill(lemming);
    }
  }

  /** Apply a hatch-queued skill once the lemming can accept it (usually grounded). */
  private tryApplyPendingHatchSkill(lemming: Lemming): void {
    const skill = lemming.pendingHatchSkill;
    if (!skill) return;
    const def = SKILL_DEFS[skill];
    if (!def.canAssign(lemming, this.skillContext())) return;
    def.onAssign(lemming, this.skillContext());
    lemming.pendingHatchSkill = null;
    this.emit('assign', lemming.x, lemming.y);
  }

  /**
   * Pre-load the hatch: consume one skill charge and append to the release
   * queue so the next lemming(s) spawn already assigned (e.g. diggers first).
   */
  enqueueRelease(skill: Skill): boolean {
    if (this.state.outcome !== 'running') return false;
    if (this.state.skills[skill] <= 0) return false;
    const remaining = this.level.totalLemmings - this.state.spawned;
    if (this.state.hatchQueue.length >= remaining) return false;
    this.state.skills[skill] -= 1;
    this.state.hatchQueue.push(skill);
    return true;
  }

  /** Cancel the last queued release and refund the skill. */
  popReleaseQueue(): boolean {
    const skill = this.state.hatchQueue.pop();
    if (!skill) return false;
    this.state.skills[skill] += 1;
    return true;
  }

  /**
   * Campaign landscape paint — consumes a charge from `state.landscape`.
   * Returns false if that material has no charges left.
   */
  paintLandscape(
    x: number,
    y: number,
    radius: number,
    kind: 'water' | 'sand' | 'dirt' | 'wood' | 'erase',
  ): boolean {
    const stock = this.state.landscape[kind];
    if (stock <= 0 && !this.level.sandLab) return false;
    if (!this.level.sandLab) this.state.landscape[kind] -= 1;
    const mat =
      kind === 'water' ? MATERIAL.water :
      kind === 'sand' ? MATERIAL.sand :
      kind === 'dirt' ? MATERIAL.dirt :
      kind === 'wood' ? MATERIAL.wood :
      MATERIAL.empty;
    this.paintCircle(x, y, radius, mat);
    return true;
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
    lemming.squashMs = 0;
  }

  /** Classic builder shrug — brief "oh no", then resume walking. */
  private beginShrug(lemming: Lemming): void {
    lemming.state = 'shrug';
    lemming.actionTimerMs = SHRUG_MS;
    lemming.velocityY = 0;
    this.emit('shrug', lemming.x, lemming.y);
  }

  private updateLemming(lemming: Lemming, deltaMs: number): void {
    if (lemming.state === 'dead' || lemming.state === 'exited') return;

    if (lemming.squashMs > 0) {
      lemming.squashMs = Math.max(0, lemming.squashMs - deltaMs);
    }

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

    if (lemming.state === 'shrug') {
      lemming.actionTimerMs -= deltaMs;
      if (lemming.actionTimerMs <= 0) {
        lemming.state = 'walker';
        lemming.y = this.findStandingY(lemming.x, lemming.y);
      }
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

    if (lemming.state === 'miner') {
      this.updateMiner(lemming, deltaMs);
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
    this.tryApplyPendingHatchSkill(lemming);
    if (lemming.state !== 'walker') return;
    this.walk(lemming, deltaMs);
  }

  /** Bomber detonation: sand-debris crater (steel survives). */
  private explode(lemming: Lemming): void {
    this.level.terrain.carveCircle(lemming.x, lemming.y + 4, BOMBER_BLAST_RADIUS, 'sand');
    this.ca?.markWorldRect(
      lemming.x - BOMBER_BLAST_RADIUS,
      lemming.y - BOMBER_BLAST_RADIUS,
      BOMBER_BLAST_RADIUS * 2,
      BOMBER_BLAST_RADIUS * 2,
    );
    this.emit('explode', lemming.x, lemming.y);
    lemming.fuseMs = null;
    this.kill(lemming, 'silent');
  }

  /** Stop a worker that hit uncarvable terrain: clank feedback, back to walking. */
  private cancelOnUncarvable(lemming: Lemming, atX: number, atY: number): void {
    this.emit('clank', atX, atY);
    lemming.state = 'walker';
    lemming.y = this.findStandingY(lemming.x, lemming.y);
  }

  /**
   * Digger: bite-and-descend cycle. Each bite removes the slab directly under
   * the feet and the digger settles into it, so it rides its own pit down —
   * it never free-falls between bites. Steel underfoot ends the job; an empty
   * pocket below means the shaft broke through into a cavity, so it falls.
   */
  private updateDigger(lemming: Lemming, deltaMs: number): void {
    lemming.actionTimerMs += deltaMs;
    if (lemming.actionTimerMs < 80) return;
    lemming.actionTimerMs = 0;

    // Steel where the next bite would go stops the dig (standing on the slab).
    if (this.level.terrain.materialAt(lemming.x, lemming.y + FOOT_Y + 2) === MATERIAL.steel) {
      this.cancelOnUncarvable(lemming, lemming.x, lemming.y + FOOT_Y);
      return;
    }

    this.level.terrain.carveRect(lemming.x - 8, lemming.y + FOOT_Y, 16, 5, 0);
    this.sprayDigDebris(lemming.x, lemming.y + FOOT_Y, 8);
    // Descend with the bite and settle onto the new shaft floor (the carve can
    // clear slightly deeper than 4px when it straddles a cell row).
    lemming.y = this.findStandingY(lemming.x, lemming.y + 4);
    this.emit('dig', lemming.x, lemming.y + FOOT_Y);

    // Broke through into open air below -> fall.
    if (!this.hasGroundBelow(lemming)) {
      this.beginFall(lemming);
    }
  }

  private updateBuilder(lemming: Lemming, deltaMs: number): void {
    if (lemming.buildSteps >= 14) {
      this.beginShrug(lemming);
      return;
    }

    lemming.actionTimerMs += deltaMs;
    if (lemming.actionTimerMs >= 96) {
      lemming.actionTimerMs = 0;

      // Head/torso blocked by a wall ahead → classic shrug (not own bricks).
      if (this.hitsWall(lemming.x + lemming.direction * 4, lemming.y - 2, lemming.direction)) {
        this.beginShrug(lemming);
        return;
      }

      const plankX = lemming.x + lemming.direction * (10 + lemming.buildSteps * 4);
      const plankY = lemming.y + FOOT_Y - 2 - lemming.buildSteps * 1.4;
      this.level.terrain.fillRect(plankX - 5, plankY, 10, 4);
      this.ca?.markWorldRect(plankX - 5, plankY, 10, 4);
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
    // floor intact), then step forward into the cleared space. Steel — or a
    // one-way wall against our direction — refuses the bite and ends the job.
    const frontX = lemming.x + lemming.direction * BODY_HALF_WIDTH;
    const left = lemming.direction === 1 ? frontX : frontX - BASH_REACH;
    const bite = this.level.terrain.carveRect(left, lemming.y + HEAD_Y, BASH_REACH, FOOT_Y - HEAD_Y - 1, lemming.direction);
    if (bite.blocked && bite.carved === 0) {
      this.cancelOnUncarvable(lemming, frontX + lemming.direction * 2, lemming.y);
      return;
    }
    this.sprayDigDebris(frontX + lemming.direction * 2, lemming.y, bite.carved);
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
   * Miner: swings a pick on a diagonal, carving a tunnel that descends in the
   * facing direction. Steel (or a one-way wall against the swing) refuses the
   * bite and ends the job with a clank; tunnelling out into open air becomes
   * a fall, and running out of anything to mine resumes walking.
   */
  private updateMiner(lemming: Lemming, deltaMs: number): void {
    lemming.actionTimerMs += deltaMs;
    if (lemming.actionTimerMs < MINE_INTERVAL_MS) return;
    lemming.actionTimerMs = 0;

    // Swing: clear a body-height pocket spanning the lemming's own column and
    // the ground ahead — including its column keeps the descending tunnel
    // continuous (no ridge left underfoot between consecutive swings).
    const frontX = lemming.x + lemming.direction * BODY_HALF_WIDTH;
    const reach = 14;
    const left = lemming.direction === 1 ? lemming.x - 2 : lemming.x + 2 - reach;
    const swing = this.level.terrain.carveRect(left, lemming.y + HEAD_Y, reach, FOOT_Y - HEAD_Y + 2, lemming.direction);

    if (swing.blocked && swing.carved === 0) {
      this.cancelOnUncarvable(lemming, frontX + lemming.direction * 3, lemming.y + FOOT_Y);
      return;
    }
    if (swing.carved === 0) {
      // Nothing left to mine (e.g. swinging at the level edge) — walk on.
      lemming.state = 'walker';
      lemming.y = this.findStandingY(lemming.x, lemming.y);
      return;
    }

    this.sprayDigDebris(frontX + lemming.direction * 3, lemming.y + FOOT_Y, swing.carved);
    this.emit('dig', frontX + lemming.direction * 3, lemming.y + FOOT_Y);
    lemming.x += lemming.direction * 3.4;
    lemming.y = this.findStandingY(lemming.x, lemming.y + 2);

    // The tunnel broke through into a cavity -> fall.
    if (!this.hasGroundBelow(lemming)) {
      this.beginFall(lemming);
    }
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
        // Soft landing juice for falls that were more than a step.
        if (fallDistance > STEP_HEIGHT) {
          lemming.squashMs = LAND_SQUASH_MS;
          this.emit('land', lemming.x, lemming.y + FOOT_Y);
        }
        this.tryApplyPendingHatchSkill(lemming);
      }
    } else if (lemming.y > this.level.height + 28) {
      this.kill(lemming);
    }
  }

  private walk(lemming: Lemming, deltaMs: number): void {
    const distance = WALK_SPEED * (deltaMs / 1000) * lemming.direction;
    const nextX = lemming.x + distance;

    // Bounce off the level edges instead of hugging them forever.
    if (nextX <= BODY_HALF_WIDTH || nextX >= this.level.width - BODY_HALF_WIDTH) {
      lemming.direction *= -1;
      return;
    }

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

  /** Body (head-to-foot box) vs. an axis-aligned box. */
  private bodyOverlapsBox(lemming: Lemming, x: number, y: number, width: number, height: number): boolean {
    return (
      lemming.x + BODY_HALF_WIDTH >= x &&
      lemming.x - BODY_HALF_WIDTH <= x + width &&
      lemming.y + FOOT_Y >= y &&
      lemming.y + HEAD_Y <= y + height
    );
  }

  private isInHazard(lemming: Lemming): boolean {
    // Flowing water cells drown (living terrain).
    if (
      this.level.terrain.isWaterAt(lemming.x, lemming.y + FOOT_Y - 2) ||
      this.level.terrain.isWaterAt(lemming.x, lemming.y) ||
      this.level.terrain.isWaterAt(lemming.x, lemming.y + HEAD_Y)
    ) {
      return true;
    }
    const hazards = this.level.hazards;
    if (!hazards || hazards.length === 0) return false;
    for (const hazard of hazards) {
      if (this.bodyOverlapsBox(lemming, hazard.x, hazard.y, hazard.width, hazard.height)) return true;
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
    // Sand Lab is free-play — no win/lose from quota.
    if (this.level.sandLab) return;

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
