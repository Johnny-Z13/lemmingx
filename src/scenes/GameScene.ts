import Phaser from 'phaser';
import { createDemoLevel } from '../levels/demoLevel';
import { GameSimulation } from '../sim/GameSimulation';
import type { Lemming, LevelDefinition, Skill } from '../sim/types';
import { Hud } from '../ui/Hud';

const LEMMING_COLORS: Record<string, number> = {
  walker: 0x5ef2a1,
  faller: 0xf8d66d,
  climber: 0xffd96b,
  blocker: 0xff5b7f,
  builder: 0x6ae1ff,
  basher: 0xffa24d,
  digger: 0xd696ff,
  exited: 0x88ffcc,
  dead: 0x5e6575,
};

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private sim!: GameSimulation;
  private hud!: Hud;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private actorGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.startLevel();
  }

  update(_time: number, delta: number): void {
    this.sim.step(Math.min(delta, 33));
    this.drawWorld();
    this.hud.update(this.sim.state, this.sim.state.outcome === 'running' && !this.sim.state.nuking);
  }

  private startLevel(): void {
    this.level = createDemoLevel();
    this.sim = new GameSimulation(this.level);

    this.children.removeAll(true);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.cameras.main.setBackgroundColor('#12171f');

    this.addBackground();
    this.terrainGraphics = this.add.graphics();
    this.actorGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();

    this.input.off('pointerdown');
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.assignSelectedSkill(pointer.worldX, pointer.worldY);
    });

    this.hud?.destroy();
    this.hud = new Hud({
      onSelectSkill: (skill) => this.selectSkill(skill),
      onNuke: () => this.triggerNuke(),
      onReleaseRate: (delta) => this.sim.changeReleaseRate(delta),
      onRestart: () => this.startLevel(),
    });
    this.hud.update(this.sim.state, true);
  }

  private selectSkill(skill: Skill): void {
    this.sim.setSelectedSkill(skill);
  }

  private triggerNuke(): void {
    if (this.sim.state.outcome !== 'running' || this.sim.state.nuking) return;
    this.sim.nukeAll();
  }

  private assignSelectedSkill(worldX: number, worldY: number): void {
    if (this.sim.state.outcome !== 'running') return;
    const target = this.findNearestLemming(worldX, worldY);
    if (target) {
      this.sim.assignSkill(target.id, this.sim.state.selectedSkill);
    }
  }

  private findNearestLemming(worldX: number, worldY: number): Lemming | null {
    let nearest: Lemming | null = null;
    let nearestDistanceSq = 26 ** 2;

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
    for (const lemming of this.sim.state.lemmings) {
      if (lemming.state === 'exited') continue;
      const color = LEMMING_COLORS[lemming.state] ?? LEMMING_COLORS.walker;
      this.actorGraphics.fillStyle(color, lemming.state === 'dead' ? 0.45 : 1);
      this.actorGraphics.fillCircle(lemming.x, lemming.y - 7, 5);
      this.actorGraphics.fillRoundedRect(lemming.x - 4, lemming.y - 3, 8, 14, 4);
      this.actorGraphics.lineStyle(2, color, 1);
      this.actorGraphics.lineBetween(lemming.x, lemming.y + 4, lemming.x + lemming.direction * 8, lemming.y + 7);

      if (lemming.state === 'blocker') {
        this.actorGraphics.lineStyle(2, 0xffffff, 0.8);
        this.actorGraphics.strokeCircle(lemming.x, lemming.y + 1, 14);
      }
    }
  }

}
