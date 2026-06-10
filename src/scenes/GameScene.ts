import Phaser from 'phaser';
import { createLevelAt, LEVEL_COUNT } from '../levels';
import { GameSimulation } from '../sim/GameSimulation';
import type { Lemming, LevelDefinition, Skill } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';
import type { SimEvent } from '../sim/types';
import { Hud } from '../ui/Hud';
import { drawLemming } from '../render/LemmingSprite';
import { Particles } from '../render/Particles';
import { Sfx } from '../audio/Sfx';

/** Animation advances at this many frames per second (shared by all sprites). */
const ANIM_FPS = 12;
/** Pixels: how close the cursor must be to a lemming to hover/select it. */
const HOVER_RADIUS = 16;

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private sim!: GameSimulation;
  private hud!: Hud;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private animClockMs = 0;
  private hoveredId: number | null = null;
  private paused = false;
  private speed = 1;
  private levelIndex = 0;
  private readonly particles = new Particles();
  private readonly sfx = new Sfx();

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.installKeyboard();
    // Audio contexts need a user gesture; unlock on the first pointer/key.
    this.input.on('pointerdown', () => this.sfx.unlock());
    this.input.keyboard?.on('keydown', () => this.sfx.unlock());
    // Click-to-assign is bound once here (reads the current sim each time), so
    // restarting a level never strips the handler.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.assignSelectedSkill(pointer.worldX, pointer.worldY);
    });
    this.startLevel();
  }

  update(_time: number, delta: number): void {
    const clamped = Math.min(delta, 33);
    if (!this.paused) {
      // Fast-forward runs extra sim sub-steps; rendering stays once per frame.
      for (let i = 0; i < this.speed; i += 1) {
        this.sim.step(clamped);
        this.consumeEvents(this.sim.drainEvents());
      }
    }
    this.animClockMs += delta;
    this.particles.update(this.paused ? 0 : delta * this.speed);
    this.updateHover();
    this.drawWorld();
    this.hud.update(this.sim.state, this.hudView());
  }

  /** Route sim events to sound + particle feedback. */
  private consumeEvents(events: SimEvent[]): void {
    for (const e of events) {
      this.sfx.play(e.kind);
      switch (e.kind) {
        case 'dig':
          this.particles.burst(e.x, e.y, 4, { color: [0x4d9674, 0x297567], speed: 0.05, lifeMs: 420, size: 2 });
          break;
        case 'bash':
          this.particles.burst(e.x, e.y, 5, { color: [0x4d9674, 0x297567, 0xffe9c2], speed: 0.09, spread: Math.PI, lifeMs: 380, size: 2 });
          break;
        case 'build':
          this.particles.burst(e.x, e.y, 2, { color: 0x6ae1ff, speed: 0.04, lifeMs: 300, size: 1.5 });
          break;
        case 'exit':
          this.particles.burst(e.x, e.y - 6, 12, { color: [0x78ffd6, 0x6ae1ff, 0xffffff], speed: 0.12, lifeMs: 700, size: 2.5, gravity: -0.0002, upward: true });
          break;
        case 'splat':
          this.particles.burst(e.x, e.y + 8, 8, { color: [0xff5b7f, 0x5e6575], speed: 0.1, spread: Math.PI, angle: -Math.PI / 2, lifeMs: 500, size: 2 });
          break;
        case 'drown':
          this.particles.burst(e.x, e.y, 8, { color: [0x4ab6ff, 0xffffff], speed: 0.09, lifeMs: 500, size: 2, upward: true });
          break;
        case 'explode':
          this.particles.burst(e.x, e.y, 24, { color: [0xff7a3a, 0xffd96b, 0x5e6575, 0xff5b7f], speed: 0.22, lifeMs: 800, size: 3 });
          break;
        case 'nuke':
          this.particles.burst(e.x, e.y, 16, { color: [0xff5b7f, 0xffd96b], speed: 0.18, lifeMs: 700, size: 3 });
          break;
      }
    }
  }

  /** Snapshot of scene-side display state the HUD needs each frame. */
  private hudView() {
    const hovered = this.hoveredId
      ? this.sim.state.lemmings.find((l) => l.id === this.hoveredId)
      : null;
    return {
      paused: this.paused,
      speed: this.speed,
      nukeReady: this.sim.state.outcome === 'running' && !this.sim.state.nuking,
      hoveredJob: hovered ? SKILL_DEFS[hovered.state as Skill]?.label ?? this.titleCase(hovered.state) : null,
      levelName: `${this.levelIndex + 1}/${LEVEL_COUNT} · ${this.level.name ?? 'LemmingX'}`,
      hasNextLevel: true,
    };
  }

  private titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Current shared animation frame index. */
  private animFrame(): number {
    return Math.floor((this.animClockMs / 1000) * ANIM_FPS);
  }

  /** Track which lemming the cursor is over, for the selection ring. */
  private updateHover(): void {
    const pointer = this.input.activePointer;
    const target = this.findNearestLemming(pointer.worldX, pointer.worldY, HOVER_RADIUS);
    this.hoveredId = target?.id ?? null;
  }

  private startLevel(): void {
    this.level = createLevelAt(this.levelIndex);
    this.sim = new GameSimulation(this.level);

    this.children.removeAll(true);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.cameras.main.setBackgroundColor('#12171f');

    this.addBackground();
    this.terrainGraphics = this.add.graphics();
    this.actorGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();

    this.particles.clear();
    this.paused = false;
    this.speed = 1;

    this.hud?.destroy();
    this.hud = new Hud({
      onSelectSkill: (skill) => this.selectSkill(skill),
      onNuke: () => this.triggerNuke(),
      onReleaseRate: (delta) => this.sim.changeReleaseRate(delta),
      onRestart: () => this.startLevel(),
      onTogglePause: () => this.togglePause(),
      onCycleSpeed: () => this.cycleSpeed(),
      onNext: () => this.nextLevel(),
    });
    this.hud.update(this.sim.state, this.hudView());
  }

  /** Advance to the next level (wraps to the first after the last). */
  private nextLevel(): void {
    this.levelIndex = (this.levelIndex + 1) % LEVEL_COUNT;
    this.startLevel();
  }

  private selectSkill(skill: Skill): void {
    this.sim.setSelectedSkill(skill);
  }

  private triggerNuke(): void {
    if (this.sim.state.outcome !== 'running' || this.sim.state.nuking) return;
    this.sim.nukeAll();
  }

  private togglePause(): void {
    if (this.sim.state.outcome !== 'running') return;
    this.paused = !this.paused;
  }

  private cycleSpeed(): void {
    // 1× → 2× → 3× → 1×
    this.speed = this.speed >= 3 ? 1 : this.speed + 1;
  }

  /** Keyboard bindings: skill hotkeys, pause, speed, nuke, restart. */
  private installKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      // Skill hotkeys (1–7) map to the registry's declared hotkeys.
      const skill = ALL_SKILLS.find((s) => SKILL_DEFS[s].hotkey === key);
      if (skill) {
        this.selectSkill(skill);
        return;
      }
      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        this.togglePause();
      } else if (key === 'f') {
        this.cycleSpeed();
      } else if (key === 'n') {
        this.triggerNuke();
      } else if (key === 'r') {
        this.startLevel();
      }
    });
  }

  private assignSelectedSkill(worldX: number, worldY: number): void {
    if (this.sim.state.outcome !== 'running') return;
    const target = this.findNearestLemming(worldX, worldY);
    if (target) {
      this.sim.assignSkill(target.id, this.sim.state.selectedSkill);
    }
  }

  private findNearestLemming(worldX: number, worldY: number, radius = 26): Lemming | null {
    let nearest: Lemming | null = null;
    let nearestDistanceSq = radius ** 2;

    for (const lemming of this.sim.state.lemmings) {
      if (lemming.state === 'dead' || lemming.state === 'exited') continue;
      const distanceSq = (lemming.x - worldX) ** 2 + (lemming.y - worldY) ** 2;
      if (distanceSq < nearestDistanceSq) {
        nearest = lemming;
        nearestDistanceSq = distanceSq;
      }
    }
    return nearest;
  }

  private addBackground(): void {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x172130, 0x172130, 0x273449, 0x273449, 1);
    sky.fillRect(0, 0, this.level.width, this.level.height);

    sky.lineStyle(2, 0x314258, 0.35);
    for (let x = 0; x < this.level.width; x += 48) {
      sky.lineBetween(x, 0, x - 180, this.level.height);
    }

    sky.fillStyle(0x6ae1ff, 0.12);
    sky.fillCircle(760, 96, 74);
  }

  private drawWorld(): void {
    this.drawTerrain();
    this.drawHatch();
    this.drawExit();
    this.drawHazards();
    this.drawLemmings();
    this.fxGraphics.clear();
    this.particles.draw(this.fxGraphics);
  }

  private drawTerrain(): void {
    this.terrainGraphics.clear();
    this.terrainGraphics.fillStyle(0x2c7c66, 1);
    this.level.terrain.forEachSolidCell((x, y, width, height) => {
      const shade = y > 460 ? 0x1f5f55 : y > 390 ? 0x297567 : 0x4d9674;
      this.terrainGraphics.fillStyle(shade, 1);
      this.terrainGraphics.fillRect(x, y, width, height);
    });
  }

  private drawExit(): void {
    const exit = this.level.exit;
    this.terrainGraphics.fillStyle(0x111923, 0.92);
    this.terrainGraphics.fillRoundedRect(exit.x - 8, exit.y - 8, exit.width + 16, exit.height + 16, 8);
    this.terrainGraphics.lineStyle(3, 0x78ffd6, 0.95);
    this.terrainGraphics.strokeRoundedRect(exit.x - 8, exit.y - 8, exit.width + 16, exit.height + 16, 8);
    this.terrainGraphics.fillStyle(0x78ffd6, 0.22);
    this.terrainGraphics.fillRect(exit.x, exit.y, exit.width, exit.height);
    this.terrainGraphics.fillStyle(0xeff7ff, 0.92);
    this.terrainGraphics.fillTriangle(exit.x + 11, exit.y + 34, exit.x + 30, exit.y + 22, exit.x + 11, exit.y + 10);
  }

  private drawHatch(): void {
    const hatchX = this.level.spawn.x - 28;
    const hatchY = this.level.spawn.y - 34;
    this.terrainGraphics.fillStyle(0x101620, 0.96);
    this.terrainGraphics.fillRoundedRect(hatchX, hatchY, 58, 30, 5);
    this.terrainGraphics.lineStyle(3, 0xffd96b, 1);
    this.terrainGraphics.strokeRoundedRect(hatchX, hatchY, 58, 30, 5);
    this.terrainGraphics.lineStyle(2, 0xffd96b, 0.55);
    for (let x = hatchX + 10; x < hatchX + 52; x += 10) {
      this.terrainGraphics.lineBetween(x, hatchY + 4, x - 12, hatchY + 26);
    }
    this.terrainGraphics.fillStyle(0xffd96b, 1);
    this.terrainGraphics.fillTriangle(this.level.spawn.x - 8, hatchY + 30, this.level.spawn.x + 8, hatchY + 30, this.level.spawn.x, hatchY + 44);
  }

  private drawHazards(): void {
    const hazards = this.level.hazards ?? [];
    for (const hazard of hazards) {
      const isLava = hazard.kind === 'lava';
      const surface = isLava ? 0xff5b3a : 0x4ab6ff;
      const deep = isLava ? 0x6e1410 : 0x123a63;
      // Dark basin.
      this.terrainGraphics.fillStyle(0x0a0d12, 0.85);
      this.terrainGraphics.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
      // Molten/liquid body.
      this.terrainGraphics.fillStyle(deep, 0.9);
      this.terrainGraphics.fillRect(hazard.x, hazard.y + 6, hazard.width, hazard.height - 6);
      // Animated-looking surface ripples (offset by a slow time wave).
      const t = this.sim.state.timeMs / 240;
      this.terrainGraphics.fillStyle(surface, isLava ? 0.95 : 0.7);
      const step = 12;
      for (let x = hazard.x; x < hazard.x + hazard.width; x += step) {
        const wave = Math.sin((x + t) * 0.18) * 2;
        this.terrainGraphics.fillRect(x, hazard.y + 4 + wave, step - 2, 4);
      }
    }
  }

  private drawLemmings(): void {
    this.actorGraphics.clear();
    const frame = this.animFrame();
    for (const lemming of this.sim.state.lemmings) {
      if (lemming.state === 'exited') continue;
      drawLemming(this.actorGraphics, lemming, frame, lemming.id === this.hoveredId);
    }
  }

}
