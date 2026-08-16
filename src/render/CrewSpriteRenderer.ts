import type Phaser from 'phaser';
import type { Lemming, LemmingState, Skill } from '../sim/types';
import type { LemmingDisplayPoint } from './crowdLayout';
import { FUSE_WARNING_SEGMENTS, fuseUrgencySegments } from './fuseWarning';
import { crewPalette, crewRole, skillPalette, type CrewRole } from './lemmingIdentity';

export const CREW_SALVAGER_TEXTURE_KEY = 'crew-salvager-actions';
export const CREW_SALVAGER_TEXTURE_PATH = 'assets/crew-salvager-actions.png';
export const CREW_SALVAGER_FRAME_SIZE = 64;
export const CREW_SALVAGER_PAINTED_HEIGHT = 58;
/** Enforced across all 48 body frames by validate-crew-salvager-actions.mjs. */
export const CREW_SALVAGER_MIN_ALPHA_EXTENT = 48;

/** The 58px authored body becomes ~38 world pixels: larger, but still crowd-safe. */
export const CREW_SALVAGER_WORLD_SCALE = 0.65;
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

function drawRoleGlyph(
  graphics: Phaser.GameObjects.Graphics,
  role: CrewRole,
  x: number,
  y: number,
  color: number,
): void {
  graphics.lineStyle(1.5, color, 1);
  switch (role) {
    case 'Climber':
      graphics.lineBetween(x - 2, y + 2, x - 2, y - 2);
      graphics.lineBetween(x - 2, y - 2, x + 2, y - 2);
      break;
    case 'Floater':
      graphics.beginPath();
      graphics.arc(x, y + 1, 3, Math.PI, Math.PI * 2);
      graphics.strokePath();
      break;
    case 'Bomber':
      graphics.strokeCircle(x, y + 1, 2.5);
      graphics.lineBetween(x + 1, y - 2, x + 3, y - 4);
      break;
    case 'Blocker':
      graphics.lineBetween(x - 3, y, x + 3, y);
      graphics.lineBetween(x - 2, y - 2, x - 2, y + 2);
      graphics.lineBetween(x + 2, y - 2, x + 2, y + 2);
      break;
    case 'Builder':
      graphics.strokeRect(x - 3, y - 2, 3, 2);
      graphics.strokeRect(x, y, 3, 2);
      break;
    case 'Basher':
      graphics.lineBetween(x - 3, y, x + 2, y);
      graphics.lineBetween(x + 1, y - 2, x + 3, y);
      graphics.lineBetween(x + 1, y + 2, x + 3, y);
      break;
    case 'Miner':
      graphics.lineBetween(x - 2, y + 3, x + 2, y - 3);
      graphics.lineBetween(x, y - 2, x + 3, y - 1);
      break;
    case 'Digger':
      graphics.lineBetween(x, y - 3, x, y + 2);
      graphics.strokeCircle(x, y + 2, 1.5);
      break;
    case 'Swimmer':
      graphics.beginPath();
      graphics.arc(x - 1.5, y, 1.5, 0, Math.PI);
      graphics.arc(x + 1.5, y, 1.5, 0, Math.PI);
      graphics.strokePath();
      break;
    case 'Walker':
      break;
  }
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

function drawUniform(
  graphics: Phaser.GameObjects.Graphics,
  point: LemmingDisplayPoint,
  role: CrewRole,
  palette: ReturnType<typeof crewPalette>,
): void {
  // Large panels make the assigned role survive phone FIT scaling; the atlas
  // remains the common salvage chassis and the palette/gear carry identity.
  // Every role keeps the original amber hardhat; role colour appears as a
  // broad lamp band and workwear panels, never a green hair-like silhouette.
  graphics.fillStyle(0xe0a33a, 0.96);
  graphics.fillRect(point.x - 9, point.y - 21, 18, 4);
  graphics.fillRect(point.x - 5, point.y - 23, 10, 2);
  graphics.fillStyle(palette.hair, 1);
  graphics.fillRect(point.x - 7, point.y - 19, 14, 2);
  graphics.fillStyle(palette.bodyShade, 0.9);
  graphics.fillRect(point.x - 8, point.y - 12, 16, 4);
  graphics.fillRect(point.x - 7, point.y - 8, 14, 10);
  graphics.fillStyle(palette.body, 0.95);
  graphics.fillRect(point.x - 7, point.y - 10, 14, 8);
  graphics.fillStyle(palette.trim, 0.95);
  graphics.fillRect(point.x - 7, point.y - 7, 14, 2);
  graphics.fillRect(point.x - 1, point.y - 10, 2, 10);

  if (role === 'Walker') return;
  graphics.fillStyle(0x071019, 0.9);
  graphics.fillRect(point.x - 4, point.y - 9, 8, 6);
  drawRoleGlyph(graphics, role, point.x, point.y - 6, palette.trim);
}

function drawRoleGear(
  graphics: Phaser.GameObjects.Graphics,
  role: CrewRole,
  point: LemmingDisplayPoint,
  direction: number,
  palette: ReturnType<typeof crewPalette>,
  compact = false,
): void {
  const d = direction < 0 ? -1 : 1;
  const side = compact ? 9 : 12;
  const gear = compact ? 3 : 5;
  graphics.lineStyle(compact ? 1.5 : 2, palette.trim, 1);
  switch (role) {
    case 'Climber':
      graphics.fillStyle(palette.hair, 1);
      graphics.fillRect(point.x - 12, point.y - 10, gear, 6);
      graphics.fillRect(point.x + 12 - gear, point.y - 10, gear, 6);
      graphics.lineBetween(point.x + d * side, point.y - 10, point.x + d * (side + 4), point.y - 20);
      graphics.lineBetween(point.x + d * (side + 4), point.y - 20, point.x + d * (side + 1), point.y - 22);
      break;
    case 'Floater': {
      const packX = point.x - d * side - gear / 2;
      graphics.fillStyle(palette.body, 1);
      graphics.fillRoundedRect(packX, point.y - 15, gear + 3, compact ? 9 : 13, 2);
      graphics.lineBetween(packX + 1, point.y - 14, point.x, point.y - 6);
      graphics.lineBetween(packX + gear + 2, point.y - 14, point.x, point.y - 6);
      break;
    }
    case 'Bomber':
      graphics.lineStyle(compact ? 2 : 3, palette.trim, 1);
      graphics.lineBetween(point.x - 7, point.y - 10, point.x + 7, point.y);
      graphics.fillStyle(palette.hair, 1);
      graphics.fillCircle(point.x + d * side, point.y - 15, compact ? 2 : 3);
      break;
    case 'Blocker':
      graphics.fillStyle(palette.body, 0.98);
      graphics.fillRect(point.x - side - gear, point.y - 12, gear, 14);
      graphics.fillRect(point.x + side, point.y - 12, gear, 14);
      graphics.lineBetween(point.x - side - gear, point.y - 5, point.x - side, point.y - 5);
      graphics.lineBetween(point.x + side, point.y - 5, point.x + side + gear, point.y - 5);
      break;
    case 'Builder':
      graphics.fillStyle(palette.trim, 1);
      graphics.fillRect(d > 0 ? point.x + 5 : point.x - 22, point.y - 3, 17, compact ? 3 : 5);
      graphics.fillStyle(palette.hair, 1);
      graphics.fillRect(point.x - 8, point.y - 2, 16, 3);
      break;
    case 'Basher':
      graphics.fillStyle(0xaebdca, 1);
      graphics.fillRect(d > 0 ? point.x + 6 : point.x - 19, point.y - 10, 13, compact ? 3 : 5);
      graphics.fillStyle(palette.trim, 1);
      graphics.fillTriangle(
        point.x + d * 19, point.y - 12,
        point.x + d * 24, point.y - 8,
        point.x + d * 19, point.y - 4,
      );
      break;
    case 'Miner':
      graphics.lineStyle(compact ? 2 : 3, palette.trim, 1);
      graphics.lineBetween(point.x - d * 8, point.y, point.x + d * 11, point.y - 18);
      graphics.lineBetween(point.x + d * 5, point.y - 19, point.x + d * 16, point.y - 14);
      break;
    case 'Digger':
      graphics.lineStyle(compact ? 2 : 3, palette.trim, 1);
      graphics.lineBetween(point.x + d * 7, point.y - 14, point.x + d * 7, point.y + 2);
      graphics.fillStyle(palette.body, 1);
      graphics.fillTriangle(
        point.x + d * 3, point.y + 1,
        point.x + d * 11, point.y + 1,
        point.x + d * 7, point.y + 7,
      );
      break;
    case 'Swimmer':
      graphics.fillStyle(palette.hair, 1);
      graphics.fillRect(point.x - 10, point.y - 21, 20, compact ? 3 : 5);
      graphics.fillStyle(palette.body, 1);
      graphics.fillRoundedRect(point.x - d * side - gear / 2, point.y - 14, gear + 3, compact ? 8 : 12, 2);
      break;
    case 'Walker':
      break;
  }
}

interface HitRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly priority: number;
}

/** Match visible body/gear ownership without touching simulation coordinates. */
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
  const addRole = (role: CrewRole, compact = false) => {
    const side = compact ? 9 : 12;
    const gear = compact ? 3 : 5;
    switch (role) {
      case 'Climber':
        add(point.x - 12, point.y - 10, gear, 6);
        add(point.x + 12 - gear, point.y - 10, gear, 6);
        add(d > 0 ? point.x + side : point.x - side - 4, point.y - 23, 4, 14);
        break;
      case 'Floater':
        add(point.x - d * side - gear / 2, point.y - 15, gear + 3, compact ? 9 : 13);
        break;
      case 'Bomber':
        add(point.x - 8, point.y - 11, 16, 13);
        add(point.x + d * side - (compact ? 2 : 3), point.y - 18, compact ? 4 : 6, compact ? 4 : 6);
        break;
      case 'Blocker':
        add(point.x - side - gear, point.y - 12, gear, 14);
        add(point.x + side, point.y - 12, gear, 14);
        break;
      case 'Builder':
        add(d > 0 ? point.x + 5 : point.x - 22, point.y - 3, 17, compact ? 3 : 5);
        break;
      case 'Basher':
        add(d > 0 ? point.x + 6 : point.x - 24, point.y - 12, 18, compact ? 8 : 12);
        break;
      case 'Miner':
        add(d > 0 ? point.x - 9 : point.x - 17, point.y - 21, 26, 22);
        break;
      case 'Digger':
        add(d > 0 ? point.x + 3 : point.x - 11, point.y - 14, 8, 21);
        break;
      case 'Swimmer':
        add(point.x - 10, point.y - 21, 20, compact ? 3 : 5);
        add(point.x - d * side - gear / 2, point.y - 14, gear + 3, compact ? 8 : 12);
        break;
      case 'Walker':
        break;
    }
  };

  const role = crewRole(lemming);
  addRole(role);
  if (lemming.isClimber && role !== 'Climber') addRole('Climber', true);
  if (lemming.isFloater && role !== 'Floater') addRole('Floater', true);
  if (lemming.isSwimmer && role !== 'Swimmer') addRole('Swimmer', true);
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

/** Cached texture renderer for the complete original salvage-crew family. */
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

    const role = crewRole(lemming);
    const palette = crewPalette(lemming);
    drawUniform(graphics, point, role, palette);
  }

  drawGearOverlays(
    graphics: Phaser.GameObjects.Graphics,
    lemming: Lemming,
    frame: number,
    point: LemmingDisplayPoint,
  ): void {
    if (!canDrawSalvager(lemming) || lemming.state === 'dead') return;
    const role = crewRole(lemming);
    const palette = crewPalette(lemming);
    drawRoleGear(graphics, role, point, lemming.direction, palette);

    // Permanent traits stay body-scale even while another active job owns the
    // primary uniform, so a Blocker can still read as a Floater or Climber.
    if (lemming.isClimber && role !== 'Climber') {
      drawRoleGear(graphics, 'Climber', point, lemming.direction, skillPalette('climber'), true);
    }
    if (lemming.isFloater && role !== 'Floater') {
      drawRoleGear(graphics, 'Floater', point, lemming.direction, skillPalette('floater'), true);
    }
    if (lemming.isSwimmer && role !== 'Swimmer') {
      drawRoleGear(graphics, 'Swimmer', point, lemming.direction, skillPalette('swimmer'), true);
    }

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
