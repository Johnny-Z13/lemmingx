import type Phaser from 'phaser';
import type { Lemming, LemmingState, Skill } from '../sim/types';
import type { LemmingDisplayPoint } from './crowdLayout';
import { FUSE_WARNING_SEGMENTS, fuseUrgencySegments } from './fuseWarning';
import { crewColor } from './lemmingIdentity';

export const CREW_SALVAGER_TEXTURE_KEY = 'crew-keyart-actions';
export const CREW_SALVAGER_TEXTURE_PATH = 'assets/crew-keyart-actions.png';
export const CREW_SALVAGER_FRAME_SIZE = 64;
export const CREW_SALVAGER_PAINTED_HEIGHT = 58;
/** Enforced across all 48 body frames by validate-crew-salvager-actions.mjs. */
export const CREW_SALVAGER_MIN_ALPHA_EXTENT = 48;

/** The 58px authored body becomes ~42 world pixels and stays readable under phone FIT scaling. */
export const CREW_SALVAGER_WORLD_SCALE = 0.72;
const CANOPY_SCALE = 0.8;
const FOOT_OFFSET = 16;
const CANOPY_FRAME = 48;

const STATE_FRAMES: Record<Exclude<LemmingState, 'exited'>, number> = {
  walker: 0,
  basher: 4,
  faller: 8,
  shrug: 12,
  climber: 16,
  blocker: 20,
  builder: 24,
  miner: 28,
  digger: 32,
  treading: 36,
  swimming: 40,
  dead: 44,
};

const HUD_FRAMES: Record<Skill, number> = {
  climber: 16,
  floater: 8,
  bomber: 0,
  blocker: 20,
  builder: 24,
  basher: 4,
  miner: 28,
  digger: 32,
  swimmer: 40,
};

export function salvagerHudFrame(skill: Skill): number {
  return HUD_FRAMES[skill];
}

export function crewSalvagerFrame(lemming: Pick<Lemming, 'state'>, frame: number): number | null {
  if (lemming.state === 'exited') return null;
  const start = STATE_FRAMES[lemming.state];
  // Dead crew stay down instead of replaying their collapse loop forever.
  return lemming.state === 'dead' ? start + 3 : start + frame % 4;
}

/** Every render state now has authored art; sim data remains untouched. */
export function canDrawSalvager(lemming: Pick<Lemming, 'state'>): boolean {
  return lemming.state !== 'exited';
}

function displayPriority(lemming: Pick<Lemming, 'state' | 'fuseMs'>): number {
  if (lemming.fuseMs !== null) return 5;
  if (lemming.state === 'dead') return 0;
  if (lemming.state === 'faller' || lemming.state === 'treading' || lemming.state === 'swimming') return 4;
  if (lemming.state !== 'walker') return 3;
  return 1;
}

function drawFuseWarning(
  graphics: Phaser.GameObjects.Graphics,
  point: LemmingDisplayPoint,
  frame: number,
  fuseMs: number,
): void {
  const lit = fuseUrgencySegments(fuseMs);
  const left = point.x - 8;
  const y = point.y - 29;
  graphics.fillStyle(0x071019, 0.9);
  graphics.fillRoundedRect(left - 2, y - 2, 20, 7, 2);
  for (let index = 0; index < FUSE_WARNING_SEGMENTS; index += 1) {
    const active = index < lit;
    graphics.fillStyle(active ? (lit <= 2 ? 0xff4f35 : 0xffc24a) : 0x37404a, active ? 1 : 0.65);
    graphics.fillRect(left + index * 4, y, 3, 3);
  }
  if (Math.floor(frame / Math.max(1, lit)) % 2 === 0) {
    graphics.lineStyle(2, lit <= 2 ? 0xff6048 : 0xffd96b, 0.8);
    graphics.strokeCircle(point.x, point.y - 4, 13);
  }
}

interface HitRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly priority: number;
}

/** Match visible generated body/tool ownership without touching simulation coordinates. */
export function salvagerTargetMetric(
  lemming: Lemming,
  point: LemmingDisplayPoint,
  worldX: number,
  worldY: number,
  targetY: number,
): { distanceSq: number; visualPriority: number } {
  const d = lemming.direction < 0 ? -1 : 1;
  const regions: HitRect[] = [];
  const add = (x: number, y: number, width: number, height: number, priority = 2) => {
    regions.push({ x, y, width, height, priority });
  };
  switch (lemming.state) {
    case 'basher':
      add(d > 0 ? point.x + 4 : point.x - 24, point.y - 18, 20, 16);
      break;
    case 'builder':
      add(d > 0 ? point.x + 3 : point.x - 24, point.y - 13, 21, 17);
      break;
    case 'miner':
      add(d > 0 ? point.x - 10 : point.x - 24, point.y - 26, 34, 30);
      break;
    case 'digger':
      add(point.x - 14, point.y - 27, 28, 34);
      break;
    case 'climber':
    case 'blocker':
      add(point.x - 20, point.y - 30, 40, 40);
      break;
  }
  if (lemming.state === 'faller' && lemming.isFloater) add(point.x - 18, point.y - 45, 36, 25);
  if (lemming.state === 'treading') add(point.x - 18, point.y - 1, 36, 11, 2);
  if (lemming.state === 'swimming') {
    add(point.x - 16, point.y - 1, 32, 11, 2);
    add(d > 0 ? point.x - 23 : point.x + 7, point.y + 2, 16, 9, 2);
  }
  if (lemming.fuseMs !== null && lemming.fuseMs > 0) {
    add(point.x - 10, point.y - 31, 20, 10);
    add(point.x - 14, point.y - 18, 28, 28);
  }

  const bodyDistanceSq = (point.x - worldX) ** 2 + (targetY - worldY) ** 2;
  let best = {
    distanceSq: bodyDistanceSq,
    visualPriority: worldX >= point.x - 19 && worldX <= point.x + 19 &&
      worldY >= point.y - 25 && worldY <= point.y + 14 ? 1 : 0,
  };
  for (const region of regions) {
    if (
      worldX < region.x || worldX > region.x + region.width ||
      worldY < region.y || worldY > region.y + region.height
    ) continue;
    const regionDistanceSq = (worldX - (region.x + region.width / 2)) ** 2 +
      (worldY - (region.y + region.height / 2)) ** 2;
    if (region.priority > best.visualPriority ||
      region.priority === best.visualPriority && regionDistanceSq < best.distanceSq) {
      best = { distanceSq: regionDistanceSq, visualPriority: region.priority };
    }
  }
  return best;
}

/** Cached renderer for the generated key-art character family. */
export class CrewSpriteRenderer {
  private readonly images = new Map<number, Phaser.GameObjects.Image>();
  private readonly canopies = new Map<number, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  beginFrame(): void {
    for (const image of this.images.values()) image.setVisible(false);
    for (const canopy of this.canopies.values()) canopy.setVisible(false);
  }

  draw(lemming: Lemming, frame: number, point: LemmingDisplayPoint): boolean {
    if (!canDrawSalvager(lemming)) return false;
    const atlasFrame = crewSalvagerFrame(lemming, frame);
    if (atlasFrame === null) return false;

    let image = this.images.get(lemming.id);
    if (!image) {
      image = this.scene.add.image(0, 0, CREW_SALVAGER_TEXTURE_KEY, atlasFrame)
        .setOrigin(0.5, 1)
        .setScale(CREW_SALVAGER_WORLD_SCALE);
      this.images.set(lemming.id, image);
    }

    const squash = lemming.squashMs > 0 ? Math.min(0.16, lemming.squashMs / 1000) : 0;
    const depth = 20 + displayPriority(lemming) * 0.1 + point.y * 0.0001;
    const waterOffset = lemming.state === 'treading' || lemming.state === 'swimming' ? 12 : FOOT_OFFSET;
    image
      .setFrame(atlasFrame)
      .setTint(crewColor(lemming))
      .setFlipX(lemming.direction < 0)
      .setPosition(point.x, point.y + waterOffset)
      .setScale(CREW_SALVAGER_WORLD_SCALE * (1 + squash), CREW_SALVAGER_WORLD_SCALE * (1 - squash))
      .setDepth(depth)
      .setVisible(true);

    if (lemming.state === 'faller' && lemming.isFloater) {
      let canopy = this.canopies.get(lemming.id);
      if (!canopy) {
        canopy = this.scene.add.image(0, 0, CREW_SALVAGER_TEXTURE_KEY, CANOPY_FRAME)
          .setOrigin(0.5, 1)
          .setScale(CANOPY_SCALE);
        this.canopies.set(lemming.id, canopy);
      }
      canopy
        .setFrame(CANOPY_FRAME + frame % 4)
        .setTint(crewColor(lemming))
        .setPosition(point.x, point.y - 20)
        .setDepth(depth - 0.01)
        .setVisible(true);
    }
    return true;
  }

  drawBaseOverlays(
    graphics: Phaser.GameObjects.Graphics,
    lemming: Lemming,
    point: LemmingDisplayPoint,
  ): void {
    if (!canDrawSalvager(lemming) || lemming.state === 'dead') return;

    if (lemming.state === 'faller' && lemming.isFloater) {
      graphics.lineStyle(1, 0xd8efff, 0.75);
      graphics.lineBetween(point.x - 13, point.y - 22, point.x - 5, point.y - 10);
      graphics.lineBetween(point.x + 13, point.y - 22, point.x + 5, point.y - 10);
    }
  }

  drawGearOverlays(
    graphics: Phaser.GameObjects.Graphics,
    lemming: Lemming,
    frame: number,
    point: LemmingDisplayPoint,
  ): void {
    if (!canDrawSalvager(lemming) || lemming.state === 'dead') return;
    if (lemming.state === 'treading' || lemming.state === 'swimming') {
      const phase = frame % 4;
      graphics.lineStyle(2, 0xb9f1ff, 0.9);
      graphics.strokeEllipse(point.x, point.y + 2 + (phase % 2), lemming.state === 'swimming' ? 30 : 24, 5);
      graphics.lineStyle(1, 0x43bfe8, 0.8);
      if (lemming.state === 'swimming') {
        const wake = -lemming.direction;
        graphics.lineBetween(point.x + wake * 9, point.y + 4, point.x + wake * 22, point.y + 6 + (phase % 2));
        graphics.lineBetween(point.x + wake * 7, point.y + 6, point.x + wake * 17, point.y + 9);
      } else {
        graphics.strokeEllipse(point.x, point.y + 5, 34, 7);
      }
    }

    if (lemming.fuseMs !== null && lemming.fuseMs > 0) {
      drawFuseWarning(graphics, point, frame, lemming.fuseMs);
    }
  }

  drawOverlays(
    graphics: Phaser.GameObjects.Graphics,
    lemming: Lemming,
    frame: number,
    point: LemmingDisplayPoint,
  ): void {
    this.drawBaseOverlays(graphics, lemming, point);
    this.drawGearOverlays(graphics, lemming, frame, point);
  }

  clear(): void {
    for (const image of this.images.values()) image.destroy();
    for (const canopy of this.canopies.values()) canopy.destroy();
    this.images.clear();
    this.canopies.clear();
  }
}
