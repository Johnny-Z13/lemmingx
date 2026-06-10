import Phaser from 'phaser';
import { createLevelAt, LEVEL_COUNT } from '../levels';
import { GameSimulation } from '../sim/GameSimulation';
import type { Lemming, LevelDefinition, Skill } from '../sim/types';
import { ALL_SKILLS } from '../sim/types';
import { SKILL_DEFS } from '../sim/skills/registry';
import type { SimEvent } from '../sim/types';
import { Hud } from '../ui/Hud';
import { drawLemming } from '../render/LemmingSprite';
import { MATERIAL } from '../sim/Terrain';
import { Particles } from '../render/Particles';
import { Sfx } from '../audio/Sfx';
import { Music } from '../audio/Music';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../audio/settings';

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
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  /** Edge-scroll only engages once the mouse has actually entered the game. */
  private pointerSeen = false;
  private readonly particles = new Particles();
  private readonly sfx = new Sfx();
  private readonly music = new Music();
  private audioSettings = loadAudioSettings();

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.installKeyboard();
    this.applyAudioSettings(this.audioSettings);
    // Audio contexts need a user gesture; unlock on the first pointer/key.
    this.input.on('pointerdown', () => this.unlockAudio());
    this.input.keyboard?.on('keydown', () => this.unlockAudio());
    // Click-to-assign is bound once here (reads the current sim each time), so
    // restarting a level never strips the handler. Left button only — the
    // right/middle buttons drag-pan the camera.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.assignSelectedSkill(pointer.worldX, pointer.worldY);
    });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.pointerSeen = true;
      if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
        const cam = this.cameras.main;
        cam.scrollX -= pointer.position.x - pointer.prevPosition.x;
        cam.scrollY -= pointer.position.y - pointer.prevPosition.y;
      }
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
    this.updateCamera(delta);
    this.updateHover();
    this.drawWorld();
    this.hud.update(this.sim.state, this.hudView());
  }

  /** Camera pan: arrow keys + screen-edge scroll (drag pan lives in create()). */
  private updateCamera(deltaMs: number): void {
    const cam = this.cameras.main;
    const pan = 420 * (deltaMs / 1000);

    if (this.cursors) {
      if (this.cursors.left.isDown) cam.scrollX -= pan;
      if (this.cursors.right.isDown) cam.scrollX += pan;
      if (this.cursors.up.isDown) cam.scrollY -= pan;
      if (this.cursors.down.isDown) cam.scrollY += pan;
    }

    if (this.pointerSeen) {
      const pointer = this.input.activePointer;
      const edge = 24;
      if (pointer.x >= 0 && pointer.y >= 0 && pointer.x <= this.scale.width && pointer.y <= this.scale.height) {
        if (pointer.x < edge) cam.scrollX -= pan;
        else if (pointer.x > this.scale.width - edge) cam.scrollX += pan;
        if (pointer.y < edge) cam.scrollY -= pan;
        else if (pointer.y > this.scale.height - edge) cam.scrollY += pan;
      }
    }
  }

  /** Route sim events to sound + particle feedback. */
  private consumeEvents(events: SimEvent[]): void {
    for (const e of events) {
      if (e.kind === 'trap') this.sfx.playTrap(e.trapKind);
      else this.sfx.play(e.kind);
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
        case 'clank':
          this.particles.burst(e.x, e.y, 6, { color: [0xffffff, 0xffd96b, 0x9aa6c2], speed: 0.14, lifeMs: 320, size: 1.5 });
          break;
        case 'trap':
          this.particles.burst(e.x, e.y, 14, {
            color: e.trapKind === 'zapper' ? [0x8be9ff, 0xffffff, 0x6ae1ff] : [0xff5b7f, 0x5e6575, 0x2c333f],
            speed: 0.13,
            lifeMs: 550,
            size: 2,
          });
          break;
        case 'explode':
          this.particles.burst(e.x, e.y, 24, { color: [0xff7a3a, 0xffd96b, 0x5e6575, 0xff5b7f], speed: 0.22, lifeMs: 800, size: 3 });
          break;
        case 'nuke':
          this.particles.burst(e.x, e.y, 16, { color: [0xff5b7f, 0xffd96b], speed: 0.18, lifeMs: 700, size: 3 });
          this.music.duck(1500);
          break;
      }
    }
  }

  /** Snapshot of scene-side display state the HUD needs each frame. */
  private hudView() {
    const hovered = this.hoveredId
      ? this.sim.state.lemmings.find((l) => l.id === this.hoveredId)
      : null;
    const cam = this.cameras.main;
    const scrolls = this.level.width > this.scale.width || this.level.height > this.scale.height;
    return {
      paused: this.paused,
      speed: this.speed,
      nukeReady: this.sim.state.outcome === 'running' && !this.sim.state.nuking,
      hoveredJob: hovered ? SKILL_DEFS[hovered.state as Skill]?.label ?? this.titleCase(hovered.state) : null,
      levelName: `${this.levelIndex + 1}/${LEVEL_COUNT} · ${this.level.name ?? 'LemmingX'}`,
      hasNextLevel: true,
      minimap: scrolls
        ? {
            terrain: this.level.terrain,
            lemmings: this.sim.state.lemmings,
            camera: { x: cam.scrollX, y: cam.scrollY, width: cam.width, height: cam.height },
            width: this.level.width,
            height: this.level.height,
          }
        : null,
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
    this.cameras.main.centerOn(this.level.spawn.x, this.level.spawn.y);

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
      onMinimapJump: (fx, fy) => this.cameras.main.centerOn(fx * this.level.width, fy * this.level.height),
      onAudioChange: (settings) => {
        this.applyAudioSettings(settings);
        saveAudioSettings(settings);
      },
    }, this.audioSettings);
    this.hud.update(this.sim.state, this.hudView());

    this.music.play(this.levelIndex);
  }

  private unlockAudio(): void {
    this.sfx.unlock();
    this.music.unlock();
  }

  private applyAudioSettings(settings: AudioSettings): void {
    this.audioSettings = settings;
    this.sfx.setMuted(settings.sfxMuted);
    this.sfx.setVolume(settings.sfxVolume);
    this.music.setMuted(settings.musicMuted);
    this.music.setVolume(settings.musicVolume);
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
    this.cursors = kb.createCursorKeys();
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

    // A soft moon in the upper sky, placed relative to the level so it never
    // lands on top of terrain in the upper-right corner of a given layout.
    sky.fillStyle(0x6ae1ff, 0.12);
    sky.fillCircle(this.level.width * 0.8, this.level.height * 0.16, 74);
  }

  private drawWorld(): void {
    this.drawTerrain();
    this.drawHatch();
    this.drawExit();
    this.drawHazards();
    this.drawTraps();
    this.drawLemmings();
    this.fxGraphics.clear();
    this.particles.draw(this.fxGraphics);
  }

  private drawTraps(): void {
    const g = this.terrainGraphics;
    const t = this.sim.state.timeMs;
    for (const trap of this.sim.state.traps) {
      const { x, y, width, height, kind, cycleMs } = { cycleMs: 1400, ...trap.def };
      // 0 → just sprung, 1 → re-armed; idle traps sit at 1.
      const cycle = trap.phase === 'killing' ? 1 - trap.timerMs / cycleMs : 1;
      if (kind === 'crusher') {
        // Frame posts + a spiked block that slams down early in the cycle.
        g.fillStyle(0x2c333f, 1);
        g.fillRect(x - 3, y - 6, 3, height + 6);
        g.fillRect(x + width, y - 6, 3, height + 6);
        const drop = trap.phase === 'killing' ? (cycle < 0.25 ? cycle / 0.25 : 1 - (cycle - 0.25) / 0.75) : Math.sin(t / 500) * 0.04;
        const blockY = y - 6 + drop * (height - 8);
        g.fillStyle(0x8a93a6, 1);
        g.fillRect(x - 1, blockY, width + 2, 10);
        g.fillStyle(0x59617a, 1);
        for (let sx = x; sx < x + width; sx += 5) {
          g.fillTriangle(sx, blockY + 10, sx + 4, blockY + 10, sx + 2, blockY + 14);
        }
      } else if (kind === 'zapper') {
        // Two tesla posts; an arc flickers across while killing.
        g.fillStyle(0x2c333f, 1);
        g.fillRect(x - 2, y, 4, height);
        g.fillRect(x + width - 2, y, 4, height);
        g.fillStyle(0x8be9ff, 0.9);
        g.fillCircle(x, y + 2, 2.5);
        g.fillCircle(x + width, y + 2, 2.5);
        if (trap.phase === 'killing' || Math.floor(t / 700) % 4 === 0) {
          const alpha = trap.phase === 'killing' ? 0.95 : 0.25;
          g.lineStyle(1.5, 0x8be9ff, alpha);
          let px = x;
          let py = y + 3;
          const segs = 5;
          for (let s = 1; s <= segs; s += 1) {
            const nx = x + (width / segs) * s;
            const ny = y + 3 + (s === segs ? 0 : Math.sin(t / 30 + s * 7) * 4);
            g.lineBetween(px, py, nx, ny);
            px = nx;
            py = ny;
          }
        }
      } else {
        // Chomper: a jaw of teeth rising from the floor, snapping while killing.
        const open = trap.phase === 'killing' ? Math.abs(Math.sin(cycle * Math.PI * 6)) : 0.25 + Math.sin(t / 600) * 0.08;
        const gape = open * (height * 0.6);
        g.fillStyle(0x3a2c3f, 1);
        g.fillRect(x, y + height - 6, width, 6);
        g.fillStyle(0xd8e0ef, 1);
        for (let tx = x; tx < x + width - 2; tx += 6) {
          // Bottom teeth up, top teeth down with the jaw gap between.
          g.fillTriangle(tx, y + height - 5, tx + 5, y + height - 5, tx + 2.5, y + height - 12 - 2);
          const topY = y + height - 16 - gape;
          g.fillTriangle(tx, topY, tx + 5, topY, tx + 2.5, topY + 7);
        }
      }
    }
  }

  private drawTerrain(): void {
    this.terrainGraphics.clear();
    // Shade by depth (fraction of level height) so terrain reads with a sense
    // of "lower = deeper/darker" on any level layout, not just level 1.
    const h = this.level.height;
    this.level.terrain.forEachSolidCell((x, y, width, height, material) => {
      if (material === MATERIAL.steel) {
        // Riveted gray plate, clearly "not diggable".
        this.terrainGraphics.fillStyle(0x77819a, 1);
        this.terrainGraphics.fillRect(x, y, width, height);
        this.terrainGraphics.fillStyle(0x59617a, 1);
        this.terrainGraphics.fillRect(x, y + height - 1, width, 1);
        if ((Math.floor(x / width) + Math.floor(y / height)) % 3 === 0) {
          this.terrainGraphics.fillStyle(0x9aa6c2, 1);
          this.terrainGraphics.fillRect(x + 1, y + 1, 1, 1);
        }
        return;
      }
      const depth = y / h;
      const shade = depth > 0.85 ? 0x1f5f55 : depth > 0.72 ? 0x297567 : 0x4d9674;
      this.terrainGraphics.fillStyle(shade, 1);
      this.terrainGraphics.fillRect(x, y, width, height);
      if (material === MATERIAL.oneWayLeft || material === MATERIAL.oneWayRight) {
        // Chevron tint marking the only carve direction.
        const dir = material === MATERIAL.oneWayRight ? 1 : -1;
        const cx = x + width / 2;
        const cy = y + height / 2;
        this.terrainGraphics.fillStyle(0xffd96b, 0.55);
        this.terrainGraphics.fillTriangle(
          cx - dir * (width / 4), y + 1,
          cx - dir * (width / 4), y + height - 1,
          cx + dir * (width / 3), cy,
        );
      }
    });
  }

  private drawExit(): void {
    const exit = this.level.exit;
    // Slow shimmer so the goal reads as alive.
    const pulse = 0.75 + Math.sin(this.sim.state.timeMs / 420) * 0.2;
    this.terrainGraphics.fillStyle(0x111923, 0.92);
    this.terrainGraphics.fillRoundedRect(exit.x - 8, exit.y - 8, exit.width + 16, exit.height + 16, 8);
    this.terrainGraphics.lineStyle(3, 0x78ffd6, pulse);
    this.terrainGraphics.strokeRoundedRect(exit.x - 8, exit.y - 8, exit.width + 16, exit.height + 16, 8);
    this.terrainGraphics.fillStyle(0x78ffd6, 0.12 + pulse * 0.14);
    this.terrainGraphics.fillRect(exit.x, exit.y, exit.width, exit.height);
    this.terrainGraphics.fillStyle(0xeff7ff, 0.92);
    this.terrainGraphics.fillTriangle(exit.x + 11, exit.y + 34, exit.x + 30, exit.y + 22, exit.x + 11, exit.y + 10);
  }

  private drawHatch(): void {
    const hatchX = this.level.spawn.x - 28;
    const hatchY = this.level.spawn.y - 34;
    const state = this.sim.state;
    // 0 → shut, 1 → fully open.
    const open = state.hatchTotalMs > 0 ? 1 - state.hatchOpenMs / state.hatchTotalMs : 1;

    this.terrainGraphics.fillStyle(0x101620, 0.96);
    this.terrainGraphics.fillRoundedRect(hatchX, hatchY, 58, 30, 5);
    this.terrainGraphics.lineStyle(3, 0xffd96b, 1);
    this.terrainGraphics.strokeRoundedRect(hatchX, hatchY, 58, 30, 5);
    this.terrainGraphics.lineStyle(2, 0xffd96b, 0.55);
    for (let x = hatchX + 10; x < hatchX + 52; x += 10) {
      this.terrainGraphics.lineBetween(x, hatchY + 4, x - 12, hatchY + 26);
    }

    // Trapdoor doors slide apart from the centre as the hatch opens.
    const opening = 24;
    const doorWidth = (opening / 2) * (1 - open);
    if (doorWidth > 0.5) {
      this.terrainGraphics.fillStyle(0xffd96b, 0.95);
      this.terrainGraphics.fillRect(this.level.spawn.x - opening / 2, hatchY + 26, doorWidth, 5);
      this.terrainGraphics.fillRect(this.level.spawn.x + opening / 2 - doorWidth, hatchY + 26, doorWidth, 5);
    }
    if (open >= 1) {
      this.terrainGraphics.fillStyle(0xffd96b, 1);
      this.terrainGraphics.fillTriangle(this.level.spawn.x - 8, hatchY + 30, this.level.spawn.x + 8, hatchY + 30, this.level.spawn.x, hatchY + 44);
    }
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
